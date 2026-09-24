import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { RegistrationEditor } from "../components/RegistrationEditor";
import type { OcrExtractResponse } from "../domain/ComplianceStatus";
import { Colors } from "../theme/Theme";

interface OcrConfirmationScreenProps {
  ocrResult: OcrExtractResponse;
  onConfirm: (confirmedRegistration: string) => void;
  onRetake: () => void;
  isLoading?: boolean;
}

export const OcrConfirmationScreen: React.FC<OcrConfirmationScreenProps> = ({
  ocrResult,
  onConfirm,
  onRetake,
  isLoading = false,
}) => {
  const [isEditing, setIsEditing] = useState(ocrResult.manual_review_required);
  const confidencePercent = Math.round(ocrResult.confidence * 100);

  if (isEditing) {
    return (
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>HUMAN CONFIRMATION REQUIRED</Text>
          <Text style={styles.subtitle}>
            OCR confidence ({confidencePercent}%) was below threshold or ambiguous. Please confirm or
            edit the vehicle registration number.
          </Text>
        </View>

        <RegistrationEditor
          initialValue={ocrResult.normalized_registration || ocrResult.raw_text}
          onConfirm={onConfirm}
          onCancel={ocrResult.manual_review_required ? undefined : () => setIsEditing(false)}
          isLoading={isLoading}
        />

        <TouchableOpacity style={styles.retakeLink} onPress={onRetake} disabled={isLoading}>
          <Text style={styles.retakeLinkText}>📷 RETAKE PHOTO</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.title}>REGISTRATION DETECTED</Text>
        <Text style={styles.subtitle}>High-confidence plate OCR extraction complete</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.plateLabel}>DETECTED REGISTRATION NUMBER</Text>
        <Text style={styles.plateNumber}>{ocrResult.normalized_registration}</Text>

        <View style={styles.confidenceRow}>
          <Text style={styles.confidenceLabel}>OCR Confidence Score:</Text>
          <View style={styles.confidenceBadge}>
            <Text style={styles.confidenceValue}>{confidencePercent}%</Text>
          </View>
        </View>

        <Text style={styles.rawText}>Raw Text: "{ocrResult.raw_text}"</Text>

        <TouchableOpacity
          style={[styles.verifyButton, isLoading && styles.disabledButton]}
          onPress={() => onConfirm(ocrResult.normalized_registration)}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          <Text style={styles.verifyButtonText}>
            {isLoading ? "VERIFYING..." : "VERIFY VEHICLE COMPLIANCE"}
          </Text>
        </TouchableOpacity>

        <View style={styles.secondaryActionRow}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setIsEditing(true)}
            disabled={isLoading}
          >
            <Text style={styles.editButtonText}>✏ EDIT NUMBER</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.retakeButton}
            onPress={onRetake}
            disabled={isLoading}
          >
            <Text style={styles.retakeButtonText}>📷 RETAKE</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    padding: 24,
    backgroundColor: Colors.background,
    flexGrow: 1,
    justifyContent: "center",
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "900",
    color: Colors.textPrimary,
    letterSpacing: 0.8,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  plateLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.textMuted,
    letterSpacing: 1,
    textAlign: "center",
  },
  plateNumber: {
    fontSize: 32,
    fontWeight: "900",
    color: Colors.textPrimary,
    letterSpacing: 3,
    textAlign: "center",
    marginVertical: 12,
  },
  confidenceRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  confidenceLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  confidenceBadge: {
    backgroundColor: Colors.successBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  confidenceValue: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.success,
  },
  rawText: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: "center",
    marginBottom: 24,
    fontStyle: "italic",
  },
  verifyButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  verifyButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  secondaryActionRow: {
    flexDirection: "row",
    marginTop: 14,
    gap: 12,
  },
  editButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: "center",
  },
  editButtonText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
  },
  retakeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: "center",
  },
  retakeButtonText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
  },
  retakeLink: {
    marginTop: 20,
    alignSelf: "center",
    padding: 10,
  },
  retakeLinkText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: "800",
  },
});
