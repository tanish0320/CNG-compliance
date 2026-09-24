import AsyncStorage from "@react-native-async-storage/async-storage";
import { OfflineQueueService } from "../services/OfflineQueueService";
import type { VerificationApi } from "../services/VerificationApi";
import type { VerificationResult } from "../domain/ComplianceStatus";

jest.mock("@react-native-async-storage/async-storage", () => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn(async (key: string) => store[key] || null),
    setItem: jest.fn(async (key: string, val: string) => {
      store[key] = val;
    }),
    clear: jest.fn(async () => {
      store = {};
    }),
  };
});

describe("OfflineQueueService", () => {
  let mockApi: jest.Mocked<VerificationApi>;
  let queueService: OfflineQueueService;

  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.clear();

    mockApi = {
      verify: jest.fn(),
      checkHealth: jest.fn(),
      extractOcr: jest.fn(),
      confirmManualReview: jest.fn(),
    } as any;

    queueService = new OfflineQueueService(mockApi);
  });

  test("enqueue creates item with unique operation ID and durable PENDING status", async () => {
    const item = await queueService.enqueue("DL01AB1234", 0.95);
    expect(item.client_operation_id).toBeDefined();
    expect(item.idempotency_key).toBeDefined();
    expect(item.queue_status).toBe("PENDING");

    const queue = await queueService.getQueue();
    expect(queue.length).toBe(1);
    expect(queue[0].registration).toBe("DL01AB1234");
  });

  test("processQueue reuses exact same idempotency_key on retry attempts", async () => {
    const item = await queueService.enqueue("DL01AB1234", 0.90);
    const originalKey = item.idempotency_key;

    // Fail first attempt with transient network error
    mockApi.verify.mockRejectedValueOnce(new Error("Network Error 503"));

    await queueService.processQueue();

    let queue = await queueService.getQueue();
    expect(queue[0].queue_status).toBe("RETRY_PENDING");
    expect(queue[0].attempt_count).toBe(1);
    expect(queue[0].idempotency_key).toBe(originalKey); // Key preserved!

    // Reset next_retry_timestamp for immediate second attempt
    queue[0].next_retry_timestamp = null;
    await queueService.saveQueue(queue);

    // Second attempt succeeds
    const mockResult: VerificationResult = {
      id: "srv-uuid-123",
      vehicle_registration: "DL01AB1234",
      status: "VALID" as any,
      compliance_id: "CNG-99",
      expires_at: "2027-01-01T00:00:00Z",
      source_reference: "MOCK",
      rule_version: "v1",
      manual_review_required: false,
    };
    mockApi.verify.mockResolvedValueOnce(mockResult);

    await queueService.processQueue();

    // Verification call received exact same original idempotency key!
    expect(mockApi.verify).toHaveBeenLastCalledWith("DL01AB1234", 0.90, originalKey);

    queue = await queueService.getQueue();
    expect(queue[0].queue_status).toBe("SYNCED");
    expect(queue[0].server_result?.status).toBe("VALID");
  });

  test("permanent error transitions status directly to FAILED", async () => {
    await queueService.enqueue("INVALID_REG", 0.88);
    mockApi.verify.mockRejectedValueOnce(new Error("HTTP 400: Invalid vehicle registration"));

    await queueService.processQueue();

    const queue = await queueService.getQueue();
    expect(queue[0].queue_status).toBe("FAILED");
    expect(queue[0].last_error).toContain("400");
  });
});
