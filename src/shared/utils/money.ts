/**
 * Money is stored in integer minor units (cents). These convert between that
 * and the major-unit strings shown in inputs.
 */

/** Parse a major-unit input string ("12.40") to integer minor units. NaN → 0. */
export function toMinorUnits(value: string): number {
  const amount = Number.parseFloat(value);
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
}

/** Format integer minor units as a fixed 2-decimal major-unit string. */
export function fromMinorUnits(minor: number): string {
  return (minor / 100).toFixed(2);
}
