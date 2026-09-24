# Architecture

## Logical layers

### Mobile edge
- Authentication/session
- Camera and image-quality guidance
- OCR interaction UI
- Result/alert UI
- Local encrypted queue/cache
- Device diagnostics
- Optional lightweight 3D experience layer

### API / application
- API gateway / WAF
- Authentication and authorization
- Verification orchestration
- OCR service abstraction
- Compliance-provider abstraction
- Deterministic rules engine
- Audit service
- Admin/configuration service

### Data
- PostgreSQL: users/roles metadata, verification metadata, rule versions, cases
- Object storage: evidence images only when policy requires
- Redis: short-lived cache/idempotency/rate limits
- Event bus: verification/audit/notification events

### External
- Organizational identity provider
- Authorized CNG compliance source
- Optional device-management / MDM
- Notification provider

## Design principles
- Provider and OCR engines are ports/adapters, not hard-coded dependencies.
- Rule decisions are deterministic and versioned.
- Human confirmation is required for uncertain recognition or consequential actions.
- Raw evidence retention is minimized.
- Every external request has timeout, retry, circuit-breaker and idempotency controls.
