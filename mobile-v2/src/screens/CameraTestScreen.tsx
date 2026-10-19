import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  NativeModules,
  Alert,
  AppState,
  AppStateStatus,
  StatusBar,
  ScrollView,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { ComplianceResultView } from '../components/ComplianceResultView';
import { ShiftHistoryModal } from '../components/ShiftHistoryModal';
import { StationSettingsModal } from '../components/StationSettingsModal';
import { ProcessingView } from '../components/ProcessingView';
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
  fetchWithFallback,
} from '../utils/settings';
import { haptics } from '../utils/haptics';

const { GalleryPicker } = NativeModules;

const ANDROID_TOP_INSET =
  Platform.OS === 'android' ? Math.max(StatusBar.currentHeight || 0, 38) : 0;
const ANDROID_BOTTOM_INSET = Platform.OS === 'android' ? 22 : 0;

type ActiveTab = 'HOME' | 'SCANNER' | 'LOGS';

export function CameraTestScreen() {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const cameraRef = useRef<Camera>(null);

  const [activeTab, setActiveTab] = useState<ActiveTab>('HOME');
  const [isAppForeground, setIsAppForeground] = useState<boolean>(
    AppState.currentState === 'active'
  );
  const [isCameraReady, setIsCameraReady] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMsg, setLoadingMsg] = useState<string>(
    'Detecting plate & checking PESO registry...'
  );
  const [result, setResult] = useState<OcrExtractResponse | null>(null);
  const [imageInput, setImageInput] = useState<ImageInput | null>(null);

  // Manual Entry Modal state
  const [isManualModalVisible, setIsManualModalVisible] = useState<boolean>(false);
  const [manualPlateInput, setManualPlateInput] = useState<string>('');

  // Enterprise Controls & Settings State
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isSettingsModalVisible, setIsSettingsModalVisible] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    online: boolean;
    latencyMs?: number;
  }>({
    online: true,
  });

  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);

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
  }, [hasPermission, requestPermission]);

  // Reset camera ready flag when leaving scanner tab
  useEffect(() => {
    if (activeTab !== 'SCANNER' || result !== null) {
      setIsCameraReady(false);
    }
  }, [activeTab, result]);

  const switchTab = (tab: ActiveTab) => {
    haptics.tap();
    if (result !== null) {
      setResult(null);
    }
    setActiveTab(tab);
  };

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
    if (isLoading) return;
    setIsLoading(true);
    setLoadingMsg('Detecting plate & verifying CNG compliance...');

    const normalizedUri =
      uri.startsWith('file://') || uri.startsWith('content://') ? uri : `file://${uri}`;

    const currentInput: ImageInput = {
      uri: normalizedUri,
      filename: 'vehicle_plate.jpg',
      mimeType: 'image/jpeg',
      size: 0,
      sha256: 'N/A',
      source,
    };
    setImageInput(currentInput);

    try {
      const formData = new FormData();
      formData.append('file', {
        uri: currentInput.uri,
        name: currentInput.filename,
        type: currentInput.mimeType,
      } as any);

      const { response } = await fetchWithFallback(
        settings.apiBaseUrl,
        '/api/v1/ocr/extract',
        {
          method: 'POST',
          headers: {
            'Idempotency-Key': `mobile-${Date.now()}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        haptics.error();
        Alert.alert(
          'Verification Error',
          `[HTTP ${response.status}]\n\n${errText || 'An error occurred during verification'}`
        );
        return;
      }

      const data: OcrExtractResponse = await response.json();
      setConnectionStatus({ online: true });
      setResult(data);

      const regToRecord =
        data.verification_result?.vehicle_registration &&
        data.verification_result.vehicle_registration !== 'NO_PLATE_DETECTED'
          ? data.verification_result.vehicle_registration
          : data.formatted_registration &&
            data.formatted_registration !== 'NO_PLATE_DETECTED'
          ? data.formatted_registration
          : data.normalized_registration || 'MANUAL CHECK';

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
      setConnectionStatus({ online: false });
      haptics.error();
      Alert.alert(
        'Connection Issue',
        `Could not reach the compliance server.\n\nError: ${err.message || 'Network request failed'}\n\nTap Settings (⚙) to check your server connection.`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmManualReview = async (confirmedRegistration: string) => {
    const payload = {
      confirmed_registration: confirmedRegistration,
      original_raw_text: result?.raw_text || confirmedRegistration,
      original_confidence: result?.confidence ?? 1.0,
      actor: settings.operatorId || 's24_operator',
    };

    const { response } = await fetchWithFallback(
      settings.apiBaseUrl,
      '/api/v1/verifications/confirm-manual-review',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': `manual-confirm-${Date.now()}`,
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      haptics.error();
      throw new Error(`HTTP ${response.status}: ${errText}`);
    }

    const verificationRes = await response.json();
    setConnectionStatus({ online: true });

    setResult({
      raw_text: result?.raw_text || confirmedRegistration,
      normalized_registration: verificationRes.vehicle_registration,
      formatted_registration: verificationRes.vehicle_registration,
      confidence: result?.confidence ?? 1.0,
      engine_name: result?.engine_name || 'ManualEntry',
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
  };

  const handleDirectManualLookup = async (plateOverride?: string) => {
    const rawPlate = typeof plateOverride === 'string' ? plateOverride : manualPlateInput;
    const cleaned = rawPlate.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (cleaned.length < 4) {
      Alert.alert('Enter Plate Number', 'Please enter at least 4 characters (e.g. DL01AB1234).');
      return;
    }
    haptics.tap();
    setIsManualModalVisible(false);
    setIsLoading(true);
    setLoadingMsg(`Looking up ${cleaned} in PESO registry...`);
    setImageInput(null);
    try {
      await handleConfirmManualReview(cleaned);
      setManualPlateInput('');
    } catch (err: any) {
      Alert.alert('Lookup Failed', err.message || 'Could not verify plate number');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCapture = async () => {
    if (isLoading) return;
    haptics.tap();

    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) {
        Alert.alert('Camera Permission', 'Please grant camera permission to scan number plates.');
      }
      return;
    }

    if (!cameraRef.current) {
      Alert.alert('Camera Starting', 'Please wait a moment for the camera preview to initialize.');
      return;
    }

    try {
      let capturedPath: string | undefined;

      // Primary fast GPU snapshot from active PreviewView stream (instant ~40ms capture on Android)
      try {
        const snap = await cameraRef.current.takeSnapshot({
          quality: 90,
        });
        if (snap && snap.path) {
          capturedPath = snap.path;
        }
      } catch {
        // Fallback to full sensor photo capture if snapshot is unavailable
      }

      if (!capturedPath) {
        const photo = await cameraRef.current.takePhoto({
          enableShutterSound: false,
        });
        capturedPath = photo?.path;
      }

      if (!capturedPath) {
        throw new Error('Camera returned an empty image path.');
      }

      await processImageUri(capturedPath, 'CAMERA');
    } catch (err: any) {
      setIsLoading(false);
      Alert.alert(
        'Camera Capture Issue',
        `${err?.message || 'Could not capture frame from camera.'}\n\nYou can also use Gallery or Manual Type below.`
      );
    }
  };

  const handleGalleryPick = async () => {
    if (isLoading) return;
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

  const safeCount = history.filter(
    h => h.status === 'VALID' || h.status === 'EXPIRING_SOON'
  ).length;
  const rejectedCount = history.filter(
    h => h.status === 'EXPIRED' || h.status === 'INVALID' || h.status === 'NOT_FOUND'
  ).length;
  const manualCount = history.filter(h => h.status === 'MANUAL_REVIEW').length;
  const lastScanned = history.length > 0 ? history[0] : null;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false} />

      {/* =====================================================================
          MAIN CONTENT AREA (VERDICT VIEW OR ACTIVE TAB: HOME / SCANNER / LOGS)
         ===================================================================== */}
      <View style={styles.flex1}>
        {result ? (
          <ComplianceResultView
            ocrData={result}
            imageInput={imageInput}
            onReset={() => setResult(null)}
            onSelectGallery={handleGalleryPick}
            onConfirmManualReview={handleConfirmManualReview}
            stationName={settings.stationName}
            bayNumber={settings.bayNumber}
          />
        ) : activeTab === 'HOME' ? (
          /* ===================================================================
             TAB 1: FRIENDLY, UNCLUTTERED LANDING PAGE (FORECOURT HOME)
             =================================================================== */
          <View style={styles.flex1}>
            {/* Clean Brand Header */}
            <View style={styles.homeHeader}>
              <View style={styles.brandRow}>
                <View style={styles.brandLogoBox}>
                  <Text style={styles.brandLogoEmoji}>⛽</Text>
                </View>
                <View>
                  <Text style={styles.brandTitle}>CNG COMPLIANCE</Text>
                  <Text style={styles.brandSubtitle}>Forecourt Safety Assistant</Text>
                </View>
              </View>

              <View style={styles.headerRightRow}>
                <TouchableOpacity
                  style={[
                    styles.statusChip,
                    connectionStatus.online ? styles.statusChipOnline : styles.statusChipOffline,
                  ]}
                  onPress={() => checkConnection(settings.apiBaseUrl)}
                  activeOpacity={0.75}
                >
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: connectionStatus.online ? '#16A34A' : '#DC2626' },
                    ]}
                  />
                  <Text
                    style={[
                      styles.statusChipText,
                      { color: connectionStatus.online ? '#15803D' : '#DC2626' },
                    ]}
                  >
                    {connectionStatus.online ? 'ONLINE' : 'OFFLINE'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.iconCircleBtn}
                  onPress={() => {
                    haptics.tap();
                    setIsSettingsModalVisible(true);
                  }}
                  activeOpacity={0.75}
                >
                  <Text style={styles.iconCircleText}>⚙</Text>
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView
              contentContainerStyle={styles.homeScroll}
              showsVerticalScrollIndicator={false}
            >
              {/* Friendly Hero Welcome Card */}
              <View style={styles.heroCard}>
                <View style={styles.heroPillRow}>
                  <View style={styles.pesoVerifiedPill}>
                    <Text style={styles.pesoVerifiedText}>✓ PESO & VAHAN Ready</Text>
                  </View>
                  <Text style={styles.heroBayLabel}>{settings.bayNumber}</Text>
                </View>

                <Text style={styles.heroGreeting}>Ready to check a vehicle</Text>
                <Text style={styles.heroDescription}>
                  Scan the number plate or pick a photo to verify cylinder hydro-test safety in seconds.
                </Text>

                {/* Big Friendly Primary CTA */}
                <TouchableOpacity
                  style={styles.primaryScanCta}
                  onPress={() => switchTab('SCANNER')}
                  activeOpacity={0.85}
                >
                  <Text style={styles.primaryScanCtaIcon}>📷</Text>
                  <Text style={styles.primaryScanCtaText}>SCAN VEHICLE PLATE</Text>
                </TouchableOpacity>

                {/* Two Friendly Secondary Quick Actions */}
                <View style={styles.quickActionsRow}>
                  <TouchableOpacity
                    style={styles.quickActionCard}
                    onPress={handleGalleryPick}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.quickActionIcon}>🖼</Text>
                    <View style={styles.flex1}>
                      <Text style={styles.quickActionTitle}>From Gallery</Text>
                      <Text style={styles.quickActionSub}>Pick saved photo</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.quickActionCard}
                    onPress={() => {
                      haptics.tap();
                      setIsManualModalVisible(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.quickActionIcon}>⌨</Text>
                    <View style={styles.flex1}>
                      <Text style={styles.quickActionTitle}>Type Plate</Text>
                      <Text style={styles.quickActionSub}>Enter manually</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Compact Shift Snapshot Card */}
              <TouchableOpacity
                style={styles.shiftSnapshotCard}
                onPress={() => switchTab('LOGS')}
                activeOpacity={0.85}
              >
                <View style={styles.shiftSnapshotTop}>
                  <View>
                    <Text style={styles.shiftSnapshotTitle}>Today's Shift Summary</Text>
                    <Text style={styles.shiftSnapshotSub}>{settings.stationName}</Text>
                  </View>
                  <Text style={styles.viewLogsLink}>View Logs →</Text>
                </View>

                <View style={styles.shiftMiniCounters}>
                  <View style={[styles.miniCounterBox, styles.miniCounterSafe]}>
                    <Text style={styles.miniCounterValueSafe}>{safeCount}</Text>
                    <Text style={styles.miniCounterLabelSafe}>Safe</Text>
                  </View>

                  <View style={[styles.miniCounterBox, styles.miniCounterRejected]}>
                    <Text style={styles.miniCounterValueRejected}>{rejectedCount}</Text>
                    <Text style={styles.miniCounterLabelRejected}>Blocked</Text>
                  </View>

                  <View style={[styles.miniCounterBox, styles.miniCounterReview]}>
                    <Text style={styles.miniCounterValueReview}>{manualCount}</Text>
                    <Text style={styles.miniCounterLabelReview}>Reviewed</Text>
                  </View>
                </View>
              </TouchableOpacity>

              {/* Last Checked Vehicle Card (only if available) */}
              {lastScanned && (
                <TouchableOpacity
                  style={styles.lastScanCard}
                  onPress={() => {
                    if (
                      lastScanned.registration &&
                      lastScanned.registration !== 'UNREADABLE' &&
                      lastScanned.registration !== 'MANUAL CHECK'
                    ) {
                      handleDirectManualLookup(lastScanned.registration);
                    } else {
                      switchTab('LOGS');
                    }
                  }}
                  activeOpacity={0.85}
                >
                  <View style={styles.lastScanHeader}>
                    <Text style={styles.lastScanTitle}>LAST CHECKED VEHICLE</Text>
                    <Text style={styles.lastScanTime}>{lastScanned.timestamp} • Tap to view</Text>
                  </View>

                  <View style={styles.lastScanBody}>
                    <View style={styles.miniHsrpPlate}>
                      <View style={styles.miniHsrpInd}>
                        <Text style={styles.miniHsrpIndText}>IND</Text>
                      </View>
                      <Text style={styles.miniHsrpNumber}>{lastScanned.registration}</Text>
                    </View>

                    <View
                      style={[
                        styles.lastScanBadge,
                        lastScanned.status === 'VALID' || lastScanned.status === 'EXPIRING_SOON'
                          ? styles.lastScanBadgeSafe
                          : lastScanned.status === 'MANUAL_REVIEW'
                          ? styles.lastScanBadgeReview
                          : styles.lastScanBadgeRejected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.lastScanBadgeText,
                          lastScanned.status === 'VALID' || lastScanned.status === 'EXPIRING_SOON'
                            ? { color: '#15803D' }
                            : lastScanned.status === 'MANUAL_REVIEW'
                            ? { color: '#B45309' }
                            : { color: '#DC2626' },
                        ]}
                      >
                        {lastScanned.status === 'VALID'
                          ? '✓ SAFE TO FILL'
                          : lastScanned.status === 'EXPIRING_SOON'
                          ? '! EXPIRING SOON'
                          : lastScanned.status === 'MANUAL_REVIEW'
                          ? '? REVIEWED'
                          : '✕ DO NOT FILL'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )}

              {/* Simple 3-Step Visual Guide (Friendly, Zero Clutter) */}
              <View style={styles.stepsCard}>
                <Text style={styles.stepsHeader}>HOW IT WORKS</Text>
                <View style={styles.stepsRow}>
                  <View style={styles.stepItem}>
                    <View style={styles.stepNumBadge}>
                      <Text style={styles.stepNumText}>1</Text>
                    </View>
                    <Text style={styles.stepItemTitle}>Snap Plate</Text>
                    <Text style={styles.stepItemSub}>Camera or gallery</Text>
                  </View>

                  <Text style={styles.stepConnector}>→</Text>

                  <View style={styles.stepItem}>
                    <View style={styles.stepNumBadge}>
                      <Text style={styles.stepNumText}>2</Text>
                    </View>
                    <Text style={styles.stepItemTitle}>Auto-Verify</Text>
                    <Text style={styles.stepItemSub}>PESO hydro check</Text>
                  </View>

                  <Text style={styles.stepConnector}>→</Text>

                  <View style={styles.stepItem}>
                    <View style={styles.stepNumBadge}>
                      <Text style={styles.stepNumText}>3</Text>
                    </View>
                    <Text style={styles.stepItemTitle}>Clear Signal</Text>
                    <Text style={styles.stepItemSub}>Green or Red</Text>
                  </View>
                </View>
              </View>
            </ScrollView>
          </View>
        ) : activeTab === 'SCANNER' ? (
          /* ===================================================================
             TAB 2: MAIN VEHICLE SCANNER (Stitch 1: Minimalist Light Scanner)
             Fixed Non-Scrolling Flex Layout so VisionCamera Preview Never Clips
             =================================================================== */
          <View style={styles.flex1}>
            {/* Minimalist Clean Scanner Header */}
            <View style={styles.scannerHeader}>
              <View style={styles.scannerHeaderLeft}>
                <TouchableOpacity
                  style={styles.backBtn}
                  onPress={() => switchTab('HOME')}
                  activeOpacity={0.75}
                >
                  <Text style={styles.backBtnText}>←</Text>
                </TouchableOpacity>
                <View>
                  <View style={styles.onlineRow}>
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: connectionStatus.online ? '#10B981' : '#EF4444' },
                      ]}
                    />
                    <Text style={styles.scannerOnlineText}>
                      {connectionStatus.online ? 'ONLINE' : 'OFFLINE'} •{' '}
                      {settings.bayNumber.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.scannerTitle}>Plate Verification</Text>
                </View>
              </View>

              <View style={styles.headerRightRow}>
                <View style={styles.stationPill}>
                  <Text style={styles.stationPillText}>⛽ CNG-04</Text>
                </View>
                <TouchableOpacity
                  style={styles.iconCircleBtn}
                  onPress={() => {
                    haptics.tap();
                    setIsSettingsModalVisible(true);
                  }}
                >
                  <Text style={styles.iconCircleText}>⚙</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.scannerMain}>
              {/* Instruction Pill Bar */}
              <View style={styles.instructionCard}>
                <View style={styles.instructionLeft}>
                  <View style={styles.focusIconBox}>
                    <Text style={styles.focusIconText}>⌖</Text>
                  </View>
                  <View>
                    <Text style={styles.stepCaption}>STEP 1 OF 2</Text>
                    <Text style={styles.stepMainText}>ALIGN VEHICLE NUMBER PLATE</Text>
                  </View>
                </View>
                <View style={styles.readyBadge}>
                  <Text style={styles.readyBadgeText}>
                    {isCameraReady ? '● LIVE' : '● STARTING'}
                  </Text>
                </View>
              </View>

              {/* Framed Viewfinder Card (Flex 1 for stable Android Surface/Texture layout) */}
              <View style={styles.viewfinderCard}>
                {!hasPermission ? (
                  <View style={styles.permissionBox}>
                    <Text style={styles.permissionTitle}>Camera Access Needed</Text>
                    <Text style={styles.permissionSub}>
                      Allow camera access to scan vehicle number plates.
                    </Text>
                    <TouchableOpacity style={styles.grantBtn} onPress={requestPermission}>
                      <Text style={styles.grantBtnText}>GRANT PERMISSION</Text>
                    </TouchableOpacity>
                  </View>
                ) : device == null ? (
                  <View style={styles.permissionBox}>
                    <ActivityIndicator size="large" color="#15803D" />
                    <Text style={styles.permissionSub}>Starting camera...</Text>
                  </View>
                ) : (
                  <Camera
                    ref={cameraRef}
                    style={StyleSheet.absoluteFill}
                    device={device}
                    isActive={isAppForeground && activeTab === 'SCANNER' && result == null}
                    photo={true}
                    resizeMode="cover"
                    torch={device?.hasTorch && isTorchOn ? 'on' : 'off'}
                    onInitialized={() => setIsCameraReady(true)}
                    onPreviewStarted={() => setIsCameraReady(true)}
                    onError={(err: any) => {
                      console.warn('[VisionCamera] Error:', err?.message);
                    }}
                  />
                )}

                {/* Top Tools Bar inside Viewfinder */}
                <View style={styles.vfTopBar}>
                  <TouchableOpacity
                    style={[styles.torchPillBtn, isTorchOn && styles.torchPillBtnActive]}
                    onPress={toggleTorch}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.torchPillText,
                        isTorchOn && styles.torchPillTextActive,
                      ]}
                    >
                      🔦 {isTorchOn ? 'TORCH ON' : 'TORCH'}
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.afBadge}>
                    <View style={styles.afDot} />
                    <Text style={styles.afText}>AUTO-FOCUS</Text>
                  </View>
                </View>

                {/* Center Targeting Frame with HSRP Template Silhouette */}
                <View style={styles.vfCenterWrap} pointerEvents="none">
                  <View style={styles.targetBox}>
                    <View style={[styles.cornerBracket, styles.cornerTL]} />
                    <View style={[styles.cornerBracket, styles.cornerTR]} />
                    <View style={[styles.cornerBracket, styles.cornerBL]} />
                    <View style={[styles.cornerBracket, styles.cornerBR]} />

                    <View style={styles.plateSilhouetteCard}>
                      <View style={styles.silhouetteIndStrip}>
                        <Text style={styles.silhouetteFlag}>🇮🇳</Text>
                        <Text style={styles.silhouetteIndText}>IND</Text>
                      </View>
                      <View style={styles.silhouetteCenter}>
                        <Text style={styles.silhouettePlateSample}>DL 01 AB 1234</Text>
                        <Text style={styles.silhouetteHint}>ALIGN NUMBER PLATE HERE</Text>
                      </View>
                      <Text style={styles.silhouetteCropIcon}>⛶</Text>
                    </View>
                  </View>
                </View>

                {/* Bottom Distance Helper Badge */}
                <View style={styles.vfBottomBar} pointerEvents="none">
                  <View style={styles.distancePill}>
                    <Text style={styles.distancePillText}>📏 HOLD CAMERA 1 METRE AWAY</Text>
                  </View>
                </View>
              </View>

              {/* Action Section */}
              <View style={styles.scannerActionsWrap}>
                {/* High Contrast Primary Action Button */}
                <TouchableOpacity
                  style={styles.scanPrimaryDarkBtn}
                  onPress={handleCapture}
                  activeOpacity={0.85}
                >
                  <Text style={styles.btnEmojiIcon}>📷</Text>
                  <Text style={styles.scanPrimaryDarkBtnText}>SCAN NUMBER PLATE</Text>
                </TouchableOpacity>

                {/* Secondary Actions: Clean Outlined Buttons */}
                <View style={styles.secondaryGrid2}>
                  <TouchableOpacity
                    style={styles.outlinedActionBtn}
                    onPress={handleGalleryPick}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.btnEmojiIconSmall}>🖼</Text>
                    <Text style={styles.outlinedActionBtnText}>GALLERY</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.outlinedActionBtn}
                    onPress={() => {
                      haptics.tap();
                      setIsManualModalVisible(true);
                    }}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.btnEmojiIconSmall}>⌨</Text>
                    <Text style={styles.outlinedActionBtnText}>MANUAL TYPE</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Compliance / Safety Banner */}
              <View style={styles.pesoFooterBanner}>
                <View style={styles.pesoShieldBox}>
                  <Text style={styles.pesoShieldIcon}>🛡</Text>
                </View>
                <View style={styles.flex1}>
                  <Text style={styles.pesoFooterTitle}>PESO & CCOE COMPLIANCE ACTIVE</Text>
                  <Text style={styles.pesoFooterSub}>
                    No filling allowed without valid hydro-test certificate verification.
                  </Text>
                </View>
              </View>
            </View>
          </View>
        ) : (
          /* ===================================================================
             TAB 3: SHIFT ACTIVITY LOGS (Inline Tab View)
             =================================================================== */
          <ShiftHistoryModal
            visible={true}
            inline={true}
            onClose={() => switchTab('HOME')}
            history={history}
            onClear={handleClearHistory}
            onSelectScan={item => {
              if (
                item.registration &&
                item.registration !== 'UNREADABLE' &&
                item.registration !== 'MANUAL CHECK'
              ) {
                handleDirectManualLookup(item.registration);
              }
            }}
            onStartNewScan={() => switchTab('SCANNER')}
            stationName={settings.stationName}
            bayNumber={settings.bayNumber}
          />
        )}
      </View>

      {/* =====================================================================
          PERSISTENT 3-TAB BOTTOM BAR (With Android System Nav Safe Padding)
         ===================================================================== */}
      <View style={styles.bottomTabBar}>
        <TouchableOpacity
          style={[
            styles.tabItem,
            !result && activeTab === 'HOME' && styles.tabItemActive,
          ]}
          onPress={() => switchTab('HOME')}
          activeOpacity={0.75}
        >
          <Text style={styles.tabIcon}>⛽</Text>
          <Text
            style={[
              styles.tabLabel,
              !result && activeTab === 'HOME' && styles.tabLabelActive,
            ]}
          >
            Forecourt
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabItem,
            !result && activeTab === 'SCANNER' && styles.tabItemActive,
          ]}
          onPress={() => switchTab('SCANNER')}
          activeOpacity={0.75}
        >
          <Text style={styles.tabIcon}>📷</Text>
          <Text
            style={[
              styles.tabLabel,
              !result && activeTab === 'SCANNER' && styles.tabLabelActive,
            ]}
          >
            Scanner
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabItem,
            !result && activeTab === 'LOGS' && styles.tabItemActive,
          ]}
          onPress={() => switchTab('LOGS')}
          activeOpacity={0.75}
        >
          <View style={styles.tabIconWrap}>
            <Text style={styles.tabIcon}>📋</Text>
            {history.length > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{history.length}</Text>
              </View>
            )}
          </View>
          <Text
            style={[
              styles.tabLabel,
              !result && activeTab === 'LOGS' && styles.tabLabelActive,
            ]}
          >
            Shift Logs
          </Text>
        </TouchableOpacity>
      </View>

      {/* =====================================================================
          MANUAL PLATE ENTRY MODAL
         ===================================================================== */}
      <Modal
        visible={isManualModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsManualModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.manualModalCard}>
            <View style={styles.manualModalHeader}>
              <Text style={styles.manualModalTitle}>Manual Plate Lookup</Text>
              <TouchableOpacity
                onPress={() => setIsManualModalVisible(false)}
                style={styles.manualCloseBtn}
              >
                <Text style={styles.manualCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.manualModalSub}>
              Enter the Indian vehicle registration number to verify against the PESO & VAHAN registry.
            </Text>

            <View style={styles.manualInputRow}>
              <View style={styles.manualIndBadge}>
                <Text style={styles.manualIndText}>IND</Text>
              </View>
              <TextInput
                style={styles.manualTextInput}
                value={manualPlateInput}
                onChangeText={t => setManualPlateInput(t.toUpperCase())}
                placeholder="e.g. DL 01 AB 1234"
                placeholderTextColor="#94A3B8"
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={14}
                autoFocus
              />
            </View>

            <View style={styles.samplePlatesRow}>
              <Text style={styles.samplePlatesLabel}>Quick test plates:</Text>
              {[
                { label: 'DL01AB1234 (Safe)', value: 'DL01AB1234' },
                { label: 'DL01EXPIRED (Lockout)', value: 'DL01EXPIRED' },
                { label: 'DL01EXPIRING (Soon)', value: 'DL01EXPIRING' },
              ].map(sp => (
                <TouchableOpacity
                  key={sp.value}
                  style={styles.sampleChip}
                  onPress={() => setManualPlateInput(sp.value)}
                >
                  <Text style={styles.sampleChipText}>{sp.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.manualSubmitBtn}
              onPress={() => handleDirectManualLookup()}
              activeOpacity={0.85}
            >
              <Text style={styles.manualSubmitBtnText}>✓  CHECK COMPLIANCE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Loading Overlay */}
      {isLoading && <ProcessingView statusText={loadingMsg} imageInput={imageInput} />}

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
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: ANDROID_TOP_INSET,
  },
  flex1: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  /* --- Home / Friendly Landing Page --- */
  homeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandLogoBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#00652C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandLogoEmoji: {
    fontSize: 20,
  },
  brandTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  brandSubtitle: {
    color: '#15803D',
    fontSize: 11,
    fontWeight: '700',
  },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusChipOnline: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  statusChipOffline: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  iconCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircleText: {
    color: '#334155',
    fontSize: 16,
  },
  homeScroll: {
    padding: 16,
    paddingBottom: 24,
    gap: 14,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  heroPillRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pesoVerifiedPill: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  pesoVerifiedText: {
    color: '#15803D',
    fontSize: 11,
    fontWeight: '800',
  },
  heroBayLabel: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
  },
  heroGreeting: {
    color: '#0F172A',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  heroDescription: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 20,
  },
  primaryScanCta: {
    backgroundColor: '#15803D',
    height: 56,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
  },
  primaryScanCtaIcon: {
    fontSize: 20,
  },
  primaryScanCtaText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  quickActionIcon: {
    fontSize: 20,
  },
  quickActionTitle: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '800',
  },
  quickActionSub: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 1,
  },
  shiftSnapshotCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  shiftSnapshotTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shiftSnapshotTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800',
  },
  shiftSnapshotSub: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 1,
  },
  viewLogsLink: {
    color: '#15803D',
    fontSize: 12,
    fontWeight: '800',
  },
  shiftMiniCounters: {
    flexDirection: 'row',
    gap: 8,
  },
  miniCounterBox: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  miniCounterSafe: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  miniCounterValueSafe: {
    color: '#065F46',
    fontSize: 18,
    fontWeight: '900',
  },
  miniCounterLabelSafe: {
    color: '#047857',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 1,
  },
  miniCounterRejected: {
    backgroundColor: '#FFF1F2',
    borderColor: '#FECDD3',
  },
  miniCounterValueRejected: {
    color: '#9F1239',
    fontSize: 18,
    fontWeight: '900',
  },
  miniCounterLabelRejected: {
    color: '#BE123C',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 1,
  },
  miniCounterReview: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  miniCounterValueReview: {
    color: '#92400E',
    fontSize: 18,
    fontWeight: '900',
  },
  miniCounterLabelReview: {
    color: '#B45309',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 1,
  },
  lastScanCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  lastScanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastScanTitle: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  lastScanTime: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },
  lastScanBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  miniHsrpPlate: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#1E293B',
    borderRadius: 8,
    overflow: 'hidden',
  },
  miniHsrpInd: {
    backgroundColor: '#0038A8',
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
  miniHsrpIndText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
  miniHsrpNumber: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '900',
    fontFamily: 'monospace',
    paddingHorizontal: 10,
    letterSpacing: 1,
  },
  lastScanBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  lastScanBadgeSafe: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  lastScanBadgeReview: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  lastScanBadgeRejected: {
    backgroundColor: '#FFF1F2',
    borderColor: '#FECDD3',
  },
  lastScanBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  stepsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  stepsHeader: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepItem: {
    flex: 1,
    alignItems: 'center',
  },
  stepNumBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  stepNumText: {
    color: '#15803D',
    fontSize: 12,
    fontWeight: '900',
  },
  stepItemTitle: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '800',
  },
  stepItemSub: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 1,
  },
  stepConnector: {
    color: '#CBD5E1',
    fontSize: 16,
    fontWeight: '800',
  },

  /* --- Stitch Screen 1: Main Vehicle Scanner Minimalist Light --- */
  scannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  scannerHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtnText: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '800',
  },
  onlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  scannerOnlineText: {
    color: '#047857',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  scannerTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '800',
  },
  stationPill: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 18,
  },
  stationPillText: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '700',
  },
  scannerMain: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    gap: 10,
    justifyContent: 'space-between',
  },
  instructionCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  instructionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  focusIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  focusIconText: {
    color: '#047857',
    fontSize: 17,
    fontWeight: '900',
  },
  stepCaption: {
    color: '#94A3B8',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  stepMainText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '800',
  },
  readyBadge: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  readyBadgeText: {
    color: '#047857',
    fontSize: 10,
    fontWeight: '800',
  },
  viewfinderCard: {
    flex: 1,
    width: '100%',
    minHeight: 220,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'space-between',
    padding: 12,
  },
  permissionBox: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#0F172A',
  },
  permissionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  permissionSub: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 14,
  },
  grantBtn: {
    backgroundColor: '#15803D',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  grantBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  vfTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  torchPillBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  torchPillBtnActive: {
    backgroundColor: '#FBBF24',
  },
  torchPillText: {
    color: '#0F172A',
    fontSize: 11,
    fontWeight: '800',
  },
  torchPillTextActive: {
    color: '#0F172A',
  },
  afBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  afDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34D399',
  },
  afText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  vfCenterWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  targetBox: {
    width: '92%',
    height: 110,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
    position: 'relative',
  },
  cornerBracket: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderColor: '#FFFFFF',
  },
  cornerTL: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  cornerTR: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  cornerBL: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  cornerBR: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  plateSilhouetteCard: {
    width: '92%',
    height: 54,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  silhouetteIndStrip: {
    width: 22,
    height: 36,
    backgroundColor: '#1D4ED8',
    borderRadius: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  silhouetteFlag: {
    fontSize: 8,
  },
  silhouetteIndText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
  },
  silhouetteCenter: {
    flex: 1,
    alignItems: 'center',
  },
  silhouettePlateSample: {
    color: '#1E293B',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 2,
  },
  silhouetteHint: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '800',
    marginTop: 1,
  },
  silhouetteCropIcon: {
    color: '#94A3B8',
    fontSize: 16,
  },
  vfBottomBar: {
    alignItems: 'center',
    zIndex: 10,
  },
  distancePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  distancePillText: {
    color: '#1E293B',
    fontSize: 10,
    fontWeight: '800',
  },
  scannerActionsWrap: {
    gap: 8,
  },
  btnEmojiIcon: {
    fontSize: 17,
  },
  btnEmojiIconSmall: {
    fontSize: 15,
  },
  scanPrimaryDarkBtn: {
    backgroundColor: '#0F172A',
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  scanPrimaryDarkBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  secondaryGrid2: {
    flexDirection: 'row',
    gap: 10,
  },
  outlinedActionBtn: {
    flex: 1,
    height: 44,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  outlinedActionBtnText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  pesoFooterBanner: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pesoShieldBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pesoShieldIcon: {
    fontSize: 15,
  },
  pesoFooterTitle: {
    color: '#0F172A',
    fontSize: 10,
    fontWeight: '800',
  },
  pesoFooterSub: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 1,
  },

  /* --- Persistent Bottom Tab Bar (Safe Area Padded for Android Gesture Nav) --- */
  bottomTabBar: {
    height: 62 + ANDROID_BOTTOM_INSET,
    paddingBottom: ANDROID_BOTTOM_INSET,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabItemActive: {
    backgroundColor: '#F0FDF4',
  },
  tabIconWrap: {
    position: 'relative',
  },
  tabIcon: {
    fontSize: 18,
  },
  tabLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  tabLabelActive: {
    color: '#15803D',
    fontWeight: '800',
  },
  tabBadge: {
    position: 'absolute',
    top: -4,
    right: -12,
    backgroundColor: '#15803D',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },

  /* --- Manual Plate Entry Modal --- */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  manualModalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  manualModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  manualModalTitle: {
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '800',
  },
  manualCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  manualCloseText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '800',
  },
  manualModalSub: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 18,
  },
  manualInputRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderWidth: 2,
    borderColor: '#0F172A',
    borderRadius: 12,
    overflow: 'hidden',
    height: 54,
  },
  manualIndBadge: {
    width: 36,
    backgroundColor: '#0038A8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  manualIndText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  manualTextInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '800',
    fontFamily: 'monospace',
    letterSpacing: 1.5,
  },
  samplePlatesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  samplePlatesLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
    width: '100%',
  },
  sampleChip: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  sampleChipText: {
    color: '#334155',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  manualSubmitBtn: {
    backgroundColor: '#15803D',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  manualSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
});
