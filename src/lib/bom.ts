import { Decimal } from "./decimal";

export interface TapeSpecParams {
  widthMm: Decimal.Value;
  filmGsm: Decimal.Value;
  dryAdhesiveGsm: Decimal.Value;
  adhesiveSolidsPercent: Decimal.Value;
  rollLengthM: Decimal.Value;
}

export interface RollBOMResult {
  areaPerRollM2: Decimal;
  filmKgPerRoll: Decimal;
  dryAdhesiveKgPerRoll: Decimal;
  liquidAdhesiveKgPerRoll: Decimal;
  netTapeKgPerRoll: Decimal;
  coresPerRoll: number;
  rollLengthM: Decimal;
}

export interface BatchBOMResult {
  rolls: number;
  areaTotalM2: Decimal;
  filmTotalKg: Decimal;
  dryAdhesiveTotalKg: Decimal;
  liquidAdhesiveTotalKg: Decimal;
  netTapeTotalKg: Decimal;
  coresTotal: number;
  lengthTotalM: Decimal;
  perRoll: RollBOMResult;
}

/**
 * Validates specification parameters and calculates single-roll BOM metrics.
 * Uses exact Decimal arithmetic without intermediate rounding.
 */
export function calculateRollBOM(params: TapeSpecParams): RollBOMResult {
  const widthMm = new Decimal(params.widthMm);
  const filmGsm = new Decimal(params.filmGsm);
  const dryAdhesiveGsm = new Decimal(params.dryAdhesiveGsm);
  const adhesiveSolidsPercent = new Decimal(params.adhesiveSolidsPercent);
  const rollLengthM = new Decimal(params.rollLengthM);

  if (widthMm.lessThanOrEqualTo(0)) {
    throw new Error("Width in millimetres must be strictly positive.");
  }
  if (filmGsm.lessThanOrEqualTo(0)) {
    throw new Error("Film GSM must be strictly positive.");
  }
  if (dryAdhesiveGsm.lessThanOrEqualTo(0)) {
    throw new Error("Dry adhesive GSM must be strictly positive.");
  }
  if (
    adhesiveSolidsPercent.lessThanOrEqualTo(0) ||
    adhesiveSolidsPercent.greaterThan(100)
  ) {
    throw new Error("Adhesive solids percentage must be greater than 0 and at most 100%.");
  }
  if (rollLengthM.lessThanOrEqualTo(0)) {
    throw new Error("Roll length in metres must be strictly positive.");
  }

  // area = (width_mm / 1000) * roll_length_m
  const areaPerRollM2 = widthMm.dividedBy(1000).times(rollLengthM);

  // film_kg = area * film_gsm / 1000
  const filmKgPerRoll = areaPerRollM2.times(filmGsm).dividedBy(1000);

  // dry_adhesive_kg = area * dry_adhesive_gsm / 1000
  const dryAdhesiveKgPerRoll = areaPerRollM2.times(dryAdhesiveGsm).dividedBy(1000);

  // solids_fraction = solids_percentage / 100
  const solidsFraction = adhesiveSolidsPercent.dividedBy(100);

  // liquid_adhesive_kg = dry_adhesive_kg / solids_fraction
  const liquidAdhesiveKgPerRoll = dryAdhesiveKgPerRoll.dividedBy(solidsFraction);

  // net_tape_kg = film_kg + dry_adhesive_kg
  const netTapeKgPerRoll = filmKgPerRoll.plus(dryAdhesiveKgPerRoll);

  return {
    areaPerRollM2,
    filmKgPerRoll,
    dryAdhesiveKgPerRoll,
    liquidAdhesiveKgPerRoll,
    netTapeKgPerRoll,
    coresPerRoll: 1,
    rollLengthM,
  };
}

/**
 * Calculates BOM requirements for any requested whole number of rolls.
 */
export function calculateBatchBOM(
  params: TapeSpecParams,
  rolls: number
): BatchBOMResult {
  if (!Number.isInteger(rolls) || rolls <= 0) {
    throw new Error("Batch roll count must be a positive whole integer.");
  }

  const perRoll = calculateRollBOM(params);
  const rollsDec = new Decimal(rolls);

  return {
    rolls,
    areaTotalM2: perRoll.areaPerRollM2.times(rollsDec),
    filmTotalKg: perRoll.filmKgPerRoll.times(rollsDec),
    dryAdhesiveTotalKg: perRoll.dryAdhesiveKgPerRoll.times(rollsDec),
    liquidAdhesiveTotalKg: perRoll.liquidAdhesiveKgPerRoll.times(rollsDec),
    netTapeTotalKg: perRoll.netTapeKgPerRoll.times(rollsDec),
    coresTotal: rolls,
    lengthTotalM: perRoll.rollLengthM.times(rollsDec),
    perRoll,
  };
}
