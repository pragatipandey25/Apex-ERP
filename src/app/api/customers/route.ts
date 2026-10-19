import { NextRequest, NextResponse } from "next/server";
import { authenticateUser, handleApiError } from "@/lib/permissions";
import { customerSchema } from "@/lib/validations";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await authenticateUser();
    const customers = await prisma.customer.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { orders: true } },
      },
    });

    return NextResponse.json({ success: true, customers });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await authenticateUser();
    const body = await req.json();
    const validated = customerSchema.parse(body);

    const existing = await prisma.customer.findUnique({
      where: { code: validated.code },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: `Customer code '${validated.code}' already exists.` },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.create({
      data: {
        code: validated.code.toUpperCase(),
        name: validated.name,
        contactPerson: validated.contactPerson,
        email: validated.email || null,
        phone: validated.phone,
        address: validated.address,
      },
    });

    await prisma.auditLog.create({
      data: {
        entityType: "Customer",
        entityId: customer.id,
        action: "CUSTOMER_CREATED",
        details: JSON.stringify(validated),
        userId: user.id,
      },
    });

    return NextResponse.json({ success: true, customer }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
