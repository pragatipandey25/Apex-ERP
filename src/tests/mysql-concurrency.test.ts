import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs";
import { PrismaClient, MaterialType, MaterialMovementType, FinishedMovementType, OrderUnit, OrderStatus } from "@prisma/client";
import { setPrismaClient } from "../lib/db";
import { confirmOrderAndReserveStock, StockReservationError } from "../lib/services/reservation-service";
import { createProductionBatch } from "../lib/services/production-service";
import { ShortageError } from "../lib/services/inventory-service";

function getTestDbUrl(): string {
  const envContent = fs.readFileSync("d:\\apex-erp\\.env", "utf8");
  for (const line of envContent.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.startsWith("DATABASE_URL=")) {
      let val = trimmed.substring("DATABASE_URL=".length).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.substring(1, val.length - 1);
      }
      const urlObj = new URL(val);
      urlObj.pathname = "/apex_tape_factory_test";
      return urlObj.toString();
    }
  }
  throw new Error("DATABASE_URL not found in .env");
}

describe("MySQL Multi-Connection Concurrency & Pessimistic Locking", () => {
  let testPrisma: PrismaClient;

  beforeAll(async () => {
    const testDbUrl = getTestDbUrl();
    testPrisma = new PrismaClient({
      datasources: { db: { url: testDbUrl } },
    });

    // CRITICAL SAFETY CHECK: Independently verify active database name
    const result = await testPrisma.$queryRawUnsafe<Array<{ dbName: string }>>(
      "SELECT DATABASE() as dbName;"
    );
    const activeDb = result[0]?.dbName;
    if (activeDb !== "apex_tape_factory_test") {
      throw new Error(
        `CRITICAL SAFETY ABORT: Expected database 'apex_tape_factory_test' but connected to '${activeDb}'. Tests halted to protect production data.`
      );
    }

    // Direct all service calls to apex_tape_factory_test
    setPrismaClient(testPrisma);
  });

  afterAll(async () => {
    if (testPrisma) {
      await testPrisma.$disconnect();
    }
  });

  it("demonstrates overselling cannot occur when two concurrent orders attempt to reserve stock", async () => {
    // 1. Fetch spec, customer, and admin user from apex_tape_factory_test
    const spec = await testPrisma.tapeSpecification.findUnique({
      where: { code: "APEX-BOPP-48-1000" },
    });
    if (!spec) throw new Error("Specification APEX-BOPP-48-1000 not found");

    const customer = await testPrisma.customer.findFirst();
    if (!customer) throw new Error("Customer not found");

    const user = await testPrisma.user.findFirst();
    if (!user) throw new Error("User not found");

    const testId = `CONCUR-RES-${Date.now()}`;

    // 2. Seed exactly 10 finished rolls
    await testPrisma.finishedGoodsMovement.create({
      data: {
        referenceNumber: `FG-SEED-${testId}`,
        specificationId: spec.id,
        movementType: FinishedMovementType.PRODUCTION_RECEIPT,
        wholeRolls: 10,
        netTapeKg: "22.560",
        rollLengthM: "1000",
        totalMetres: "10000",
        notes: "Concurrency test seed",
        userId: user.id,
      },
    });

    // 3. Create two pending customer orders of 6 rolls each (total 12 rolls requested against 10 available)
    const orderA = await testPrisma.customerOrder.create({
      data: {
        orderNumber: `ORD-A-${testId}`,
        customerId: customer.id,
        specificationId: spec.id,
        requestedQuantity: "6",
        requestedUnit: OrderUnit.ROLLS,
        wholeRolls: 6,
        totalMetres: "6000",
        totalNetKg: "13.536",
        status: OrderStatus.PENDING,
        orderDate: new Date(),
        userId: user.id,
      },
    });

    const orderB = await testPrisma.customerOrder.create({
      data: {
        orderNumber: `ORD-B-${testId}`,
        customerId: customer.id,
        specificationId: spec.id,
        requestedQuantity: "6",
        requestedUnit: OrderUnit.ROLLS,
        wholeRolls: 6,
        totalMetres: "6000",
        totalNetKg: "13.536",
        status: OrderStatus.PENDING,
        orderDate: new Date(),
        userId: user.id,
      },
    });

    // 4. Fire concurrent reservations simultaneously
    const [resultA, resultB] = await Promise.allSettled([
      confirmOrderAndReserveStock(orderA.id, user.id),
      confirmOrderAndReserveStock(orderB.id, user.id),
    ]);

    // 5. Verification: Exactly one succeeded, one failed with StockReservationError
    const succeeded = [resultA, resultB].filter((r) => r.status === "fulfilled");
    const rejected = [resultA, resultB].filter((r) => r.status === "rejected");

    expect(succeeded.length).toBe(1);
    expect(rejected.length).toBe(1);

    const rejection = (rejected[0] as PromiseRejectedResult).reason;
    expect(rejection).toBeInstanceOf(StockReservationError);
    expect(rejection.shortageRolls).toBe(2); // 6 requested - 4 remaining = 2 shortage

    // 6. Verify total active reservations in database is strictly 6, never 12
    const totalReserved = await testPrisma.stockReservation.aggregate({
      where: { specificationId: spec.id, status: "ACTIVE" },
      _sum: { reservedRolls: true },
    });
    expect(totalReserved._sum.reservedRolls).toBe(6);

    // 7. Clean up test records
    await testPrisma.stockReservation.deleteMany({
      where: { orderId: { in: [orderA.id, orderB.id] } },
    });
    await testPrisma.customerOrder.deleteMany({
      where: { id: { in: [orderA.id, orderB.id] } },
    });
    await testPrisma.finishedGoodsMovement.deleteMany({
      where: { referenceNumber: `FG-SEED-${testId}` },
    });
  });

  it("demonstrates overconsumption cannot occur when two concurrent batches compete for raw stock", async () => {
    const spec = await testPrisma.tapeSpecification.findUnique({
      where: { code: "APEX-BOPP-48-1000" },
    });
    if (!spec) throw new Error("Specification not found");

    const user = await testPrisma.user.findFirst();
    if (!user) throw new Error("User not found");

    const testId = `CONCUR-PROD-${Date.now()}`;

    // Seed raw materials: 100 kg Film, 300 kg Adhesive, 200 Cores
    await testPrisma.materialInventoryMovement.createMany({
      data: [
        {
          referenceNumber: `REC-FILM-${testId}`,
          materialType: MaterialType.FILM,
          movementType: MaterialMovementType.RECEIPT,
          quantity: "100.000",
          unit: "kg",
          userId: user.id,
        },
        {
          referenceNumber: `REC-ADH-${testId}`,
          materialType: MaterialType.LIQUID_ADHESIVE,
          movementType: MaterialMovementType.RECEIPT,
          quantity: "300.000",
          unit: "kg",
          userId: user.id,
        },
        {
          referenceNumber: `REC-CORE-${testId}`,
          materialType: MaterialType.CORE,
          movementType: MaterialMovementType.RECEIPT,
          quantity: "200.000",
          unit: "pieces",
          userId: user.id,
        },
      ],
    });

    // Two concurrent batches of 60 rolls each.
    // Each 60 rolls requires: 60 * 1.200 = 72 kg film, 60 * 2.112 = 126.720 kg adhesive, 60 cores.
    // Total film required for both = 144 kg, but only 100 kg is in stock!
    const batchInput1 = {
      batchNumber: `BATCH-A-${testId}`,
      productionDate: new Date(),
      specificationId: spec.id,
      wholeRolls: 60,
      filmIssuedKg: "72.000",
      liquidAdhesiveIssuedKg: "126.720",
      dryWastageKg: "0.000",
      userId: user.id,
    };

    const batchInput2 = {
      batchNumber: `BATCH-B-${testId}`,
      productionDate: new Date(),
      specificationId: spec.id,
      wholeRolls: 60,
      filmIssuedKg: "72.000",
      liquidAdhesiveIssuedKg: "126.720",
      dryWastageKg: "0.000",
      userId: user.id,
    };

    const [batch1Res, batch2Res] = await Promise.allSettled([
      createProductionBatch(batchInput1),
      createProductionBatch(batchInput2),
    ]);

    const succeeded = [batch1Res, batch2Res].filter((r) => r.status === "fulfilled");
    const rejected = [batch1Res, batch2Res].filter((r) => r.status === "rejected");

    // Exactly 1 must succeed, 1 must fail with ShortageError
    expect(succeeded.length).toBe(1);
    expect(rejected.length).toBe(1);

    const rejection = (rejected[0] as PromiseRejectedResult).reason;
    expect(rejection).toBeInstanceOf(ShortageError);
    expect(rejection.materialType).toBe(MaterialType.FILM);

    // Verify remaining film in database is 28.000 kg (100 - 72 = 28), strictly non-negative!
    const filmSum = await testPrisma.materialInventoryMovement.aggregate({
      where: { materialType: MaterialType.FILM },
      _sum: { quantity: true },
    });
    expect(parseFloat(filmSum._sum.quantity?.toString() || "0")).toBe(28.0);

    // Clean up test batch and test movements
    const successfulBatchId = (succeeded[0] as any).value?.batch?.id;
    if (successfulBatchId) {
      await testPrisma.materialInventoryMovement.deleteMany({
        where: { batchId: successfulBatchId },
      });
      await testPrisma.finishedGoodsMovement.deleteMany({
        where: { batchId: successfulBatchId },
      });
      await testPrisma.productionBatch.deleteMany({
        where: { id: successfulBatchId },
      });
    }
    await testPrisma.materialInventoryMovement.deleteMany({
      where: {
        referenceNumber: { in: [`REC-FILM-${testId}`, `REC-ADH-${testId}`, `REC-CORE-${testId}`] },
      },
    });
  });
});
