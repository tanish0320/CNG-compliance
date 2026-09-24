# Open-Source Tooling Shortlist

| Need | Options | Notes |
|---|---|---|
| Image processing | OpenCV | Crop, deskew, glare/contrast preprocessing |
| OCR | PaddleOCR, Tesseract | Benchmark on Indian plates before selecting |
| Plate detection | YOLO family-compatible open models / custom detector | Validate model license and dataset rights |
| Mobile | React Native, TypeScript | Android-first shared codebase |
| 3D UX | Three.js / React Three Fiber | Keep optional; never block verification flow |
| Backend | FastAPI, Pydantic | Typed async APIs |
| Database | PostgreSQL | Durable metadata and audit indexes |
| Cache | Redis | Idempotency, throttling, short TTL cache |
| Queue | Redpanda/Kafka-compatible, RabbitMQ | Async processing |
| Observability | OpenTelemetry, Prometheus, Grafana, Loki | Traces/metrics/logs |
| API gateway | Kong / Envoy / cloud managed equivalent | Auth/rate limiting |
| Containers | Docker / containerd | Repeatable deployment |
| Orchestration | Kubernetes | For scale when operationally justified |
| Security scanning | Semgrep, Bandit, Trivy, Gitleaks | CI gates |
