import { NextRequest, NextResponse } from "next/server";
import { authenticateUser, handleApiError } from "@/lib/permissions";
import { tapeSpecificationSchema } from "@/lib/validations";
import { prisma } from "@/lib/db";
import { Decimal } from "@/lib/decimal";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await authenticateUser();
    const specs = await prisma.tapeSpecification.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, specifications: specs });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await authenticateUser();
    const body = await req.json();
    const validated = tapeSpecificationSchema.parse(body);

    const existing = await prisma.tapeSpecification.findUnique({
      where: { code: validated.code },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: `Specification code '${validated.code}' already exists.` },
        { status: 400 }
      );
    }

    const spec = await prisma.tapeSpecification.create({
      data: {
        code: validated.code.toUpperCase(),
        name: validated.name,
        widthMm: new Decimal(validated.widthMm).toString(),
        filmGsm: new Decimal(validated.filmGsm).toString(),
        dryAdhesiveGsm: new Decimal(validated.dryAdhesiveGsm).toString(),
        adhesiveSolidsPercent: new Decimal(validated.adhesiveSolidsPercent).toString(),
        rollLengthM: new Decimal(validated.rollLengthM).toString(),
        isUsedInProduction: false,
      },
    });

    await prisma.auditLog.create({
      data: {
        entityType: "TapeSpecification",
        entityId: spec.id,
        action: "SPECIFICATION_CREATED",
        details: JSON.stringify(validated),
        userId: user.id,
      },
    });

    return NextResponse.json({ success: true, specification: spec }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
