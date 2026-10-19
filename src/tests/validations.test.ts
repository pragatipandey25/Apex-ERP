import { describe, it, expect } from "vitest";
import {
  loginSchema,
  tapeSpecificationSchema,
  materialReceiptSchema,
  materialDamageSchema,
  productionBatchSchema,
  customerOrderSchema,
  dispatchSchema,
  adminCorrectionSchema,
} from "../lib/validations";

describe("Input Validation Schemas (Zod)", () => {
  describe("Login Schema", () => {
    it("validates correct email and password", () => {
      const valid = loginSchema.safeParse({
        email: "staff@apexdemo.local",
        password: "ValidPassword123!",
      });
      expect(valid.success).toBe(true);
    });

    it("rejects invalid email formats", () => {
      const invalid = loginSchema.safeParse({
        email: "not-an-email",
        password: "ValidPassword123!",
      });
      expect(invalid.success).toBe(false);
    });
  });

  describe("Tape Specification Schema", () => {
    it("accepts valid specification parameters", () => {
      const valid = tapeSpecificationSchema.safeParse({
        code: "APEX-BOPP-48-1000",
        name: "Standard 48mm Tape",
        widthMm: 48,
        filmGsm: 25,
        dryAdhesiveGsm: 22,
        adhesiveSolidsPercent: 50,
        rollLengthM: 1000,
      });
      expect(valid.success).toBe(true);
    });

    it("rejects non-positive dimensions and invalid solids percentages", () => {
      expect(
        tapeSpecificationSchema.safeParse({
          code: "TEST-CODE",
          name: "Test",
          widthMm: -48,
          filmGsm: 25,
          dryAdhesiveGsm: 22,
          adhesiveSolidsPercent: 50,
          rollLengthM: 1000,
        }).success
      ).toBe(false);

      expect(
        tapeSpecificationSchema.safeParse({
          code: "TEST-CODE",
          name: "Test",
          widthMm: 48,
          filmGsm: 25,
          dryAdhesiveGsm: 22,
          adhesiveSolidsPercent: 120, // > 100%
          rollLengthM: 1000,
        }).success
      ).toBe(false);
    });
  });

  describe("Material Receipt and Damage Schemas", () => {
    it("accepts valid receipt payload", () => {
      expect(
        materialReceiptSchema.safeParse({
          materialType: "FILM",
          quantity: 500,
          unit: "kg",
        }).success
      ).toBe(true);
    });

    it("rejects non-positive receipt quantities", () => {
      expect(
        materialReceiptSchema.safeParse({
          materialType: "FILM",
          quantity: 0,
          unit: "kg",
        }).success
      ).toBe(false);
    });

    it("accepts valid damage payload with mandatory reason", () => {
      expect(
        materialDamageSchema.safeParse({
          materialType: "LIQUID_ADHESIVE",
          quantity: 25,
          reason: "Handling drum leak",
        }).success
      ).toBe(true);
    });

    it("rejects damage payload without reason", () => {
      expect(
        materialDamageSchema.safeParse({
          materialType: "LIQUID_ADHESIVE",
          quantity: 25,
          reason: "",
        }).success
      ).toBe(false);
    });
  });

  describe("Production Batch Schema", () => {
    it("accepts valid production batch payload", () => {
      expect(
        productionBatchSchema.safeParse({
          batchNumber: "BATCH-2026-001",
          productionDate: "2026-10-19",
          specificationId: "spec_123",
          wholeRolls: 50,
          filmIssuedKg: 60.0,
          liquidAdhesiveIssuedKg: 105.6,
          dryWastageKg: 0.0,
        }).success
      ).toBe(true);
    });

    it("rejects negative dry wastage and fractional rolls", () => {
      expect(
        productionBatchSchema.safeParse({
          batchNumber: "BATCH-2026-001",
          productionDate: "2026-10-19",
          specificationId: "spec_123",
          wholeRolls: 50.5, // fractional
          filmIssuedKg: 60.0,
          liquidAdhesiveIssuedKg: 105.6,
          dryWastageKg: 0.0,
        }).success
      ).toBe(false);

      expect(
        productionBatchSchema.safeParse({
          batchNumber: "BATCH-2026-001",
          productionDate: "2026-10-19",
          specificationId: "spec_123",
          wholeRolls: 50,
          filmIssuedKg: 60.0,
          liquidAdhesiveIssuedKg: 105.6,
          dryWastageKg: -1.0, // negative
        }).success
      ).toBe(false);
    });
  });

  describe("Admin Correction Schema", () => {
    it("requires mandatory reason of at least 5 characters", () => {
      expect(
        adminCorrectionSchema.safeParse({
          originalTransactionReference: "REC-FILM-123",
          transactionType: "MATERIAL_MOVEMENT",
          newQuantity: 450,
          reason: "Scale re-calibration audit adjustment",
        }).success
      ).toBe(true);

      expect(
        adminCorrectionSchema.safeParse({
          originalTransactionReference: "REC-FILM-123",
          transactionType: "MATERIAL_MOVEMENT",
          newQuantity: 450,
          reason: "bad", // too short
        }).success
      ).toBe(false);
    });
  });
});
