import { NextRequest, NextResponse } from "next/server";
import { authenticateUser, handleApiError } from "@/lib/permissions";
import { materialDamageSchema } from "@/lib/validations";
import { recordMaterialDamage, ShortageError } from "@/lib/services/inventory-service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await authenticateUser(req);
    const body = await req.json();
    const validated = materialDamageSchema.parse(body);

    const movement = await recordMaterialDamage({
      materialType: validated.materialType,
      quantity: validated.quantity,
      reason: validated.reason,
      notes: validated.notes,
      userId: user.id,
    });

    return NextResponse.json({ success: true, movement }, { status: 201 });
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
