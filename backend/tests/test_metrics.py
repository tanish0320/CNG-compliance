import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_prometheus_metrics_endpoint() -> None:
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get("/metrics")
        assert response.status_code == 200
        content = response.text

        # Verify mandatory metric definitions exist
        assert "cng_http_requests_total" in content
        assert "cng_http_request_duration_seconds" in content
        assert "cng_verifications_total" in content
        assert "cng_ocr_requests_total" in content

        # Verify no sensitive high-cardinality labels leak into metrics
        assert "vehicle_registration" not in content
        assert "DL01" not in content
