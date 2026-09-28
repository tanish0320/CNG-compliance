import { CurrentEnvironment } from "../config/Environment";
import type {
  ManualReviewConfirmationRequest,
  OcrExtractResponse,
  VerificationResult,
} from "../domain/ComplianceStatus";
import { SecureStorageService } from "./SecureStorageService";

export class VerificationApi {
  public constructor(private readonly baseUrl: string = CurrentEnvironment.apiBaseUrl) {}

  public async checkHealth(): Promise<{ status: string }> {
    const response = await fetch(`${this.baseUrl}/health`);
    if (!response.ok) {
      throw new Error(`Health check failed with HTTP ${response.status}`);
    }
    return (await response.json()) as { status: string };
  }

  public async verify(
    vehicleRegistration: string,
    ocrConfidence?: number | null,
    idempotencyKey?: string
  ): Promise<VerificationResult> {
    const key = idempotencyKey || this.generateUUID();
    const token = await SecureStorageService.getAccessToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Idempotency-Key": key,
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}/api/v1/verifications`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        vehicle_registration: vehicleRegistration,
        ocr_confidence: ocrConfidence ?? null,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message = errorData.detail || `Verification failed with HTTP ${response.status}`;
      throw new Error(message);
    }

    return (await response.json()) as VerificationResult;
  }

  public async extractOcr(
    imageBlob: Blob | { uri: string; type: string; name: string },
    fileName: string = "plate.jpg",
    idempotencyKey?: string
  ): Promise<OcrExtractResponse> {
    const targetUrl = `${this.baseUrl}/api/v1/ocr/extract`;
    const key = idempotencyKey || this.generateUUID();
    const token = await SecureStorageService.getAccessToken();

    console.log("[OCR_DIAGNOSTICS] Starting OCR request...");
    console.log("[OCR_DIAGNOSTICS] Exact URL:", targetUrl);
    console.log("[OCR_DIAGNOSTICS] HTTP Method: POST");
    console.log("[OCR_DIAGNOSTICS] Image Payload:", JSON.stringify(imageBlob));

    const formData = new FormData();
    formData.append("file", imageBlob as any, fileName);

    const headers: Record<string, string> = {
      "Idempotency-Key": key,
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const startTime = Date.now();
    try {
      const response = await fetch(targetUrl, {
        method: "POST",
        headers,
        body: formData,
      });

      const durationMs = Date.now() - startTime;
      console.log(`[OCR_DIAGNOSTICS] Response status: ${response.status} (${durationMs}ms)`);

      const responseText = await response.text();
      console.log("[OCR_DIAGNOSTICS] Response Body:", responseText);

      if (!response.ok) {
        let message = `OCR extraction failed with HTTP ${response.status}`;
        try {
          const parsed = JSON.parse(responseText);
          if (parsed.detail) message = parsed.detail;
        } catch (_) {}
        throw new Error(message);
      }

      return JSON.parse(responseText) as OcrExtractResponse;
    } catch (err: any) {
      console.error("[OCR_DIAGNOSTICS] OCR Request Exception:", err?.message || err);
      throw err;
    }
  }

  public async confirmManualReview(
    payload: ManualReviewConfirmationRequest,
    idempotencyKey?: string
  ): Promise<VerificationResult> {
    const key = idempotencyKey || this.generateUUID();
    const token = await SecureStorageService.getAccessToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Idempotency-Key": key,
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(
      `${this.baseUrl}/api/v1/verifications/confirm-manual-review`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message =
        errorData.detail || `Manual review confirmation failed with HTTP ${response.status}`;
      throw new Error(message);
    }

    return (await response.json()) as VerificationResult;
  }

  private generateUUID(): string {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}
