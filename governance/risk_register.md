# Risk Register

| Risk | Impact | Mitigation |
|---|---|---|
| No approved compliance API | Critical | Secure data-sharing/API agreement before production |
| OCR errors | High | Quality checks, confidence threshold, human correction |
| Provider outage | High | Timeout, circuit breaker, queue/retry, clear unverifiable state |
| Stale provider data | High | Display source timestamp; contract freshness SLA |
| Data/privacy over-retention | High | Minimize data, lifecycle rules, documented retention |
| Role misuse | High | OIDC, RBAC, tenant scope, immutable audit |
| Peak load | Medium/High | Autoscaling, async workers, cache, load tests |
| Device loss | High | MDM, short tokens, encrypted local storage, remote revocation |
| False enforcement action | Critical | Human procedure; no automated penalty from uncertain result |
