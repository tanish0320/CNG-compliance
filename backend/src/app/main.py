import time
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes.config import router as config_router
from app.api.routes.health import router as health_router
from app.api.routes.ocr import router as ocr_router
from app.api.routes.supervisor import router as supervisor_router
from app.api.routes.verification import router as verification_router
from app.core.database import init_db
from app.core.logging import configure_logging
from app.core.metrics import (
    HTTP_REQUEST_DURATION_SECONDS,
    HTTP_REQUESTS_TOTAL,
    get_metrics_output,
)
from app.domain.exceptions import (
    IdempotencyConflictError,
    InvalidImageError,
    InvalidRegistrationError,
    OcrProcessingError,
    ProviderUnavailableError,
)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan context managing database schema setup and auth warnings."""
    import structlog

    from app.core.config import get_settings

    logger = structlog.get_logger(__name__)
    settings = get_settings()

    if settings.enable_dev_auth:
        logger.warning(
            "DEVELOPMENT_MOCK_AUTHENTICATION_ENABLED",
            warning="CRITICAL: Development mock authentication is ENABLED! Non-authenticated requests will be accepted. Disable ENABLE_DEV_AUTH in production!",
        )

    await init_db()
    yield


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    configure_logging()
    app = FastAPI(
        title="CNG Compliance API",
        version="0.1.0",
        description="Enterprise CNG Compliance Verification Service",
        lifespan=lifespan,
    )

    # CORS baseline configuration
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Telemetry Middleware for HTTP requests
    @app.middleware("http")
    async def metrics_telemetry_middleware(request: Request, call_next: Any) -> Response:
        start_time = time.perf_counter()
        response: Response = await call_next(request)
        duration = time.perf_counter() - start_time

        # Match endpoint path template or fallback to path
        endpoint = request.url.path
        method = request.method
        status_code = str(response.status_code)

        HTTP_REQUESTS_TOTAL.labels(method=method, endpoint=endpoint, status_code=status_code).inc()
        HTTP_REQUEST_DURATION_SECONDS.labels(method=method, endpoint=endpoint).observe(duration)

        return response

    # Prometheus Metrics Endpoint
    @app.get("/metrics", tags=["telemetry"], include_in_schema=True)
    async def metrics() -> Response:
        body, content_type = get_metrics_output()
        return Response(content=body, media_type=content_type)

    # Domain Exception Handlers
    @app.exception_handler(InvalidRegistrationError)
    async def invalid_registration_handler(
        request: Request, exc: InvalidRegistrationError
    ) -> JSONResponse:
        return JSONResponse(status_code=400, content={"detail": str(exc)})

    @app.exception_handler(InvalidImageError)
    async def invalid_image_handler(
        request: Request, exc: InvalidImageError
    ) -> JSONResponse:
        return JSONResponse(status_code=400, content={"detail": str(exc)})

    @app.exception_handler(OcrProcessingError)
    async def ocr_processing_handler(
        request: Request, exc: OcrProcessingError
    ) -> JSONResponse:
        return JSONResponse(status_code=422, content={"detail": str(exc)})

    @app.exception_handler(IdempotencyConflictError)
    async def idempotency_conflict_handler(
        request: Request, exc: IdempotencyConflictError
    ) -> JSONResponse:
        return JSONResponse(status_code=409, content={"detail": str(exc)})

    @app.exception_handler(ProviderUnavailableError)
    async def provider_unavailable_handler(
        request: Request, exc: ProviderUnavailableError
    ) -> JSONResponse:
        return JSONResponse(status_code=503, content={"detail": str(exc)})

    app.include_router(health_router)
    app.include_router(verification_router, prefix="/api/v1")
    app.include_router(ocr_router, prefix="/api/v1")
    app.include_router(supervisor_router, prefix="/api/v1")
    app.include_router(config_router, prefix="/api/v1")
    return app


app = create_app()
