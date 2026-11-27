import { addDays, formatDate } from '../domain/dates';
import type { LocalDate, Locale } from '../domain/types';
import type { I18n } from './i18n';

/** 102.5 -> "102.5", 100 -> "100", 72.125 -> "72.13". */
export function formatNumber(n: number): string {
  return String(Math.round(n * 100) / 100);
}

/** 12345.5 -> "12,345.5" in the reader's locale, for display only. */
export function formatGrouped(n: number, locale: Locale): string {
  return n.toLocaleString(locale, { maximumFractionDigits: 1 });
}

/** Milliseconds left -> "m:ss", rounding up so 0:00 means done. */
export function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export function formatSeconds(sec: number): string {
  return formatClock(sec * 1000);
}

/** A short axis label: 12_345 -> "12K" in English, "1.2万" in Japanese. */
export function formatCompact(n: number, locale: Locale): string {
  return n.toLocaleString(locale, { notation: 'compact' });
}

export function dayLabel(date: LocalDate, today: LocalDate, { locale, t }: I18n): string {
  if (date === today) return t.dates.today;
  if (date === addDays(today, -1)) return t.dates.yesterday;
  if (date === addDays(today, 1)) return t.dates.tomorrow;
  const sameYear = date.slice(0, 4) === today.slice(0, 4);
  return formatDate(date, locale, { weekday: 'short', month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }) });
}

export function shortDate(date: LocalDate, locale: Locale): string {
  return formatDate(date, locale, { month: 'short', day: 'numeric' });
}

/** Parses what a person typed in a number field; accepts a comma decimal separator. */
export function parseNumberInput(text: string): number | null {
  const normalized = text.trim().replace(',', '.');
  if (normalized === '') return null;
  const n = Number(normalized);
  return Number.isFinite(n) && n >= 0 ? n : null;
}
