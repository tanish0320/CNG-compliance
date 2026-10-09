# ChatGPT Project Context: CNG Compliance Enterprise

> **Note for ChatGPT**: This document serves as the single source of truth for the **CNG Compliance Enterprise** codebase. It contains the complete architectural blueprint, tech stack specifications, domain logic, codebase structure, data models, API contracts, and development instructions needed to assist with ongoing development, debugging, and feature additions.

---

## 1. Project Overview & Operational Context

### 1.1 Executive Summary
**CNG Compliance Enterprise** is an enterprise-grade, Android-first platform designed to scale up to ~1,000,000 active users. Its primary objective is to allow field operators—specifically **CNG pump management personnel** and **traffic police/enforcement officers**—to rapidly capture vehicle registration plates using a mobile device, extract registration numbers via OCR/ANPR, verify CNG compliance/cylinder testing status against authorized data providers, and flag non-compliant or expired vehicles in real time.

### 1.2 Core Value Proposition & Principles
- **Speed & Usability**: Modern, lightweight, operationally fast UX suited for high-throughput field use (e.g., fuel filling queues and police checkpoints).
- **Evidence & Traceability**: Every automated verification records normalized plate inputs, raw OCR text, OCR confidence scores, provider API metadata, exact rule versions applied, actor identity, timestamps, and manual review states.
- **Legal & Technical Guardrails**: Explicitly forbids circumvention of CAPTCHAs or protected portals. All compliance integrations MUST rely on official APIs, database access, or approved system-to-system interfaces.

### 1.3 Core User Roles & Use Cases
1. **CNG Pump Operator**: Scans plates before refueling. Alerts when compliance is expired or invalid to block unsafe gas filling.
2. **Traffic Police / Enforcement Officer**: Scans plates on roadside checks. Receives immediate actionable compliance status and evidence log.
3. **Supervisor / Admin**: Reviews exception queues, manual review overrides, and station-level operational analytics.
4. **Auditor**: Inspects immutable audit trails for legal compliance and verification history.

---

## 2. Technology Stack & Key Dependencies

### Mobile Edge App (`mobile/`)
- **Framework**: React Native + TypeScript
- **Camera Layer**: Native camera integration with frame-quality guidance (glare, blur, angle checking)
- **3D Polish Layer**: Optional React Three Fiber / Three.js light experience layer for interactive 3D indicators without degrading core execution speed
- **Local Storage & Queue**: Encrypted SQLite / EncryptedStorage for offline-tolerant verification queues
- **HTTP Client**: Fetch / Axios with `Idempotency-Key` headers for duplicate request prevention

### Backend Service (`backend/`)
- **Language / Runtime**: Python 3.11+
- **API Framework**: FastAPI (async ASGI framework)
- **Data Validation & Settings**: Pydantic v2 & `pydantic-settings`
- **Structured Logging**: `structlog` (JSON format, context binding)
- **Testing**: `pytest`, `pytest-asyncio`, `httpx`

### OCR / ANPR Engine Layer
- **Engine Options**: Pluggable ports/adapters interface supporting **PaddleOCR**, **Tesseract**, or **OpenCV**.
- **Managed ANPR Fallback**: Abstracted so cloud ANPR APIs can be swapped in without modifying domain business logic.

### Infrastructure & Data Layer (`infra/`)
- **Primary Database**: PostgreSQL (Users, Roles, Verification Records, Rule Versions, Case Management)
- **Cache & Rate Limiting**: Redis (short-lived caching, token bucket rate-limiting, idempotency lock tracking)
- **Object Storage**: AWS S3 / MinIO (for optional short-term retention of cropped vehicle/plate evidence images)
- **Event Bus / Async Queues**: Kafka / Redpanda or cloud queue services for asynchronous verification events
- **Authentication**: OIDC / OAuth2 integration with enterprise Identity Providers (IdP) supporting RBAC
- **Observability**: OpenTelemetry instrumentation, Prometheus metrics, Grafana dashboards, Loki log aggregation

---

## 3. Architecture & Design Patterns

### 3.1 Architecture Blueprint (Hexagonal / Ports & Adapters)
The backend is structured around **Hexagonal Architecture** to decouple core domain logic from external data providers and frameworks:

```
                  +-----------------------------------+
                  |        Android Mobile App         |
                  +-----------------------------------+
                                    |
                                    v
                  +-----------------------------------+
                  |         API Gateway / WAF         |
                  +-----------------------------------+
                                    |
       +----------------------------+----------------------------+
       |                            |                            |
       v                            v                            v
+--------------+          +-------------------+        +--------------------+
|  OIDC Auth   |          | Verification API  |        | Verification Rules |
|  & RBAC      |          | (FastAPI Routes)  |        |   (Deterministic)  |
+--------------+          +-------------------+        +--------------------+
                                    |
                                    v
                          +-------------------+
                          | VerificationSvc   |  <-- Core Domain Logic
                          +-------------------+
                               /         \
                              /           \
                             v             v
                    +---------------+  +------------------+
                    |  OcrProvider  |  |ComplianceProvider| (Abstract Ports)
                    |    (Port)     |  |      (Port)      |
                    +---------------+  +------------------+
                            |                    |
                            v                    v
                    +---------------+  +------------------+
                    |  PaddleOCR /  |  | Authorized CNG   | (Adapters)
                    |  Tesseract    |  | API / Mock Adapter|
                    +---------------+  +------------------+
```

### 3.2 Layer Breakdown
- **Domain Layer** (`backend/src/app/domain/`): Pure dataclasses/Pydantic models (`ComplianceStatus`, `VerificationRequest`, `ProviderRecord`, `VerificationResult`). No external framework dependencies.
- **Ports Layer** (`backend/src/app/ports/`): Abstract base classes defining contracts (`ComplianceProvider`, `OcrProvider`).
- **Services Layer** (`backend/src/app/services/`): Business logic orchestration (`VerificationService`), registration string normalization, and deterministic status evaluation.
- **Adapters Layer** (`backend/src/app/adapters/`): Concrete implementations of ports (`MockComplianceProvider`, future `PaddleOcrAdapter`, etc.).
- **API Layer** (`backend/src/app/api/`): FastAPI endpoints (`POST /api/v1/verifications`, `GET /health`).

### 3.3 Architectural Decision Records (ADRs)
- **ADR-001: Compliance Provider Abstraction**: All external CNG databases are accessed through a unified interface. Core logic operates strictly on normalized `ProviderRecord` objects.
- **ADR-002: Human Confirmation for Low-Confidence OCR**: When OCR confidence is below threshold or registration format is ambiguous, the application forces user manual confirmation/correction before querying external compliance databases.

---

## 4. Detailed Domain Logic & Workflows

### 4.1 Registration Normalization Logic
Registration plates are cleaned using deterministic normalization:
```python
def _normalize_registration(value: str) -> str:
    return "".join(value.upper().split())
```
*Example*: `"  dl 01 ab 1234 "` $\rightarrow$ `"DL01AB1234"`

### 4.2 Compliance Status Classification Matrix
The `VerificationService` evaluates provider records against current timestamp (`now` in UTC) and assigns statuses deterministically:

| Provider Response State | Rule Logic / Condition | Assigned `ComplianceStatus` | Action Required |
| :--- | :--- | :--- | :--- |
| No record returned (`None`) | `record is None` | `NOT_FOUND` | Flag for Manual Review |
| Explicitly invalid | `record.is_valid is False` | `INVALID` | Alert: Refuse CNG / Enforce |
| Expired certificate | `record.expires_at < now` | `EXPIRED` | Alert: Refuse CNG / Enforce |
| Expiring within 30 days | `(record.expires_at - now).days <= 30` | `EXPIRING_SOON` | Warning: Notify Driver |
| Valid certificate | `record.expires_at > now + 30 days` | `VALID` | Pass: Permit CNG Refueling |
| OCR confidence below threshold | `ocr_confidence < THRESHOLD` | `MANUAL_REVIEW` | User plate confirmation gate |
| Provider lookup timeout / error | HTTP 5xx / Network Failure | `PROVIDER_UNAVAILABLE` | Queue for retry / review |

### 4.3 Verification Lifecycle State Machine
```
[CAPTURED] ---> [OCR_COMPLETE] ---> [HUMAN_CONFIRMATION? (if low confidence)]
                                              |
                                              v
[CLOSED] <--- [DECIDED] <--- [VERIFIED] <-----+ (Provider Lookup & Rules)
                 |
                 +---> [MANUAL_REVIEW] / [PROVIDER_UNAVAILABLE] (Exception Branches)
```

---

## 5. API Specs & Data Schemas

### 5.1 Endpoints Overview (`openapi/cng-compliance-openapi.yaml`)

#### 1. `POST /api/v1/verifications`
- **Headers**: `Idempotency-Key: <UUID>` (Required)
- **Request Body (`VerificationRequest`)**:
```json
{
  "vehicle_registration": "DL01AB1234",
  "ocr_confidence": 0.95
}
```
- **Response Body (`VerificationResult`)**:
```json
{
  "id": "a3b8e4f1-6789-4c12-890a-bcdef0123456",
  "vehicle_registration": "DL01AB1234",
  "status": "VALID",
  "compliance_id": "CNG-2026-98765",
  "expires_at": "2027-09-21T00:00:00Z",
  "source_reference": "MOCK-PROVIDER-AUTH",
  "rule_version": "v1",
  "manual_review_required": false
}
```

#### 2. `GET /health`
- **Response Body**: `{"status": "ok"}`

---

## 6. Repository Map & Directory Layout

```
CNG_Compliance_Enterprise/
├── architecture/               # Mermaid system architecture & sequence diagrams
│   ├── system_architecture.mmd
│   ├── data_flow.mmd
│   └── verification_sequence.mmd
├── backend/                    # Python / FastAPI Backend Service
│   ├── pyproject.toml          # Poetry/Pip build config & dependencies
│   ├── src/app/
│   │   ├── main.py             # FastAPI entrypoint
│   │   ├── adapters/           # Concrete provider adapters (Mock, etc.)
│   │   ├── api/routes/         # API endpoints (/verifications, /health)
│   │   ├── core/               # Logging & configuration management
│   │   ├── domain/             # Domain entities & Pydantic models
│   │   ├── ports/              # Abstract interface definitions
│   │   └── services/           # VerificationService business logic
│   └── tests/                  # Unit & integration tests (pytest)
├── config/                     # Json schema & sample rule definitions
├── docs/                       # Comprehensive documentation (01 to 15)
│   ├── 01_product_scope.md
│   ├── 04_architecture.md
│   ├── 13_api_contract.md
│   └── 14_data_model.md
├── governance/                 # Architectural Decision Records (ADRs) & Risk Register
├── infra/                      # Dockerfile and docker-compose deployment scripts
├── mobile/                     # React Native / TypeScript App Starter
│   ├── package.json
│   └── src/
│       ├── domain/             # TS Interfaces matching backend schemas
│       └── services/           # HTTP API client for verification backend
├── openapi/                    # OpenAPI 3.1.0 YAML specification
├── prototype/                  # Synthetic HTML prototype for concept demonstration
├── sample-data/                # Synthetic test JSON payloads
├── scripts/                    # Validation scripts (validate_package.py)
├── PROJECT_CONTEXT.md          # High-level goals & constraints
└── README.md                   # Main project overview
```

---

## 7. How to Run, Test & Validate

### 7.1 Backend Setup & Execution
```bash
# Navigate to backend directory
cd backend

# Install dependencies (virtual environment recommended)
pip install -e .

# Run FastAPI development server with auto-reload
uvicorn app.main:app --reload --port 8000
```

### 7.2 Running Tests
```bash
cd backend
pytest
```

### 7.3 Infrastructure Docker Startup
```bash
cd infra
docker-compose up -d
```

### 7.4 Running Package Integrity Validation
```bash
python scripts/validate_package.py
```

---

## 8. Development Roadmap & Immediate Tasks

As the sole maintainer, upcoming development phases include:
1. **Real OCR Engine Integration**: Implement `PaddleOcrAdapter` implementing `OcrProvider` port in Python.
2. **Database Persistence Layer**: Setup SQLAlchemy 2.0 / AsyncPG + Alembic migrations to persist `VerificationResult` and `AuditEvent` records in PostgreSQL.
3. **Mobile App UI Implementation**: Build React Native camera screen, plate detection overlay, and verification response view based on `docs/15_ui_ux_spec.md`.
4. **Auth Middleware**: Implement JWT validation middleware against OIDC IdP in FastAPI routes.
