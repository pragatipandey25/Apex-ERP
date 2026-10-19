import { NextRequest, NextResponse } from "next/server";
import { authenticateUser, authorizeRole, handleApiError } from "@/lib/permissions";
import { adminCorrectionSchema } from "@/lib/validations";
import { executeCorrection, getCorrectionsHistory } from "@/lib/services/correction-service";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await authenticateUser();
    // Only Admin can view and perform corrections
    authorizeRole(user, [Role.ADMIN]);

    const corrections = await getCorrectionsHistory();
    return NextResponse.json({ success: true, corrections });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await authenticateUser();
    // ENFORCE ADMIN ROLE - Staff MUST receive HTTP 403 Forbidden!
    authorizeRole(user, [Role.ADMIN]);

    const body = await req.json();
    const validated = adminCorrectionSchema.parse(body);

    if (validated.newQuantity === undefined) {
      return NextResponse.json(
        { success: false, error: "New quantity is required for inventory movement correction." },
        { status: 400 }
      );
    }

    const result = await executeCorrection({
      originalTransactionReference: validated.originalTransactionReference,
      transactionType: validated.transactionType as "MATERIAL_MOVEMENT" | "FINISHED_MOVEMENT",
      newQuantity: validated.newQuantity,
      reason: validated.reason,
      adminUserId: user.id,
      adminRole: user.role,
    });

    return NextResponse.json({ success: true, ...result }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
