import { prisma } from "../db";
import { MaterialMovementType, FinishedMovementType, Role } from "@prisma/client";
import { Decimal } from "../decimal";
import { getMaterialBalance } from "./inventory-service";
import { getAvailableRolls } from "./finished-goods-service";

export interface CreateCorrectionInput {
  originalTransactionReference: string;
  transactionType: "MATERIAL_MOVEMENT" | "FINISHED_MOVEMENT";
  newQuantity: Decimal.Value;
  reason: string;
  adminUserId: string;
  adminRole: Role;
}

/**
 * Executes an audited, admin-only correction on a posted movement.
 * - Enforces ADMIN role at the service layer (Staff receives error).
 * - Never deletes or overwrites existing posted rows.
 * - Records a TransactionCorrection audit entry with before/after payloads.
 * - Posts a compensating CORRECTION_ADJUSTMENT ledger entry.
 * - Pre-validates that resulting stock will not become negative or violate invariants.
 */
export async function executeCorrection(input: CreateCorrectionInput) {
  // Service-level role enforcement
  if (input.adminRole !== Role.ADMIN) {
    throw new Error("Forbidden: Only an Admin user can execute audited corrections.");
  }

  if (!input.reason || input.reason.trim().length < 5) {
    throw new Error("A comprehensive reason (at least 5 characters) is required for audit compliance.");
  }

  const targetQty = new Decimal(input.newQuantity);

  return prisma.$transaction(async (tx) => {
    const correctionRef = `CORR-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    if (input.transactionType === "MATERIAL_MOVEMENT") {
      const origMovement = await tx.materialInventoryMovement.findUnique({
        where: { referenceNumber: input.originalTransactionReference },
      });

      if (!origMovement) {
        throw new Error(
          `Original material movement '${input.originalTransactionReference}' not found.`
        );
      }

      const origQty = new Decimal(origMovement.quantity.toString());
      // Quantity delta needed to adjust the ledger: adjustment = newQuantity - originalQuantity
      // Note: for receipts, quantities are positive. For issues/damages, negative.
      const deltaQty = targetQty.minus(origQty);

      if (deltaQty.isZero()) {
        throw new Error("New quantity is identical to existing quantity. No correction needed.");
      }

      // Check resulting balance after applying delta
      const currentBalance = await getMaterialBalance(origMovement.materialType, tx);
      const resultingBalance = currentBalance.plus(deltaQty);

      if (resultingBalance.lessThan(0)) {
        throw new Error(
          `Correction rejected: Applying this adjustment would cause negative raw material stock for ${
            origMovement.materialType
          }. Current: ${currentBalance.toFixed(3)}, Adjustment: ${deltaQty.toFixed(
            3
          )}, Resulting: ${resultingBalance.toFixed(3)}.`
        );
      }

      // Record compensating movement
      await tx.materialInventoryMovement.create({
        data: {
          referenceNumber: `ADJ-${correctionRef}`,
          materialType: origMovement.materialType,
          movementType: MaterialMovementType.CORRECTION_ADJUSTMENT,
          quantity: deltaQty.toString(),
          unit: origMovement.unit,
          reason: `Correction of ${origMovement.referenceNumber}: ${input.reason}`,
          notes: `Adjusted from ${origQty.toFixed(3)} to ${targetQty.toFixed(3)}`,
          userId: input.adminUserId,
        },
      });

      // Record TransactionCorrection
      const correction = await tx.transactionCorrection.create({
        data: {
          correctionReference: correctionRef,
          originalTransactionReference: origMovement.referenceNumber,
          transactionType: "MATERIAL_MOVEMENT",
          beforePayload: JSON.stringify({
            referenceNumber: origMovement.referenceNumber,
            quantity: origQty.toFixed(3),
            materialType: origMovement.materialType,
            movementType: origMovement.movementType,
          }),
          afterPayload: JSON.stringify({
            referenceNumber: origMovement.referenceNumber,
            correctedQuantity: targetQty.toFixed(3),
            adjustmentDelta: deltaQty.toFixed(3),
          }),
          deltaSummary: `Adjusted ${origMovement.materialType} by ${deltaQty.toFixed(3)} ${origMovement.unit}`,
          reason: input.reason,
          adminUserId: input.adminUserId,
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          entityType: "TransactionCorrection",
          entityId: correction.id,
          action: "MATERIAL_CORRECTION_APPLIED",
          details: JSON.stringify({
            correctionRef,
            originalRef: origMovement.referenceNumber,
            delta: deltaQty.toFixed(3),
            reason: input.reason,
          }),
          userId: input.adminUserId,
        },
      });

      return {
        correction,
        adjustmentDelta: deltaQty.toFixed(3),
        resultingBalance: resultingBalance.toFixed(3),
      };
    }

    if (input.transactionType === "FINISHED_MOVEMENT") {
      const origMovement = await tx.finishedGoodsMovement.findUnique({
        where: { referenceNumber: input.originalTransactionReference },
      });

      if (!origMovement) {
        throw new Error(
          `Original finished movement '${input.originalTransactionReference}' not found.`
        );
      }

      const origRolls = origMovement.wholeRolls;
      const targetRolls = targetQty.toNumber();

      if (!Number.isInteger(targetRolls)) {
        throw new Error("Corrected roll quantity must be an integer.");
      }

      const deltaRolls = targetRolls - origRolls;

      if (deltaRolls === 0) {
        throw new Error("Target rolls match existing rolls. No correction needed.");
      }

      // Check resulting finished stock and reservations
      const currentAvailable = await getAvailableRolls(origMovement.specificationId, tx);
      const resultingAvailable = currentAvailable + deltaRolls;

      if (resultingAvailable < 0) {
        throw new Error(
          `Correction rejected: Applying this adjustment would cause negative available finished stock or violate active reservations. Current available: ${currentAvailable}, Adjustment: ${deltaRolls}, Resulting: ${resultingAvailable}.`
        );
      }

      const rollLengthM = new Decimal(origMovement.rollLengthM.toString());
      const netKgPerRoll = new Decimal(origMovement.netTapeKg.toString()).dividedBy(
        Math.abs(origRolls) || 1
      );

      const deltaMetres = rollLengthM.times(deltaRolls);
      const deltaNetKg = netKgPerRoll.times(deltaRolls);

      // Record compensating movement
      await tx.finishedGoodsMovement.create({
        data: {
          referenceNumber: `ADJ-${correctionRef}`,
          specificationId: origMovement.specificationId,
          movementType: FinishedMovementType.CORRECTION_ADJUSTMENT,
          wholeRolls: deltaRolls,
          netTapeKg: deltaNetKg.toString(),
          rollLengthM: rollLengthM.toString(),
          totalMetres: deltaMetres.toString(),
          reason: `Correction of ${origMovement.referenceNumber}: ${input.reason}`,
          userId: input.adminUserId,
        },
      });

      const correction = await tx.transactionCorrection.create({
        data: {
          correctionReference: correctionRef,
          originalTransactionReference: origMovement.referenceNumber,
          transactionType: "FINISHED_MOVEMENT",
          beforePayload: JSON.stringify({
            referenceNumber: origMovement.referenceNumber,
            wholeRolls: origRolls,
          }),
          afterPayload: JSON.stringify({
            referenceNumber: origMovement.referenceNumber,
            correctedRolls: targetRolls,
            deltaRolls,
          }),
          deltaSummary: `Adjusted finished rolls by ${deltaRolls}`,
          reason: input.reason,
          adminUserId: input.adminUserId,
        },
      });

      await tx.auditLog.create({
        data: {
          entityType: "TransactionCorrection",
          entityId: correction.id,
          action: "FINISHED_GOODS_CORRECTION_APPLIED",
          details: JSON.stringify({
            correctionRef,
            originalRef: origMovement.referenceNumber,
            deltaRolls,
            reason: input.reason,
          }),
          userId: input.adminUserId,
        },
      });

      return {
        correction,
        adjustmentDelta: deltaRolls,
        resultingAvailable,
      };
    }

    throw new Error(`Unsupported transaction type for correction: ${input.transactionType}`);
  });
}

/**
 * Retrieves all audited corrections with admin user details.
 */
export async function getCorrectionsHistory() {
  return prisma.transactionCorrection.findMany({
    include: {
      adminUser: {
        select: { id: true, name: true, email: true, role: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}
