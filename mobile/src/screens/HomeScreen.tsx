import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { StatusBadge } from "../components/StatusBadge";
import type { UserSession, VerificationResult } from "../domain/ComplianceStatus";
import { Colors } from "../theme/Theme";

interface HomeScreenProps {
  session: UserSession;
  recentVerifications: VerificationResult[];
  isConnected: boolean;
  onScanPress: () => void;
  onHistoryPress: () => void;
  onProfilePress: () => void;
  onSelectVerification: (result: VerificationResult) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  session,
  recentVerifications,
  isConnected,
  onScanPress,
  onHistoryPress,
  onProfilePress,
  onSelectVerification,
}) => {
  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.profileSection} onPress={onProfilePress}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{session.name.charAt(0)}</Text>
          </View>
          <View>
            <Text style={styles.operatorName}>{session.name}</Text>
            <Text style={styles.stationName}>{session.station_name}</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.connectionBadge}>
          <View
            style={[
              styles.connectionDot,
              { backgroundColor: isConnected ? Colors.success : Colors.danger },
            ]}
          />
          <Text style={styles.connectionText}>
            {isConnected ? "ONLINE" : "OFFLINE"}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Primary Action Button */}
        <TouchableOpacity
          style={styles.scanButton}
          onPress={onScanPress}
          activeOpacity={0.85}
        >
          <View style={styles.scanIconCircle}>
            <Text style={styles.scanIconText}>📷</Text>
          </View>
          <View style={styles.scanTextContainer}>
            <Text style={styles.scanButtonTitle}>SCAN VEHICLE PLATE</Text>
            <Text style={styles.scanButtonSubtitle}>Capture registration plate image for instant verification</Text>
          </View>
        </TouchableOpacity>

        {/* Dashboard Metrics Card */}
        <View style={styles.metricsContainer}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{recentVerifications.length}</Text>
            <Text style={styles.metricLabel}>Total Scans</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={[styles.metricValue, { color: Colors.success }]}>
              {recentVerifications.filter((v) => v.status === "VALID").length}
            </Text>
            <Text style={styles.metricLabel}>Valid CNG</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={[styles.metricValue, { color: Colors.danger }]}>
              {recentVerifications.filter((v) => v.status === "EXPIRED" || v.status === "INVALID").length}
            </Text>
            <Text style={styles.metricLabel}>Exceptions</Text>
          </View>
        </View>

        {/* Recent Activity Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>RECENT VERIFICATIONS</Text>
          <TouchableOpacity onPress={onHistoryPress}>
            <Text style={styles.viewAllText}>SEE ALL ({recentVerifications.length})</Text>
          </TouchableOpacity>
        </View>

        {recentVerifications.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🚗</Text>
            <Text style={styles.emptyTitle}>No Scans Yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap "SCAN VEHICLE PLATE" above to capture and verify your first CNG vehicle plate.
            </Text>
          </View>
        ) : (
          recentVerifications.slice(0, 5).map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.verificationRow}
              onPress={() => onSelectVerification(item)}
              activeOpacity={0.7}
            >
              <View>
                <Text style={styles.plateNumber}>{item.vehicle_registration}</Text>
                <Text style={styles.ruleVersion}>Rule: {item.rule_version}</Text>
              </View>
              <StatusBadge status={item.status} />
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
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  operatorName: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  stationName: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  connectionBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.background,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    gap: 6,
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  connectionText: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  scrollContent: {
    padding: 20,
  },
  scanButton: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: 20,
  },
  scanIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  scanIconText: {
    fontSize: 26,
  },
  scanTextContainer: {
    flex: 1,
  },
  scanButtonTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  scanButtonSubtitle: {
    color: "rgba(255, 255, 255, 0.85)",
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
    fontWeight: "500",
  },
  metricsContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  metricCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: "center",
  },
  metricValue: {
    fontSize: 22,
    fontWeight: "900",
    color: Colors.textPrimary,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textSecondary,
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.textSecondary,
    letterSpacing: 0.8,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.primary,
  },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
  verificationRow: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  plateNumber: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.textPrimary,
    letterSpacing: 1,
  },
  ruleVersion: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
});
