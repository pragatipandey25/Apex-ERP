import { prisma } from "../db";
import { OrderStatus, ReservationStatus } from "@prisma/client";

export interface CancelOrderInput {
  orderId: string;
  reason?: string;
  userId: string;
}

/**
 * Cancels the remaining unshipped balance of an order atomically.
 * - Releases only the remaining reserved rolls.
 * - Never alters or reverses already dispatched quantities.
 * - Preserves order history, dispatches, and records an audit log.
 */
export async function cancelOrder(input: CancelOrderInput) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.customerOrder.findUnique({
      where: { id: input.orderId },
      include: {
        reservations: {
          where: { status: ReservationStatus.ACTIVE },
        },
        dispatches: true,
      },
    });

    if (!order) {
      throw new Error(`Order '${input.orderId}' not found.`);
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new Error(`Order '${order.orderNumber}' is already cancelled.`);
    }

    if (order.status === OrderStatus.FULFILLED) {
      throw new Error(
        `Cannot cancel order '${order.orderNumber}' because it is already completely fulfilled.`
      );
    }

    // Release only active reservations
    let releasedRolls = 0;
    for (const res of order.reservations) {
      releasedRolls += res.reservedRolls;
      await tx.stockReservation.update({
        where: { id: res.id },
        data: {
          status: ReservationStatus.RELEASED,
        },
      });
    }

    // Update order status to CANCELLED
    const updatedOrder = await tx.customerOrder.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.CANCELLED,
        notes: order.notes
          ? `${order.notes}\n[Cancelled]: ${input.reason || "Cancelled by user"}`
          : `[Cancelled]: ${input.reason || "Cancelled by user"}`,
      },
    });

    // Audit log
    await tx.auditLog.create({
      data: {
        entityType: "CustomerOrder",
        entityId: order.id,
        action: "ORDER_CANCELLED",
        details: JSON.stringify({
          orderNumber: order.orderNumber,
          previousStatus: order.status,
          releasedRolls,
          dispatchesRetainedCount: order.dispatches.length,
          reason: input.reason || "No reason specified",
        }),
        userId: input.userId,
      },
    });

    return {
      order: updatedOrder,
      releasedRolls,
    };
  });
}
