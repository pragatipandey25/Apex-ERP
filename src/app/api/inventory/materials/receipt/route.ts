import { NextRequest, NextResponse } from "next/server";
import { authenticateUser, handleApiError } from "@/lib/permissions";
import { materialReceiptSchema } from "@/lib/validations";
import { recordMaterialReceipt } from "@/lib/services/inventory-service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await authenticateUser(req);
    const body = await req.json();
    const validated = materialReceiptSchema.parse(body);

    const movement = await recordMaterialReceipt({
      materialType: validated.materialType,
      quantity: validated.quantity,
      unit: validated.unit,
      referenceNumber: validated.referenceNumber,
      notes: validated.notes,
      userId: user.id,
    });

    return NextResponse.json({ success: true, movement }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
