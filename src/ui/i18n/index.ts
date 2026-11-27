import type { Locale } from '../../domain/types';
import { useAppState } from '../../store/react';
import { en, type Messages } from './en';
import { ja } from './ja';
import { ko } from './ko';
import { resolveLocale } from './locale';
import { zhHans } from './zh-Hans';
import { zhHant } from './zh-Hant';

export type { Messages };
export { resolveLocale };

const MESSAGES: Record<Locale, Messages> = { en, 'zh-Hans': zhHans, 'zh-Hant': zhHant, ja, ko };

/** Each language's name in its own script, the same in every UI language. */
export const LANGUAGE_NAMES: Record<Locale, string> = {
  en: 'English',
  'zh-Hans': '简体中文',
  'zh-Hant': '繁體中文',
  ja: '日本語',
  ko: '한국어',
};

/** The active locale (a BCP 47 tag for Intl and `lang`) with its messages. */
export interface I18n {
  locale: Locale;
  t: Messages;
}

export function i18n(locale: Locale): I18n {
  return { locale, t: MESSAGES[locale] };
}

/** The device's preferred languages, most preferred first. */
export const deviceLanguages = (): readonly string[] => navigator.languages;

export function useI18n(): I18n {
  return i18n(resolveLocale(useAppState().settings.language, deviceLanguages()));
}

/** The localStorage key the inline script in index.html reads to set `lang` before first paint. */
const STORAGE_KEY = 'lang';

let applied: Locale | null = null;

/** Sets `<html lang>`, which also picks the right CJK glyphs and the pixel theme's fonts. */
export function applyLocale(locale: Locale) {
  if (locale === applied) return;
  applied = locale;
  document.documentElement.lang = locale;
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // Storage can be unavailable (private mode); `lang` then applies once the app loads.
  }
}
