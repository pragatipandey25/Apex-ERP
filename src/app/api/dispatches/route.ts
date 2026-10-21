import { NextRequest, NextResponse } from "next/server";
import { authenticateUser, handleApiError } from "@/lib/permissions";
import { dispatchSchema } from "@/lib/validations";
import { executeDispatch } from "@/lib/services/dispatch-service";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await authenticateUser();
    const dispatches = await prisma.dispatch.findMany({
      include: {
        order: {
          include: { customer: true },
        },
        specification: true,
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, dispatches });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await authenticateUser(req);
    const body = await req.json();
    const validated = dispatchSchema.parse(body);

    const result = await executeDispatch({
      orderId: validated.orderId,
      wholeRollsDispatched: validated.wholeRollsDispatched,
      notes: validated.notes,
      userId: user.id,
    });

    return NextResponse.json({ success: true, ...result }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
