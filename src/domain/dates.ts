import type { LocalDate } from './types';

const DAY_MS = 86_400_000;
const pad = (n: number) => String(n).padStart(2, '0');

/** Calendar date of `date` in the device's local time zone. */
export function toLocalDate(date: Date): LocalDate {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` as LocalDate;
}

export function today(): LocalDate {
  return toLocalDate(new Date());
}

export function parseLocalDate(value: unknown): LocalDate | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return fromUtcMs(toUtcMs(value as LocalDate)) === value ? (value as LocalDate) : null;
}

// Calendar arithmetic runs on UTC midnights so DST shifts never move a date.
function toUtcMs(date: LocalDate): number {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, d);
}

function fromUtcMs(ms: number): LocalDate {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}` as LocalDate;
}

export function addDays(date: LocalDate, days: number): LocalDate {
  return fromUtcMs(toUtcMs(date) + days * DAY_MS);
}

export function daysBetween(from: LocalDate, to: LocalDate): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / DAY_MS);
}

/** The Monday on or before `date`. */
export function weekStart(date: LocalDate): LocalDate {
  const weekday = new Date(toUtcMs(date)).getUTCDay(); // 0 = Sunday
  return addDays(date, -((weekday + 6) % 7));
}

export function formatDate(date: LocalDate, options: Intl.DateTimeFormatOptions): string {
  return new Date(toUtcMs(date)).toLocaleDateString(undefined, { ...options, timeZone: 'UTC' });
}
