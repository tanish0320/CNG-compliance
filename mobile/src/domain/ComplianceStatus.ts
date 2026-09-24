export type ComplianceStatus =
  | "VALID"
  | "EXPIRING_SOON"
  | "EXPIRED"
  | "INVALID"
  | "NOT_FOUND"
  | "MANUAL_REVIEW"
  | "PROVIDER_UNAVAILABLE"
  | "PENDING_VERIFICATION";

export interface VerificationResult {
  id: string;
  vehicle_registration: string;
  status: ComplianceStatus;
  compliance_id?: string | null;
  expires_at?: string | null;
  source_reference?: string | null;
  rule_version: string;
  manual_review_required: boolean;
}

export interface OcrExtractResponse {
  raw_text: string;
  normalized_registration: string;
  confidence: number;
  engine_name: string;
  manual_review_required: boolean;
  verification_result?: VerificationResult | null;
}

export interface ManualReviewConfirmationRequest {
  confirmed_registration: string;
  original_raw_text?: string | null;
  original_confidence?: number | null;
  actor: string;
}

export interface UserSession {
  user_id: string;
  name: string;
  role: "PUMP_OPERATOR" | "ENFORCEMENT_OFFICER" | "SUPERVISOR" | "AUDITOR";
  station_id: string;
  station_name: string;
  token: string;
}
