export type ComplianceStatus =
  | 'VALID'
  | 'EXPIRING_SOON'
  | 'EXPIRED'
  | 'INVALID'
  | 'NOT_FOUND'
  | 'MANUAL_REVIEW'
  | 'PROVIDER_UNAVAILABLE';

export interface VerificationResult {
  id?: string;
  vehicle_registration: string;
  status: ComplianceStatus;
  compliance_id?: string | null;
  expires_at?: string | null;
  source_reference?: string | null;
  rule_version?: string;
  manual_review_required?: boolean;
}

export interface OcrExtractResponse {
  raw_text: string;
  normalized_registration: string;
  formatted_registration?: string;
  confidence: number;
  engine_name: string;
  manual_review_required: boolean;
  verification_result?: VerificationResult | null;
}

export interface ImageInput {
  uri: string;
  filename: string;
  mimeType: string;
  size: number;
  sha256: string;
  source: 'CAMERA' | 'GALLERY';
}
