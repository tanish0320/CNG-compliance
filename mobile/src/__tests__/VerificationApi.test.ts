import { VerificationApi } from "../services/VerificationApi";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => {}),
  removeItem: jest.fn(async () => {}),
}));

describe("VerificationApi Client", () => {
  const baseUrl = "http://localhost:8000";
  let api: VerificationApi;

  beforeEach(() => {
    api = new VerificationApi(baseUrl);
    (global as any).fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it("calls health check endpoint", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: "ok" }),
    });

    const res = await api.checkHealth();
    expect(res.status).toBe("ok");
    expect(global.fetch).toHaveBeenCalledWith(`${baseUrl}/health`);
  });

  it("posts verification request with Idempotency-Key", async () => {
    const mockResult = {
      id: "test-uuid-123",
      vehicle_registration: "DL01AB1234",
      status: "VALID",
      rule_version: "v1",
      manual_review_required: false,
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResult,
    });

    const res = await api.verify("DL01AB1234", 0.95, "custom-idempotency-key");
    expect(res.status).toBe("VALID");
    expect(global.fetch).toHaveBeenCalledWith(
      `${baseUrl}/api/v1/verifications`,
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": "custom-idempotency-key",
        },
      })
    );
  });

  it("handles OCR extraction request", async () => {
    const mockOcrResponse = {
      raw_text: "DL 01 AB 1234",
      normalized_registration: "DL01AB1234",
      confidence: 0.95,
      engine_name: "PaddleOCR",
      manual_review_required: false,
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockOcrResponse,
    });

    const fakeBlob = new Blob(["fake-img-data"], { type: "image/png" });
    const res = await api.extractOcr(fakeBlob);
    expect(res.normalized_registration).toBe("DL01AB1234");
    expect(global.fetch).toHaveBeenCalledWith(
      `${baseUrl}/api/v1/ocr/extract`,
      expect.objectContaining({
        method: "POST",
      })
    );
  });

  it("handles manual review confirmation request", async () => {
    const mockConfirmedResult = {
      id: "confirmed-uuid",
      vehicle_registration: "DL01AB1234",
      status: "VALID",
      rule_version: "v1",
      manual_review_required: false,
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockConfirmedResult,
    });

    const res = await api.confirmManualReview(
      {
        confirmed_registration: "DL01AB1234",
        original_raw_text: "DL 01 AB 1234 LOW_CONF",
        original_confidence: 0.65,
        actor: "operator-101",
      },
      "confirm-key-1"
    );

    expect(res.status).toBe("VALID");
    expect(global.fetch).toHaveBeenCalledWith(
      `${baseUrl}/api/v1/verifications/confirm-manual-review`,
      expect.objectContaining({
        method: "POST",
      })
    );
  });
});
