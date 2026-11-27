import { describe, expect, it } from 'vitest';
import { day } from '../domain/testing';
import { dayLabel, formatCompact, formatGrouped, shortDate } from './format';
import { i18n } from './i18n';

const today = day('2026-11-25'); // a Wednesday

describe('format', () => {
  it('names nearby days in the reader’s language', () => {
    expect(dayLabel(today, today, i18n('en'))).toBe('Today');
    expect(dayLabel(day('2026-11-24'), today, i18n('ja'))).toBe('昨日');
    expect(dayLabel(day('2026-11-26'), today, i18n('zh-Hant'))).toBe('明天');
    expect(dayLabel(today, today, i18n('ko'))).toBe('오늘');
    expect(dayLabel(today, today, i18n('zh-Hans'))).toBe('今天');
  });

  it('formats other days with the locale’s own date pattern', () => {
    expect(dayLabel(day('2026-11-20'), today, i18n('en'))).toBe('Fri, Nov 20');
    expect(dayLabel(day('2026-11-20'), today, i18n('ja'))).toBe('11月20日(金)');
    expect(dayLabel(day('2025-11-20'), today, i18n('en'))).toBe('Thu, Nov 20, 2025');
  });

  it('formats short dates per locale', () => {
    expect(shortDate(day('2026-11-20'), 'en')).toBe('Nov 20');
    expect(shortDate(day('2026-11-20'), 'zh-Hans')).toBe('11月20日');
    expect(shortDate(day('2026-11-20'), 'ko')).toBe('11월 20일');
  });

  it('groups digits per locale', () => {
    expect(formatGrouped(12345.5, 'en')).toBe('12,345.5');
    expect(formatGrouped(12345.5, 'ja')).toBe('12,345.5');
  });

  it('abbreviates large numbers the way each locale counts', () => {
    expect(formatCompact(500, 'en')).toBe('500');
    expect(formatCompact(1250, 'en')).toBe('1.3K');
    expect(formatCompact(12345, 'en')).toBe('12K');
    expect(formatCompact(12345, 'ja')).toBe('1.2万');
    expect(formatCompact(12345, 'ko')).toBe('1.2만');
  });
});
