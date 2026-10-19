import { prisma } from "../db";
import { Decimal, formatKg, formatMetres } from "../decimal";
import { FinishedMovementType, ReservationStatus } from "@prisma/client";
import { calculateRollBOM } from "../bom";

export interface FinishedGoodsSummary {
  specificationId: string;
  specificationCode: string;
  specificationName: string;
  widthMm: number;
  rollLengthM: number;
  netWeightKgPerRoll: number;
  physicalRolls: number;
  reservedRolls: number;
  availableRolls: number;
  dispatchedRolls: number;
  availableMetres: string;
  reservedMetres: string;
  availableNetKg: string;
  reservedNetKg: string;
}

/**
 * Calculates current finished stock by specification reconciled with the movement ledger:
 * - Physical Rolls = Sum of all FinishedGoodsMovement wholeRolls (RECEIPTS + ADJUSTMENTS - DISPATCHES)
 * - Reserved Rolls = Sum of active StockReservation reservedRolls
 * - Available Rolls = Physical Rolls - Reserved Rolls
 * - Dispatched Rolls = Total rolls marked as dispatched
 */
export async function getFinishedGoodsSummary(
  specificationId?: string,
  tx?: any
): Promise<FinishedGoodsSummary[]> {
  const client = tx || prisma;

  const specs = await client.tapeSpecification.findMany({
    where: specificationId ? { id: specificationId } : undefined,
    orderBy: { code: "asc" },
  });

  const summaries: FinishedGoodsSummary[] = [];

  for (const spec of specs) {
    const specParams = {
      widthMm: spec.widthMm.toString(),
      filmGsm: spec.filmGsm.toString(),
      dryAdhesiveGsm: spec.dryAdhesiveGsm.toString(),
      adhesiveSolidsPercent: spec.adhesiveSolidsPercent.toString(),
      rollLengthM: spec.rollLengthM.toString(),
    };
    const bom = calculateRollBOM(specParams);

    // Sum physical rolls from ledger (Production Receipts positive, Dispatches negative, Adjustments +/-)
    const ledgerSum = await client.finishedGoodsMovement.aggregate({
      where: { specificationId: spec.id },
      _sum: { wholeRolls: true },
    });
    const physicalRolls = ledgerSum._sum.wholeRolls || 0;

    // Sum active reservations
    const reservationsSum = await client.stockReservation.aggregate({
      where: {
        specificationId: spec.id,
        status: ReservationStatus.ACTIVE,
      },
      _sum: { reservedRolls: true },
    });
    const reservedRolls = reservationsSum._sum.reservedRolls || 0;

    // Sum dispatched rolls
    const dispatchesSum = await client.dispatch.aggregate({
      where: { specificationId: spec.id },
      _sum: { wholeRollsDispatched: true },
    });
    const dispatchedRolls = dispatchesSum._sum.wholeRollsDispatched || 0;

    const availableRolls = Math.max(0, physicalRolls - reservedRolls);

    const availableMetres = bom.rollLengthM.times(availableRolls);
    const reservedMetres = bom.rollLengthM.times(reservedRolls);
    const availableNetKg = bom.netTapeKgPerRoll.times(availableRolls);
    const reservedNetKg = bom.netTapeKgPerRoll.times(reservedRolls);

    summaries.push({
      specificationId: spec.id,
      specificationCode: spec.code,
      specificationName: spec.name,
      widthMm: spec.widthMm.toNumber(),
      rollLengthM: spec.rollLengthM.toNumber(),
      netWeightKgPerRoll: bom.netTapeKgPerRoll.toNumber(),
      physicalRolls,
      reservedRolls,
      availableRolls,
      dispatchedRolls,
      availableMetres: formatMetres(availableMetres),
      reservedMetres: formatMetres(reservedMetres),
      availableNetKg: formatKg(availableNetKg),
      reservedNetKg: formatKg(reservedNetKg),
    });
  }

  return summaries;
}

/**
 * Returns available whole rolls for a specific specification.
 */
export async function getAvailableRolls(
  specificationId: string,
  tx?: any
): Promise<number> {
  const summaries = await getFinishedGoodsSummary(specificationId, tx);
  return summaries.length > 0 ? summaries[0].availableRolls : 0;
}
