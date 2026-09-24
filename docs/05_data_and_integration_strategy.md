# Data and Integration Strategy

## Authoritative CNG data
Production verification depends on an authorized source of CNG compliance/fitness records. Before production, confirm:
- Data owner / authority.
- API or approved integration mechanism.
- Available keys: vehicle registration, certificate/plate number, issue date, expiry, installer/inspection center, status.
- Freshness/SLA.
- Rate limits.
- Legal basis and data-sharing terms.
- Permitted caching and retention.
- Error semantics and audit requirements.

## Provider abstraction
`ComplianceProvider` is a stable application port. A concrete adapter maps each external provider into the internal model:
- `vehicle_registration`
- `compliance_id`
- `status`
- `issued_at`
- `expires_at`
- `source_reference`
- `source_timestamp`
- `raw_status_code`

## No protected-portal automation
If the source only exposes a CAPTCHA-protected website, do not automate bypass. Obtain an official API, whitelisted service account, approved bulk feed, or data-sharing integration.

## Idempotency
A verification request accepts an idempotency key. Repeated mobile retries must not create duplicate cases or audit events.
