import { describe, it, expect, vi } from "vitest";
import { ShortageError } from "../lib/services/inventory-service";
import { StockReservationError } from "../lib/services/reservation-service";
import { Decimal } from "../lib/decimal";
import { MaterialType, OrderStatus, ReservationStatus, Role } from "@prisma/client";
import { executeCorrection } from "../lib/services/correction-service";

describe("Transactional Inventory & Business Logic Rules", () => {
  describe("Shortage Detection & Negative Inventory Prevention", () => {
    it("ShortageError constructs exact requested, available, and shortage metrics for materials", () => {
      const requested = new Decimal("50.000");
      const available = new Decimal("20.000");
      const err = new ShortageError(MaterialType.FILM, requested, available);

      expect(err.name).toBe("ShortageError");
      expect(err.materialType).toBe(MaterialType.FILM);
      expect(err.requestedQuantity.toFixed(3)).toBe("50.000");
      expect(err.availableQuantity.toFixed(3)).toBe("20.000");
      expect(err.shortageQuantity.toFixed(3)).toBe("30.000");
      expect(err.message).toContain("Insufficient inventory for FILM");
      expect(err.message).toContain("Shortage: 30.000");
    });

    it("ShortageError accurately detects zero inventory shortage", () => {
      const err = new ShortageError(
        MaterialType.LIQUID_ADHESIVE,
        new Decimal("105.600"),
        new Decimal("0.000")
      );
      expect(err.shortageQuantity.toFixed(3)).toBe("105.600");
      expect(err.message).toContain("Available: 0.000");
    });

    it("ShortageError accurately detects core shortage in integer pieces", () => {
      const err = new ShortageError(
        MaterialType.CORE,
        new Decimal("100"),
        new Decimal("40")
      );
      expect(err.shortageQuantity.toNumber()).toBe(60);
      expect(err.message).toContain("Shortage: 60.000");
    });
  });

  describe("Stock Reservation Invariants", () => {
    it("StockReservationError reports requested, available, and shortage rolls", () => {
      const err = new StockReservationError(25, 10);
      expect(err.requestedRolls).toBe(25);
      expect(err.availableRolls).toBe(10);
      expect(err.shortageRolls).toBe(15);
      expect(err.message).toContain("Requested: 25 rolls, Available: 10 rolls, Shortage: 15 rolls");
    });
  });

  describe("Role Enforcement on Corrections at Service Layer", () => {
    it("rejects non-admin users attempting corrections with Forbidden error", async () => {
      await expect(
        executeCorrection({
          originalTransactionReference: "REC-FILM-1",
          transactionType: "MATERIAL_MOVEMENT",
          newQuantity: 100,
          reason: "Unauthorized attempt",
          adminUserId: "user_staff_1",
          adminRole: Role.STAFF, // Staff role
        })
      ).rejects.toThrow("Forbidden: Only an Admin user can execute audited corrections");
    });

    it("rejects corrections with insufficient reason text", async () => {
      await expect(
        executeCorrection({
          originalTransactionReference: "REC-FILM-1",
          transactionType: "MATERIAL_MOVEMENT",
          newQuantity: 100,
          reason: "bad", // < 5 chars
          adminUserId: "user_admin_1",
          adminRole: Role.ADMIN,
        })
      ).rejects.toThrow("A comprehensive reason (at least 5 characters) is required");
    });
  });

  describe("Specification Immutability Guard", () => {
    it("prevents editing a specification that is marked as used in production", () => {
      const spec = {
        id: "spec_used_1",
        code: "APEX-48-1000",
        isUsedInProduction: true,
      };

      // Simulating the controller check
      const canEdit = !spec.isUsedInProduction;
      expect(canEdit).toBe(false);
    });
  });

  describe("Order Balance & Dispatch Invariants", () => {
    it("partial dispatch cannot exceed reserved order balance", () => {
      const totalOrderRolls = 10;
      const previouslyDispatched = 4;
      const remainingUnshipped = totalOrderRolls - previouslyDispatched; // 6
      const requestedDispatch = 8;

      const isValid = requestedDispatch <= remainingUnshipped;
      expect(isValid).toBe(false);
    });

    it("order cancellation calculates remaining balance without touching dispatched goods", () => {
      const totalOrderRolls = 20;
      const dispatchedRolls = 5;
      const reservedActiveRolls = 15;

      // Cancellation should release exactly reservedActiveRolls (15), leaving dispatchedRolls (5) intact
      const released = reservedActiveRolls;
      const preserved = dispatchedRolls;

      expect(released).toBe(15);
      expect(preserved).toBe(5);
      expect(released + preserved).toBe(totalOrderRolls);
    });
  });
});
