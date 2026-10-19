import { describe, it, expect } from "vitest";
import { calculateRollBOM, calculateBatchBOM } from "../lib/bom";

describe("Bill of Materials (BOM) Calculator", () => {
  const dummySpec = {
    widthMm: 48,
    filmGsm: 25,
    dryAdhesiveGsm: 22,
    adhesiveSolidsPercent: 50,
    rollLengthM: 1000,
  };

  it("calculates exact dummy-specification single-roll BOM metrics", () => {
    const result = calculateRollBOM(dummySpec);

    // Area: 48 square metres: (48 / 1000) * 1000 = 48
    expect(result.areaPerRollM2.toFixed(2)).toBe("48.00");

    // Film: 48 * 25 / 1000 = 1.200 kg
    expect(result.filmKgPerRoll.toFixed(3)).toBe("1.200");

    // Dry adhesive: 48 * 22 / 1000 = 1.056 kg
    expect(result.dryAdhesiveKgPerRoll.toFixed(3)).toBe("1.056");

    // Liquid adhesive: 1.056 / (50 / 100) = 2.112 kg
    expect(result.liquidAdhesiveKgPerRoll.toFixed(3)).toBe("2.112");

    // Net tape weight: 1.200 + 1.056 = 2.256 kg
    expect(result.netTapeKgPerRoll.toFixed(3)).toBe("2.256");

    // Cores: 1 piece per roll
    expect(result.coresPerRoll).toBe(1);

    // Length: 1,000 metres
    expect(result.rollLengthM.toFixed(0)).toBe("1000");
  });

  it("correctly scales batch BOM calculations for any requested whole number of rolls", () => {
    const batch = calculateBatchBOM(dummySpec, 10);

    expect(batch.rolls).toBe(10);
    expect(batch.areaTotalM2.toFixed(2)).toBe("480.00");
    expect(batch.filmTotalKg.toFixed(3)).toBe("12.000");
    expect(batch.dryAdhesiveTotalKg.toFixed(3)).toBe("10.560");
    expect(batch.liquidAdhesiveTotalKg.toFixed(3)).toBe("21.120");
    expect(batch.netTapeTotalKg.toFixed(3)).toBe("22.560");
    expect(batch.coresTotal).toBe(10);
    expect(batch.lengthTotalM.toFixed(0)).toBe("10000");
  });

  it("changing width changes material consumption proportionally", () => {
    // 72mm width instead of 48mm (1.5x wider)
    const wideSpec = { ...dummySpec, widthMm: 72 };
    const wide = calculateRollBOM(wideSpec);

    // Area: (72/1000) * 1000 = 72 m²
    expect(wide.areaPerRollM2.toFixed(2)).toBe("72.00");
    // Film: 72 * 25 / 1000 = 1.800 kg (1.5 * 1.200)
    expect(wide.filmKgPerRoll.toFixed(3)).toBe("1.800");
    // Liquid adhesive: 1.5 * 2.112 = 3.168 kg
    expect(wide.liquidAdhesiveKgPerRoll.toFixed(3)).toBe("3.168");
    // Net tape: 1.5 * 2.256 = 3.384 kg
    expect(wide.netTapeKgPerRoll.toFixed(3)).toBe("3.384");
  });

  it("changing film GSM changes film consumption without affecting adhesive", () => {
    // 30 GSM film instead of 25 GSM
    const heavyFilmSpec = { ...dummySpec, filmGsm: 30 };
    const result = calculateRollBOM(heavyFilmSpec);

    // Film: 48 * 30 / 1000 = 1.440 kg
    expect(result.filmKgPerRoll.toFixed(3)).toBe("1.440");
    // Dry adhesive remains unaffected
    expect(result.dryAdhesiveKgPerRoll.toFixed(3)).toBe("1.056");
    // Liquid adhesive remains unaffected
    expect(result.liquidAdhesiveKgPerRoll.toFixed(3)).toBe("2.112");
    // Net tape weight updates: 1.440 + 1.056 = 2.496 kg
    expect(result.netTapeKgPerRoll.toFixed(3)).toBe("2.496");
  });

  it("changing coating GSM changes dry and liquid adhesive consumption", () => {
    // 25 GSM adhesive instead of 22 GSM
    const thickAdhesiveSpec = { ...dummySpec, dryAdhesiveGsm: 25 };
    const result = calculateRollBOM(thickAdhesiveSpec);

    // Film remains unaffected: 1.200 kg
    expect(result.filmKgPerRoll.toFixed(3)).toBe("1.200");
    // Dry adhesive: 48 * 25 / 1000 = 1.200 kg
    expect(result.dryAdhesiveKgPerRoll.toFixed(3)).toBe("1.200");
    // Liquid adhesive: 1.200 / 0.5 = 2.400 kg
    expect(result.liquidAdhesiveKgPerRoll.toFixed(3)).toBe("2.400");
    // Net tape weight: 1.200 + 1.200 = 2.400 kg
    expect(result.netTapeKgPerRoll.toFixed(3)).toBe("2.400");
  });

  it("changing solids percentage changes liquid adhesive consumption without changing dry weight", () => {
    // 55% solids instead of 50%
    const concentratedSpec = { ...dummySpec, adhesiveSolidsPercent: 55 };
    const result = calculateRollBOM(concentratedSpec);

    // Dry adhesive remains exactly 1.056 kg
    expect(result.dryAdhesiveKgPerRoll.toFixed(3)).toBe("1.056");
    // Liquid adhesive: 1.056 / 0.55 = 1.920 kg
    expect(result.liquidAdhesiveKgPerRoll.toFixed(3)).toBe("1.920");
    // Net tape weight remains 2.256 kg
    expect(result.netTapeKgPerRoll.toFixed(3)).toBe("2.256");
  });

  it("rejects invalid solids percentages (>100% or <=0%)", () => {
    expect(() => calculateRollBOM({ ...dummySpec, adhesiveSolidsPercent: 0 })).toThrow(
      "Adhesive solids percentage must be greater than 0 and at most 100%"
    );
    expect(() => calculateRollBOM({ ...dummySpec, adhesiveSolidsPercent: -10 })).toThrow(
      "Adhesive solids percentage must be greater than 0 and at most 100%"
    );
    expect(() => calculateRollBOM({ ...dummySpec, adhesiveSolidsPercent: 105 })).toThrow(
      "Adhesive solids percentage must be greater than 0 and at most 100%"
    );
  });

  it("rejects non-positive dimensions and negative GSM", () => {
    expect(() => calculateRollBOM({ ...dummySpec, widthMm: 0 })).toThrow(
      "Width in millimetres must be strictly positive"
    );
    expect(() => calculateRollBOM({ ...dummySpec, rollLengthM: -500 })).toThrow(
      "Roll length in metres must be strictly positive"
    );
    expect(() => calculateRollBOM({ ...dummySpec, filmGsm: -25 })).toThrow(
      "Film GSM must be strictly positive"
    );
  });

  it("rejects invalid and fractional roll counts", () => {
    expect(() => calculateBatchBOM(dummySpec, 0)).toThrow(
      "Batch roll count must be a positive whole integer."
    );
    expect(() => calculateBatchBOM(dummySpec, -5)).toThrow(
      "Batch roll count must be a positive whole integer."
    );
    expect(() => calculateBatchBOM(dummySpec, 2.5)).toThrow(
      "Batch roll count must be a positive whole integer."
    );
  });
});
