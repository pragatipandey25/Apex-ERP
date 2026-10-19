import { NextRequest, NextResponse } from "next/server";
import { authenticateUser, handleApiError } from "@/lib/permissions";
import { customerOrderSchema } from "@/lib/validations";
import {
  createCustomerOrder,
  getCustomerOrders,
  OrderValidationError,
} from "@/lib/services/order-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await authenticateUser();
    const orders = await getCustomerOrders();
    return NextResponse.json({ success: true, orders });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await authenticateUser();
    const body = await req.json();
    const validated = customerOrderSchema.parse(body);

    const order = await createCustomerOrder({
      customerId: validated.customerId,
      specificationId: validated.specificationId,
      requestedQuantity: validated.requestedQuantity,
      requestedUnit: validated.requestedUnit,
      orderDate: validated.orderDate,
      notes: validated.notes,
      userId: user.id,
    });

    return NextResponse.json({ success: true, order }, { status: 201 });
  } catch (error) {
    if (error instanceof OrderValidationError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          alternatives: error.conversionResult.alternatives?.map((a) => ({
            rolls: a.rolls,
            metres: a.metres.toFixed(2),
            netKg: a.netKg.toFixed(3),
          })),
        },
        { status: 400 }
      );
    }
    return handleApiError(error);
  }
}
