import { prisma } from "../db";
import { OrderStatus, ReservationStatus } from "@prisma/client";
import { getAvailableRolls } from "./finished-goods-service";

export class StockReservationError extends Error {
  requestedRolls: number;
  availableRolls: number;
  shortageRolls: number;

  constructor(requestedRolls: number, availableRolls: number) {
    const shortageRolls = requestedRolls - availableRolls;
    super(
      `Insufficient finished stock to confirm order. Requested: ${requestedRolls} rolls, Available: ${availableRolls} rolls, Shortage: ${shortageRolls} rolls.`
    );
    this.name = "StockReservationError";
    this.requestedRolls = requestedRolls;
    this.availableRolls = availableRolls;
    this.shortageRolls = shortageRolls;
  }
}

/**
 * Atomically confirms a customer order and reserves finished rolls.
 * Enforces strict transactional concurrency:
 * - Re-reads available stock inside transaction
 * - Rejects if available < requested
 * - Prevents duplicate reservation if order is already confirmed
 */
export async function confirmOrderAndReserveStock(
  orderId: string,
  userId: string
) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.customerOrder.findUnique({
      where: { id: orderId },
      include: {
        reservations: {
          where: { status: ReservationStatus.ACTIVE },
        },
      },
    });

    if (!order) {
      throw new Error(`Order '${orderId}' not found.`);
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new Error(
        `Cannot confirm order with status '${order.status}'. Only PENDING orders can be confirmed.`
      );
    }

    if (order.reservations.length > 0) {
      throw new Error("Order already has an active stock reservation.");
    }

    // Acquire exclusive row lock on tape specification in MySQL to serialize concurrent reservations
    await tx.$queryRaw`SELECT id FROM tape_specifications WHERE id = ${order.specificationId} FOR UPDATE`;

    // Check available finished stock for this specification inside transaction
    const availableRolls = await getAvailableRolls(order.specificationId, tx);
    if (availableRolls < order.wholeRolls) {
      throw new StockReservationError(order.wholeRolls, availableRolls);
    }

    const refNumber = `RES-${order.orderNumber}-${Date.now()}`;

    // Create reservation
    const reservation = await tx.stockReservation.create({
      data: {
        referenceNumber: refNumber,
        orderId: order.id,
        specificationId: order.specificationId,
        reservedRolls: order.wholeRolls,
        status: ReservationStatus.ACTIVE,
      },
    });

    // Update order status to CONFIRMED
    const updatedOrder = await tx.customerOrder.update({
      where: { id: order.id },
      data: { status: OrderStatus.CONFIRMED },
    });

    // Record audit log
    await tx.auditLog.create({
      data: {
        entityType: "StockReservation",
        entityId: reservation.id,
        action: "STOCK_RESERVED",
        details: JSON.stringify({
          orderId: order.id,
          orderNumber: order.orderNumber,
          reservedRolls: order.wholeRolls,
          referenceNumber: refNumber,
        }),
        userId,
      },
    });

    return {
      order: updatedOrder,
      reservation,
    };
  });
}
