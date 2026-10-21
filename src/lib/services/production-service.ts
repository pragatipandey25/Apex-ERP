import { prisma } from "../db";
import {
  MaterialType,
  MaterialMovementType,
  FinishedMovementType,
} from "@prisma/client";
import { Decimal } from "../decimal";
import { calculateRollBOM } from "../bom";
import {
  verifyProductionBalance,
  PRODUCTION_BALANCE_TOLERANCE_KG,
} from "../production-balance";
import { ShortageError, getMaterialBalance } from "./inventory-service";

export interface CreateProductionBatchInput {
  batchNumber: string;
  productionDate: string | Date;
  specificationId: string;
  wholeRolls: number;
  filmIssuedKg: Decimal.Value;
  liquidAdhesiveIssuedKg: Decimal.Value;
  dryWastageKg: Decimal.Value;
  notes?: string;
  idempotencyKey?: string;
  userId: string;
}

/**
 * Creates and posts a production batch in a single atomic database transaction.
 * Performs rigorous multi-point validation:
 * 1. Idempotency check
 * 2. Specification existence
 * 3. Exact production balance equation verification
 * 4. Raw material stock sufficiency (Film, Adhesive, Cores)
 * 5. Atomic deductions of raw materials
 * 6. Atomic credit of finished rolls to finished goods ledger
 * 7. Locks specification from future edits
 * 8. Creates audit log
 */
export async function createProductionBatch(input: CreateProductionBatchInput) {
  // 1. Idempotency Check
  if (input.idempotencyKey) {
    const existingRecord = await prisma.idempotencyRecord.findUnique({
      where: { key: input.idempotencyKey },
    });
    if (existingRecord) {
      return JSON.parse(existingRecord.responseBody);
    }
  }

  // 2. Fetch Specification
  const spec = await prisma.tapeSpecification.findUnique({
    where: { id: input.specificationId },
  });
  if (!spec) {
    throw new Error(`Tape specification with ID '${input.specificationId}' not found.`);
  }

  const specParams = {
    widthMm: spec.widthMm.toString(),
    filmGsm: spec.filmGsm.toString(),
    dryAdhesiveGsm: spec.dryAdhesiveGsm.toString(),
    adhesiveSolidsPercent: spec.adhesiveSolidsPercent.toString(),
    rollLengthM: spec.rollLengthM.toString(),
  };

  // 3. Verify Production Balance Equation
  const balanceResult = verifyProductionBalance({
    specParams,
    wholeRolls: input.wholeRolls,
    filmIssuedKg: input.filmIssuedKg,
    liquidAdhesiveIssuedKg: input.liquidAdhesiveIssuedKg,
    dryWastageKg: input.dryWastageKg,
  });

  if (!balanceResult.isValid) {
    throw new Error(balanceResult.errorMessage);
  }

  const filmIssued = new Decimal(input.filmIssuedKg);
  const liquidAdhesiveIssued = new Decimal(input.liquidAdhesiveIssuedKg);
  const dryWastage = new Decimal(input.dryWastageKg);
  const rollsCount = input.wholeRolls;
  const coresRequired = rollsCount;

  // Single Atomic Database Transaction
  const result = await prisma.$transaction(async (tx) => {
    // Check batch number uniqueness
    const existingBatch = await tx.productionBatch.findUnique({
      where: { batchNumber: input.batchNumber },
    });
    if (existingBatch) {
      throw new Error(`Batch number '${input.batchNumber}' already exists.`);
    }

    // Acquire exclusive row lock on the tape specification in MySQL to serialize concurrent batch creation
    await tx.$queryRaw`SELECT id FROM tape_specifications WHERE id = ${input.specificationId} FOR UPDATE`;

    // 4. Validate Raw Material Stocks
    const filmStock = await getMaterialBalance(MaterialType.FILM, tx);
    if (filmStock.lessThan(filmIssued)) {
      throw new ShortageError(MaterialType.FILM, filmIssued, filmStock);
    }

    const adhesiveStock = await getMaterialBalance(MaterialType.LIQUID_ADHESIVE, tx);
    if (adhesiveStock.lessThan(liquidAdhesiveIssued)) {
      throw new ShortageError(MaterialType.LIQUID_ADHESIVE, liquidAdhesiveIssued, adhesiveStock);
    }

    const coreStock = await getMaterialBalance(MaterialType.CORE, tx);
    if (coreStock.lessThan(coresRequired)) {
      throw new ShortageError(MaterialType.CORE, new Decimal(coresRequired), coreStock);
    }

    // 5. Create the Production Batch record
    const batch = await tx.productionBatch.create({
      data: {
        batchNumber: input.batchNumber,
        productionDate: new Date(input.productionDate),
        specificationId: input.specificationId,
        wholeRolls: rollsCount,
        filmIssuedKg: filmIssued.toString(),
        liquidAdhesiveIssuedKg: liquidAdhesiveIssued.toString(),
        dryWastageKg: dryWastage.toString(),
        theoreticalNetTapeKg: balanceResult.netTapeProducedKg.toString(),
        balanceDifferenceKg: balanceResult.signedDifferenceKg.toString(),
        notes: input.notes,
        idempotencyKey: input.idempotencyKey,
        userId: input.userId,
      },
    });

    // 6. Record Raw Material Deductions (negative quantity)
    // Film Issue
    await tx.materialInventoryMovement.create({
      data: {
        referenceNumber: `ISS-FILM-${batch.batchNumber}`,
        materialType: MaterialType.FILM,
        movementType: MaterialMovementType.PRODUCTION_ISSUE,
        quantity: filmIssued.negated().toString(),
        unit: "kg",
        batchId: batch.id,
        notes: `Production batch ${batch.batchNumber} consumption`,
        userId: input.userId,
      },
    });

    // Liquid Adhesive Issue
    await tx.materialInventoryMovement.create({
      data: {
        referenceNumber: `ISS-ADH-${batch.batchNumber}`,
        materialType: MaterialType.LIQUID_ADHESIVE,
        movementType: MaterialMovementType.PRODUCTION_ISSUE,
        quantity: liquidAdhesiveIssued.negated().toString(),
        unit: "kg",
        batchId: batch.id,
        notes: `Production batch ${batch.batchNumber} consumption`,
        userId: input.userId,
      },
    });

    // Core Issue (1 per roll)
    await tx.materialInventoryMovement.create({
      data: {
        referenceNumber: `ISS-CORE-${batch.batchNumber}`,
        materialType: MaterialType.CORE,
        movementType: MaterialMovementType.PRODUCTION_ISSUE,
        quantity: new Decimal(coresRequired).negated().toString(),
        unit: "pieces",
        batchId: batch.id,
        notes: `Production batch ${batch.batchNumber} cores`,
        userId: input.userId,
      },
    });

    // 7. Record Finished Goods Receipt (positive whole rolls and kg)
    const rollBom = calculateRollBOM(specParams);
    const totalMetres = rollBom.rollLengthM.times(rollsCount);
    const netTapeKg = rollBom.netTapeKgPerRoll.times(rollsCount);

    await tx.finishedGoodsMovement.create({
      data: {
        referenceNumber: `FG-REC-${batch.batchNumber}`,
        specificationId: input.specificationId,
        batchId: batch.id,
        movementType: FinishedMovementType.PRODUCTION_RECEIPT,
        wholeRolls: rollsCount,
        netTapeKg: netTapeKg.toString(),
        rollLengthM: rollBom.rollLengthM.toString(),
        totalMetres: totalMetres.toString(),
        notes: `Finished tape received from batch ${batch.batchNumber}`,
        userId: input.userId,
      },
    });

    // 8. Lock Specification (Immutable once used in production)
    if (!spec.isUsedInProduction) {
      await tx.tapeSpecification.update({
        where: { id: input.specificationId },
        data: { isUsedInProduction: true },
      });
    }

    // 9. Record Audit Log
    await tx.auditLog.create({
      data: {
        entityType: "ProductionBatch",
        entityId: batch.id,
        action: "PRODUCTION_BATCH_CREATED",
        details: JSON.stringify({
          batchNumber: batch.batchNumber,
          wholeRolls: rollsCount,
          filmIssuedKg: filmIssued.toFixed(3),
          liquidAdhesiveIssuedKg: liquidAdhesiveIssued.toFixed(3),
          dryWastageKg: dryWastage.toFixed(3),
          balanceDifferenceKg: balanceResult.signedDifferenceKg.toFixed(4),
        }),
        userId: input.userId,
      },
    });

    const responsePayload = {
      success: true,
      batch,
      balanceResult: {
        isValid: balanceResult.isValid,
        signedDifferenceKg: balanceResult.signedDifferenceKg.toFixed(4),
        netTapeProducedKg: balanceResult.netTapeProducedKg.toFixed(3),
      },
    };

    // 10. Record Idempotency key if provided
    if (input.idempotencyKey) {
      await tx.idempotencyRecord.create({
        data: {
          key: input.idempotencyKey,
          endpoint: "/api/production/batches",
          responseCode: 200,
          responseBody: JSON.stringify(responsePayload),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
    }

    return responsePayload;
  }, {
    isolationLevel: "ReadCommitted",
  });

  return result;
}
