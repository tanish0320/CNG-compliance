import React, { useRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import {
  Camera,
  type CameraRef,
  useCameraDevice,
  useCameraPermission,
  usePhotoOutput,
} from "react-native-vision-camera";
import { launchImageLibrary } from "react-native-image-picker";
import { CameraOverlay } from "../components/CameraOverlay";
import { Colors } from "../theme/Theme";

interface CameraScreenProps {
  onCaptureImage: (imageBlob: Blob | { uri: string; type: string; name: string }) => void;
  onBack: () => void;
}

export const CameraScreen: React.FC<CameraScreenProps> = ({ onCaptureImage, onBack }) => {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice("back");
  const photoOutput = usePhotoOutput();
  const cameraRef = useRef<CameraRef>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  console.log("[CameraScreen] Permission state:", hasPermission);
  console.log("[CameraScreen] Selected camera device:", device ? `${device.id} (${device.name})` : "NONE");

  if (!hasPermission) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionIcon}>📷</Text>
        <Text style={styles.permissionTitle}>CAMERA PERMISSION REQUIRED</Text>
        <Text style={styles.permissionSubtitle}>
          Camera access is required to scan vehicle registration plates live at the station.
        </Text>
        <TouchableOpacity
          style={styles.retryPermissionButton}
          onPress={requestPermission}
        >
          <Text style={styles.retryPermissionText}>ENABLE CAMERA PERMISSION</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backLink} onPress={onBack}>
          <Text style={styles.backLinkText}>CANCEL</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionIcon}>⚠️</Text>
        <Text style={styles.permissionTitle}>NO CAMERA DEVICE AVAILABLE</Text>
        <Text style={styles.permissionSubtitle}>
          No rear camera device detected on this hardware.
        </Text>
        <TouchableOpacity style={styles.backLink} onPress={onBack}>
          <Text style={styles.backLinkText}>GO BACK</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleCapture = async () => {
    setIsProcessing(true);
    try {
      console.log("[CameraScreen] Embedded frame capture started via capturePhotoToFile...");
      const photoFile = await photoOutput.capturePhotoToFile(
        { flashMode: "off", enableShutterSound: false },
        {}
      );
      console.log("[CameraScreen] Embedded frame captured successfully to file:", photoFile.filePath);
      const uri = photoFile.filePath.startsWith("file://")
        ? photoFile.filePath
        : `file://${photoFile.filePath}`;
      onCaptureImage({
        uri,
        type: "image/jpeg",
        name: "captured_frame.jpg",
      });
    } catch (err) {
      console.error("[CameraScreen] Embedded capture failed, falling back to gallery pick:", err);
      handlePickFromGallery();
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePickFromGallery = async () => {
    setIsProcessing(true);
    launchImageLibrary(
      { mediaType: "photo", quality: 0.8 },
      (response) => {
        setIsProcessing(false);
        if (response.didCancel || response.errorCode || !response.assets || response.assets.length === 0) {
          return;
        }
        const asset = response.assets[0];
        if (asset.uri) {
          onCaptureImage({
            uri: asset.uri,
            type: asset.type || "image/jpeg",
            name: asset.fileName || "plate.jpg",
          });
        }
      }
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.cameraView}>
        {/* Real Live Embedded Camera Feed */}
        <Camera
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          device={device}
          outputs={[photoOutput]}
          isActive={true}
        />

        {/* Top Header Controls */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>← BACK</Text>
          </TouchableOpacity>
          <Text style={styles.topTitle}>PLATE SCANNER</Text>
        </View>

        {/* Plate Scanner Framing Overlay & Capture Button */}
        <CameraOverlay
          onCapture={handleCapture}
          isProcessing={isProcessing}
          guidanceText="ALIGN REGISTRATION PLATE\nKeep plate centered inside frame"
        />

        {/* Secondary Gallery Picker Option */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={styles.galleryButton}
            onPress={handlePickFromGallery}
            disabled={isProcessing}
          >
            <Text style={styles.galleryButtonText}>🖼 SELECT FROM GALLERY</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  cameraView: {
    flex: 1,
    position: "relative",
  },
  topBar: {
    position: "absolute",
    top: 48,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 10,
  },
  backButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 8,
  },
  backButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 12,
  },
  topTitle: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
    letterSpacing: 1,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  permissionIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: Colors.textPrimary,
    textAlign: "center",
  },
  permissionSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
    marginBottom: 24,
  },
  retryPermissionButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
  },
  retryPermissionText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
  },
  backLink: {
    marginTop: 16,
    padding: 10,
  },
  backLinkText: {
    color: Colors.textSecondary,
    fontWeight: "700",
    fontSize: 14,
  },
  actionContainer: {
    position: "absolute",
    bottom: 120,
    left: 20,
    right: 20,
    alignItems: "center",
    zIndex: 10,
  },
  galleryButton: {
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  galleryButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
});
