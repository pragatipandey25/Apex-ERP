import { Decimal } from "./decimal";
import { TapeSpecParams, calculateRollBOM } from "./bom";

export interface ProductionBalanceInput {
  specParams: TapeSpecParams;
  wholeRolls: number;
  filmIssuedKg: Decimal.Value;
  liquidAdhesiveIssuedKg: Decimal.Value;
  dryWastageKg: Decimal.Value;
}

export interface ProductionBalanceResult {
  isValid: boolean;
  lhsTotalInputSolidsKg: Decimal;
  rhsTotalOutputSolidsKg: Decimal;
  netTapeProducedKg: Decimal;
  dryWastageKg: Decimal;
  filmIssuedKg: Decimal;
  liquidAdhesiveIssuedKg: Decimal;
  solidsFraction: Decimal;
  liquidAdhesiveSolidsKg: Decimal;
  signedDifferenceKg: Decimal; // LHS - RHS
  absoluteDifferenceKg: Decimal;
  toleranceKg: Decimal;
  errorMessage?: string;
}

/**
 * Industrial tolerance for tape factory coating balance.
 * Rationale: Scales record weights to 3 decimal places (1 gram / 0.001 kg).
 * Summing film (±0.0005) and adhesive solids (±0.0005) against output tape (±0.0005) and wastage (±0.0005)
 * yields a cumulative measurement precision boundary of 0.002 kg (2 grams).
 */
export const PRODUCTION_BALANCE_TOLERANCE_KG = new Decimal("0.002");

/**
 * Validates the mandatory tape factory production balance equation:
 * film_issued_kg + (liquid_adhesive_issued_kg * solids_fraction) = net_tape_produced_kg + dry_wastage_kg
 *
 * Where:
 * net_tape_produced_kg = expected_net_tape_kg_per_roll * whole_rolls
 */
export function verifyProductionBalance(
  input: ProductionBalanceInput,
  tolerance: Decimal = PRODUCTION_BALANCE_TOLERANCE_KG
): ProductionBalanceResult {
  const filmIssued = new Decimal(input.filmIssuedKg);
  const liquidAdhesiveIssued = new Decimal(input.liquidAdhesiveIssuedKg);
  const dryWastage = new Decimal(input.dryWastageKg);

  if (!Number.isInteger(input.wholeRolls) || input.wholeRolls <= 0) {
    throw new Error("Roll count must be a positive whole integer.");
  }
  if (filmIssued.lessThanOrEqualTo(0)) {
    throw new Error("Film issued must be strictly positive.");
  }
  if (liquidAdhesiveIssued.lessThanOrEqualTo(0)) {
    throw new Error("Liquid adhesive issued must be strictly positive.");
  }
  if (dryWastage.lessThan(0)) {
    throw new Error("Dry wastage must be non-negative.");
  }

  const bom = calculateRollBOM(input.specParams);
  const netTapeProducedKg = bom.netTapeKgPerRoll.times(input.wholeRolls);

  const solidsFraction = new Decimal(input.specParams.adhesiveSolidsPercent).dividedBy(100);
  const liquidAdhesiveSolidsKg = liquidAdhesiveIssued.times(solidsFraction);

  // LHS = film_issued_kg + (liquid_adhesive_issued_kg * solids_fraction)
  const lhsTotalInputSolidsKg = filmIssued.plus(liquidAdhesiveSolidsKg);

  // RHS = net_tape_produced_kg + dry_wastage_kg
  const rhsTotalOutputSolidsKg = netTapeProducedKg.plus(dryWastage);

  // Signed Difference: LHS - RHS (Positive means extra material input; Negative means insufficient input)
  const signedDifferenceKg = lhsTotalInputSolidsKg.minus(rhsTotalOutputSolidsKg);
  const absoluteDifferenceKg = signedDifferenceKg.abs();

  const isValid = absoluteDifferenceKg.lessThanOrEqualTo(tolerance);

  let errorMessage: string | undefined;
  if (!isValid) {
    const signPrefix = signedDifferenceKg.isPositive() ? "+" : "";
    errorMessage = `Production balance mismatch: Input solids (${lhsTotalInputSolidsKg.toFixed(
      3
    )} kg) does not match Output solids (${rhsTotalOutputSolidsKg.toFixed(
      3
    )} kg). Signed difference: ${signPrefix}${signedDifferenceKg.toFixed(
      4
    )} kg (exceeds allowable tolerance of ±${tolerance.toFixed(3)} kg).`;
  }

  return {
    isValid,
    lhsTotalInputSolidsKg,
    rhsTotalOutputSolidsKg,
    netTapeProducedKg,
    dryWastageKg: dryWastage,
    filmIssuedKg: filmIssued,
    liquidAdhesiveIssuedKg: liquidAdhesiveIssued,
    solidsFraction,
    liquidAdhesiveSolidsKg,
    signedDifferenceKg,
    absoluteDifferenceKg,
    toleranceKg: tolerance,
    errorMessage,
  };
}
