# Scalability and Reliability

## Target
Design for approximately one million registered users with bursty verification traffic.

## Patterns
- Stateless API workers behind a load balancer.
- Horizontal autoscaling.
- Async OCR/provider jobs for slow operations.
- Redis-backed idempotency and transient caching.
- Connection pooling for PostgreSQL.
- Partition/archival strategy for audit events.
- Object storage rather than database BLOBs.
- CDN only for public/static assets.
- Circuit breakers around provider calls.
- Exponential backoff with jitter for transient provider failures.
- Dead-letter queue for unrecoverable async events.
- Regional disaster-recovery design based on RTO/RPO.
- Load tests based on peak verifications/sec, not user count alone.

## Suggested SLOs
- API availability: 99.9%+ subject to provider dependency.
- Core API p95 excluding external provider: <500 ms.
- End-to-end verification p95 target: <5 s when provider SLA supports it.
- Audit event durability: at-least-once delivery with deduplication.
