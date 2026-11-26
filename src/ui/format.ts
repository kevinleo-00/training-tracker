import { addDays, formatDate } from '../domain/dates';
import type { LocalDate } from '../domain/types';

/** 102.5 -> "102.5", 100 -> "100", 72.125 -> "72.13". */
export function formatNumber(n: number): string {
  return String(Math.round(n * 100) / 100);
}

/** 12345.5 -> "12,345.5" in the reader's locale, for display only. */
export function formatGrouped(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

/** Milliseconds left -> "m:ss", rounding up so 0:00 means done. */
export function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export function formatSeconds(sec: number): string {
  return formatClock(sec * 1000);
}

/** 12_345 -> "12.3k". */
export function formatCompact(n: number): string {
  if (n >= 10_000) return `${Math.round(n / 1000)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return formatNumber(n);
}

export function dayLabel(date: LocalDate, today: LocalDate): string {
  if (date === today) return 'Today';
  if (date === addDays(today, -1)) return 'Yesterday';
  if (date === addDays(today, 1)) return 'Tomorrow';
  const sameYear = date.slice(0, 4) === today.slice(0, 4);
  return formatDate(date, { weekday: 'short', month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }) });
}

export function shortDate(date: LocalDate): string {
  return formatDate(date, { month: 'short', day: 'numeric' });
}

/** Parses what a person typed in a number field; accepts a comma decimal separator. */
export function parseNumberInput(text: string): number | null {
  const normalized = text.trim().replace(',', '.');
  if (normalized === '') return null;
  const n = Number(normalized);
  return Number.isFinite(n) && n >= 0 ? n : null;
}
