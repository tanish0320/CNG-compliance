import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { CameraOverlay } from "../components/CameraOverlay";
import { Colors } from "../theme/Theme";

interface CameraScreenProps {
  onCaptureImage: (imageBlob: Blob | { uri: string; type: string; name: string }) => void;
  onBack: () => void;
}

export const CameraScreen: React.FC<CameraScreenProps> = ({ onCaptureImage, onBack }) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [testPlate, setTestPlate] = useState("DL01AB1234");

  if (hasPermission === false) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionIcon}>📷</Text>
        <Text style={styles.permissionTitle}>CAMERA PERMISSION REQUIRED</Text>
        <Text style={styles.permissionSubtitle}>
          Camera access is required to scan vehicle registration plates at the station. Please enable
          camera permissions in system settings.
        </Text>
        <TouchableOpacity
          style={styles.retryPermissionButton}
          onPress={() => setHasPermission(true)}
        >
          <Text style={styles.retryPermissionText}>ENABLE CAMERA PERMISSION</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backLink} onPress={onBack}>
          <Text style={styles.backLinkText}>CANCEL</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleCapture = () => {
    setIsProcessing(true);

    // Create synthetic PNG image blob containing test plate text for OCR extraction backend
    const syntheticCanvas = `SYNTHETIC_PLATE_IMAGE_BYTES:${testPlate}`;
    const blob = new Blob([syntheticCanvas], { type: "image/png" });

    onCaptureImage(blob);
  };

  return (
    <View style={styles.container}>
      {/* Simulated Camera Viewfinder Container */}
      <View style={styles.cameraView}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>← BACK</Text>
          </TouchableOpacity>
          <Text style={styles.topTitle}>PLATE SCANNER</Text>
        </View>

        {/* Framing Overlay & Guidance */}
        <CameraOverlay
          onCapture={handleCapture}
          isProcessing={isProcessing}
          guidanceText="ALIGN REGISTRATION PLATE\nKeep plate centered inside frame"
        />

        {/* Field Test Target Selector */}
        <View style={styles.testSelectorContainer}>
          <Text style={styles.testSelectorLabel}>SIMULATED PLATE TARGET:</Text>
          <View style={styles.testSelectorRow}>
            {[
              "DL01AB1234",
              "DL01AB1234 LOW_CONF",
              "DL01EXPIRED",
              "DL01INVALID",
              "FAIL",
            ].map((target) => (
              <TouchableOpacity
                key={target}
                style={[
                  styles.testChip,
                  testPlate === target && styles.testChipActive,
                ]}
                onPress={() => setTestPlate(target)}
              >
                <Text
                  style={[
                    styles.testChipText,
                    testPlate === target && styles.testChipTextActive,
                  ]}
                >
                  {target.replace("DL01AB1234 ", "")}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
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
  testSelectorContainer: {
    position: "absolute",
    top: 100,
    left: 16,
    right: 16,
    zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 10,
    borderRadius: 12,
  },
  testSelectorLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: "800",
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  testSelectorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  testChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 6,
  },
  testChipActive: {
    backgroundColor: Colors.primary,
  },
  testChipText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  testChipTextActive: {
    fontWeight: "900",
  },
});
