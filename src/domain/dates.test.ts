import { describe, expect, it } from 'vitest';
import { addDays, daysBetween, parseLocalDate, toLocalDate, weekStart } from './dates';

const d = (s: string) => {
  const parsed = parseLocalDate(s);
  if (!parsed) throw new Error(`bad date ${s}`);
  return parsed;
};

describe('dates', () => {
  it('formats a Date in local time', () => {
    expect(toLocalDate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });

  it('parses only real YYYY-MM-DD dates', () => {
    expect(parseLocalDate('2026-02-28')).toBe('2026-02-28');
    expect(parseLocalDate('2026-02-30')).toBeNull();
    expect(parseLocalDate('2026-2-3')).toBeNull();
    expect(parseLocalDate(20260203)).toBeNull();
  });

  it('adds days across month, year, and DST boundaries', () => {
    expect(addDays(d('2026-01-31'), 1)).toBe('2026-02-01');
    expect(addDays(d('2026-12-31'), 1)).toBe('2027-01-01');
    expect(addDays(d('2026-03-08'), 1)).toBe('2026-03-09');
    expect(addDays(d('2026-03-01'), -1)).toBe('2026-02-28');
  });

  it('counts whole days between dates', () => {
    expect(daysBetween(d('2026-03-01'), d('2026-03-31'))).toBe(30);
    expect(daysBetween(d('2026-03-31'), d('2026-03-01'))).toBe(-30);
  });

  it('starts weeks on Monday', () => {
    expect(weekStart(d('2026-11-25'))).toBe('2026-11-23'); // Wednesday
    expect(weekStart(d('2026-11-23'))).toBe('2026-11-23'); // Monday
    expect(weekStart(d('2026-11-29'))).toBe('2026-11-23'); // Sunday
  });
});
