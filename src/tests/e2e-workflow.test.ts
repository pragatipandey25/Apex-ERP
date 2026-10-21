import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs";
import { PrismaClient, MaterialType, MaterialMovementType, OrderUnit, OrderStatus, Role } from "@prisma/client";
import { setPrismaClient } from "../lib/db";
import { recordMaterialReceipt, getAllMaterialBalances } from "../lib/services/inventory-service";
import { calculateBatchBOM } from "../lib/bom";
import { createProductionBatch } from "../lib/services/production-service";
import { getFinishedGoodsSummary } from "../lib/services/finished-goods-service";
import { createCustomerOrder } from "../lib/services/order-service";
import { confirmOrderAndReserveStock } from "../lib/services/reservation-service";
import { executeDispatch } from "../lib/services/dispatch-service";
import { cancelOrder } from "../lib/services/cancellation-service";
import { executeCorrection } from "../lib/services/correction-service";

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

describe("End-to-End Factory Workflow & Ledger Reconciliation (apex_tape_factory_test)", () => {
  let testPrisma: PrismaClient;
  let adminUser: any;
  let staffUser: any;
  let dummySpec: any;
  let dummyCustomer: any;

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
        `CRITICAL SAFETY ABORT: Connected to '${activeDb}' instead of 'apex_tape_factory_test'. Tests aborted.`
      );
    }

    setPrismaClient(testPrisma);

    // Fetch baseline seeded entities from apex_tape_factory_test
    adminUser = await testPrisma.user.findUnique({ where: { email: "admin@apexdemo.local" } });
    staffUser = await testPrisma.user.findUnique({ where: { email: "staff@apexdemo.local" } });
    dummySpec = await testPrisma.tapeSpecification.findUnique({ where: { code: "APEX-BOPP-48-1000" } });
    dummyCustomer = await testPrisma.customer.findFirst();

    if (!adminUser || !staffUser || !dummySpec || !dummyCustomer) {
      throw new Error("Required seeded entities not found in apex_tape_factory_test");
    }
  });

  afterAll(async () => {
    if (testPrisma) {
      // Clean up test database back to baseline
      await testPrisma.stockReservation.deleteMany();
      await testPrisma.dispatch.deleteMany();
      await testPrisma.finishedGoodsMovement.deleteMany();
      await testPrisma.materialInventoryMovement.deleteMany();
      await testPrisma.customerOrder.deleteMany();
      await testPrisma.productionBatch.deleteMany();
      await testPrisma.transactionCorrection.deleteMany();
      await testPrisma.auditLog.deleteMany();
      await testPrisma.tapeSpecification.updateMany({ data: { isUsedInProduction: false } });
      await testPrisma.$disconnect();
    }
  });

  it("Step 1: Raw material receipts increase only the target materials", async () => {
    // Receive 500 kg Film, 1,000 kg Adhesive, 200 Cores
    const filmRec = await recordMaterialReceipt({
      materialType: MaterialType.FILM,
      quantity: "500.000",
      unit: "kg",
      referenceNumber: "REC-E2E-FILM-001",
      notes: "E2E delivery batch A",
      userId: staffUser.id,
    });

    const adhRec = await recordMaterialReceipt({
      materialType: MaterialType.LIQUID_ADHESIVE,
      quantity: "1000.000",
      unit: "kg",
      referenceNumber: "REC-E2E-ADH-001",
      notes: "E2E delivery drum B",
      userId: staffUser.id,
    });

    const coreRec = await recordMaterialReceipt({
      materialType: MaterialType.CORE,
      quantity: "200.000",
      unit: "pieces",
      referenceNumber: "REC-E2E-CORE-001",
      notes: "E2E pallet C",
      userId: staffUser.id,
    });

    expect(filmRec.referenceNumber).toBe("REC-E2E-FILM-001");
    expect(adhRec.referenceNumber).toBe("REC-E2E-ADH-001");
    expect(coreRec.referenceNumber).toBe("REC-E2E-CORE-001");

    // Verify balances
    const balances = await getAllMaterialBalances(testPrisma);
    expect(balances[MaterialType.FILM].toFixed(3)).toBe("500.000");
    expect(balances[MaterialType.LIQUID_ADHESIVE].toFixed(3)).toBe("1000.000");
    expect(balances[MaterialType.CORE].toNumber()).toBe(200);
  });

  it("Step 2: BOM calculator accurately predicts 50-roll batch consumption", () => {
    const bom = calculateBatchBOM(
      {
        widthMm: dummySpec.widthMm.toString(),
        filmGsm: dummySpec.filmGsm.toString(),
        dryAdhesiveGsm: dummySpec.dryAdhesiveGsm.toString(),
        adhesiveSolidsPercent: dummySpec.adhesiveSolidsPercent.toString(),
        rollLengthM: dummySpec.rollLengthM.toString(),
      },
      50
    );

    // 50 rolls * 1.200 kg = 60.000 kg Film
    expect(bom.filmTotalKg.toFixed(3)).toBe("60.000");
    // 50 rolls * 2.112 kg = 105.600 kg Liquid Adhesive
    expect(bom.liquidAdhesiveTotalKg.toFixed(3)).toBe("105.600");
    // 50 rolls * 2.256 kg = 112.800 kg Net Tape
    expect(bom.netTapeTotalKg.toFixed(3)).toBe("112.800");
    // 50 cores
    expect(bom.coresTotal).toBe(50);
  });

  it("Step 3: Execute production batch of 50 rolls with exact mass-balance equation", async () => {
    const batchResult = await createProductionBatch({
      batchNumber: "BATCH-E2E-001",
      productionDate: new Date(),
      specificationId: dummySpec.id,
      wholeRolls: 50,
      filmIssuedKg: "60.000",
      liquidAdhesiveIssuedKg: "105.600",
      dryWastageKg: "0.000",
      notes: "E2E shift production",
      userId: staffUser.id,
    });

    expect(batchResult.success).toBe(true);
    expect(batchResult.batch.batchNumber).toBe("BATCH-E2E-001");
    expect(batchResult.balanceResult.isValid).toBe(true);
    expect(batchResult.balanceResult.signedDifferenceKg).toBe("0.0000");

    // Verify raw material deductions
    const balances = await getAllMaterialBalances(testPrisma);
    expect(balances[MaterialType.FILM].toFixed(3)).toBe("440.000"); // 500 - 60
    expect(balances[MaterialType.LIQUID_ADHESIVE].toFixed(3)).toBe("894.400"); // 1000 - 105.6
    expect(balances[MaterialType.CORE].toNumber()).toBe(150); // 200 - 50

    // Verify specification is now locked and immutable
    const updatedSpec = await testPrisma.tapeSpecification.findUnique({
      where: { id: dummySpec.id },
    });
    expect(updatedSpec?.isUsedInProduction).toBe(true);
  });

  it("Step 4: Reconcile finished goods inventory after production", async () => {
    const summaries = await getFinishedGoodsSummary(dummySpec.id, testPrisma);
    expect(summaries.length).toBe(1);

    const fg = summaries[0];
    expect(fg.physicalRolls).toBe(50);
    expect(fg.reservedRolls).toBe(0);
    expect(fg.availableRolls).toBe(50);
    expect(fg.dispatchedRolls).toBe(0);
    expect(fg.availableMetres).toBe("50000.00");
    expect(fg.availableNetKg).toBe("112.800");
  });

  it("Step 5: Create and confirm customer order of 20 rolls with atomic stock reservation", async () => {
    // Create customer order for 20 rolls
    const order = await createCustomerOrder({
      customerId: dummyCustomer.id,
      specificationId: dummySpec.id,
      requestedQuantity: 20,
      requestedUnit: OrderUnit.ROLLS,
      orderDate: new Date(),
      notes: "E2E commercial order",
      userId: staffUser.id,
    });

    expect(order.status).toBe(OrderStatus.PENDING);
    expect(order.wholeRolls).toBe(20);

    // Confirm order and atomically reserve stock
    const confirmResult = await confirmOrderAndReserveStock(order.id, staffUser.id);
    expect(confirmResult.order.status).toBe(OrderStatus.CONFIRMED);
    expect(confirmResult.reservation.reservedRolls).toBe(20);

    // Verify finished stock reconciliation: available = 30, reserved = 20, physical = 50
    const summaries = await getFinishedGoodsSummary(dummySpec.id, testPrisma);
    const fg = summaries[0];
    expect(fg.physicalRolls).toBe(50);
    expect(fg.reservedRolls).toBe(20);
    expect(fg.availableRolls).toBe(30);
  });

  it("Step 6: Execute partial dispatch of 10 rolls", async () => {
    const order = await testPrisma.customerOrder.findFirst({
      where: { status: OrderStatus.CONFIRMED },
    });
    if (!order) throw new Error("Confirmed order not found");

    const dispatchResult = await executeDispatch({
      orderId: order.id,
      wholeRollsDispatched: 10,
      notes: "E2E delivery partial shipment 1",
      userId: staffUser.id,
    });

    expect(dispatchResult.dispatch.wholeRollsDispatched).toBe(10);
    expect(dispatchResult.order.status).toBe(OrderStatus.PARTIALLY_DISPATCHED);
    expect(dispatchResult.isFullyFulfilled).toBe(false);
    expect(dispatchResult.remainingUnshippedRolls).toBe(10);

    // Reconcile finished goods stock:
    // Physical = 40 (50 - 10)
    // Reserved = 10 (20 - 10)
    // Dispatched = 10
    // Available = 30 (40 - 10)
    const summaries = await getFinishedGoodsSummary(dummySpec.id, testPrisma);
    const fg = summaries[0];
    expect(fg.physicalRolls).toBe(40);
    expect(fg.reservedRolls).toBe(10);
    expect(fg.dispatchedRolls).toBe(10);
    expect(fg.availableRolls).toBe(30);
  });

  it("Step 7: Cancel remaining unshipped balance (10 rolls) and verify dispatched stock is preserved", async () => {
    const order = await testPrisma.customerOrder.findFirst({
      where: { status: OrderStatus.PARTIALLY_DISPATCHED },
    });
    if (!order) throw new Error("Partially dispatched order not found");

    const cancelResult = await cancelOrder({
      orderId: order.id,
      reason: "E2E partial balance cancellation",
      userId: staffUser.id,
    });

    expect(cancelResult.order.status).toBe(OrderStatus.CANCELLED);
    expect(cancelResult.releasedRolls).toBe(10);

    // Reconcile finished goods stock:
    // Reserved rolls released = 0
    // Physical = 40
    // Available = 40
    // Dispatched = 10 preserved
    const summaries = await getFinishedGoodsSummary(dummySpec.id, testPrisma);
    const fg = summaries[0];
    expect(fg.physicalRolls).toBe(40);
    expect(fg.reservedRolls).toBe(0);
    expect(fg.dispatchedRolls).toBe(10);
    expect(fg.availableRolls).toBe(40);
  });

  it("Step 8: Admin audited correction applies compensating adjustment while Staff is rejected", async () => {
    const origReceipt = await testPrisma.materialInventoryMovement.findUnique({
      where: { referenceNumber: "REC-E2E-FILM-001" },
    });
    if (!origReceipt) throw new Error("Original receipt not found");

    // 1. Verify Staff role is rejected at service layer with Forbidden error
    await expect(
      executeCorrection({
        originalTransactionReference: origReceipt.referenceNumber,
        transactionType: "MATERIAL_MOVEMENT",
        newQuantity: "490.000",
        reason: "Unauthorized staff correction attempt",
        adminUserId: staffUser.id,
        adminRole: Role.STAFF,
      })
    ).rejects.toThrow("Forbidden: Only an Admin user can execute audited corrections");

    // 2. Admin executes audited correction (adjust from 500.000 kg to 490.000 kg, delta = -10.000 kg)
    const correctionResult = await executeCorrection({
      originalTransactionReference: origReceipt.referenceNumber,
      transactionType: "MATERIAL_MOVEMENT",
      newQuantity: "490.000",
      reason: "Tare weight adjustment after scale calibration audit",
      adminUserId: adminUser.id,
      adminRole: Role.ADMIN,
    });

    expect(correctionResult.adjustmentDelta).toBe("-10.000");

    // 3. Verify net Film inventory is updated: was 440.000 kg, after -10.000 kg adjustment becomes 430.000 kg
    const balances = await getAllMaterialBalances(testPrisma);
    expect(balances[MaterialType.FILM].toFixed(3)).toBe("430.000");

    // 4. Verify original transaction movement record was preserved (never hard-deleted)
    const intactOrig = await testPrisma.materialInventoryMovement.findUnique({
      where: { referenceNumber: "REC-E2E-FILM-001" },
    });
    expect(intactOrig).not.toBeNull();
    expect(parseFloat(intactOrig?.quantity.toString() || "0")).toBe(500.0);
  });
});
