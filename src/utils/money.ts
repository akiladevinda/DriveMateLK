/** LKR minor units per major unit (1 rupee = 100 cents/paisa). */
export const MINOR_UNITS_PER_MAJOR = 100;

/**
 * Converts a major-unit amount (e.g. rupees) to integer minor units.
 * Rounds to the nearest minor unit to avoid floating-point drift.
 */
export function toMinorUnits(major: number): number {
  if (!Number.isFinite(major)) {
    return 0;
  }
  return Math.round(major * MINOR_UNITS_PER_MAJOR);
}

/** Converts integer minor units back to major units for display or input. */
export function fromMinorUnits(minor: number): number {
  return minor / MINOR_UNITS_PER_MAJOR;
}

/** Formats minor units as a localized currency string. */
export function formatMoney(
  minor: number,
  currencyCode = 'LKR',
  locale = 'en-LK',
): string {
  const major = fromMinorUnits(minor);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(major);
}

/**
 * Parses user-entered money text into integer minor units.
 * Returns null when the input cannot be parsed as a valid amount.
 */
export function parseMoneyInput(text: string): number | null {
  const normalized = text.trim().replace(/[^\d.,-]/g, '');
  if (!normalized) {
    return null;
  }

  const withoutCommas = normalized.replace(/,/g, '');
  const parsed = Number(withoutCommas);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return toMinorUnits(parsed);
}

/** Sums amounts in minor units using integer arithmetic only. */
export function sumMinor(...amounts: number[]): number {
  return amounts.reduce((total, amount) => total + Math.trunc(amount), 0);
}
