import logging
from collections.abc import Generator
from contextlib import contextmanager

from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider

logger = logging.getLogger(__name__)

_provider = TracerProvider()
trace.set_tracer_provider(_provider)
tracer = trace.get_tracer("cng_compliance_backend", "0.1.0")


@contextmanager
def start_span(name: str, attributes: dict[str, str | int | float | bool] | None = None) -> Generator[trace.Span, None, None]:
    """Context manager to start an OpenTelemetry span safely."""
    with tracer.start_as_current_span(name) as span:
        if attributes:
            for key, val in attributes.items():
                span.set_attribute(key, val)
        yield span
