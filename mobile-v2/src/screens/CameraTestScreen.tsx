import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  NativeModules,
  Alert,
} from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { ComplianceResultView } from '../components/ComplianceResultView';
import { OcrExtractResponse, ImageInput } from '../types/compliance';

const { GalleryPicker } = NativeModules;

// Host workstation LAN IP address reachable by Samsung S24
const API_BASE_URL = 'http://192.168.68.60:8000';

export function CameraTestScreen() {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const cameraRef = useRef<Camera>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMsg, setLoadingMsg] = useState<string>('Processing...');
  const [result, setResult] = useState<OcrExtractResponse | null>(null);
  const [imageInput, setImageInput] = useState<ImageInput | null>(null);

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission]);

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
    
    // Explicitly target local LAN / adb reversed endpoint
    const targetUrl = `${API_BASE_URL}/api/v1/ocr/extract`;
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

      // Safe, non-secret response logging immediately after request
      console.log('[SAFE NETWORK DIAGNOSTIC] POST /api/v1/ocr/extract Response Data:', {
        http_status: response.status,
        response_json_keys: Object.keys(data),
        normalized_registration: data.normalized_registration,
        ocr_confidence: data.confidence,
        verification_status: data.verification_result?.status || (data.manual_review_required ? 'MANUAL_REVIEW' : 'UNKNOWN'),
        compliance_id: data.verification_result?.compliance_id || null,
        expires_at: data.verification_result?.expires_at || null,
      });

      setResult(data);
    } catch (err: any) {
      console.error('[NETWORK DIAGNOSTIC] Fetch exception caught:', err.message, err);
      Alert.alert(
        'Network Connection Failure',
        `Could not connect to FastAPI server at ${targetUrl}.\n\nError: ${err.message || 'Network request failed'}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmManualReview = async (confirmedRegistration: string) => {
    const targetUrl = `${API_BASE_URL}/api/v1/verifications/confirm-manual-review`;
    console.log(`[NETWORK DIAGNOSTIC] Submitting confirmed registration to: ${targetUrl}`);

    const payload = {
      confirmed_registration: confirmedRegistration,
      original_raw_text: result?.raw_text || null,
      original_confidence: result?.confidence || null,
      actor: 's24_operator',
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
    }
  };

  const handleCapture = async () => {
    if (!cameraRef.current) return;
    try {
      // 1. Take photo FIRST while VisionCamera session is active
      const photo = await cameraRef.current.takePhoto({
        flash: 'off',
      });
      // 2. Process captured photo (sets isLoading=true and sends to OCR backend)
      await processImageUri(photo.path);
    } catch (err: any) {
      setIsLoading(false);
      Alert.alert('Capture Failed', err.message || 'Could not take photo');
    }
  };

  const handleGalleryPick = async () => {
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
        <Text style={styles.text}>Camera Permission Required</Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>GRANT PERMISSION</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (device == null) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>No rear camera device found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={result == null}
        photo={true}
      />

      {/* Top Banner Overlay */}
      <SafeAreaView style={styles.overlayTop} pointerEvents="none">
        <View style={styles.badge}>
          <Text style={styles.badgeText}>🚗 CNG COMPLIANCE MOBILE</Text>
          <Text style={styles.subText}>Point camera at Indian registration plate</Text>
        </View>
      </SafeAreaView>

      {/* Loading Modal */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#38bdf8" />
          <Text style={styles.loadingText}>{loadingMsg}</Text>
        </View>
      )}

      {/* Compliance Result Screen Overlay */}
      {result && (
        <ComplianceResultView
          ocrData={result}
          imageInput={imageInput}
          onReset={() => setResult(null)}
          onSelectGallery={handleGalleryPick}
          onConfirmManualReview={handleConfirmManualReview}
        />
      )}

      {/* Bottom Action Controls */}
      {!result && !isLoading && (
        <SafeAreaView style={styles.controlsBottom}>
          <TouchableOpacity style={styles.galleryBtn} onPress={handleGalleryPick}>
            <Text style={styles.galleryBtnText}>🖼️ GALLERY</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.captureBtn} onPress={handleCapture}>
            <View style={styles.captureInner} />
          </TouchableOpacity>
        </SafeAreaView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  text: {
    color: '#ffffff',
    fontSize: 16,
    marginBottom: 12,
  },
  btn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  btnText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  overlayTop: {
    position: 'absolute',
    top: 20,
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  badge: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#38bdf8',
  },
  badgeText: {
    color: '#38bdf8',
    fontWeight: 'bold',
    fontSize: 14,
  },
  subText: {
    color: '#e2e8f0',
    fontSize: 12,
    marginTop: 4,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#ffffff',
    marginTop: 14,
    fontSize: 15,
    fontWeight: '600',
  },
  controlsBottom: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  captureBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  captureInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ffffff',
  },
  galleryBtn: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#38bdf8',
  },
  galleryBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  resultContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0f172a',
    zIndex: 100,
  },
  resultContent: {
    padding: 24,
    alignItems: 'center',
    paddingTop: 60,
  },
  resultTitle: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 16,
  },
  statusBadge: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 20,
  },
  statusValid: {
    backgroundColor: '#16a34a',
  },
  statusExpired: {
    backgroundColor: '#dc2626',
  },
  statusReview: {
    backgroundColor: '#ca8a04',
  },
  statusText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 20,
    letterSpacing: 1,
  },
  card: {
    backgroundColor: '#1e293b',
    width: '100%',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  label: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginTop: 10,
  },
  valueReg: {
    color: '#38bdf8',
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    marginVertical: 4,
  },
  value: {
    color: '#f8fafc',
    fontSize: 16,
    marginTop: 2,
  },
  warningBox: {
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
    borderWidth: 1,
    borderColor: '#eab308',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  warningText: {
    color: '#fef08a',
    fontSize: 13,
    lineHeight: 18,
  },
  dismissBtn: {
    backgroundColor: '#2563eb',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  dismissBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
