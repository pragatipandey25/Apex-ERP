import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email("Please provide a valid email address."),
  password: z.string().min(1, "Password is required."),
});

export const tapeSpecificationSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "Code must be at least 2 characters")
    .max(50, "Code cannot exceed 50 characters")
    .regex(/^[A-Za-z0-9-_]+$/, "Code must contain only letters, numbers, hyphens, and underscores"),
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  widthMm: z
    .number({ invalid_type_error: "Width must be a number" })
    .positive("Width in millimetres must be strictly positive")
    .max(2000, "Width cannot exceed 2000 mm"),
  filmGsm: z
    .number({ invalid_type_error: "Film GSM must be a number" })
    .positive("Film GSM must be strictly positive")
    .max(500, "Film GSM cannot exceed 500"),
  dryAdhesiveGsm: z
    .number({ invalid_type_error: "Dry adhesive GSM must be a number" })
    .positive("Dry adhesive GSM must be strictly positive")
    .max(500, "Dry adhesive GSM cannot exceed 500"),
  adhesiveSolidsPercent: z
    .number({ invalid_type_error: "Adhesive solids percentage must be a number" })
    .gt(0, "Adhesive solids percentage must be greater than 0%")
    .lte(100, "Adhesive solids percentage cannot exceed 100%"),
  rollLengthM: z
    .number({ invalid_type_error: "Roll length must be a number" })
    .positive("Roll length in metres must be strictly positive")
    .max(50000, "Roll length cannot exceed 50,000 metres"),
});

export const materialReceiptSchema = z.object({
  materialType: z.enum(["FILM", "LIQUID_ADHESIVE", "CORE"]),
  quantity: z
    .number({ invalid_type_error: "Quantity must be a number" })
    .positive("Receipt quantity must be strictly positive"),
  unit: z.enum(["kg", "pieces"]),
  referenceNumber: z.string().trim().optional(),
  notes: z.string().trim().max(500).optional(),
});

export const materialDamageSchema = z.object({
  materialType: z.enum(["FILM", "LIQUID_ADHESIVE", "CORE"]),
  quantity: z
    .number({ invalid_type_error: "Quantity must be a number" })
    .positive("Damage quantity must be strictly positive"),
  reason: z.string().trim().min(3, "Reason must be at least 3 characters").max(255),
  notes: z.string().trim().max(500).optional(),
});

export const productionBatchSchema = z.object({
  batchNumber: z
    .string()
    .trim()
    .min(3, "Batch number must be at least 3 characters")
    .max(50)
    .regex(/^[A-Za-z0-9-_]+$/, "Batch number must contain only letters, numbers, hyphens, and underscores"),
  productionDate: z.string().min(1, "Production date is required"),
  specificationId: z.string().min(1, "Tape specification is required"),
  wholeRolls: z
    .number({ invalid_type_error: "Whole rolls must be an integer" })
    .int("Roll count must be a positive whole integer")
    .positive("Roll count must be at least 1 roll"),
  filmIssuedKg: z
    .number({ invalid_type_error: "Film issued must be a number" })
    .positive("Film issued must be strictly positive"),
  liquidAdhesiveIssuedKg: z
    .number({ invalid_type_error: "Liquid adhesive issued must be a number" })
    .positive("Liquid adhesive issued must be strictly positive"),
  dryWastageKg: z
    .number({ invalid_type_error: "Dry wastage must be a number" })
    .min(0, "Dry wastage cannot be negative"),
  notes: z.string().trim().max(1000).optional(),
  idempotencyKey: z.string().trim().optional(),
});

export const customerSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "Customer code must be at least 2 characters")
    .max(50)
    .regex(/^[A-Za-z0-9-_]+$/, "Customer code must contain only letters, numbers, hyphens, and underscores"),
  name: z.string().trim().min(2, "Customer name must be at least 2 characters").max(100),
  contactPerson: z.string().trim().max(100).optional(),
  email: z.string().trim().email("Invalid email format").optional().or(z.literal("")),
  phone: z.string().trim().max(50).optional(),
  address: z.string().trim().max(255).optional(),
});

export const customerOrderSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  specificationId: z.string().min(1, "Tape specification is required"),
  requestedQuantity: z
    .number({ invalid_type_error: "Requested quantity must be a number" })
    .positive("Requested quantity must be strictly positive"),
  requestedUnit: z.enum(["ROLLS", "METRES", "NET_KG"]),
  orderDate: z.string().min(1, "Order date is required"),
  notes: z.string().trim().max(1000).optional(),
});

export const dispatchSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
  wholeRollsDispatched: z
    .number({ invalid_type_error: "Rolls must be an integer" })
    .int("Dispatched rolls must be a whole integer")
    .positive("Must dispatch at least 1 roll"),
  notes: z.string().trim().max(500).optional(),
});

export const cancelOrderSchema = z.object({
  reason: z.string().trim().min(3, "Cancellation reason must be at least 3 characters").max(255),
});

export const adminCorrectionSchema = z.object({
  originalTransactionReference: z.string().min(1, "Original transaction reference is required"),
  transactionType: z.enum(["MATERIAL_MOVEMENT", "FINISHED_MOVEMENT", "BATCH", "DISPATCH"]),
  newQuantity: z.number().optional(),
  reason: z.string().trim().min(5, "Correction reason must be detailed (min 5 characters)"),
});
