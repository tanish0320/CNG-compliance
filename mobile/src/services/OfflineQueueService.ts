import AsyncStorage from "@react-native-async-storage/async-storage";
import type { VerificationResult } from "../domain/ComplianceStatus";
import type { VerificationApi } from "./VerificationApi";

export type QueueStatus = "PENDING" | "SYNCING" | "RETRY_PENDING" | "SYNCED" | "FAILED";

export interface QueuedVerificationItem {
  client_operation_id: string;
  idempotency_key: string;
  registration: string;
  ocr_confidence: number | null;
  ocr_metadata: Record<string, any> | null;
  captured_timestamp: string;
  queue_status: QueueStatus;
  attempt_count: number;
  last_attempt_timestamp: string | null;
  next_retry_timestamp: string | null;
  last_error: string | null;
  server_verification_id: string | null;
  server_result: VerificationResult | null;
}

const STORAGE_KEY = "@cng_compliance_offline_queue_v1";

export class OfflineQueueService {
  private inMemoryLocks: Set<string> = new Set();

  public constructor(private readonly api: VerificationApi) {}

  public async getQueue(): Promise<QueuedVerificationItem[]> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as QueuedVerificationItem[];
    } catch {
      return [];
    }
  }

  public async saveQueue(items: QueuedVerificationItem[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  public async enqueue(
    registration: string,
    ocrConfidence?: number | null,
    ocrMetadata?: Record<string, any> | null
  ): Promise<QueuedVerificationItem> {
    const queue = await this.getQueue();
    const id = this.generateUUID();
    const idempotencyKey = this.generateUUID(); // Idempotency key generated ONCE on creation

    const item: QueuedVerificationItem = {
      client_operation_id: id,
      idempotency_key: idempotencyKey,
      registration,
      ocr_confidence: ocrConfidence ?? null,
      ocr_metadata: ocrMetadata ?? null,
      captured_timestamp: new Date().toISOString(),
      queue_status: "PENDING",
      attempt_count: 0,
      last_attempt_timestamp: null,
      next_retry_timestamp: null,
      last_error: null,
      server_verification_id: null,
      server_result: null,
    };

    queue.push(item);
    await this.saveQueue(queue);
    return item;
  }

  public async processQueue(): Promise<void> {
    const queue = await this.getQueue();
    const now = new Date();

    for (const item of queue) {
      if (item.queue_status === "SYNCED" || item.queue_status === "FAILED") {
        continue;
      }

      // Check if next retry timestamp is in the future
      if (item.next_retry_timestamp && new Date(item.next_retry_timestamp) > now) {
        continue;
      }

      // Prevent concurrent worker processing using concurrency lock
      if (this.inMemoryLocks.has(item.client_operation_id)) {
        continue;
      }

      // Lock item
      this.inMemoryLocks.add(item.client_operation_id);

      try {
        // State transition: PENDING / RETRY_PENDING -> SYNCING
        item.queue_status = "SYNCING";
        item.attempt_count += 1;
        item.last_attempt_timestamp = new Date().toISOString();
        await this.saveQueue(queue);

        // Execute API verification reusing exact same idempotency_key
        const result = await this.api.verify(
          item.registration,
          item.ocr_confidence,
          item.idempotency_key
        );

        // State transition: SYNCING -> SYNCED
        item.queue_status = "SYNCED";
        item.server_verification_id = result.id;
        item.server_result = result;
        item.last_error = null;
        item.next_retry_timestamp = null;
        await this.saveQueue(queue);
      } catch (err: any) {
        const errorMsg = err?.message || String(err);
        const isPermanent = errorMsg.includes("400") || errorMsg.includes("Invalid vehicle registration");

        if (isPermanent || item.attempt_count >= 5) {
          // State transition: SYNCING -> FAILED
          item.queue_status = "FAILED";
          item.last_error = errorMsg;
          item.next_retry_timestamp = null;
        } else {
          // Transient failure: SYNCING -> RETRY_PENDING with exponential backoff
          item.queue_status = "RETRY_PENDING";
          item.last_error = errorMsg;
          const backoffSeconds = Math.pow(2, item.attempt_count) * 2; // 4s, 8s, 16s, 32s
          item.next_retry_timestamp = new Date(Date.now() + backoffSeconds * 1000).toISOString();
        }
        await this.saveQueue(queue);
      } finally {
        this.inMemoryLocks.delete(item.client_operation_id);
      }
    }
  }

  public async retryFailedItem(clientOperationId: string): Promise<void> {
    const queue = await this.getQueue();
    const item = queue.find((i) => i.client_operation_id === clientOperationId);
    if (!item) return;

    item.queue_status = "PENDING";
    item.attempt_count = 0;
    item.next_retry_timestamp = null;
    item.last_error = null;
    await this.saveQueue(queue);
    await this.processQueue();
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
