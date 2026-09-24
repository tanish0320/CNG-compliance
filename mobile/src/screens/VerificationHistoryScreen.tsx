import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { StatusBadge } from "../components/StatusBadge";
import type { VerificationResult } from "../domain/ComplianceStatus";
import { Colors } from "../theme/Theme";

interface VerificationHistoryScreenProps {
  verifications: VerificationResult[];
  onSelectVerification: (result: VerificationResult) => void;
  onBack: () => void;
}

export const VerificationHistoryScreen: React.FC<VerificationHistoryScreenProps> = ({
  verifications,
  onSelectVerification,
  onBack,
}) => {
  const [filterQuery, setFilterQuery] = useState("");

  const filteredVerifications = verifications.filter((item) =>
    item.vehicle_registration.toUpperCase().includes(filterQuery.toUpperCase())
  );

  return (
    <View style={styles.container}>
      {/* Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← BACK</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>VERIFICATION HISTORY</Text>
      </View>

      {/* Search Input Filter */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          value={filterQuery}
          onChangeText={setFilterQuery}
          placeholder="Filter by plate number (e.g. DL01)..."
          placeholderTextColor={Colors.textMuted}
          autoCapitalize="characters"
        />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {filteredVerifications.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No matching verification history</Text>
            <Text style={styles.emptySubtitle}>
              Completed scans will appear here automatically.
            </Text>
          </View>
        ) : (
          filteredVerifications.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.card}
              onPress={() => onSelectVerification(item)}
              activeOpacity={0.7}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.plateText}>{item.vehicle_registration}</Text>
                <StatusBadge status={item.status} />
              </View>

              <View style={styles.metaRow}>
                <Text style={styles.metaText}>Certificate: {item.compliance_id || "None"}</Text>
                <Text style={styles.metaText}>Rule: {item.rule_version}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  backButton: {
    paddingRight: 16,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.primary,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: Colors.textPrimary,
    letterSpacing: 0.8,
  },
  searchContainer: {
    padding: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  searchInput: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  scrollContent: {
    padding: 16,
  },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 32,
    alignItems: "center",
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  plateText: {
    fontSize: 18,
    fontWeight: "900",
    color: Colors.textPrimary,
    letterSpacing: 1.5,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.background,
  },
  metaText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
});
