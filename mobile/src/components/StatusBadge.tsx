import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { ComplianceStatus } from "../domain/ComplianceStatus";
import { StatusTheme } from "../theme/Theme";

interface StatusBadgeProps {
  status: ComplianceStatus;
  large?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, large = false }) => {
  const theme = StatusTheme[status] || StatusTheme.NOT_FOUND;

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: theme.backgroundColor },
        large && styles.badgeLarge,
      ]}
    >
      <Text style={[styles.icon, { color: theme.textColor }, large && styles.iconLarge]}>
        {theme.icon}
      </Text>
      <Text style={[styles.label, { color: theme.textColor }, large && styles.labelLarge]}>
        {theme.label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  badgeLarge: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  icon: {
    fontSize: 14,
    fontWeight: "700",
    marginRight: 6,
  },
  iconLarge: {
    fontSize: 20,
    marginRight: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  labelLarge: {
    fontSize: 16,
    letterSpacing: 0.8,
  },
});
