import { prisma } from "../db";
import { OrderUnit, OrderStatus } from "@prisma/client";
import { Decimal } from "../decimal";
import { validateAndConvertOrder, OrderConversionResult } from "../order-conversions";

export interface CreateCustomerOrderInput {
  customerId: string;
  specificationId: string;
  requestedQuantity: Decimal.Value;
  requestedUnit: OrderUnit;
  orderDate: string | Date;
  notes?: string;
  userId: string;
}

export class OrderValidationError extends Error {
  conversionResult: OrderConversionResult;

  constructor(message: string, conversionResult: OrderConversionResult) {
    super(message);
    this.name = "OrderValidationError";
    this.conversionResult = conversionResult;
  }
}

/**
 * Creates a customer order after server-side validation and conversion.
 * Every accepted order must correspond to an exact whole number of rolls.
 */
export async function createCustomerOrder(input: CreateCustomerOrderInput) {
  const customer = await prisma.customer.findUnique({
    where: { id: input.customerId },
  });
  if (!customer) {
    throw new Error(`Customer with ID '${input.customerId}' not found.`);
  }

  const spec = await prisma.tapeSpecification.findUnique({
    where: { id: input.specificationId },
  });
  if (!spec) {
    throw new Error(`Specification with ID '${input.specificationId}' not found.`);
  }

  const specParams = {
    widthMm: spec.widthMm.toString(),
    filmGsm: spec.filmGsm.toString(),
    dryAdhesiveGsm: spec.dryAdhesiveGsm.toString(),
    adhesiveSolidsPercent: spec.adhesiveSolidsPercent.toString(),
    rollLengthM: spec.rollLengthM.toString(),
  };

  // Rigorous conversion & whole-roll validation
  const conversion = validateAndConvertOrder(
    specParams,
    input.requestedQuantity,
    input.requestedUnit
  );

  if (!conversion.isValid) {
    throw new OrderValidationError(
      conversion.errorMessage || "Invalid order quantity.",
      conversion
    );
  }

  const orderNumber = `ORD-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

  const order = await prisma.customerOrder.create({
    data: {
      orderNumber,
      customerId: input.customerId,
      specificationId: input.specificationId,
      requestedQuantity: new Decimal(input.requestedQuantity).toString(),
      requestedUnit: input.requestedUnit,
      wholeRolls: conversion.wholeRolls,
      totalMetres: conversion.totalMetres.toString(),
      totalNetKg: conversion.totalNetKg.toString(),
      status: OrderStatus.PENDING,
      orderDate: new Date(input.orderDate),
      notes: input.notes,
      userId: input.userId,
    },
    include: {
      customer: true,
      specification: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      entityType: "CustomerOrder",
      entityId: order.id,
      action: "ORDER_CREATED",
      details: JSON.stringify({
        orderNumber: order.orderNumber,
        requestedQuantity: input.requestedQuantity,
        requestedUnit: input.requestedUnit,
        wholeRolls: conversion.wholeRolls,
      }),
      userId: input.userId,
    },
  });

  return order;
}

/**
 * Retrieves orders with customer, spec, reservations, and dispatches.
 */
export async function getCustomerOrders(filter?: { status?: OrderStatus }) {
  return prisma.customerOrder.findMany({
    where: filter?.status ? { status: filter.status } : undefined,
    include: {
      customer: true,
      specification: true,
      reservations: true,
      dispatches: true,
    },
    orderBy: { createdAt: "desc" },
  });
}
