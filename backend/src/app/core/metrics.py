from prometheus_client import (
    CONTENT_TYPE_LATEST,
    CollectorRegistry,
    Counter,
    Histogram,
    generate_latest,
)

# Standard application metrics registry
REGISTRY = CollectorRegistry(auto_describe=True)

# 1. HTTP Request Metrics
HTTP_REQUESTS_TOTAL = Counter(
    "cng_http_requests_total",
    "Total HTTP requests received",
    ["method", "endpoint", "status_code"],
    registry=REGISTRY,
)

HTTP_REQUEST_DURATION_SECONDS = Histogram(
    "cng_http_request_duration_seconds",
    "HTTP request latency in seconds",
    ["method", "endpoint"],
    registry=REGISTRY,
)

# 2. Verification Domain Metrics
VERIFICATIONS_TOTAL = Counter(
    "cng_verifications_total",
    "Total verification requests processed",
    ["status", "source"],
    registry=REGISTRY,
)

# 3. OCR Metrics
OCR_REQUESTS_TOTAL = Counter(
    "cng_ocr_requests_total",
    "Total OCR extraction attempts",
    ["status"],
    registry=REGISTRY,
)

OCR_FAILURES_TOTAL = Counter(
    "cng_ocr_failures_total",
    "Total failed OCR extractions",
    registry=REGISTRY,
)

# 4. Manual Review & Exceptions Metrics
MANUAL_REVIEWS_TOTAL = Counter(
    "cng_manual_reviews_total",
    "Total verifications routed to manual review",
    ["reason"],
    registry=REGISTRY,
)

IDEMPOTENCY_CONFLICTS_TOTAL = Counter(
    "cng_idempotency_conflicts_total",
    "Total idempotency key conflict detections",
    registry=REGISTRY,
)

# 5. External Provider Metrics
PROVIDER_FAILURES_TOTAL = Counter(
    "cng_provider_failures_total",
    "Total provider lookup failures or timeouts",
    ["provider_name"],
    registry=REGISTRY,
)

PROVIDER_LATENCY_SECONDS = Histogram(
    "cng_provider_latency_seconds",
    "Provider API lookup latency in seconds",
    ["provider_name"],
    registry=REGISTRY,
)

# 6. Offline Sync & Configuration Metrics
OFFLINE_SYNC_EVENTS_TOTAL = Counter(
    "cng_offline_sync_events_total",
    "Total server-side offline synchronization request events",
    ["event_type"],
    registry=REGISTRY,
)

CONFIG_CHANGES_TOTAL = Counter(
    "cng_config_changes_total",
    "Total dynamic configuration updates",
    registry=REGISTRY,
)


def get_metrics_output() -> tuple[bytes, str]:
    """Generate Prometheus metric output and content type."""
    return generate_latest(REGISTRY), CONTENT_TYPE_LATEST
