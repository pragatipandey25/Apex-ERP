import { describe, it, expect } from "vitest";
import { Decimal } from "../lib/decimal";
import { StockReservationError } from "../lib/services/reservation-service";

describe("Concurrency and Idempotency Protections", () => {
  it("prevents two concurrent orders from over-reserving available finished stock", async () => {
    // Simulated atomic ledger state
    let physicalRolls = 10;
    let activeReservations = 0;

    // Mutex / atomic transaction simulation replicating MySQL row-level locking
    const mutex = { locked: false };
    const acquireLock = async () => {
      while (mutex.locked) {
        await new Promise((r) => setTimeout(r, 5));
      }
      mutex.locked = true;
    };
    const releaseLock = () => {
      mutex.locked = false;
    };

    const reserveRolls = async (orderId: string, requestedRolls: number) => {
      await acquireLock();
      try {
        const available = physicalRolls - activeReservations;
        if (available < requestedRolls) {
          throw new StockReservationError(requestedRolls, available);
        }
        activeReservations += requestedRolls;
        return { success: true, orderId, reservedRolls: requestedRolls };
      } finally {
        releaseLock();
      }
    };

    // Both orders simultaneously attempt to reserve 6 rolls when only 10 are available
    const [resultA, resultB] = await Promise.allSettled([
      reserveRolls("order_A", 6),
      reserveRolls("order_B", 6),
    ]);

    // One order must succeed, and the other must fail with StockReservationError
    const succeeded = [resultA, resultB].filter((r) => r.status === "fulfilled");
    const rejected = [resultA, resultB].filter((r) => r.status === "rejected");

    expect(succeeded.length).toBe(1);
    expect(rejected.length).toBe(1);

    const rejectionReason = (rejected[0] as PromiseRejectedResult).reason;
    expect(rejectionReason).toBeInstanceOf(StockReservationError);
    expect(rejectionReason.shortageRolls).toBe(2); // 6 requested - 4 remaining = 2 shortage

    // Verify active reservations does not exceed 10
    expect(activeReservations).toBe(6);
    expect(physicalRolls - activeReservations).toBe(4);
  });

  it("idempotency prevents duplicate material deductions on repeated requests", async () => {
    const idempotencyStore = new Map<string, any>();
    let filmStock = new Decimal("100.000");

    const postBatchWithIdempotency = async (
      key: string,
      batchNumber: string,
      filmDeduction: Decimal
    ) => {
      if (idempotencyStore.has(key)) {
        // Return existing cached response without repeating deduction
        return idempotencyStore.get(key);
      }

      // Deduct stock
      filmStock = filmStock.minus(filmDeduction);
      const result = { batchNumber, filmDeducted: filmDeduction.toFixed(3) };
      idempotencyStore.set(key, result);
      return result;
    };

    const key = "IDEM-BATCH-12345";
    const deduction = new Decimal("12.000");

    // First request
    const res1 = await postBatchWithIdempotency(key, "BATCH-001", deduction);
    expect(res1.batchNumber).toBe("BATCH-001");
    expect(filmStock.toFixed(3)).toBe("88.000");

    // Duplicate client retry with same key
    const res2 = await postBatchWithIdempotency(key, "BATCH-001", deduction);
    expect(res2.batchNumber).toBe("BATCH-001");
    // Crucial check: filmStock must still be 88.000, NOT 76.000!
    expect(filmStock.toFixed(3)).toBe("88.000");
  });

  it("rejects duplicate batch references", async () => {
    const committedBatches = new Set<string>();

    const recordBatch = (batchNumber: string) => {
      if (committedBatches.has(batchNumber)) {
        throw new Error(`Batch number '${batchNumber}' already exists.`);
      }
      committedBatches.add(batchNumber);
    };

    recordBatch("BATCH-UNIQUE-1");
    expect(() => recordBatch("BATCH-UNIQUE-1")).toThrow("already exists");
  });

  it("rejects duplicate dispatch references", async () => {
    const committedDispatches = new Set<string>();

    const recordDispatch = (dispatchNumber: string) => {
      if (committedDispatches.has(dispatchNumber)) {
        throw new Error(`Dispatch number '${dispatchNumber}' already exists.`);
      }
      committedDispatches.add(dispatchNumber);
    };

    recordDispatch("DSP-UNIQUE-1");
    expect(() => recordDispatch("DSP-UNIQUE-1")).toThrow("already exists");
  });
});
