# Security, Privacy and Compliance

## Controls
- OAuth2/OIDC with MFA where supported.
- RBAC and tenant/station scoping.
- TLS 1.2+ in transit; managed encryption at rest.
- Android Keystore for device secrets/tokens.
- Certificate pinning considered for managed devices.
- WAF, API throttling and abuse controls.
- Short-lived access tokens; refresh-token rotation.
- No secrets in mobile binaries or source control.
- Input validation for registration numbers and uploads.
- Malware/content checks for uploaded files if gallery upload is permitted.
- Immutable audit trail for security and verification events.
- Field-level masking for sensitive operational views.
- Separate admin endpoints and stronger privileges.
- Dependency/SAST/DAST/container scanning in CI/CD.

## Privacy
Store only data needed for compliance verification and audit. Default to not retaining raw vehicle images beyond the operational/legal retention window. Document purpose, lawful basis, retention, access, deletion and incident handling before production.

## Consequential action guardrail
A machine result should inform an authorized human. Any penalty, refusal of service, seizure, or enforcement action must follow the applicable organizational/legal procedure and should not be triggered solely by an uncertain OCR result.
