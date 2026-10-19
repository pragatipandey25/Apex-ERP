import { describe, it, expect } from "vitest";
import { validateAndConvertOrder } from "../lib/order-conversions";

describe("Order Quantity Conversions & Whole-Roll Enforcement", () => {
  const dummySpec = {
    widthMm: 48,
    filmGsm: 25,
    dryAdhesiveGsm: 22,
    adhesiveSolidsPercent: 50,
    rollLengthM: 1000,
  };

  describe("Unit: ROLLS", () => {
    it("accepts valid whole number of rolls", () => {
      const result = validateAndConvertOrder(dummySpec, 5, "ROLLS");
      expect(result.isValid).toBe(true);
      expect(result.wholeRolls).toBe(5);
      expect(result.totalMetres.toFixed(0)).toBe("5000");
      expect(result.totalNetKg.toFixed(3)).toBe("11.280"); // 5 * 2.256
    });

    it("rejects fractional roll counts and returns whole-roll alternatives", () => {
      const result = validateAndConvertOrder(dummySpec, 2.5, "ROLLS");
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain("must be a positive whole integer");
      expect(result.alternatives).toBeDefined();
      expect(result.alternatives?.length).toBeGreaterThan(0);
      expect(result.alternatives?.map((a) => a.rolls)).toEqual([2, 3]);
    });

    it("rejects zero or negative rolls", () => {
      const result = validateAndConvertOrder(dummySpec, 0, "ROLLS");
      expect(result.isValid).toBe(false);
    });
  });

  describe("Unit: METRES", () => {
    it("accepts exact multiples of roll length (1000m)", () => {
      const result1 = validateAndConvertOrder(dummySpec, 1000, "METRES");
      expect(result1.isValid).toBe(true);
      expect(result1.wholeRolls).toBe(1);
      expect(result1.totalNetKg.toFixed(3)).toBe("2.256");

      const result2 = validateAndConvertOrder(dummySpec, 3000, "METRES");
      expect(result2.isValid).toBe(true);
      expect(result2.wholeRolls).toBe(3);
      expect(result2.totalNetKg.toFixed(3)).toBe("6.768");
    });

    it("rejects non-multiples of roll length and suggests valid alternatives", () => {
      // 1500m requested for a 1000m roll
      const result = validateAndConvertOrder(dummySpec, 1500, "METRES");
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain("not an exact multiple of the roll length (1000 m)");
      expect(result.alternatives).toBeDefined();
      // Valid alternatives should be 1 roll (1000m) and 2 rolls (2000m)
      const altRolls = result.alternatives?.map((a) => a.rolls);
      expect(altRolls).toContain(1);
      expect(altRolls).toContain(2);

      const alt1 = result.alternatives?.find((a) => a.rolls === 1);
      expect(alt1?.metres.toFixed(0)).toBe("1000");
      expect(alt1?.netKg.toFixed(3)).toBe("2.256");
    });
  });

  describe("Unit: NET_KG", () => {
    it("accepts exact multiples of single-roll net weight (2.256 kg)", () => {
      // 1 roll = 2.256 kg
      const result1 = validateAndConvertOrder(dummySpec, "2.256", "NET_KG");
      expect(result1.isValid).toBe(true);
      expect(result1.wholeRolls).toBe(1);
      expect(result1.totalMetres.toFixed(0)).toBe("1000");

      // 2 rolls = 4.512 kg
      const result2 = validateAndConvertOrder(dummySpec, "4.512", "NET_KG");
      expect(result2.isValid).toBe(true);
      expect(result2.wholeRolls).toBe(2);
      expect(result2.totalMetres.toFixed(0)).toBe("2000");
    });

    it("rejects non-exact net kg quantities and suggests valid alternatives", () => {
      // 3.000 kg requested (between 1 roll: 2.256 kg and 2 rolls: 4.512 kg)
      const result = validateAndConvertOrder(dummySpec, "3.000", "NET_KG");
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain("does not correspond to an exact whole number of rolls");
      expect(result.alternatives).toBeDefined();

      const altRolls = result.alternatives?.map((a) => a.rolls);
      expect(altRolls).toEqual([1, 2]);

      const alt1 = result.alternatives?.find((a) => a.rolls === 1);
      expect(alt1?.netKg.toFixed(3)).toBe("2.256");

      const alt2 = result.alternatives?.find((a) => a.rolls === 2);
      expect(alt2?.netKg.toFixed(3)).toBe("4.512");
    });

    it("rejects quantities below 1 roll weight with suggestions", () => {
      // 1.000 kg requested (< 2.256 kg)
      const result = validateAndConvertOrder(dummySpec, "1.000", "NET_KG");
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain("less than a single roll");
      expect(result.alternatives?.map((a) => a.rolls)).toContain(1);
    });
  });
});
