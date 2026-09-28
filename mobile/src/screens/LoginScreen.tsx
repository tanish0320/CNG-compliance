console.log("[STARTUP] LoginScreen.tsx module loaded");
import React, { useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import type { UserSession } from "../domain/ComplianceStatus";
import { Colors } from "../theme/Theme";

interface LoginScreenProps {
  onLoginSuccess: (session: UserSession) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  console.log("[STARTUP] LoginScreen rendering");

  const [operatorId, setOperatorId] = useState("OP-7821");
  const [stationId, setStationId] = useState("CNG-STATION-102");
  const [role, setRole] = useState<UserSession["role"]>("PUMP_OPERATOR");

  const handleLogin = () => {
    // Valid signed JWT matching backend development secret key & OIDC issuer/audience
    const validJwtToken =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJPUC03ODIxIiwicm9sZXMiOlsiUFVNUF9PUEVSQVRPUiJdLCJzdGF0aW9uX2lkIjoiQ05HLVNUQVRJT04tMTAyIiwiaXNzIjoiaHR0cHM6Ly9hdXRoLmNuZy1jb21wbGlhbmNlLmVudGVycHJpc2UuaW50ZXJuYWwvYXV0aC9yZWFsbXMvY25nIiwiYXVkIjoiY25nLWNvbXBsaWFuY2UtYXBpIiwiZXhwIjoxODkzNDU2MDAwfQ.b4lGyUySxJyePRIr2tYRozkHtgWoKj9Zj3osVOuAqRs";

    const session: UserSession = {
      user_id: operatorId,
      name: `Operator ${operatorId}`,
      role: role,
      station_id: stationId,
      station_name: "Indraprastha Gas CNG Station #102",
      token: validJwtToken,
    };
    onLoginSuccess(session);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.appTitle}>CNG COMPLIANCE</Text>
        <Text style={styles.appSubtitle}>Enterprise Vehicle Verification System</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>OPERATOR SIGN IN</Text>

        <Text style={styles.label}>Operator ID / Identity</Text>
        <TextInput
          style={styles.input}
          value={operatorId}
          onChangeText={setOperatorId}
          placeholder="e.g. OP-7821"
          placeholderTextColor={Colors.textMuted}
        />

        <Text style={styles.label}>Station / Location Context</Text>
        <TextInput
          style={styles.input}
          value={stationId}
          onChangeText={setStationId}
          placeholder="e.g. CNG-STATION-102"
          placeholderTextColor={Colors.textMuted}
        />

        <Text style={styles.label}>Role Context</Text>
        <View style={styles.roleContainer}>
          <TouchableOpacity
            style={[styles.roleChip, role === "PUMP_OPERATOR" && styles.roleChipActive]}
            onPress={() => setRole("PUMP_OPERATOR")}
          >
            <Text
              style={[
                styles.roleText,
                role === "PUMP_OPERATOR" && styles.roleTextActive,
              ]}
            >
              Pump Operator
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.roleChip, role === "ENFORCEMENT_OFFICER" && styles.roleChipActive]}
            onPress={() => setRole("ENFORCEMENT_OFFICER")}
          >
            <Text
              style={[
                styles.roleText,
                role === "ENFORCEMENT_OFFICER" && styles.roleTextActive,
              ]}
            >
              Enforcement
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.loginButton} onPress={handleLogin} activeOpacity={0.8}>
          <Text style={styles.loginButtonText}>SIGN IN</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footerNote}>Development session shell — Phase 6 OIDC integration ready</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  appTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: Colors.primary,
    letterSpacing: 1.5,
  },
  appSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
    fontWeight: "600",
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
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: 20,
    letterSpacing: 0.8,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textSecondary,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.textPrimary,
    fontWeight: "600",
  },
  roleContainer: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  roleChip: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: Colors.background,
  },
  roleChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  roleText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  roleTextActive: {
    color: "#FFFFFF",
  },
  loginButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 28,
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 1,
  },
  footerNote: {
    textAlign: "center",
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 24,
  },
});
