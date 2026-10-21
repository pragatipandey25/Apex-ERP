import { prisma } from "../db";
import {
  OrderStatus,
  ReservationStatus,
  FinishedMovementType,
} from "@prisma/client";
import { Decimal } from "../decimal";
import { calculateRollBOM } from "../bom";

export interface CreateDispatchInput {
  orderId: string;
  wholeRollsDispatched: number;
  notes?: string;
  userId: string;
}

/**
 * Executes a partial or full dispatch for a confirmed order atomically.
 * Updates:
 * 1. Finished goods ledger (records deduction)
 * 2. Active stock reservation (decrements or fulfills)
 * 3. Order status (PARTIALLY_DISPATCHED or FULFILLED)
 * 4. Dispatch record
 * 5. Audit log
 */
export async function executeDispatch(input: CreateDispatchInput) {
  const rollsToDispatch = input.wholeRollsDispatched;
  if (!Number.isInteger(rollsToDispatch) || rollsToDispatch <= 0) {
    throw new Error("Dispatched rolls must be a positive whole integer.");
  }

  return prisma.$transaction(async (tx) => {
    // Acquire exclusive row lock on the customer order in MySQL to serialize concurrent dispatches
    await tx.$queryRaw`SELECT id FROM customer_orders WHERE id = ${input.orderId} FOR UPDATE`;

    // 1. Fetch Order with Specification, Reservations, and Dispatches
    const order = await tx.customerOrder.findUnique({
      where: { id: input.orderId },
      include: {
        specification: true,
        reservations: {
          where: { status: ReservationStatus.ACTIVE },
        },
        dispatches: true,
      },
    });

    if (!order) {
      throw new Error(`Order '${input.orderId}' not found.`);
    }

    if (
      order.status !== OrderStatus.CONFIRMED &&
      order.status !== OrderStatus.PARTIALLY_DISPATCHED
    ) {
      throw new Error(
        `Cannot dispatch from order in status '${order.status}'. Must be CONFIRMED or PARTIALLY_DISPATCHED.`
      );
    }

    // Calculate previously dispatched rolls
    const previouslyDispatchedRolls = order.dispatches.reduce(
      (sum, d) => sum + d.wholeRollsDispatched,
      0
    );
    const remainingUnshippedRolls = order.wholeRolls - previouslyDispatchedRolls;

    if (rollsToDispatch > remainingUnshippedRolls) {
      throw new Error(
        `Cannot dispatch ${rollsToDispatch} rolls. Remaining unshipped balance is ${remainingUnshippedRolls} rolls.`
      );
    }

    // Check active reservation balance
    const activeReservation = order.reservations[0];
    if (!activeReservation || activeReservation.reservedRolls < rollsToDispatch) {
      const reservedCount = activeReservation ? activeReservation.reservedRolls : 0;
      throw new Error(
        `Cannot dispatch beyond stock reserved for this order. Reserved: ${reservedCount} rolls, Requested: ${rollsToDispatch} rolls.`
      );
    }

    // 2. Calculate Metres and Net Tape Kg from Specification
    const spec = order.specification;
    const specParams = {
      widthMm: spec.widthMm.toString(),
      filmGsm: spec.filmGsm.toString(),
      dryAdhesiveGsm: spec.dryAdhesiveGsm.toString(),
      adhesiveSolidsPercent: spec.adhesiveSolidsPercent.toString(),
      rollLengthM: spec.rollLengthM.toString(),
    };
    const bom = calculateRollBOM(specParams);

    const dispatchedMetres = bom.rollLengthM.times(rollsToDispatch);
    const dispatchedNetKg = bom.netTapeKgPerRoll.times(rollsToDispatch);

    const dispatchNumber = `DSP-${order.orderNumber}-${Date.now()}`;

    // 3. Create Dispatch Record
    const dispatch = await tx.dispatch.create({
      data: {
        dispatchNumber,
        orderId: order.id,
        specificationId: order.specificationId,
        wholeRollsDispatched: rollsToDispatch,
        dispatchedMetres: dispatchedMetres.toString(),
        dispatchedNetKg: dispatchedNetKg.toString(),
        notes: input.notes,
        userId: input.userId,
      },
    });

    // 4. Record Finished Goods Movement (deduction from physical stock)
    await tx.finishedGoodsMovement.create({
      data: {
        referenceNumber: `FG-DSP-${dispatch.dispatchNumber}`,
        specificationId: order.specificationId,
        movementType: FinishedMovementType.ORDER_DISPATCH,
        wholeRolls: -rollsToDispatch, // Negative for dispatch
        netTapeKg: dispatchedNetKg.negated().toString(),
        rollLengthM: bom.rollLengthM.toString(),
        totalMetres: dispatchedMetres.negated().toString(),
        orderId: order.id,
        dispatchId: dispatch.id,
        notes: `Dispatch ${dispatch.dispatchNumber} for order ${order.orderNumber}`,
        userId: input.userId,
      },
    });

    // 5. Update Reservation
    const newReservedRemaining = activeReservation.reservedRolls - rollsToDispatch;
    if (newReservedRemaining === 0) {
      await tx.stockReservation.update({
        where: { id: activeReservation.id },
        data: {
          reservedRolls: 0,
          status: ReservationStatus.FULFILLED,
        },
      });
    } else {
      await tx.stockReservation.update({
        where: { id: activeReservation.id },
        data: {
          reservedRolls: newReservedRemaining,
        },
      });
    }

    // 6. Update Order Status
    const totalDispatchedAfterThis = previouslyDispatchedRolls + rollsToDispatch;
    const isFullyFulfilled = totalDispatchedAfterThis >= order.wholeRolls;
    const nextStatus = isFullyFulfilled
      ? OrderStatus.FULFILLED
      : OrderStatus.PARTIALLY_DISPATCHED;

    const updatedOrder = await tx.customerOrder.update({
      where: { id: order.id },
      data: { status: nextStatus },
    });

    // 7. Record Audit Log
    await tx.auditLog.create({
      data: {
        entityType: "Dispatch",
        entityId: dispatch.id,
        action: isFullyFulfilled ? "ORDER_FULFILLED" : "ORDER_PARTIALLY_DISPATCHED",
        details: JSON.stringify({
          dispatchNumber,
          orderNumber: order.orderNumber,
          rollsDispatched: rollsToDispatch,
          dispatchedMetres: dispatchedMetres.toFixed(2),
          dispatchedNetKg: dispatchedNetKg.toFixed(3),
          totalDispatchedSoFar: totalDispatchedAfterThis,
          totalOrderRolls: order.wholeRolls,
        }),
        userId: input.userId,
      },
    });

    return {
      dispatch,
      order: updatedOrder,
      isFullyFulfilled,
      remainingUnshippedRolls: order.wholeRolls - totalDispatchedAfterThis,
    };
  }, {
    isolationLevel: "ReadCommitted",
  });
}
