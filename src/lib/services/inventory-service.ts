import { prisma } from "../db";
import { MaterialType, MaterialMovementType } from "@prisma/client";
import { Decimal } from "../decimal";

export interface MaterialBalance {
  materialType: MaterialType;
  availableQuantity: Decimal;
  unit: string;
}

export class ShortageError extends Error {
  materialType: MaterialType;
  requestedQuantity: Decimal;
  availableQuantity: Decimal;
  shortageQuantity: Decimal;

  constructor(
    materialType: MaterialType,
    requestedQuantity: Decimal,
    availableQuantity: Decimal
  ) {
    const shortageQuantity = requestedQuantity.minus(availableQuantity);
    super(
      `Insufficient inventory for ${materialType}. Requested: ${requestedQuantity.toFixed(
        3
      )}, Available: ${availableQuantity.toFixed(
        3
      )}, Shortage: ${shortageQuantity.toFixed(3)}.`
    );
    this.name = "ShortageError";
    this.materialType = materialType;
    this.requestedQuantity = requestedQuantity;
    this.availableQuantity = availableQuantity;
    this.shortageQuantity = shortageQuantity;
  }
}

/**
 * Calculates current on-hand stock for a specific material from the movement ledger.
 * Sums all posted movements: receipts (+), production issues (-), damage (-), adjustments (+/-).
 */
export async function getMaterialBalance(
  materialType: MaterialType,
  tx?: any
): Promise<Decimal> {
  const client = tx || prisma;
  const result = await client.materialInventoryMovement.aggregate({
    where: { materialType },
    _sum: { quantity: true },
  });

  return new Decimal(result._sum.quantity?.toString() || "0");
}

/**
 * Retrieves balances for all 3 raw materials.
 */
export async function getAllMaterialBalances(tx?: any): Promise<Record<MaterialType, Decimal>> {
  const [film, adhesive, cores] = await Promise.all([
    getMaterialBalance(MaterialType.FILM, tx),
    getMaterialBalance(MaterialType.LIQUID_ADHESIVE, tx),
    getMaterialBalance(MaterialType.CORE, tx),
  ]);

  return {
    [MaterialType.FILM]: film,
    [MaterialType.LIQUID_ADHESIVE]: adhesive,
    [MaterialType.CORE]: cores,
  };
}

/**
 * Posts a raw material receipt transaction atomically.
 */
export async function recordMaterialReceipt(params: {
  materialType: MaterialType;
  quantity: Decimal.Value;
  unit: string;
  referenceNumber?: string;
  notes?: string;
  userId: string;
}) {
  const qty = new Decimal(params.quantity);
  if (qty.lessThanOrEqualTo(0)) {
    throw new Error("Receipt quantity must be strictly positive.");
  }

  const refNumber =
    params.referenceNumber ||
    `REC-${params.materialType.substring(0, 3)}-${Date.now()}-${Math.floor(
      Math.random() * 1000
    )}`;

  return prisma.$transaction(async (tx) => {
    const movement = await tx.materialInventoryMovement.create({
      data: {
        referenceNumber: refNumber,
        materialType: params.materialType,
        movementType: MaterialMovementType.RECEIPT,
        quantity: qty.toString(),
        unit: params.unit,
        notes: params.notes,
        userId: params.userId,
      },
    });

    await tx.auditLog.create({
      data: {
        entityType: "MaterialInventoryMovement",
        entityId: movement.id,
        action: "MATERIAL_RECEIPT",
        details: JSON.stringify({
          materialType: params.materialType,
          quantity: qty.toFixed(3),
          unit: params.unit,
          referenceNumber: refNumber,
        }),
        userId: params.userId,
      },
    });

    return movement;
  });
}

/**
 * Posts a raw material damage transaction atomically.
 * Rejects if inventory is insufficient.
 */
export async function recordMaterialDamage(params: {
  materialType: MaterialType;
  quantity: Decimal.Value;
  reason: string;
  notes?: string;
  userId: string;
}) {
  const qty = new Decimal(params.quantity);
  if (qty.lessThanOrEqualTo(0)) {
    throw new Error("Damage quantity must be strictly positive.");
  }

  return prisma.$transaction(async (tx) => {
    // Check available balance before deducting
    const currentBalance = await getMaterialBalance(params.materialType, tx);
    if (currentBalance.lessThan(qty)) {
      throw new ShortageError(params.materialType, qty, currentBalance);
    }

    const refNumber = `DAM-${params.materialType.substring(0, 3)}-${Date.now()}-${Math.floor(
      Math.random() * 1000
    )}`;

    // Negative quantity represents deduction from stock
    const negativeQty = qty.negated();
    const unit = params.materialType === MaterialType.CORE ? "pieces" : "kg";

    const movement = await tx.materialInventoryMovement.create({
      data: {
        referenceNumber: refNumber,
        materialType: params.materialType,
        movementType: MaterialMovementType.DAMAGE,
        quantity: negativeQty.toString(),
        unit,
        reason: params.reason,
        notes: params.notes,
        userId: params.userId,
      },
    });

    await tx.auditLog.create({
      data: {
        entityType: "MaterialInventoryMovement",
        entityId: movement.id,
        action: "MATERIAL_DAMAGE",
        details: JSON.stringify({
          materialType: params.materialType,
          quantity: qty.toFixed(3),
          reason: params.reason,
          referenceNumber: refNumber,
        }),
        userId: params.userId,
      },
    });

    return movement;
  });
}
