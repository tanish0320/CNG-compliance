import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Colors } from "../theme/Theme";

interface OcrProcessingScreenProps {
  statusMessage?: string;
}

export const OcrProcessingScreen: React.FC<OcrProcessingScreenProps> = ({
  statusMessage = "Analyzing plate image...",
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <ActivityIndicator size="large" color={Colors.primary} style={styles.spinner} />
        <Text style={styles.title}>ANALYZING PLATE</Text>
        <Text style={styles.statusMessage}>{statusMessage}</Text>

        <View style={styles.stepsContainer}>
          <View style={styles.stepRow}>
            <Text style={styles.stepCheck}>✓</Text>
            <Text style={styles.stepText}>Image validated & preprocessed</Text>
          </View>
          <View style={styles.stepRow}>
            <ActivityIndicator size="small" color={Colors.primary} style={{ marginRight: 8 }} />
            <Text style={styles.stepTextActive}>Extracting registration candidate via OCR</Text>
          </View>
          <View style={styles.stepRow}>
            <Text style={styles.stepPending}>○</Text>
            <Text style={styles.stepTextPending}>Evaluating confidence threshold</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    width: "100%",
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  spinner: {
    marginBottom: 20,
    transform: [{ scale: 1.2 }],
  },
  title: {
    fontSize: 18,
    fontWeight: "900",
    color: Colors.textPrimary,
    letterSpacing: 1,
  },
  statusMessage: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 6,
    marginBottom: 24,
    fontWeight: "600",
  },
  stepsContainer: {
    width: "100%",
    gap: 12,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  stepCheck: {
    color: Colors.success,
    fontWeight: "900",
    fontSize: 14,
    marginRight: 10,
    width: 16,
  },
  stepText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  stepTextActive: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: "700",
  },
  stepPending: {
    color: Colors.textMuted,
    fontSize: 14,
    marginRight: 10,
    width: 16,
  },
  stepTextPending: {
    fontSize: 12,
    color: Colors.textMuted,
  },
});
