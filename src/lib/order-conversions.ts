import { Decimal } from "./decimal";
import { TapeSpecParams, calculateRollBOM } from "./bom";

export type OrderUnitType = "ROLLS" | "METRES" | "NET_KG";

export interface OrderAlternative {
  rolls: number;
  metres: Decimal;
  netKg: Decimal;
}

export interface OrderConversionResult {
  isValid: boolean;
  wholeRolls: number;
  totalMetres: Decimal;
  totalNetKg: Decimal;
  errorMessage?: string;
  alternatives?: OrderAlternative[];
}

/**
 * Validates and converts customer order quantities into exact whole rolls,
 * metres, and net kg based on the tape specification.
 * If invalid, provides nearest lower and upper whole roll alternatives.
 */
export function validateAndConvertOrder(
  specParams: TapeSpecParams,
  requestedQuantity: Decimal.Value,
  unit: OrderUnitType,
  netKgTolerance: Decimal.Value = "0.001"
): OrderConversionResult {
  const reqQty = new Decimal(requestedQuantity);
  const bom = calculateRollBOM(specParams);
  const rollLengthM = bom.rollLengthM;
  const netTapeKgPerRoll = bom.netTapeKgPerRoll;

  if (reqQty.lessThanOrEqualTo(0)) {
    return {
      isValid: false,
      wholeRolls: 0,
      totalMetres: new Decimal(0),
      totalNetKg: new Decimal(0),
      errorMessage: "Order requested quantity must be strictly positive.",
    };
  }

  const tolerance = new Decimal(netKgTolerance);

  if (unit === "ROLLS") {
    // Must be integer
    if (!reqQty.isInteger() || reqQty.lessThan(1)) {
      const lower = Math.max(1, Math.floor(reqQty.toNumber()));
      const upper = Math.ceil(reqQty.toNumber());
      return {
        isValid: false,
        wholeRolls: 0,
        totalMetres: new Decimal(0),
        totalNetKg: new Decimal(0),
        errorMessage: `Roll orders must be a positive whole integer. ${reqQty.toString()} is invalid.`,
        alternatives: buildAlternatives(specParams, [lower, upper]),
      };
    }

    const wholeRolls = reqQty.toNumber();
    return {
      isValid: true,
      wholeRolls,
      totalMetres: rollLengthM.times(wholeRolls),
      totalNetKg: netTapeKgPerRoll.times(wholeRolls),
    };
  }

  if (unit === "METRES") {
    // Must be positive integer and exact multiple of roll length
    if (!reqQty.isInteger() || reqQty.lessThan(1)) {
      return {
        isValid: false,
        wholeRolls: 0,
        totalMetres: new Decimal(0),
        totalNetKg: new Decimal(0),
        errorMessage: "Metre orders must be a positive whole integer.",
        alternatives: buildAlternatives(specParams, [1, 2]),
      };
    }

    const division = reqQty.dividedBy(rollLengthM);
    if (!division.isInteger() || division.lessThan(1)) {
      const lowerRolls = Math.max(1, Math.floor(division.toNumber()));
      const upperRolls = Math.max(1, Math.ceil(division.toNumber()));
      const suggestedRolls = lowerRolls === upperRolls ? [lowerRolls] : [lowerRolls, upperRolls];

      return {
        isValid: false,
        wholeRolls: 0,
        totalMetres: new Decimal(0),
        totalNetKg: new Decimal(0),
        errorMessage: `Requested metres (${reqQty.toString()} m) is not an exact multiple of the roll length (${rollLengthM.toString()} m). Every roll must be complete.`,
        alternatives: buildAlternatives(specParams, suggestedRolls),
      };
    }

    const wholeRolls = division.toNumber();
    return {
      isValid: true,
      wholeRolls,
      totalMetres: reqQty,
      totalNetKg: netTapeKgPerRoll.times(wholeRolls),
    };
  }

  if (unit === "NET_KG") {
    // Must correspond exactly to a whole number of rolls within tolerance
    const calculatedRolls = reqQty.dividedBy(netTapeKgPerRoll);
    const roundedRolls = Math.round(calculatedRolls.toNumber());

    if (roundedRolls < 1) {
      return {
        isValid: false,
        wholeRolls: 0,
        totalMetres: new Decimal(0),
        totalNetKg: new Decimal(0),
        errorMessage: `Requested weight (${reqQty.toFixed(3)} kg) is less than a single roll (${netTapeKgPerRoll.toFixed(3)} kg). Orders must be in whole rolls.`,
        alternatives: buildAlternatives(specParams, [1, 2]),
      };
    }

    const expectedExactKg = netTapeKgPerRoll.times(roundedRolls);
    const diff = reqQty.minus(expectedExactKg).abs();

    if (diff.greaterThan(tolerance)) {
      const lowerRolls = Math.max(1, Math.floor(calculatedRolls.toNumber()));
      const upperRolls = Math.max(1, Math.ceil(calculatedRolls.toNumber()));
      const suggestedRolls = lowerRolls === upperRolls ? [lowerRolls, lowerRolls + 1] : [lowerRolls, upperRolls];

      return {
        isValid: false,
        wholeRolls: 0,
        totalMetres: new Decimal(0),
        totalNetKg: new Decimal(0),
        errorMessage: `Requested weight (${reqQty.toFixed(3)} kg) does not correspond to an exact whole number of rolls (net weight per roll is ${netTapeKgPerRoll.toFixed(3)} kg). Nearest whole roll would be ${expectedExactKg.toFixed(3)} kg for ${roundedRolls} roll(s).`,
        alternatives: buildAlternatives(specParams, suggestedRolls),
      };
    }

    return {
      isValid: true,
      wholeRolls: roundedRolls,
      totalMetres: rollLengthM.times(roundedRolls),
      totalNetKg: expectedExactKg,
    };
  }

  return {
    isValid: false,
    wholeRolls: 0,
    totalMetres: new Decimal(0),
    totalNetKg: new Decimal(0),
    errorMessage: `Unsupported order unit: ${unit}`,
  };
}

function buildAlternatives(
  specParams: TapeSpecParams,
  rollsList: number[]
): OrderAlternative[] {
  const bom = calculateRollBOM(specParams);
  const uniqueRolls = Array.from(new Set(rollsList)).filter((r) => r >= 1);

  return uniqueRolls.map((rolls) => ({
    rolls,
    metres: bom.rollLengthM.times(rolls),
    netKg: bom.netTapeKgPerRoll.times(rolls),
  }));
}
