import type { ComplianceStatus } from "../domain/ComplianceStatus";

/**
 * Warm Sand Glassmorphic Design System Tokens
 * Hushed luxury, sun-warmed neutrals, frosted-glass surfaces.
 */
export const Colors = {
  // Canvas & Surfaces
  background: "#FAF7F2",
  surface: "#FAF7F2",
  surfaceAlt: "#FFFFFF",
  surfaceTonal: "#F0EAE1",
  surfaceMuted: "#F2EFEA",
  surfaceBorder: "#EBE3D5",
  
  // Text Roles
  textPrimary: "#23201E",
  textSecondary: "#4A4542",
  textMuted: "#8A827A",
  
  // Antique Gold Brand & Accent
  primary: "#C1A673",
  primaryDark: "#9E8455",
  
  // Semantic Roles (Restrained Gold & Dusty Terracotta)
  success: "#C1A673",
  successBg: "#F0EAE1",
  warning: "#B88A3B",
  warningBg: "#F0EAE1",
  danger: "#8C4A4A",
  dangerBg: "#F7EEED",
  neutral: "#8A827A",
  neutralBg: "#F0EAE1",
  
  // Glassmorphic Overlays
  scrimGlass: "rgba(255, 255, 255, 0.6)",
  scrimGlassSoft: "rgba(255, 255, 255, 0.4)",
};

export const Typography = {
  headingFamily: "Raleway",
  bodyFamily: "DM Sans",
  letterSpacingEyebrow: 2.0, // 0.2em
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
