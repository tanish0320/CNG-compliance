# API Contract Summary

## `POST /api/v1/verifications`
Accepts normalized registration or image metadata and creates/executes a verification. Use `Idempotency-Key`.

### Response
- verification ID
- normalized registration
- OCR confidence
- compliance status
- compliance identifier when returned by provider
- issue/expiry dates
- source timestamp/reference
- rule version
- review requirement
- user-facing action

## `GET /api/v1/verifications/{id}`
Returns the current verification/case state subject to RBAC.

## `POST /api/v1/verifications/{id}/confirm-registration`
Human-confirmed OCR correction.

## `POST /api/v1/verifications/{id}/review`
Authorized manual-review decision.

## `GET /api/v1/health`
Liveness/health endpoint. Detailed dependency health should be access controlled.
