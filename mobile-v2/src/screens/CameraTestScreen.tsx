import React, { useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import {
  Camera,
  type CameraRef,
  useCameraDevice,
  useCameraPermission,
  usePreviewOutput,
  usePhotoOutput,
} from 'react-native-vision-camera';
import { ENVIRONMENT } from '../config/environment';
import { computeSha256 } from '../utils/crypto';

export function CameraTestScreen() {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const previewOutput = usePreviewOutput();
  const photoOutput = usePhotoOutput();
  const cameraRef = useRef<CameraRef>(null);

  const [previewState, setPreviewState] = useState<string>('INITIALIZING');
  const [cameraActive, setCameraActive] = useState<boolean>(true);
  const [lastError, setLastError] = useState<string | null>(null);

  // Network & Health
  const [backendHealth, setBackendHealth] = useState<string>('Not tested');
  const [isHealthChecking, setIsHealthChecking] = useState<boolean>(false);

  // Capture & OCR states
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [photoInfo, setPhotoInfo] = useState<{
    path: string;
    width: number;
    height: number;
    byteSize: number;
    sha256: string;
  } | null>(null);
  const [ocrResult, setOcrResult] = useState<any>(null);

  const checkBackendHealth = async () => {
    setIsHealthChecking(true);
    setBackendHealth('Testing...');
    try {
      const url = `${ENVIRONMENT.BACKEND_BASE_URL}${ENVIRONMENT.HEALTH_ENDPOINT}`;
      const res = await fetch(url);
      const data = await res.json();
      setBackendHealth(`200 OK: ${JSON.stringify(data)}`);
    } catch (err: any) {
      setBackendHealth(`FAILED: ${err?.message || err}`);
    } finally {
      setIsHealthChecking(false);
    }
  };

  const handleCaptureAndOcr = async () => {
    setIsCapturing(true);
    setPhotoInfo(null);
    setOcrResult(null);
    setLastError(null);

    let capturedFilePath = '';

    try {
      console.log('[CameraTestScreen] Attempting photoOutput.capturePhotoToFile...');
      try {
        const photoFile = await photoOutput.capturePhotoToFile(
          { flashMode: 'off', enableShutterSound: false },
          {},
        );
        capturedFilePath = photoFile.filePath;
        console.log('[CameraTestScreen] photoOutput capture success:', capturedFilePath);
      } catch (primaryErr: any) {
        console.warn('[CameraTestScreen] photoOutput capture failed, falling back to cameraRef.takePhoto:', primaryErr);
        if (cameraRef.current) {
          const photo = await (cameraRef.current as any).takePhoto({
            flash: 'off',
            enableShutterSound: false,
          });
          capturedFilePath = photo.path;
          console.log('[CameraTestScreen] cameraRef fallback takePhoto success:', capturedFilePath);
        } else {
          throw primaryErr;
        }
      }

      const photoUri = capturedFilePath.startsWith('file://')
        ? capturedFilePath
        : `file://${capturedFilePath}`;

      // Read raw JPEG bytes via fetch file protocol
      const fileRes = await fetch(photoUri);
      const arrayBuf = await fileRes.arrayBuffer();

      const byteSize = arrayBuf.byteLength;
      const sha256 = computeSha256(arrayBuf);

      console.log('[CameraTestScreen] Photo metrics:', {
        uri: photoUri,
        byteSize,
        sha256,
      });

      if (byteSize === 0) {
        throw new Error('Captured JPEG is empty (0 bytes)!');
      }

      setPhotoInfo({
        path: capturedFilePath,
        width: 1920,
        height: 1080,
        byteSize,
        sha256,
      });

      // Send to FastAPI Backend
      console.log('[CameraTestScreen] Uploading JPEG to OCR endpoint...');
      const formData = new FormData();
      formData.append('file', {
        uri: photoUri,
        name: 'plate_capture.jpg',
        type: 'image/jpeg',
      } as any);

      const ocrUrl = `${ENVIRONMENT.BACKEND_BASE_URL}${ENVIRONMENT.OCR_EXTRACT_ENDPOINT}`;
      const ocrRes = await fetch(ocrUrl, {
        method: 'POST',
        headers: {
          'Idempotency-Key': `mobile-v2-${Date.now()}`,
        },
        body: formData,
      });

      if (!ocrRes.ok) {
        const errorText = await ocrRes.text();
        throw new Error(`HTTP ${ocrRes.status}: ${errorText}`);
      }

      const ocrData = await ocrRes.json();
      console.log('[CameraTestScreen] OCR response received:', ocrData);
      setOcrResult(ocrData);
    } catch (err: any) {
      console.error('[CameraTestScreen] Capture/OCR error:', err);
      setLastError(`Capture/OCR Error: ${err?.message || err}`);
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Camera Preview Frame */}
      <View style={styles.cameraContainer}>
        {device != null && hasPermission ? (
          <Camera
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            device={device}
            outputs={[previewOutput, photoOutput]}
            implementationMode="compatible"
            resizeMode="cover"
            isActive={cameraActive}
            onPreviewStarted={() => {
              console.log('[CameraTestScreen] Preview started');
              setPreviewState('STARTED');
            }}
            onPreviewStopped={() => {
              console.log('[CameraTestScreen] Preview stopped');
              setPreviewState('STOPPED');
            }}
            onError={(err: any) => {
              console.error('[VisionCamera Error]', err);
              setLastError(`Camera error: ${err?.message || err}`);
            }}
          />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>
              {!hasPermission
                ? 'Camera Permission Required'
                : 'No Rear Camera Device Found'}
            </Text>
            {!hasPermission && (
              <TouchableOpacity
                style={styles.permButton}
                onPress={requestPermission}>
                <Text style={styles.permButtonText}>GRANT PERMISSION</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Scan Frame Overlay */}
        <View style={styles.overlayFrame} pointerEvents="none">
          <View style={styles.targetBox}>
            <Text style={styles.targetLabel}>ALIGN LICENSE PLATE HERE</Text>
          </View>
        </View>
      </View>

      {/* Control & Debug Panel */}
      <ScrollView style={styles.panel} contentContainerStyle={styles.panelContent}>
        <Text style={styles.header}>CNG Mobile v2 - Live Verification Slice</Text>

        {/* Debug Status Metrics */}
        <View style={styles.debugCard}>
          <Text style={styles.cardTitle}>📱 Diagnostic Status</Text>
          <Text style={styles.debugText}>Permission: {String(hasPermission)}</Text>
          <Text style={styles.debugText}>
            Device: {device ? `${device.name} (${device.position})` : 'NULL'}
          </Text>
          <Text style={styles.debugText}>
            Camera Active: {cameraActive ? 'TRUE' : 'FALSE'}
          </Text>
          <Text style={styles.debugText}>Preview State: {previewState}</Text>
          <Text style={styles.debugText}>
            Preview Mode: compatible (TextureView)
          </Text>
          {lastError && (
            <Text style={styles.errorText}>⚠️ Error: {lastError}</Text>
          )}
        </View>

        {/* Health Check Controls */}
        <View style={styles.debugCard}>
          <View style={styles.row}>
            <Text style={styles.cardTitle}>🌐 FastAPI Backend Health</Text>
            <TouchableOpacity
              style={styles.healthButton}
              onPress={checkBackendHealth}
              disabled={isHealthChecking}>
              <Text style={styles.healthButtonText}>
                {isHealthChecking ? 'Testing...' : 'Test /health'}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.debugText}>Status: {backendHealth}</Text>
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={[styles.captureButton, isCapturing && styles.disabledButton]}
          onPress={handleCaptureAndOcr}
          disabled={isCapturing || !hasPermission || device == null}>
          {isCapturing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.captureButtonText}>📷 CAPTURE & EXTRACT OCR</Text>
          )}
        </TouchableOpacity>

        {/* Captured Image Metadata Card */}
        {photoInfo && (
          <View style={styles.resultCard}>
            <Text style={styles.cardTitle}>🖼️ Captured JPEG Metadata</Text>
            <Text style={styles.resultText}>File: {photoInfo.path}</Text>
            <Text style={styles.resultText}>
              Bytes: {photoInfo.byteSize} bytes
            </Text>
            <Text style={styles.resultText}>SHA-256: {photoInfo.sha256}</Text>
          </View>
        )}

        {/* OCR Result Output Card */}
        {ocrResult && (
          <View style={styles.ocrCard}>
            <Text style={styles.cardTitle}>⚡ OCR Response Output</Text>
            <Text style={styles.ocrHighlight}>
              Registration:{' '}
              {ocrResult.normalized_registration || 'NO PLATE DETECTED'}
            </Text>
            <Text style={styles.ocrText}>Raw Text: {ocrResult.raw_text}</Text>
            <Text style={styles.ocrText}>
              Confidence: {(ocrResult.confidence * 100).toFixed(1)}%
            </Text>
            <Text style={styles.ocrText}>
              Engine: {ocrResult.engine_name}
            </Text>
            <Text style={styles.ocrText}>
              Manual Review: {ocrResult.manual_review_required ? 'YES' : 'NO'}
            </Text>

            {ocrResult.verification_result && (
              <View style={styles.verificationBox}>
                <Text style={styles.verificationTitle}>
                  Verification Status:{' '}
                  {ocrResult.verification_result.status}
                </Text>
                <Text style={styles.ocrText}>
                  Compliance ID:{' '}
                  {ocrResult.verification_result.compliance_id || 'N/A'}
                </Text>
                <Text style={styles.ocrText}>
                  Expires:{' '}
                  {ocrResult.verification_result.expires_at || 'N/A'}
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  cameraContainer: {
    height: 320,
    width: '100%',
    backgroundColor: '#000',
    position: 'relative',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 16,
  },
  placeholderText: {
    color: '#94a3b8',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 12,
  },
  permButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
  },
  permButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  overlayFrame: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  targetBox: {
    width: '80%',
    height: 120,
    borderWidth: 2,
    borderColor: '#38bdf8',
    borderRadius: 8,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
  },
  targetLabel: {
    color: '#38bdf8',
    fontWeight: 'bold',
    fontSize: 12,
    letterSpacing: 1,
  },
  panel: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  panelContent: {
    padding: 16,
  },
  header: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  debugCard: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardTitle: {
    color: '#38bdf8',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  debugText: {
    color: '#cbd5e1',
    fontSize: 12,
    marginBottom: 2,
  },
  errorText: {
    color: '#f87171',
    fontSize: 12,
    marginTop: 4,
    fontWeight: 'bold',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  healthButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  healthButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  captureButton: {
    backgroundColor: '#16a34a',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  disabledButton: {
    backgroundColor: '#475569',
  },
  captureButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultCard: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  resultText: {
    color: '#e2e8f0',
    fontSize: 12,
    marginBottom: 2,
    fontFamily: 'monospace',
  },
  ocrCard: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 14,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#22c55e',
  },
  ocrHighlight: {
    color: '#4ade80',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  ocrText: {
    color: '#e2e8f0',
    fontSize: 13,
    marginBottom: 3,
  },
  verificationBox: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  verificationTitle: {
    color: '#f59e0b',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
});
