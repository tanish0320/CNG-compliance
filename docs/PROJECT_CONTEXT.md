# Project Context

## Goal
Build an enterprise-grade Android-first application capable of scaling to approximately one million users. A user captures/uploads a vehicle image, the app recognizes the vehicle registration plate, retrieves CNG compliance information from an authorized source, and warns when the compliance plate/certificate is invalid, expired, absent, or unverifiable.

## Confirmed operating context
- Primary user groups: CNG pump management and traffic police.
- Android installation is required.
- The UX should be high quality, light, modern and operationally fast.
- 3D/Three.js-style visual polish may be used where it does not compromise speed or core workflows.
- External OCR/ANPR and compliance-data integrations must be modular.
- Preference is for open-source components where practical.

## Key product principle
Evidence and traceability matter as much as the decision. Every automated verification should preserve normalized input, OCR confidence, provider response metadata, rule outcome, actor, timestamp and manual-review state.

## Non-goal
Automating circumvention of CAPTCHA or access controls is explicitly outside the design. Production integration requires authorization from the compliance-data owner.
