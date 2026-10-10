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


class VehicleDetails(BaseModel):
    registration_no: str
    formatted_registration: str | None = None
    state_code: str | None = None
    rto_name: str | None = None
    vehicle_class: str | None = None
    maker_model: str | None = None
    fuel_type: str | None = None
    chassis_no: str | None = None
    engine_no: str | None = None
    fitment_type: str | None = None
    kit_serial_no: str | None = None
    kit_manufacturer: str | None = None
    cylinder_serial_no: str | None = None
    cylinder_water_capacity_liters: float | None = None
    last_hydro_test_date: str | None = None
    next_hydro_test_due: str | None = None
    compliance_plate_no: str | None = None
    testing_agency: str | None = None
    compliance_status: str | None = None
    compliance_reason: str | None = None
    fueling_permission: str | None = None
    matched_via_fuzzy: bool = False


class ProviderRecord(BaseModel):
    vehicle_registration: str
    compliance_id: str | None = None
    source_reference: str | None = None
    source_timestamp: datetime | None = None
    issued_at: datetime | None = None
    expires_at: datetime | None = None
    is_valid: bool | None = None
    vehicle_details: VehicleDetails | None = None


class VerificationResult(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    vehicle_registration: str
    status: ComplianceStatus
    compliance_id: str | None = None
    expires_at: datetime | None = None
    source_reference: str | None = None
    rule_version: str = "v1"
    manual_review_required: bool = False
    vehicle_details: VehicleDetails | None = None


class OcrExtractResponse(BaseModel):
    raw_text: str
    normalized_registration: str
    formatted_registration: str = ""
    confidence: float = Field(ge=0, le=1)
    engine_name: str = "PaddleOCR"
    detection_source: str = "ocr"
    manual_review_required: bool = False
    verification_result: VerificationResult | None = None


class ManualReviewConfirmationRequest(BaseModel):
    confirmed_registration: str = Field(min_length=4, max_length=20)
    original_raw_text: str | None = None
    original_confidence: float | None = Field(default=None, ge=0, le=1)
    actor: str = Field(default="operator")
