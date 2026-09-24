# Product Scope

## In scope
- Secure sign-in and RBAC.
- Camera capture and gallery upload.
- Number-plate localization, OCR, normalization and confidence scoring.
- Manual plate correction before verification when OCR confidence is low.
- Authorized compliance lookup.
- CNG plate/certificate status, expiry and evidence display.
- Alerts for invalid/expired/not-found results.
- Verification history and audit trail.
- Supervisor exception queue.
- Basic operational dashboard.
- Offline-tolerant capture queue with later verification where policy permits.
- Device/app telemetry, API observability and security auditing.

## Out of scope for MVP
- Automated penalties/fines.
- Automated law-enforcement actions without human confirmation.
- CAPTCHA bypass or scraping protected portals.
- Face recognition.
- Unrelated vehicle ownership profiling.
- Permanent storage of raw images unless operationally/legal required.

## Core states
`CAPTURED -> OCR_COMPLETE -> VERIFIED -> DECIDED -> CLOSED`
with exception branches to `MANUAL_REVIEW` and `PROVIDER_UNAVAILABLE`.
