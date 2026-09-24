import pytest

from app.adapters.mock_compliance_provider import MockComplianceProvider
from app.domain.exceptions import InvalidRegistrationError
from app.domain.models import ComplianceStatus
from app.services.verification_service import VerificationService


@pytest.mark.asyncio
async def test_valid_vehicle() -> None:
    service = VerificationService(MockComplianceProvider())
    result = await service.verify("DL 01 AB 1234")
    assert result.status == ComplianceStatus.VALID
    assert result.vehicle_registration == "DL01AB1234"
    assert result.manual_review_required is False


@pytest.mark.asyncio
async def test_expired_vehicle() -> None:
    service = VerificationService(MockComplianceProvider())
    result = await service.verify("DL 01 EXPIRED")
    assert result.status == ComplianceStatus.EXPIRED
    assert result.manual_review_required is False


@pytest.mark.asyncio
async def test_expiring_soon_vehicle() -> None:
    service = VerificationService(MockComplianceProvider())
    result = await service.verify("DL 01 EXPIRING")
    assert result.status == ComplianceStatus.EXPIRING_SOON
    assert result.manual_review_required is False


@pytest.mark.asyncio
async def test_invalid_vehicle() -> None:
    service = VerificationService(MockComplianceProvider())
    result = await service.verify("DL 01 INVALID")
    assert result.status == ComplianceStatus.INVALID
    assert result.manual_review_required is False


@pytest.mark.asyncio
async def test_not_found_vehicle() -> None:
    service = VerificationService(MockComplianceProvider())
    result = await service.verify("DL 01 AB 0000")
    assert result.status == ComplianceStatus.NOT_FOUND
    assert result.manual_review_required is True


@pytest.mark.asyncio
async def test_low_ocr_confidence() -> None:
    service = VerificationService(MockComplianceProvider(), ocr_confidence_threshold=0.85)
    result = await service.verify("DL 01 AB 1234", ocr_confidence=0.75)
    assert result.status == ComplianceStatus.MANUAL_REVIEW
    assert result.manual_review_required is True


@pytest.mark.asyncio
async def test_high_ocr_confidence_proceeds() -> None:
    service = VerificationService(MockComplianceProvider(), ocr_confidence_threshold=0.85)
    result = await service.verify("DL 01 AB 1234", ocr_confidence=0.95)
    assert result.status == ComplianceStatus.VALID
    assert result.manual_review_required is False


@pytest.mark.asyncio
async def test_provider_timeout() -> None:
    service = VerificationService(MockComplianceProvider())
    result = await service.verify("DL 01 TIMEOUT")
    assert result.status == ComplianceStatus.PROVIDER_UNAVAILABLE
    assert result.manual_review_required is True


@pytest.mark.asyncio
async def test_provider_error() -> None:
    service = VerificationService(MockComplianceProvider())
    result = await service.verify("DL 01 ERROR")
    assert result.status == ComplianceStatus.PROVIDER_UNAVAILABLE
    assert result.manual_review_required is True


@pytest.mark.asyncio
async def test_malformed_registration() -> None:
    service = VerificationService(MockComplianceProvider())
    with pytest.raises(InvalidRegistrationError):
        await service.verify("D@L#01!")


@pytest.mark.asyncio
async def test_registration_normalization() -> None:
    service = VerificationService(MockComplianceProvider())
    normalized = service.normalize_registration("  dl-01 ab 1234  ")
    assert normalized == "DL01AB1234"
