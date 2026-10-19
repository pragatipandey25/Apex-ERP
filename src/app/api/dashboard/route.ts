import { NextResponse } from "next/server";
import { authenticateUser, handleApiError } from "@/lib/permissions";
import { getAllMaterialBalances } from "@/lib/services/inventory-service";
import { getFinishedGoodsSummary } from "@/lib/services/finished-goods-service";
import { prisma } from "@/lib/db";
import { formatKg } from "@/lib/decimal";
import { MaterialType, OrderStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await authenticateUser();

    // 1. Raw Material Balances
    const rawBalances = await getAllMaterialBalances();
    const filmBalance = rawBalances[MaterialType.FILM];
    const adhesiveBalance = rawBalances[MaterialType.LIQUID_ADHESIVE];
    const coreBalance = rawBalances[MaterialType.CORE];

    // 2. Finished Goods Aggregation
    const finishedSummaries = await getFinishedGoodsSummary();
    const totalAvailableRolls = finishedSummaries.reduce((sum, s) => sum + s.availableRolls, 0);
    const totalReservedRolls = finishedSummaries.reduce((sum, s) => sum + s.reservedRolls, 0);
    const totalPhysicalRolls = finishedSummaries.reduce((sum, s) => sum + s.physicalRolls, 0);
    const totalDispatchedRolls = finishedSummaries.reduce((sum, s) => sum + s.dispatchedRolls, 0);

    // 3. Orders Overview
    const [pendingOrdersCount, confirmedOrdersCount] = await Promise.all([
      prisma.customerOrder.count({ where: { status: OrderStatus.PENDING } }),
      prisma.customerOrder.count({
        where: {
          status: { in: [OrderStatus.CONFIRMED, OrderStatus.PARTIALLY_DISPATCHED] },
        },
      }),
    ]);

    // 4. Low Stock Alerts (Configurable Thresholds)
    // Low thresholds: Film < 100 kg, Adhesive < 200 kg, Cores < 100 pieces, Available rolls < 50 rolls
    const alerts: Array<{ type: string; level: "warning" | "danger"; message: string }> = [];

    if (filmBalance.lessThan(100)) {
      alerts.push({
        type: "RAW_MATERIAL",
        level: filmBalance.isZero() ? "danger" : "warning",
        message: `Film inventory low: ${formatKg(filmBalance)} kg remaining on hand.`,
      });
    }

    if (adhesiveBalance.lessThan(200)) {
      alerts.push({
        type: "RAW_MATERIAL",
        level: adhesiveBalance.isZero() ? "danger" : "warning",
        message: `Liquid adhesive inventory low: ${formatKg(adhesiveBalance)} kg remaining on hand.`,
      });
    }

    if (coreBalance.lessThan(100)) {
      alerts.push({
        type: "RAW_MATERIAL",
        level: coreBalance.isZero() ? "danger" : "warning",
        message: `Cores inventory low: ${coreBalance.toNumber()} pieces remaining on hand.`,
      });
    }

    // 5. Recent Production Batches
    const recentBatches = await prisma.productionBatch.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        specification: { select: { code: true, name: true } },
      },
    });

    // 6. Recent Movements
    const recentMovements = await prisma.materialInventoryMovement.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true } },
      },
    });

    return NextResponse.json({
      success: true,
      rawMaterials: {
        filmKg: formatKg(filmBalance),
        liquidAdhesiveKg: formatKg(adhesiveBalance),
        corePieces: coreBalance.toNumber(),
      },
      finishedGoods: {
        totalAvailableRolls,
        totalReservedRolls,
        totalPhysicalRolls,
        totalDispatchedRolls,
        summaries: finishedSummaries,
      },
      orders: {
        pendingOrdersCount,
        confirmedOrdersCount,
      },
      alerts,
      recentBatches,
      recentMovements,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
