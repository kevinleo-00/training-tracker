import { describe, expect, it } from 'vitest';
import { LOCALES } from '../../domain/types';
import { resolveLocale } from './locale';

describe('resolveLocale', () => {
  it.each(LOCALES)('uses a chosen locale (%s) whatever the device prefers', (locale) => {
    expect(resolveLocale(locale, ['ko-KR', 'fr-FR'])).toBe(locale);
  });

  it.each([
    ['zh-TW', 'zh-Hant'],
    ['zh-HK', 'zh-Hant'],
    ['zh-MO', 'zh-Hant'],
    ['zh-Hant', 'zh-Hant'],
    ['zh-Hant-TW', 'zh-Hant'],
    ['zh-Hant-CN', 'zh-Hant'],
    ['zh-CN', 'zh-Hans'],
    ['zh-SG', 'zh-Hans'],
    ['zh', 'zh-Hans'],
    ['zh-Hans', 'zh-Hans'],
    ['zh-Hans-HK', 'zh-Hans'],
    ['ja', 'ja'],
    ['ja-JP', 'ja'],
    ['ko-KR', 'ko'],
    ['en-GB', 'en'],
    ['EN-us', 'en'],
    ['zh-tw', 'zh-Hant'],
  ])('follows the device: %s shows %s', (tag, locale) => {
    expect(resolveLocale('system', [tag])).toBe(locale);
  });

  it('takes the first supported language in the device list', () => {
    expect(resolveLocale('system', ['fr-FR', 'ja-JP', 'en-US'])).toBe('ja');
    expect(resolveLocale('system', ['de', 'zh-HK', 'ko'])).toBe('zh-Hant');
  });

  it('falls back to English when no device language is supported', () => {
    expect(resolveLocale('system', ['fr-FR', 'de-DE'])).toBe('en');
    expect(resolveLocale('system', [])).toBe('en');
  });
});
