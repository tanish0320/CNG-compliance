import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { UserSession } from "../domain/ComplianceStatus";
import { Colors } from "../theme/Theme";

interface ProfileScreenProps {
  session: UserSession;
  onLogout: () => void;
  onBack: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ session, onLogout, onBack }) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← BACK</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>OPERATOR PROFILE</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarTextLarge}>{session.name.charAt(0)}</Text>
          </View>
          <Text style={styles.name}>{session.name}</Text>
          <Text style={styles.role}>{session.role.replace("_", " ")}</Text>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Operator Identity ID:</Text>
            <Text style={styles.infoValue}>{session.user_id}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Station Context:</Text>
            <Text style={styles.infoValue}>{session.station_name}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Station ID:</Text>
            <Text style={styles.infoValue}>{session.station_id}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>App Version:</Text>
            <Text style={styles.infoValue}>0.1.0 Enterprise</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
          <Text style={styles.logoutText}>SIGN OUT</Text>
        </TouchableOpacity>
      </View>
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
  content: {
    padding: 24,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginBottom: 24,
  },
  avatarLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarTextLarge: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "900",
  },
  name: {
    fontSize: 18,
    fontWeight: "900",
    color: Colors.textPrimary,
  },
  role: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.primary,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  divider: {
    width: "100%",
    height: 1,
    backgroundColor: Colors.surfaceBorder,
    marginVertical: 16,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingVertical: 6,
  },
  infoLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  infoValue: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  logoutButton: {
    backgroundColor: Colors.dangerBg,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  logoutText: {
    color: Colors.danger,
    fontWeight: "900",
    fontSize: 14,
    letterSpacing: 0.8,
  },
});
