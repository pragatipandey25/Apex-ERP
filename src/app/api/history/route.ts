import { NextRequest, NextResponse } from "next/server";
import { authenticateUser, handleApiError } from "@/lib/permissions";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await authenticateUser();
    const { searchParams } = new URL(req.url);

    const type = searchParams.get("type"); // e.g. "ALL", "MATERIAL", "FINISHED", "PRODUCTION", "ORDER", "DISPATCH", "CORRECTION", "AUDIT"
    const query = searchParams.get("q")?.toLowerCase();

    // Fetch across various ledgers
    const [
      materialMovements,
      finishedMovements,
      productionBatches,
      orders,
      dispatches,
      corrections,
      auditLogs,
    ] = await Promise.all([
      (!type || type === "ALL" || type === "MATERIAL")
        ? prisma.materialInventoryMovement.findMany({
            take: 100,
            orderBy: { createdAt: "desc" },
            include: { user: { select: { id: true, name: true, email: true } } },
          })
        : [],
      (!type || type === "ALL" || type === "FINISHED")
        ? prisma.finishedGoodsMovement.findMany({
            take: 100,
            orderBy: { createdAt: "desc" },
            include: {
              specification: true,
              user: { select: { id: true, name: true, email: true } },
            },
          })
        : [],
      (!type || type === "ALL" || type === "PRODUCTION")
        ? prisma.productionBatch.findMany({
            take: 100,
            orderBy: { createdAt: "desc" },
            include: {
              specification: true,
              user: { select: { id: true, name: true, email: true } },
            },
          })
        : [],
      (!type || type === "ALL" || type === "ORDER")
        ? prisma.customerOrder.findMany({
            take: 100,
            orderBy: { createdAt: "desc" },
            include: {
              customer: true,
              specification: true,
              user: { select: { id: true, name: true, email: true } },
            },
          })
        : [],
      (!type || type === "ALL" || type === "DISPATCH")
        ? prisma.dispatch.findMany({
            take: 100,
            orderBy: { createdAt: "desc" },
            include: {
              order: { include: { customer: true } },
              specification: true,
              user: { select: { id: true, name: true, email: true } },
            },
          })
        : [],
      (!type || type === "ALL" || type === "CORRECTION")
        ? prisma.transactionCorrection.findMany({
            take: 100,
            orderBy: { createdAt: "desc" },
            include: {
              adminUser: { select: { id: true, name: true, email: true } },
            },
          })
        : [],
      (!type || type === "ALL" || type === "AUDIT")
        ? prisma.auditLog.findMany({
            take: 100,
            orderBy: { createdAt: "desc" },
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          })
        : [],
    ]);

    // Unify all into a single structured timeline
    const timeline: any[] = [];

    materialMovements.forEach((m) => {
      timeline.push({
        id: `mat-${m.id}`,
        category: "RAW_MATERIAL",
        type: m.movementType,
        reference: m.referenceNumber,
        summary: `${m.movementType}: ${m.quantity.toString()} ${m.unit} of ${m.materialType}`,
        details: m.notes || m.reason || "",
        timestamp: m.createdAt,
        user: m.user?.name || "System",
      });
    });

    finishedMovements.forEach((f) => {
      timeline.push({
        id: `fg-${f.id}`,
        category: "FINISHED_GOODS",
        type: f.movementType,
        reference: f.referenceNumber,
        summary: `${f.movementType}: ${f.wholeRolls} rolls (${f.specification?.code || ""})`,
        details: f.notes || f.reason || "",
        timestamp: f.createdAt,
        user: f.user?.name || "System",
      });
    });

    productionBatches.forEach((b) => {
      timeline.push({
        id: `batch-${b.id}`,
        category: "PRODUCTION",
        type: "BATCH_PRODUCED",
        reference: b.batchNumber,
        summary: `Batch ${b.batchNumber}: ${b.wholeRolls} rolls of ${b.specification.code}`,
        details: `Film: ${b.filmIssuedKg} kg, Adhesive: ${b.liquidAdhesiveIssuedKg} kg, Wastage: ${b.dryWastageKg} kg. Diff: ${b.balanceDifferenceKg} kg`,
        timestamp: b.createdAt,
        user: b.user?.name || "System",
      });
    });

    orders.forEach((o) => {
      timeline.push({
        id: `ord-${o.id}`,
        category: "ORDER",
        type: o.status,
        reference: o.orderNumber,
        summary: `Order ${o.orderNumber}: ${o.wholeRolls} rolls (${o.specification.code}) for ${o.customer.name}`,
        details: `Status: ${o.status}. Total: ${o.totalMetres}m, ${o.totalNetKg}kg`,
        timestamp: o.createdAt,
        user: o.user?.name || "System",
      });
    });

    dispatches.forEach((d) => {
      timeline.push({
        id: `dsp-${d.id}`,
        category: "DISPATCH",
        type: "DISPATCH_EXECUTED",
        reference: d.dispatchNumber,
        summary: `Dispatch ${d.dispatchNumber}: ${d.wholeRollsDispatched} rolls to ${d.order.customer.name}`,
        details: `${d.dispatchedMetres}m, ${d.dispatchedNetKg}kg`,
        timestamp: d.createdAt,
        user: d.user?.name || "System",
      });
    });

    corrections.forEach((c) => {
      timeline.push({
        id: `corr-${c.id}`,
        category: "CORRECTION",
        type: c.transactionType,
        reference: c.correctionReference,
        summary: `Correction of ${c.originalTransactionReference}: ${c.deltaSummary}`,
        details: `Reason: ${c.reason}`,
        timestamp: c.createdAt,
        user: c.adminUser?.name || "Admin",
      });
    });

    auditLogs.forEach((a) => {
      timeline.push({
        id: `audit-${a.id}`,
        category: "AUDIT_LOG",
        type: a.action,
        reference: `${a.entityType}:${a.entityId}`,
        summary: `${a.action} on ${a.entityType}`,
        details: a.details,
        timestamp: a.createdAt,
        user: a.user?.name || "System",
      });
    });

    // Sort by timestamp descending
    timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply text search filter if provided
    const filteredTimeline = query
      ? timeline.filter(
          (t) =>
            t.reference?.toLowerCase().includes(query) ||
            t.summary?.toLowerCase().includes(query) ||
            t.details?.toLowerCase().includes(query) ||
            t.user?.toLowerCase().includes(query)
        )
      : timeline;

    return NextResponse.json({
      success: true,
      count: filteredTimeline.length,
      history: filteredTimeline.slice(0, 200),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
