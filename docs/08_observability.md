# Observability

## Signals
- Mobile capture success/failure.
- OCR latency, confidence distribution and correction rate.
- Verification request rate.
- Provider latency, status codes, timeout/error rate.
- Rule outcome distribution.
- Manual-review rate.
- Invalid/expired/not-found counts.
- API p50/p95/p99 latency.
- Authentication failures.
- Queue depth and retry count.
- Crash-free sessions.
- Audit-write failures.

## Implementation
Use OpenTelemetry traces and metrics. Add a correlation ID from mobile request through OCR, provider lookup, decision and audit write. Structured logs must avoid raw secrets and unnecessary PII.

## Alert examples
- Provider failure rate exceeds threshold.
- OCR confidence collapses by device/app version.
- Manual-review rate spikes.
- Audit sink unavailable.
- Authentication failures or unusual request volume spike.
