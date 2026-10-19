import { NextResponse } from "next/server";
import { authenticateUser, handleApiError } from "@/lib/permissions";
import { getFinishedGoodsSummary } from "@/lib/services/finished-goods-service";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await authenticateUser();
    const summaries = await getFinishedGoodsSummary();

    const movements = await prisma.finishedGoodsMovement.findMany({
      take: 50,
      orderBy: { createdAt: "desc" },
      include: {
        specification: true,
        batch: { select: { batchNumber: true } },
        order: { select: { orderNumber: true } },
        dispatch: { select: { dispatchNumber: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({
      success: true,
      summaries,
      movements,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
