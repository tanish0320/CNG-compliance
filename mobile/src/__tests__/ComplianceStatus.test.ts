import { StatusTheme } from "../theme/Theme";
import { ComplianceStatus } from "../domain/ComplianceStatus";

describe("ComplianceStatus Theme Mappings", () => {
  const statuses: ComplianceStatus[] = [
    "VALID",
    "EXPIRING_SOON",
    "EXPIRED",
    "INVALID",
    "NOT_FOUND",
    "MANUAL_REVIEW",
    "PROVIDER_UNAVAILABLE",
  ];

  it.each(statuses)("defines a valid theme entry for status %s", (status: ComplianceStatus) => {
    const theme = StatusTheme[status];
    expect(theme).toBeDefined();
    expect(theme.label).toBeTruthy();
    expect(theme.icon).toBeTruthy();
    expect(theme.backgroundColor).toBeTruthy();
    expect(theme.textColor).toBeTruthy();
    expect(theme.description).toBeTruthy();
    expect(theme.recommendedAction).toBeTruthy();
  });
});
