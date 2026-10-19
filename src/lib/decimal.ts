import Decimal from "decimal.js";

// Configure Decimal.js precision for financial & engineering calculations
Decimal.set({ precision: 30, rounding: Decimal.ROUND_HALF_UP });

export { Decimal };

/**
 * Formats a decimal number or string to a fixed 3 decimal places (e.g. 1.200 kg)
 */
export function formatKg(value: Decimal.Value | null | undefined): string {
  if (value === null || value === undefined) return "0.000";
  return new Decimal(value).toFixed(3);
}

/**
 * Formats a decimal number or string to 2 decimal places (e.g. metres or percentages)
 */
export function formatMetres(value: Decimal.Value | null | undefined): string {
  if (value === null || value === undefined) return "0.00";
  return new Decimal(value).toFixed(2);
}

/**
 * Safely converts an input to Decimal
 */
export function toDecimal(value: Decimal.Value): Decimal {
  return new Decimal(value);
}

/**
 * Compare two decimals with a tolerance.
 * Returns true if Math.abs(a - b) <= tolerance
 */
export function isWithinTolerance(
  a: Decimal.Value,
  b: Decimal.Value,
  tolerance: Decimal.Value = "0.001"
): boolean {
  const decA = new Decimal(a);
  const decB = new Decimal(b);
  const diff = decA.minus(decB).abs();
  return diff.lessThanOrEqualTo(new Decimal(tolerance));
}
