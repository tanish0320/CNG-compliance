import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { StatusBadge } from "../components/StatusBadge";
import type { VerificationResult } from "../domain/ComplianceStatus";
import { Colors, StatusTheme } from "../theme/Theme";

interface ComplianceResultScreenProps {
  result: VerificationResult;
  onDone: () => void;
  onRetry?: () => void;
}

export const ComplianceResultScreen: React.FC<ComplianceResultScreenProps> = ({
  result,
  onDone,
  onRetry,
}) => {
  const theme = StatusTheme[result.status] || StatusTheme.NOT_FOUND;

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      {/* Header Result Card */}
      <View style={[styles.statusCard, { borderColor: theme.textColor }]}>
        <StatusBadge status={result.status} large />

        <Text style={styles.registrationText}>{result.vehicle_registration}</Text>

        <Text style={styles.descriptionText}>{theme.description}</Text>

        {/* Action Callout Box */}
        <View style={[styles.actionBox, { backgroundColor: theme.backgroundColor }]}>
          <Text style={[styles.actionTitle, { color: theme.textColor }]}>RECOMMENDED FIELD ACTION</Text>
          <Text style={styles.actionText}>{theme.recommendedAction}</Text>
        </View>
      </View>

      {/* Detail Metadata Card */}
      <View style={styles.detailsCard}>
        <Text style={styles.detailsTitle}>VERIFICATION DETAILS</Text>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Verification ID:</Text>
          <Text style={styles.detailValue} numberOfLines={1}>
            {result.id}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Compliance Certificate ID:</Text>
          <Text style={styles.detailValue}>{result.compliance_id || "N/A"}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Certificate Expiry Date:</Text>
          <Text style={styles.detailValue}>
            {result.expires_at
              ? new Date(result.expires_at).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })
              : "N/A"}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Authorized Data Source:</Text>
          <Text style={styles.detailValue} numberOfLines={1}>
            {result.source_reference || "Mock Compliance Provider"}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Classification Rule Version:</Text>
          <Text style={styles.detailValue}>{result.rule_version}</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        {onRetry ? (
          <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
            <Text style={styles.retryText}>RETRY</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity style={styles.doneButton} onPress={onDone} activeOpacity={0.8}>
          <Text style={styles.doneText}>DONE / SCAN NEXT</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    padding: 20,
    backgroundColor: Colors.background,
    flexGrow: 1,
    paddingTop: 48,
  },
  statusCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    borderWidth: 2,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  registrationText: {
    fontSize: 28,
    fontWeight: "900",
    color: Colors.textPrimary,
    letterSpacing: 2,
    marginVertical: 14,
  },
  descriptionText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  actionBox: {
    borderRadius: 12,
    padding: 16,
  },
  actionTitle: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  actionText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  detailsCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginBottom: 24,
  },
  detailsTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background,
  },
  detailLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  detailValue: {
    fontSize: 12,
    color: Colors.textPrimary,
    fontWeight: "700",
    maxWidth: "50%",
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
  },
  retryButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: "center",
  },
  retryText: {
    color: Colors.textSecondary,
    fontWeight: "800",
    fontSize: 14,
  },
  doneButton: {
    flex: 2,
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  doneText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
    letterSpacing: 0.8,
  },
});
