# CNG Compliance Enterprise

Enterprise mobile platform for CNG pump management and traffic-police users to capture a vehicle registration plate, extract the registration number, verify CNG compliance/fitness status through an authorized data source, and raise an actionable alert when compliance is missing, invalid, expired, or cannot be verified.

## Primary workflow

1. User signs in with an authorized organizational identity.
2. User captures or uploads a vehicle image.
3. On-device/server image preprocessing improves plate readability.
4. OCR/ANPR extracts the registration number with confidence and evidence.
5. The backend normalizes and validates the registration number.
6. The compliance connector calls an **authorized API/database integration**.
7. Rules classify the outcome: VALID, EXPIRING_SOON, EXPIRED, INVALID, NOT_FOUND, or MANUAL_REVIEW.
8. The app shows compliance details, evidence, and the required action.
9. Every verification is audit logged with actor, timestamp, source, confidence, and decision.
10. Supervisors can review exceptions and operational analytics.

## Intended users

- CNG pump operators / station management
- Traffic police / enforcement users
- Supervisors / administrators
- Compliance operations / audit teams

## Repository map

- `docs/` — product, architecture, security, data, UX, roadmap, testing and operations.
- `architecture/` — Mermaid architecture, sequence and data-flow diagrams.
- `backend/` — FastAPI starter with layered OOP separation, structured logging, provider abstraction and tests.
- `mobile/` — React Native/TypeScript starter specification with a Three.js-compatible experience layer.
- `openapi/` — versioned API contract.
- `config/` — rule configuration examples.
- `sample-data/` — synthetic payloads only.
- `prototype/` — standalone synthetic HTML concept.
- `infra/` — container/local deployment starter.
- `governance/` — ADRs, risk register and retention guidance.
- `scripts/` — package validation utility.

## Important integration constraint

The application must use official/authorized compliance data access. It must not bypass CAPTCHA, access controls, rate limits, or website protections. If the authoritative source provides only a human-facing portal, obtain an API, data-sharing agreement, or approved system-to-system interface.

## Recommended baseline stack

- Mobile: React Native + TypeScript; secure native camera; optional React Three Fiber/Three.js for non-critical 3D UX.
- Backend: Python + FastAPI + Pydantic.
- OCR/ANPR: PaddleOCR or Tesseract plus OpenCV; pluggable service boundary allows replacement with a managed ANPR service if required.
- Persistence: PostgreSQL for verification/audit metadata; object storage for evidence subject to retention policy.
- Cache/rate limiting: Redis.
- Messaging: Kafka/Redpanda or cloud-native queue for asynchronous jobs.
- Auth: OIDC/OAuth2 with organizational IdP and RBAC.
- Observability: OpenTelemetry + Prometheus/Grafana + Loki-compatible logging.
- Deployment: Containers; managed Kubernetes/App Service/App Runner/ECS depending target cloud.

## Status

This package is a consolidated developer handover derived from the CNG Compliance project decisions available in ChatGPT on 21 Sep 2026. No directly attached CNG source repository or previous APK was available in the current file surface, so this export includes the consolidated specification, architecture, code starter, contracts and synthetic prototype rather than claiming to contain unavailable binaries.
