import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  NativeModules,
  Alert,
  AppState,
  AppStateStatus,
  StatusBar,
} from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { ComplianceResultView } from '../components/ComplianceResultView';
import { ShiftHistoryModal } from '../components/ShiftHistoryModal';
import { StationSettingsModal } from '../components/StationSettingsModal';
import { OcrExtractResponse, ImageInput } from '../types/compliance';
import {
  ScanHistoryItem,
  loadScanHistory,
  saveScanItem,
  clearScanHistory,
} from '../utils/history';
import {
  AppSettings,
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  testServerConnection,
} from '../utils/settings';
import { haptics } from '../utils/haptics';

const { GalleryPicker } = NativeModules;

export function CameraTestScreen() {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const cameraRef = useRef<Camera>(null);

  const [isAppForeground, setIsAppForeground] = useState<boolean>(
    AppState.currentState === 'active'
  );
  const [isCameraReady, setIsCameraReady] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMsg, setLoadingMsg] = useState<string>('Processing...');
  const [result, setResult] = useState<OcrExtractResponse | null>(null);
  const [imageInput, setImageInput] = useState<ImageInput | null>(null);

  // Enterprise Controls & Settings State
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isSettingsModalVisible, setIsSettingsModalVisible] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<{ online: boolean; latencyMs?: number }>({
    online: true,
  });

  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [isHistoryModalVisible, setIsHistoryModalVisible] = useState<boolean>(false);

  // Load settings & shift history on mount
  useEffect(() => {
    loadSettings().then(loaded => {
      setSettings(loaded);
      checkConnection(loaded.apiBaseUrl);
    });
    loadScanHistory().then(setHistory);
  }, []);

  const checkConnection = useCallback(async (url: string) => {
    const res = await testServerConnection(url);
    setConnectionStatus({ online: res.success, latencyMs: res.latencyMs });
  }, []);

  // Synchronize camera activity with application foreground lifecycle
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      setIsAppForeground(nextState === 'active');
      if (nextState === 'active') {
        checkConnection(settings.apiBaseUrl);
      }
    });
    return () => subscription.remove();
  }, [settings.apiBaseUrl, checkConnection]);

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission]);

  const toggleTorch = () => {
    haptics.tap();
    if (!device?.hasTorch) {
      Alert.alert('Flash Unavailable', 'This device does not support torch/flashlight mode.');
      return;
    }
    setIsTorchOn(prev => !prev);
  };

  const handleClearHistory = async () => {
    await clearScanHistory();
    setHistory([]);
  };

  const handleSaveSettings = async (newSettings: AppSettings) => {
    setSettings(newSettings);
    await saveSettings(newSettings);
    checkConnection(newSettings.apiBaseUrl);
  };

  const processImageUri = async (uri: string, source: 'CAMERA' | 'GALLERY' = 'CAMERA') => {
    setIsLoading(true);
    setLoadingMsg('Detecting plate & verifying CNG compliance...');

    const currentInput: ImageInput = {
      uri: uri.startsWith('file://') ? uri : `file://${uri}`,
      filename: 'vehicle_plate.jpg',
      mimeType: 'image/jpeg',
      size: 0,
      sha256: 'N/A',
      source,
    };
    setImageInput(currentInput);

    const targetUrl = `${settings.apiBaseUrl.replace(/\/+$/, '')}/api/v1/ocr/extract`;
    console.log(`[NETWORK DIAGNOSTIC] Sending POST request to: ${targetUrl}`);

    try {
      const formData = new FormData();
      formData.append('file', {
        uri: currentInput.uri,
        name: currentInput.filename,
        type: currentInput.mimeType,
      } as any);

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Idempotency-Key': `mobile-${Date.now()}`,
        },
        body: formData,
      });

      console.log(`[NETWORK DIAGNOSTIC] Response HTTP Status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errText = await response.text();
        console.error(`[NETWORK DIAGNOSTIC] HTTP ${response.status} Error Body:`, errText);
        haptics.error();

        let errorCategory = `HTTP ${response.status}`;
        if (response.status === 400) errorCategory = 'HTTP 400 Bad Request';
        else if (response.status === 401) errorCategory = 'HTTP 401 Unauthorized';
        else if (response.status === 403) errorCategory = 'HTTP 403 Forbidden';
        else if (response.status === 422) errorCategory = 'HTTP 422 Unprocessable Entity';
        else if (response.status === 500) errorCategory = 'HTTP 500 Internal Server Error';

        Alert.alert(
          'Server Error',
          `[${errorCategory}]\n\n${errText || 'An error occurred during verification'}`
        );
        return;
      }

      const data: OcrExtractResponse = await response.json();
      setConnectionStatus({ online: true });

      console.log('[SAFE NETWORK DIAGNOSTIC] POST /api/v1/ocr/extract Response Data:', {
        http_status: response.status,
        response_json_keys: Object.keys(data),
        normalized_registration: data.normalized_registration,
        ocr_confidence: data.confidence,
        verification_status:
          data.verification_result?.status || (data.manual_review_required ? 'MANUAL_REVIEW' : 'UNKNOWN'),
        compliance_id: data.verification_result?.compliance_id || null,
        expires_at: data.verification_result?.expires_at || null,
      });

      setResult(data);

      const regToRecord =
        data.verification_result?.vehicle_registration &&
        data.verification_result.vehicle_registration !== 'NO_PLATE_DETECTED'
          ? data.verification_result.vehicle_registration
          : data.formatted_registration || data.normalized_registration || data.raw_text || 'UNREADABLE';

      const statusToRecord =
        data.verification_result?.status ||
        (data.manual_review_required ? 'MANUAL_REVIEW' : 'NOT_FOUND');

      const updatedHistory = await saveScanItem({
        registration: regToRecord,
        status: statusToRecord,
        confidence: data.confidence,
        source,
      });
      setHistory(updatedHistory);
    } catch (err: any) {
      console.error('[NETWORK DIAGNOSTIC] Fetch exception caught:', err.message, err);
      setConnectionStatus({ online: false });
      haptics.error();
      Alert.alert(
        'Network Connection Failure',
        `Could not connect to FastAPI server at ${targetUrl}.\n\nError: ${err.message || 'Network request failed'}\n\nPlease check server URL in Settings.`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmManualReview = async (confirmedRegistration: string) => {
    const targetUrl = `${settings.apiBaseUrl.replace(/\/+$/, '')}/api/v1/verifications/confirm-manual-review`;
    console.log(`[NETWORK DIAGNOSTIC] Submitting confirmed registration to: ${targetUrl}`);

    const payload = {
      confirmed_registration: confirmedRegistration,
      original_raw_text: result?.raw_text || null,
      original_confidence: result?.confidence || null,
      actor: settings.operatorId || 's24_operator',
    };

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': `manual-confirm-${Date.now()}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      haptics.error();
      throw new Error(`HTTP ${response.status}: ${errText}`);
    }

    const verificationRes = await response.json();
    console.log('[SAFE NETWORK DIAGNOSTIC] Manual Review Confirmed Response:', {
      http_status: response.status,
      vehicle_registration: verificationRes.vehicle_registration,
      status: verificationRes.status,
      compliance_id: verificationRes.compliance_id,
      expires_at: verificationRes.expires_at,
    });

    if (result) {
      setResult({
        ...result,
        normalized_registration: verificationRes.vehicle_registration,
        formatted_registration: verificationRes.vehicle_registration,
        manual_review_required: verificationRes.manual_review_required,
        verification_result: verificationRes,
      });

      const updatedHistory = await saveScanItem({
        registration: verificationRes.vehicle_registration,
        status: verificationRes.status,
        confidence: 1.0,
        source: 'MANUAL',
      });
      setHistory(updatedHistory);
    }
  };

  const handleCapture = async () => {
    haptics.tap();
    if (!cameraRef.current) {
      Alert.alert('Camera Not Ready', 'The camera session is still initializing. Please wait a moment.');
      return;
    }
    try {
      const photo = await cameraRef.current.takePhoto({
        flash: device?.hasFlash ? 'off' : undefined,
        enableShutterSound: false,
      });
      if (!photo || !photo.path) {
        throw new Error('Camera returned empty photo path');
      }
      await processImageUri(photo.path);
    } catch (err: any) {
      setIsLoading(false);
      Alert.alert('Capture Failed', err.message || 'Could not take photo');
    }
  };

  const handleGalleryPick = async () => {
    haptics.tap();
    try {
      if (!GalleryPicker || !GalleryPicker.openGallery) {
        Alert.alert('Error', 'Gallery picker module not available');
        return;
      }
      const uri: string = await GalleryPicker.openGallery();
      if (uri) {
        await processImageUri(uri, 'GALLERY');
      }
    } catch (err: any) {
      if (err.code !== 'E_CANCELLED') {
        Alert.alert('Gallery Error', err.message || 'Failed to select image from gallery');
      }
    }
  };

  if (!hasPermission) {
    return (
      <View style={styles.center}>
        <StatusBar barStyle="light-content" backgroundColor="#090d16" />
        <View style={styles.permissionCard}>
          <Text style={styles.permissionTitle}>CAMERA PERMISSION REQUIRED</Text>
          <Text style={styles.permissionSubtext}>
            CNG Compliance Guard requires access to your camera to scan Indian vehicle registration plates for PESO compliance verification.
          </Text>
          <TouchableOpacity style={styles.btn} onPress={requestPermission} activeOpacity={0.85}>
            <Text style={styles.btnText}>GRANT CAMERA ACCESS</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (device == null) {
    return (
      <View style={styles.center}>
        <StatusBar barStyle="light-content" backgroundColor="#090d16" />
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text style={[styles.text, { marginTop: 14 }]}>Initializing camera hardware...</Text>
      </View>
    );
  }

  const lastScanned = history.length > 0 ? history[0] : null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#090d16" translucent={false} />

      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isAppForeground && result == null}
        photo={true}
        resizeMode="cover"
        androidPreviewViewType="texture-view"
        torch={device?.hasTorch && isTorchOn ? 'on' : 'off'}
        onInitialized={() => {
          console.log('[CameraTestScreen] Camera hardware initialized');
          setIsCameraReady(true);
        }}
        onError={(err: any) => {
          console.error('[CameraTestScreen] Camera hardware error:', err);
          setCameraError(err?.message || String(err));
          Alert.alert('Camera Hardware Error', err?.message || 'Failed to start camera');
        }}
      />

      {/* Top Station Header & System Controls */}
      {!result && (
        <SafeAreaView style={styles.headerSafeArea} pointerEvents="box-none">
          <View style={styles.stationHeader}>
            <View style={styles.stationInfo}>
              <View style={styles.stationNameRow}>
                <View
                  style={[
                    styles.liveIndicatorDot,
                    { backgroundColor: connectionStatus.online ? '#10b981' : '#ef4444' },
                  ]}
                />
                <Text style={styles.stationTitle} numberOfLines={1}>
                  {settings.stationName.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.stationSubtitle} numberOfLines={1}>
                {settings.bayNumber} | {connectionStatus.online ? `${connectionStatus.latencyMs ? `${connectionStatus.latencyMs}ms` : 'ONLINE'}` : 'OFFLINE'}
              </Text>
            </View>

            <View style={styles.headerActions}>
              {/* Hardware Torch Toggle */}
              {device?.hasTorch && (
                <TouchableOpacity
                  style={[styles.headerIconBtn, isTorchOn && styles.headerIconBtnActive]}
                  onPress={toggleTorch}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={[styles.headerIconText, isTorchOn && styles.headerIconTextActive]}>
                    {isTorchOn ? 'TORCH ON' : 'TORCH'}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Station Settings Modal Button */}
              <TouchableOpacity
                style={styles.headerIconBtn}
                onPress={() => {
                  haptics.tap();
                  setIsSettingsModalVisible(true);
                }}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.headerIconText}>CONFIG</Text>
              </TouchableOpacity>

              {/* Shift Scan History Drawer Button */}
              <TouchableOpacity
                style={styles.headerIconBtn}
                onPress={() => {
                  haptics.tap();
                  setIsHistoryModalVisible(true);
                }}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.headerIconText}>LOG</Text>
                {history.length > 0 && (
                  <View style={styles.historyBadge}>
                    <Text style={styles.historyBadgeText}>{history.length}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      )}

      {/* Professional Viewfinder Reticle HUD */}
      {!result && !isLoading && (
        <View style={styles.centerViewport} pointerEvents="none">
          <View style={styles.alignmentFrame}>
            {/* Laser Corner Brackets */}
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />

            {/* Horizontal Guide Crosshair */}
            <View style={styles.reticleLine} />

            <View style={styles.alignmentPill}>
              <Text style={styles.alignmentText}>ALIGN NUMBER PLATE HERE</Text>
            </View>
          </View>
        </View>
      )}

      {/* Mini-Ticker / Last Scanned Vehicle Pill */}
      {!result && !isLoading && lastScanned && (
        <SafeAreaView style={styles.tickerSafeArea} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.tickerPill}
            onPress={() => {
              haptics.tap();
              setIsHistoryModalVisible(true);
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.tickerPrefix}>LAST SCANNED:</Text>
            <Text style={styles.tickerPlate}>{lastScanned.registration}</Text>
            <View
              style={[
                styles.tickerStatusDot,
                {
                  backgroundColor:
                    lastScanned.status === 'VALID'
                      ? '#10b981'
                      : lastScanned.status === 'EXPIRING_SOON'
                      ? '#f59e0b'
                      : '#ef4444',
                },
              ]}
            />
            <Text style={styles.tickerTime}>{lastScanned.timestamp}</Text>
          </TouchableOpacity>
        </SafeAreaView>
      )}

      {/* High-Contrast Bottom Attendant Controls */}
      {!result && !isLoading && (
        <SafeAreaView style={styles.controlsBottom} pointerEvents="box-none">
          {/* Gallery Button */}
          <TouchableOpacity
            style={styles.controlPillBtn}
            onPress={handleGalleryPick}
            activeOpacity={0.7}
          >
            <Text style={styles.controlPillText}>GALLERY</Text>
          </TouchableOpacity>

          {/* Shutter Button */}
          <TouchableOpacity
            style={styles.shutterBtn}
            onPress={handleCapture}
            activeOpacity={0.85}
          >
            <View style={styles.shutterInnerRing}>
              <View style={styles.shutterCore} />
            </View>
          </TouchableOpacity>

          {/* Shift Log Shortcut Button */}
          <TouchableOpacity
            style={styles.controlPillBtn}
            onPress={() => {
              haptics.tap();
              setIsHistoryModalVisible(true);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.controlPillText}>LOG ({history.length})</Text>
          </TouchableOpacity>
        </SafeAreaView>
      )}

      {/* Loading Modal with Dark Backdrop */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#38bdf8" />
          <Text style={styles.loadingText}>{loadingMsg}</Text>
          <Text style={styles.loadingSubtext}>Running YOLO11 ANPR and compliance check...</Text>
        </View>
      )}

      {/* Compliance Result Screen Modal View */}
      {result && (
        <ComplianceResultView
          ocrData={result}
          imageInput={imageInput}
          onReset={() => setResult(null)}
          onSelectGallery={handleGalleryPick}
          onConfirmManualReview={handleConfirmManualReview}
        />
      )}

      {/* Shift Scan History Modal */}
      <ShiftHistoryModal
        visible={isHistoryModalVisible}
        onClose={() => setIsHistoryModalVisible(false)}
        history={history}
        onClear={handleClearHistory}
      />

      {/* Station Configuration Modal */}
      <StationSettingsModal
        visible={isSettingsModalVisible}
        settings={settings}
        onClose={() => setIsSettingsModalVisible(false)}
        onSave={handleSaveSettings}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#090d16',
    padding: 24,
  },
  permissionCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1e293b',
    alignItems: 'center',
  },
  permissionTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 10,
    textAlign: 'center',
  },
  permissionSubtext: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
  },
  text: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  btn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    width: '100%',
  },
  btnText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  headerSafeArea: {
    position: 'absolute',
    top: 10,
    left: 16,
    right: 16,
    zIndex: 40,
  },
  stationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(9, 13, 22, 0.92)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  stationInfo: {
    flex: 1,
    paddingRight: 8,
  },
  stationNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stationTitle: {
    color: '#f8fafc',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  stationSubtitle: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerIconBtn: {
    backgroundColor: 'rgba(30, 41, 59, 0.85)',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
    position: 'relative',
  },
  headerIconBtnActive: {
    backgroundColor: '#78350f',
    borderColor: '#f59e0b',
  },
  headerIconText: {
    color: '#f8fafc',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  headerIconTextActive: {
    color: '#fbbf24',
  },
  historyBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#10b981',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  historyBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
  },
  centerViewport: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  alignmentFrame: {
    width: 310,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    backgroundColor: 'rgba(56, 189, 248, 0.03)',
  },
  corner: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderColor: '#38bdf8',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 10,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 10,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 10,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 10,
  },
  reticleLine: {
    position: 'absolute',
    width: '60%',
    height: 1,
    backgroundColor: 'rgba(56, 189, 248, 0.35)',
  },
  alignmentPill: {
    backgroundColor: 'rgba(9, 13, 22, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.4)',
  },
  alignmentText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  tickerSafeArea: {
    position: 'absolute',
    bottom: 125,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 35,
  },
  tickerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(9, 13, 22, 0.92)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
    gap: 6,
  },
  tickerPrefix: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '800',
  },
  tickerPlate: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
    fontFamily: 'monospace',
    letterSpacing: 0.5,
  },
  tickerStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 2,
  },
  tickerTime: {
    color: '#94a3b8',
    fontSize: 10,
  },
  controlsBottom: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 50,
  },
  shutterBtn: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  shutterInnerRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterCore: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#ffffff',
  },
  controlPillBtn: {
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    minWidth: 80,
  },
  controlPillText: {
    color: '#f8fafc',
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(9, 13, 22, 0.94)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 90,
  },
  loadingText: {
    color: '#ffffff',
    marginTop: 16,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  loadingSubtext: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 6,
  },
});
