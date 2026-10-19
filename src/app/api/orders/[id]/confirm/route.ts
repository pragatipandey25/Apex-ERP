import { NextRequest, NextResponse } from "next/server";
import { authenticateUser, handleApiError } from "@/lib/permissions";
import {
  confirmOrderAndReserveStock,
  StockReservationError,
} from "@/lib/services/reservation-service";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await authenticateUser();
    const result = await confirmOrderAndReserveStock(params.id, user.id);

    return NextResponse.json({
      success: true,
      order: result.order,
      reservation: result.reservation,
      message: "Order confirmed and finished stock reserved atomically.",
    });
  } catch (error) {
    if (error instanceof StockReservationError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          shortageDetails: {
            requestedRolls: error.requestedRolls,
            availableRolls: error.availableRolls,
            shortageRolls: error.shortageRolls,
          },
        },
        { status: 400 }
      );
    }
    return handleApiError(error);
  }
}
