# CNG Compliance Enterprise - Mobile v2 API Contract

## Overview
This document specifies the exact API contract provided by the FastAPI backend (`http://127.0.0.1:8000`) for the `mobile-v2` vertical slice.
The backend is **FROZEN** and must not be modified.

---

## Endpoints

### 1. Health Check
- **Endpoint**: `GET /health`
- **Headers**: None required
- **Response**: `200 OK`
```json
{
  "status": "ok"
}
```

---

### 2. OCR Extraction & Verification
- **Endpoint**: `POST /api/v1/ocr/extract`
- **Content-Type**: `multipart/form-data`
- **Optional Headers**:
  - `Idempotency-Key`: string (UUID or timestamp identifier)
- **Form Fields**:
  - `file`: Raw binary image file (`UploadFile`)
  - Supported MIME types: `image/jpeg`, `image/jpg`, `image/png`
- **Response**: `200 OK`
```json
{
  "raw_text": "MH12AB1234",
  "normalized_registration": "MH12AB1234",
  "confidence": 0.95,
  "engine_name": "PaddleOCR",
  "manual_review_required": false,
  "verification_result": {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "vehicle_registration": "MH12AB1234",
    "status": "VALID",
    "compliance_id": "CMP-2026-001",
    "expires_at": "2027-01-01T00:00:00Z",
    "source_reference": "REF-12345",
    "rule_version": "v1",
    "manual_review_required": false
  }
}
```

#### Error Responses:
- `400 Bad Request`: `{"detail": "Unsupported MIME type..."}` or `{"detail": "Invalid image..."}`
- `422 Unprocessable Entity`: `{"detail": "OCR Processing error..."}`
- `500 Internal Server Error`: `{"detail": "OCR extraction failed..."}`
