import { describe, it, expect } from "vitest";
import { verifyProductionBalance, PRODUCTION_BALANCE_TOLERANCE_KG } from "../lib/production-balance";

describe("Production Balance Equation Verification", () => {
  const dummySpec = {
    widthMm: 48,
    filmGsm: 25,
    dryAdhesiveGsm: 22,
    adhesiveSolidsPercent: 50,
    rollLengthM: 1000,
  };

  it("verifies exact production balance with zero dry wastage for 1 roll", () => {
    // 1 roll dummy spec: 1.200 kg film, 2.112 kg liquid adhesive (1.056 kg solids), net tape = 2.256 kg
    const result = verifyProductionBalance({
      specParams: dummySpec,
      wholeRolls: 1,
      filmIssuedKg: "1.200",
      liquidAdhesiveIssuedKg: "2.112",
      dryWastageKg: "0.000",
    });

    expect(result.isValid).toBe(true);
    expect(result.lhsTotalInputSolidsKg.toFixed(3)).toBe("2.256");
    expect(result.rhsTotalOutputSolidsKg.toFixed(3)).toBe("2.256");
    expect(result.netTapeProducedKg.toFixed(3)).toBe("2.256");
    expect(result.dryWastageKg.toFixed(3)).toBe("0.000");
    expect(result.signedDifferenceKg.toFixed(4)).toBe("0.0000");
    expect(result.errorMessage).toBeUndefined();
  });

  it("verifies production balance when additional material corresponds to dry wastage", () => {
    // 1 roll with 0.100 kg dry wastage.
    // LHS must equal RHS = 2.256 + 0.100 = 2.356 kg.
    // Provide 1.300 kg film + 2.112 kg liquid adhesive (1.056 kg solids) = 2.356 kg.
    const result = verifyProductionBalance({
      specParams: dummySpec,
      wholeRolls: 1,
      filmIssuedKg: "1.300",
      liquidAdhesiveIssuedKg: "2.112",
      dryWastageKg: "0.100",
    });

    expect(result.isValid).toBe(true);
    expect(result.lhsTotalInputSolidsKg.toFixed(3)).toBe("2.356");
    expect(result.rhsTotalOutputSolidsKg.toFixed(3)).toBe("2.356");
    expect(result.signedDifferenceKg.toFixed(4)).toBe("0.0000");
  });

  it("rejects mismatched production balance and displays the signed difference", () => {
    // Provide 1.500 kg film instead of 1.200 kg (+0.300 kg excess)
    const result = verifyProductionBalance({
      specParams: dummySpec,
      wholeRolls: 1,
      filmIssuedKg: "1.500",
      liquidAdhesiveIssuedKg: "2.112",
      dryWastageKg: "0.000",
    });

    expect(result.isValid).toBe(false);
    expect(result.signedDifferenceKg.toFixed(4)).toBe("0.3000");
    expect(result.errorMessage).toContain("+0.3000 kg");
    expect(result.errorMessage).toContain("Production balance mismatch");
  });

  it("rejects insufficient material input with negative signed difference", () => {
    // Provide 1.000 kg film instead of 1.200 kg (-0.200 kg deficit)
    const result = verifyProductionBalance({
      specParams: dummySpec,
      wholeRolls: 1,
      filmIssuedKg: "1.000",
      liquidAdhesiveIssuedKg: "2.112",
      dryWastageKg: "0.000",
    });

    expect(result.isValid).toBe(false);
    expect(result.signedDifferenceKg.toFixed(4)).toBe("-0.2000");
    expect(result.errorMessage).toContain("-0.2000 kg");
  });

  it("accepts variations within the documented 0.002 kg measurement tolerance", () => {
    // 0.001 kg difference (1 gram measurement variance) is within the 0.002 kg tolerance
    const result = verifyProductionBalance({
      specParams: dummySpec,
      wholeRolls: 1,
      filmIssuedKg: "1.201",
      liquidAdhesiveIssuedKg: "2.112",
      dryWastageKg: "0.000",
    });

    expect(result.isValid).toBe(true);
  });

  it("rejects negative dry wastage", () => {
    expect(() =>
      verifyProductionBalance({
        specParams: dummySpec,
        wholeRolls: 1,
        filmIssuedKg: "1.200",
        liquidAdhesiveIssuedKg: "2.112",
        dryWastageKg: "-0.050",
      })
    ).toThrow("Dry wastage must be non-negative");
  });

  it("rejects fractional or non-positive roll counts", () => {
    expect(() =>
      verifyProductionBalance({
        specParams: dummySpec,
        wholeRolls: 0,
        filmIssuedKg: "1.200",
        liquidAdhesiveIssuedKg: "2.112",
        dryWastageKg: "0.000",
      })
    ).toThrow("Roll count must be a positive whole integer");
  });
});
