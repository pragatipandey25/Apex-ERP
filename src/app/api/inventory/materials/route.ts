import { NextResponse } from "next/server";
import { authenticateUser, handleApiError } from "@/lib/permissions";
import { getAllMaterialBalances } from "@/lib/services/inventory-service";
import { prisma } from "@/lib/db";
import { formatKg } from "@/lib/decimal";
import { MaterialType } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await authenticateUser();
    const balances = await getAllMaterialBalances();

    const movements = await prisma.materialInventoryMovement.findMany({
      take: 50,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({
      success: true,
      balances: {
        filmKg: formatKg(balances[MaterialType.FILM]),
        liquidAdhesiveKg: formatKg(balances[MaterialType.LIQUID_ADHESIVE]),
        corePieces: balances[MaterialType.CORE].toNumber(),
      },
      movements,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
