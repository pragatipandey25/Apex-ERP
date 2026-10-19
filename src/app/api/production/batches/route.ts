import { NextRequest, NextResponse } from "next/server";
import { authenticateUser, handleApiError } from "@/lib/permissions";
import { productionBatchSchema } from "@/lib/validations";
import { createProductionBatch } from "@/lib/services/production-service";
import { ShortageError } from "@/lib/services/inventory-service";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await authenticateUser();
    const batches = await prisma.productionBatch.findMany({
      include: {
        specification: true,
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, batches });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await authenticateUser();
    const body = await req.json();
    const validated = productionBatchSchema.parse(body);

    const idempotencyHeader = req.headers.get("x-idempotency-key");
    const idempotencyKey = validated.idempotencyKey || idempotencyHeader || undefined;

    const result = await createProductionBatch({
      batchNumber: validated.batchNumber,
      productionDate: validated.productionDate,
      specificationId: validated.specificationId,
      wholeRolls: validated.wholeRolls,
      filmIssuedKg: validated.filmIssuedKg,
      liquidAdhesiveIssuedKg: validated.liquidAdhesiveIssuedKg,
      dryWastageKg: validated.dryWastageKg,
      notes: validated.notes,
      idempotencyKey,
      userId: user.id,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ShortageError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          shortageDetails: {
            materialType: error.materialType,
            requestedQuantity: error.requestedQuantity.toFixed(3),
            availableQuantity: error.availableQuantity.toFixed(3),
            shortageQuantity: error.shortageQuantity.toFixed(3),
          },
        },
        { status: 400 }
      );
    }
    return handleApiError(error);
  }
}
