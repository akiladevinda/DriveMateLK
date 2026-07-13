import {
  differenceInCalendarDays,
  format,
  isValid,
  parseISO,
  startOfDay,
} from 'date-fns';

/** Serializes a Date to a UTC ISO-8601 string. */
export function toUtcIso(date: Date): string {
  return date.toISOString();
}

function parseIsoDate(iso: string): Date | null {
  const parsed = parseISO(iso);
  return isValid(parsed) ? parsed : null;
}

/** Formats an ISO date string for on-screen display. */
export function formatDisplayDate(iso: string, locale?: string): string {
  const date = parseIsoDate(iso);
  if (!date) {
    return '—';
  }

  if (locale) {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  }

  return format(date, 'dd MMM yyyy');
}

/** Returns whole calendar days from `from` until the ISO date (negative if past). */
export function daysUntil(iso: string, from = new Date()): number {
  const date = parseIsoDate(iso);
  if (!date) {
    return Number.NaN;
  }

  return differenceInCalendarDays(startOfDay(date), startOfDay(from));
}

/** True when the date falls within the next `withinDays` calendar days. */
export function isExpiringSoon(iso: string, withinDays = 30): boolean {
  const remaining = daysUntil(iso);
  if (Number.isNaN(remaining)) {
    return false;
  }
  return remaining >= 0 && remaining <= withinDays;
}

/** True when the ISO date is before today. */
export function isExpired(iso: string): boolean {
  const remaining = daysUntil(iso);
  if (Number.isNaN(remaining)) {
    return false;
  }
  return remaining < 0;
}
