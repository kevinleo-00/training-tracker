import type { Language, Locale } from '../../domain/types';

const TRADITIONAL_REGIONS = new Set(['tw', 'hk', 'mo']);
const BY_LANGUAGE: Partial<Record<string, Locale>> = { en: 'en', ja: 'ja', ko: 'ko' };

/** The supported locale for one BCP 47 tag, or null when the app has no translation for it. */
function matchTag(tag: string): Locale | null {
  const [language = '', ...rest] = tag.toLowerCase().split('-');
  if (language !== 'zh') return BY_LANGUAGE[language] ?? null;
  // An explicit script wins (zh-Hans-HK is Simplified); otherwise the region decides.
  const script = rest.find((subtag) => subtag === 'hans' || subtag === 'hant');
  if (script) return script === 'hant' ? 'zh-Hant' : 'zh-Hans';
  return rest.some((subtag) => TRADITIONAL_REGIONS.has(subtag)) ? 'zh-Hant' : 'zh-Hans';
}

/** The locale to show: the chosen one, or for 'system' the first supported device language, else English. */
export function resolveLocale(language: Language, preferred: readonly string[]): Locale {
  if (language !== 'system') return language;
  for (const tag of preferred) {
    const locale = matchTag(tag);
    if (locale) return locale;
  }
  return 'en';
}
