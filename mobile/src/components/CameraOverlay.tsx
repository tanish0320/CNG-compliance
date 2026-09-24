import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Colors } from "../theme/Theme";

interface CameraOverlayProps {
  onCapture: () => void;
  guidanceText?: string;
  isProcessing?: boolean;
}

export const CameraOverlay: React.FC<CameraOverlayProps> = ({
  onCapture,
  guidanceText = "ALIGN REGISTRATION PLATE\nKeep plate inside frame and avoid glare",
  isProcessing = false,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.topMask}>
        <Text style={styles.guidanceText}>{guidanceText}</Text>
      </View>

      <View style={styles.middleRow}>
        <View style={styles.sideMask} />
        <View style={styles.frame}>
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
        </View>
        <View style={styles.sideMask} />
      </View>

      <View style={styles.bottomMask}>
        <TouchableOpacity
          style={[styles.captureButton, isProcessing && styles.captureDisabled]}
          onPress={onCapture}
          disabled={isProcessing}
          activeOpacity={0.8}
        >
          <View style={styles.captureInner}>
            <Text style={styles.captureText}>{isProcessing ? "PROCESSING..." : "CAPTURE"}</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
  },
  topMask: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  guidanceText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    letterSpacing: 0.5,
    lineHeight: 20,
  },
  middleRow: {
    flexDirection: "row",
    height: 140,
  },
  sideMask: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  frame: {
    width: 280,
    height: 140,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.8)",
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 20,
    height: 20,
    borderColor: Colors.primary,
  },
  topLeft: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  topRight: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  bottomLeft: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  bottomRight: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  bottomMask: {
    flex: 1.5,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  captureDisabled: {
    opacity: 0.5,
  },
  captureInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  captureText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    textAlign: "center",
  },
});
