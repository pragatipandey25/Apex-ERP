import { NextRequest, NextResponse } from "next/server";
import { authenticateUser, handleApiError } from "@/lib/permissions";
import { cancelOrder } from "@/lib/services/cancellation-service";
import { cancelOrderSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await authenticateUser(req);
    let reason: string | undefined;

    try {
      const body = await req.json();
      const validated = cancelOrderSchema.safeParse(body);
      if (validated.success) {
        reason = validated.data.reason;
      }
    } catch {
      // Body is optional
    }

    const result = await cancelOrder({
      orderId: params.id,
      reason,
      userId: user.id,
    });

    return NextResponse.json({
      success: true,
      order: result.order,
      releasedRolls: result.releasedRolls,
      message: `Order cancelled successfully. ${result.releasedRolls} reserved rolls released back to stock.`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
