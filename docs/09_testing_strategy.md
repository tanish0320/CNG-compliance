# Testing Strategy

## Layers
- Unit: normalization, rules, provider mapping, authorization.
- Contract: provider adapters and OpenAPI schema.
- Integration: API + database + queue + mock provider.
- Mobile: camera permission, offline queue, correction UX, role-specific flows.
- Security: SAST, dependency scan, secret scan, DAST, mobile package analysis.
- Performance: API load, OCR concurrency, provider timeout behavior.
- Resilience: provider outage, queue outage, DB failover, duplicate requests.
- UAT: pump operator and traffic-police field scenarios.

## Critical test cases
- Clear valid plate.
- Glare/blur/partial plate.
- OCR produces multiple candidates.
- User correction changes candidate.
- Valid certificate.
- Expired certificate.
- Compliance record not found.
- Provider unavailable.
- Duplicate request.
- Unauthorized role attempts admin action.
- Device offline then reconnects.
- Evidence retention expiry.
