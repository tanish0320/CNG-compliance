export type ComplianceStatus =
  | 'VALID'
  | 'EXPIRING_SOON'
  | 'EXPIRED'
  | 'INVALID'
  | 'NOT_FOUND'
  | 'MANUAL_REVIEW'
  | 'PROVIDER_UNAVAILABLE';

export interface VehicleDetails {
  registration_no: string;
  formatted_registration?: string | null;
  state_code?: string | null;
  rto_name?: string | null;
  vehicle_class?: string | null;
  maker_model?: string | null;
  fuel_type?: string | null;
  chassis_no?: string | null;
  engine_no?: string | null;
  fitment_type?: string | null;
  kit_serial_no?: string | null;
  kit_manufacturer?: string | null;
  cylinder_serial_no?: string | null;
  cylinder_water_capacity_liters?: number | null;
  last_hydro_test_date?: string | null;
  next_hydro_test_due?: string | null;
  compliance_plate_no?: string | null;
  testing_agency?: string | null;
  compliance_status?: string | null;
  compliance_reason?: string | null;
  fueling_permission?: string | null;
  matched_via_fuzzy?: boolean;
}

export interface VerificationResult {
  id?: string;
  vehicle_registration: string;
  status: ComplianceStatus;
  compliance_id?: string | null;
  expires_at?: string | null;
  source_reference?: string | null;
  rule_version?: string;
  manual_review_required?: boolean;
  vehicle_details?: VehicleDetails | null;
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
