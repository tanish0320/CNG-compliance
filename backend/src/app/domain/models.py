from datetime import datetime
from enum import StrEnum
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class ComplianceStatus(StrEnum):
    VALID = "VALID"
    EXPIRING_SOON = "EXPIRING_SOON"
    EXPIRED = "EXPIRED"
    INVALID = "INVALID"
    NOT_FOUND = "NOT_FOUND"
    MANUAL_REVIEW = "MANUAL_REVIEW"
    PROVIDER_UNAVAILABLE = "PROVIDER_UNAVAILABLE"


class VerificationRequest(BaseModel):
    vehicle_registration: str = Field(min_length=4, max_length=20)
    ocr_confidence: float | None = Field(default=None, ge=0, le=1)


class ProviderRecord(BaseModel):
    vehicle_registration: str
    compliance_id: str | None = None
    source_reference: str | None = None
    source_timestamp: datetime | None = None
    issued_at: datetime | None = None
    expires_at: datetime | None = None
    is_valid: bool | None = None


class VerificationResult(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    vehicle_registration: str
    status: ComplianceStatus
    compliance_id: str | None = None
    expires_at: datetime | None = None
    source_reference: str | None = None
    rule_version: str = "v1"
    manual_review_required: bool = False


class OcrExtractResponse(BaseModel):
    raw_text: str
    normalized_registration: str
    confidence: float = Field(ge=0, le=1)
    engine_name: str = "PaddleOCR"
    manual_review_required: bool = False
    verification_result: VerificationResult | None = None


class ManualReviewConfirmationRequest(BaseModel):
    confirmed_registration: str = Field(min_length=4, max_length=20)
    original_raw_text: str | None = None
    original_confidence: float | None = Field(default=None, ge=0, le=1)
    actor: str = Field(default="operator")
