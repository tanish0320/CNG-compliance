import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  NativeModules,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import {
  Camera,
  type CameraRef,
  useCameraDevice,
  useCameraPermission,
  usePhotoOutput,
} from 'react-native-vision-camera';
import { ENVIRONMENT } from '../config/environment';
import { computeSha256 } from '../utils/crypto';

const { GalleryPicker } = NativeModules;

export interface ImageInput {
  uri: string;
  filename: string;
  mimeType: string;
  size: number;
  sha256: string;
  source: 'CAMERA' | 'GALLERY';
}

export function CameraTestScreen() {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const photoOutput = usePhotoOutput();
  const cameraRef = useRef<CameraRef>(null);

  // Camera & Layout State
  const [previewState, setPreviewState] = useState<string>('INITIALIZING');
  const [cameraActive, setCameraActive] = useState<boolean>(true);
  const [lastError, setLastError] = useState<string | null>(null);
  const [useTextureView, setUseTextureView] = useState<boolean>(false);
  const [showDebug, setShowDebug] = useState<boolean>(false);

  // Network & Health State
  const [healthStatusText, setHealthStatusText] = useState<string>('Not tested');
  const [healthHttpCode, setHealthHttpCode] = useState<string>('');
  const [healthResponseBody, setHealthResponseBody] = useState<string>('');
  const [healthUrlRequested, setHealthUrlRequested] = useState<string>('');
  const [isHealthChecking, setIsHealthChecking] = useState<boolean>(false);

  // Active Image & Processing State
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [activeImage, setActiveImage] = useState<ImageInput | null>(null);

  // OCR Diagnostic & Result State
  const [ocrStatusText, setOcrStatusText] = useState<string>('');
  const [ocrHttpCode, setOcrHttpCode] = useState<string>('');
  const [ocrResponseBody, setOcrResponseBody] = useState<string>('');
  const [ocrUrlRequested, setOcrUrlRequested] = useState<string>('');
  const [ocrErrorDetail, setOcrErrorDetail] = useState<string>('');
  const [ocrResultData, setOcrResultData] = useState<any>(null);

  const candidateBaseUrls = [
    ENVIRONMENT.BACKEND_BASE_URL,
    'http://192.168.68.63:8000',
    'http://127.0.0.1:8000',
    'http://localhost:8000',
  ];

  // Auto-request permission on mount if needed
  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission]);

  const checkBackendHealth = async () => {
    console.log('[CameraTestScreen] Health check triggered');
    setIsHealthChecking(true);
    setHealthStatusText('REQUEST STARTED');
    setHealthHttpCode('');
    setHealthResponseBody('');
    setHealthUrlRequested('');

    let lastErr: any = null;
    for (const baseUrl of candidateBaseUrls) {
      const url = `${baseUrl}${ENVIRONMENT.HEALTH_ENDPOINT}`;
      setHealthUrlRequested(url);
      try {
        const res = await fetch(url);
        setHealthHttpCode(String(res.status));
        const bodyText = await res.text();
        setHealthResponseBody(bodyText);

        if (res.ok) {
          setHealthStatusText('Connected');
          setIsHealthChecking(false);
          return;
        } else {
          setHealthStatusText(`HTTP Error ${res.status}`);
        }
      } catch (err: any) {
        lastErr = err;
      }
    }
    setHealthStatusText('REQUEST FAILED');
    setHealthResponseBody(`Error: ${lastErr?.message || String(lastErr)}`);
    setIsHealthChecking(false);
  };

  useEffect(() => {
    checkBackendHealth();
  }, []);

  // Shared OCR Upload Pipeline
  const processOcrUpload = async (input: ImageInput) => {
    console.log('[CameraTestScreen] Processing OCR for ImageInput:', input);
    setIsProcessing(true);
    setActiveImage(input);
    setOcrResultData(null);
    setOcrStatusText('UPLOADING TO BACKEND...');
    setOcrHttpCode('');
    setOcrResponseBody('');
    setOcrErrorDetail('');
    setLastError(null);

    let lastOcrErr: any = null;
    let ocrSuccess = false;

    for (const baseUrl of candidateBaseUrls) {
      const targetOcrUrl = `${baseUrl}${ENVIRONMENT.OCR_EXTRACT_ENDPOINT}`;
      setOcrUrlRequested(targetOcrUrl);

      const formData = new FormData();
      formData.append('file', {
        uri: input.uri,
        name: input.filename,
        type: input.mimeType,
      } as any);

      try {
        const ocrRes = await fetch(targetOcrUrl, {
          method: 'POST',
          headers: {
            'Idempotency-Key': `mobile-v2-${Date.now()}`,
          },
          body: formData,
        });

        setOcrHttpCode(String(ocrRes.status));
        const responseText = await ocrRes.text();
        setOcrResponseBody(responseText);

        if (!ocrRes.ok) {
          setOcrStatusText(`REQUEST FAILED (HTTP ${ocrRes.status})`);
          throw new Error(`HTTP ${ocrRes.status}: ${responseText}`);
        }

        setOcrStatusText('REQUEST COMPLETED (200 OK)');
        const ocrData = JSON.parse(responseText);
        setOcrResultData(ocrData);
        ocrSuccess = true;
        break;
      } catch (err: any) {
        console.warn(`[CameraTestScreen] OCR request to ${targetOcrUrl} failed:`, err);
        lastOcrErr = err;
      }
    }

    if (!ocrSuccess && lastOcrErr) {
      setOcrStatusText('REQUEST FAILED');
      setOcrErrorDetail(`Error: ${lastOcrErr?.message || String(lastOcrErr)}`);
      setLastError(`OCR Error: ${lastOcrErr?.message || lastOcrErr}`);
    }

    setIsProcessing(false);
  };

  // Option A: Live Camera Capture
  const handleCameraCapture = async () => {
    if (!photoOutput || !cameraRef.current) {
      setLastError('Camera hardware not ready for capture');
      return;
    }
    try {
      setIsProcessing(true);
      console.log('[CameraTestScreen] Capturing photo to file...');
      const photoFile = await photoOutput.capturePhotoToFile(
        { flashMode: 'off', enableShutterSound: false },
        {},
      );
      const filePath = photoFile.filePath;
      const photoUri = filePath.startsWith('file://') ? filePath : `file://${filePath}`;

      // Read binary bytes for SHA-256 calculation
      const fileRes = await fetch(photoUri);
      const arrayBuf = await fileRes.arrayBuffer();
      const size = arrayBuf.byteLength;
      const sha256 = computeSha256(arrayBuf);

      if (size === 0) {
        throw new Error('Captured JPEG file is empty (0 bytes)');
      }

      const input: ImageInput = {
        uri: photoUri,
        filename: 'plate_camera_capture.jpg',
        mimeType: 'image/jpeg',
        size,
        sha256,
        source: 'CAMERA',
      };

      await processOcrUpload(input);
    } catch (err: any) {
      console.error('[CameraCapture Error]', err);
      setLastError(`Camera Capture Error: ${err?.message || err}`);
      setIsProcessing(false);
    }
  };

  // Option B: Select from Gallery
  const handleGallerySelect = async () => {
    try {
      console.log('[GalleryPicker] Invoking NativeModules.GalleryPicker.openGallery()...');
      if (!GalleryPicker || !GalleryPicker.openGallery) {
        throw new Error('Native GalleryPicker module is not available');
      }

      const uri = await GalleryPicker.openGallery();

      if (!uri) {
        console.log('[GalleryPicker] User cancelled gallery selection');
        return;
      }

      setIsProcessing(true);
      const filename = `gallery_image_${Date.now()}.jpg`;
      const mimeType = 'image/jpeg';

      // Read file binary to verify non-zero size & calculate SHA-256
      const fileRes = await fetch(uri);
      const arrayBuf = await fileRes.arrayBuffer();
      const size = arrayBuf.byteLength;
      const sha256 = computeSha256(arrayBuf);

      if (size === 0) {
        throw new Error('Selected gallery image is empty (0 bytes)');
      }

      const input: ImageInput = {
        uri,
        filename,
        mimeType,
        size,
        sha256,
        source: 'GALLERY',
      };

      await processOcrUpload(input);
    } catch (err: any) {
      console.error('[GalleryPicker Error]', err);
      setLastError(`Gallery Error: ${err?.message || err}`);
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* 1. Live Camera Preview Layer (Fills Background) */}
      {device != null && hasPermission ? (
        <Camera
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          device={device}
          outputs={[photoOutput]}
          implementationMode={useTextureView ? 'compatible' : 'performance'}
          resizeMode="cover"
          isActive={cameraActive}
          onStarted={() => setPreviewState('STARTED')}
          onPreviewStarted={() => setPreviewState('STARTED')}
          onPreviewStopped={() => setPreviewState('STOPPED')}
          onError={(err: any) => setLastError(`Camera: ${err?.message || err}`)}
        />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>
            {!hasPermission ? 'Camera Permission Required' : 'No Rear Camera Device Found'}
          </Text>
          {!hasPermission && (
            <TouchableOpacity style={styles.permButton} onPress={requestPermission}>
              <Text style={styles.permButtonText}>GRANT PERMISSION</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* 2. Transparent Scanner UI Overlay Layer */}
      <SafeAreaView style={styles.overlayContainer} pointerEvents="box-none">
        {/* Top Header Bar */}
        <View style={styles.topHeader}>
          <Text style={styles.headerTitle}>CNG PLATE SCANNER</Text>
          <TouchableOpacity
            style={styles.debugToggle}
            onPress={() => setShowDebug(!showDebug)}>
            <Text style={styles.debugToggleText}>
              {showDebug ? 'HIDE DIAGNOSTICS' : '🐞 DIAGNOSTICS'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Collapsible Debug Panel */}
        {showDebug && (
          <ScrollView style={styles.debugScroll} contentContainerStyle={styles.debugScrollContent}>
            <View style={styles.debugCard}>
              <Text style={styles.cardTitle}>📱 Diagnostics</Text>
              <Text style={styles.debugText}>Permission: {String(hasPermission)}</Text>
              <Text style={styles.debugText}>Device: {device ? device.name : 'NULL'}</Text>
              <Text style={styles.debugText}>
                Preview State:{' '}
                <Text style={previewState === 'STARTED' ? styles.successText : styles.warnText}>
                  {previewState}
                </Text>
              </Text>
              <Text style={styles.debugText}>
                Render Mode: {useTextureView ? 'TextureView (compatible)' : 'SurfaceView (performance)'}
              </Text>
              <TouchableOpacity
                style={styles.modeSwitchBtn}
                onPress={() => setUseTextureView(!useTextureView)}>
                <Text style={styles.modeSwitchText}>
                  SWITCH TO {useTextureView ? 'SURFACEVIEW' : 'TEXTUREVIEW'}
                </Text>
              </TouchableOpacity>
              {lastError && <Text style={styles.errorText}>⚠️ {lastError}</Text>}
            </View>

            <View style={styles.debugCard}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardTitle}>🌐 FastAPI Backend</Text>
                <TouchableOpacity style={styles.smallBtn} onPress={checkBackendHealth}>
                  <Text style={styles.smallBtnText}>HEALTH CHECK</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.debugText}>URL: {healthUrlRequested}</Text>
              <Text style={styles.debugText}>Status: {healthStatusText}</Text>
              {healthHttpCode !== '' && <Text style={styles.debugText}>HTTP: {healthHttpCode}</Text>}
            </View>
          </ScrollView>
        )}

        {/* Center License Plate Alignment Frame */}
        <View style={styles.centerViewport} pointerEvents="none">
          <View style={styles.alignmentFrame}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
            <Text style={styles.alignmentText}>ALIGN LICENSE PLATE HERE</Text>
          </View>
        </View>

        {/* OCR Result Preview Card (Renders above controls if active) */}
        {ocrResultData && (
          <View style={styles.ocrResultPopup}>
            <View style={styles.popupHeader}>
              <Text style={styles.popupTitle}>
                {ocrResultData.verification_result?.vehicle_registration === 'NO_PLATE_DETECTED'
                  ? '⚠️ NO PLATE DETECTED'
                  : `✅ REGISTRATION: ${ocrResultData.normalized_registration || ocrResultData.raw_text}`}
              </Text>
              <TouchableOpacity onPress={() => setOcrResultData(null)}>
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.popupDetail}>
              Status: {ocrResultData.verification_result?.status || 'MANUAL_REVIEW'} | Confidence:{' '}
              {(ocrResultData.confidence * 100).toFixed(1)}%
            </Text>
            {activeImage && (
              <Text style={styles.popupDetailSub}>
                Source: {activeImage.source} | Size: {(activeImage.size / 1024).toFixed(0)} KB | SHA: {activeImage.sha256.slice(0, 10)}...
              </Text>
            )}
          </View>
        )}

        {/* Bottom Dual Input Controls */}
        <View style={styles.bottomControls}>
          <TouchableOpacity
            style={[styles.captureButton, isProcessing && styles.disabledButton]}
            onPress={handleCameraCapture}
            disabled={isProcessing || !hasPermission || device == null}>
            {isProcessing ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.captureButtonText}>📷 CAPTURE & EXTRACT OCR</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.galleryButton, isProcessing && styles.disabledButton]}
            onPress={handleGallerySelect}
            disabled={isProcessing}>
            <Text style={styles.galleryButtonText}>🖼️ SELECT FROM GALLERY</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    padding: 20,
  },
  placeholderText: {
    color: '#94a3b8',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  permButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  overlayContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
  },
  headerTitle: {
    color: '#38bdf8',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  debugToggle: {
    backgroundColor: 'rgba(51, 65, 85, 0.8)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  debugToggleText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: 'bold',
  },
  debugScroll: {
    maxHeight: 220,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    marginHorizontal: 12,
    marginTop: 6,
    borderRadius: 8,
  },
  debugScrollContent: {
    padding: 12,
  },
  debugCard: {
    marginBottom: 10,
  },
  cardTitle: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  debugText: {
    color: '#cbd5e1',
    fontSize: 12,
    marginBottom: 2,
  },
  successText: {
    color: '#22c55e',
    fontWeight: 'bold',
  },
  warnText: {
    color: '#eab308',
    fontWeight: 'bold',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
  },
  modeSwitchBtn: {
    backgroundColor: '#334155',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 4,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  modeSwitchText: {
    color: '#38bdf8',
    fontSize: 10,
    fontWeight: 'bold',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  smallBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  smallBtnText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  centerViewport: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alignmentFrame: {
    width: 300,
    height: 150,
    borderWidth: 2,
    borderColor: '#38bdf8',
    borderRadius: 12,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.05)',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderColor: '#38bdf8',
  },
  topLeft: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 10,
  },
  topRight: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 10,
  },
  bottomLeft: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 10,
  },
  bottomRight: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 10,
  },
  alignmentText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  ocrResultPopup: {
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#38bdf8',
  },
  popupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  popupTitle: {
    color: '#4ade80',
    fontSize: 14,
    fontWeight: 'bold',
  },
  closeText: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: 'bold',
    padding: 4,
  },
  popupDetail: {
    color: '#e2e8f0',
    fontSize: 12,
    marginTop: 2,
  },
  popupDetailSub: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  bottomControls: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    alignItems: 'stretch',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingTop: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  captureButton: {
    backgroundColor: '#16a34a',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
    elevation: 3,
  },
  captureButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 15,
    letterSpacing: 0.5,
  },
  galleryButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
  },
  galleryButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  disabledButton: {
    opacity: 0.5,
  },
});
