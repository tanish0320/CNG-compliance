import type { ComplianceStatus } from "../domain/ComplianceStatus";

export const Colors = {
  background: "#F8FAFC",
  surface: "#FFFFFF",
  surfaceBorder: "#E2E8F0",
  textPrimary: "#0F172A",
  textSecondary: "#475569",
  textMuted: "#94A3B8",
  primary: "#0284C7",
  primaryDark: "#0369A1",
  success: "#16A34A",
  successBg: "#DCFCE7",
  warning: "#D97706",
  warningBg: "#FEF3C7",
  danger: "#DC2626",
  dangerBg: "#FEE2E2",
  neutral: "#64748B",
  neutralBg: "#F1F5F9",
};

export interface StatusStyle {
  label: string;
  icon: string;
  backgroundColor: string;
  textColor: string;
  description: string;
  recommendedAction: string;
}

export const StatusTheme: Record<ComplianceStatus, StatusStyle> = {
  VALID: {
    label: "COMPLIANCE VALID",
    icon: "✓",
    backgroundColor: Colors.successBg,
    textColor: Colors.success,
    description: "CNG compliance certificate is active and verified against authorized records.",
    recommendedAction: "Proceed with CNG dispensing / clear vehicle inspection.",
  },
  EXPIRING_SOON: {
    label: "EXPIRING SOON",
    icon: "⚠",
    backgroundColor: Colors.warningBg,
    textColor: Colors.warning,
    description: "CNG compliance certificate expires within 30 days.",
    recommendedAction: "Inform vehicle operator to schedule re-testing before expiry date.",
  },
  EXPIRED: {
    label: "CERTIFICATE EXPIRED",
    icon: "✕",
    backgroundColor: Colors.dangerBg,
    textColor: Colors.danger,
    description: "CNG compliance certificate has expired and is no longer valid.",
    recommendedAction: "DO NOT DISPENSE CNG. Direct operator to authorized compliance testing center.",
  },
  INVALID: {
    label: "COMPLIANCE INVALID",
    icon: "⛔",
    backgroundColor: Colors.dangerBg,
    textColor: Colors.danger,
    description: "Vehicle compliance record is flagged invalid or revoked.",
    recommendedAction: "Refuse service immediately and report exception to supervisor.",
  },
  NOT_FOUND: {
    label: "RECORD NOT FOUND",
    icon: "❓",
    backgroundColor: Colors.warningBg,
    textColor: Colors.warning,
    description: "No matching CNG compliance record found in authoritative database.",
    recommendedAction: "Verify physical CNG cylinder plate/certificate or request supervisor manual review.",
  },
  MANUAL_REVIEW: {
    label: "MANUAL REVIEW REQUIRED",
    icon: "🔍",
    backgroundColor: Colors.warningBg,
    textColor: Colors.warning,
    description: "OCR recognition confidence was below threshold or ambiguous.",
    recommendedAction: "Inspect plate visually and confirm/edit registration number.",
  },
  PROVIDER_UNAVAILABLE: {
    label: "SERVICE UNAVAILABLE",
    icon: "⚡",
    backgroundColor: Colors.neutralBg,
    textColor: Colors.neutral,
    description: "Compliance provider connection timed out or is temporarily unavailable.",
    recommendedAction: "Retry verification or check physical certificate documentation.",
  },
  PENDING_VERIFICATION: {
    label: "PENDING VERIFICATION",
    icon: "⏳",
    backgroundColor: Colors.warningBg,
    textColor: Colors.warning,
    description: "Vehicle scan is queued locally and awaiting backend synchronization.",
    recommendedAction: "Keep app open or check back when connection is restored.",
  },
};
