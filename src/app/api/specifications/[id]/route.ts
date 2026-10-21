import { NextRequest, NextResponse } from "next/server";
import { authenticateUser, handleApiError } from "@/lib/permissions";
import { tapeSpecificationSchema } from "@/lib/validations";
import { prisma } from "@/lib/db";
import { Decimal } from "@/lib/decimal";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await authenticateUser();
    const spec = await prisma.tapeSpecification.findUnique({
      where: { id: params.id },
    });

    if (!spec) {
      return NextResponse.json(
        { success: false, error: "Specification not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, specification: spec });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await authenticateUser(req);
    const spec = await prisma.tapeSpecification.findUnique({
      where: { id: params.id },
    });

    if (!spec) {
      return NextResponse.json(
        { success: false, error: "Specification not found" },
        { status: 404 }
      );
    }

    // IMMUTABILITY ENFORCEMENT
    if (spec.isUsedInProduction) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Specification is locked and immutable because it has already been used in historical production batches. To change parameters, create a new specification.",
        },
        { status: 400 }
      );
    }

    const body = await req.json();
    const validated = tapeSpecificationSchema.parse(body);

    const updated = await prisma.tapeSpecification.update({
      where: { id: params.id },
      data: {
        code: validated.code.toUpperCase(),
        name: validated.name,
        widthMm: new Decimal(validated.widthMm).toString(),
        filmGsm: new Decimal(validated.filmGsm).toString(),
        dryAdhesiveGsm: new Decimal(validated.dryAdhesiveGsm).toString(),
        adhesiveSolidsPercent: new Decimal(validated.adhesiveSolidsPercent).toString(),
        rollLengthM: new Decimal(validated.rollLengthM).toString(),
      },
    });

    await prisma.auditLog.create({
      data: {
        entityType: "TapeSpecification",
        entityId: updated.id,
        action: "SPECIFICATION_UPDATED",
        details: JSON.stringify(validated),
        userId: user.id,
      },
    });

    return NextResponse.json({ success: true, specification: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await authenticateUser();
    const spec = await prisma.tapeSpecification.findUnique({
      where: { id: params.id },
    });

    if (!spec) {
      return NextResponse.json(
        { success: false, error: "Specification not found" },
        { status: 404 }
      );
    }

    if (spec.isUsedInProduction) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Cannot delete a specification that has been used in production batches. Historical traceability must be preserved.",
        },
        { status: 400 }
      );
    }

    await prisma.tapeSpecification.delete({
      where: { id: params.id },
    });

    await prisma.auditLog.create({
      data: {
        entityType: "TapeSpecification",
        entityId: params.id,
        action: "SPECIFICATION_DELETED",
        details: JSON.stringify({ code: spec.code, name: spec.name }),
        userId: user.id,
      },
    });

    return NextResponse.json({ success: true, message: "Specification deleted" });
  } catch (error) {
    return handleApiError(error);
  }
}
