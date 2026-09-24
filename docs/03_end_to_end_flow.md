# End-to-End Flow

1. **Authenticate** — OIDC login issues a short-lived access token; backend resolves organizational role and tenant/station.
2. **Capture** — app captures image with quality guidance (blur, glare, angle, plate framing).
3. **Pre-process** — crop/deskew/denoise/contrast normalization.
4. **Plate detect** — ANPR pipeline identifies plate bounding box.
5. **OCR** — OCR extracts candidate text and confidence.
6. **Normalize** — format rules remove noise, standardize spacing/case and validate Indian registration syntax.
7. **Human correction gate** — if below confidence threshold or format ambiguous, user confirms/corrects.
8. **Verification request** — app sends normalized registration plus evidence metadata.
9. **Provider lookup** — provider adapter calls an approved API/database/system-to-system interface.
10. **Rule evaluation** — deterministic rules derive compliance status and alerts.
11. **Response** — app renders status, expiry, compliance identifier (when provided), data-source timestamp and action.
12. **Audit** — append-only verification/audit event is written.
13. **Exception** — not-found, provider conflict, low confidence or unavailable provider enters review/retry flow.
14. **Analytics** — privacy-minimized aggregates support station and enforcement operations.
