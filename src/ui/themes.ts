import type { ThemeId } from '../domain/types';
import type { Tune } from './device';

export interface Theme {
  label: string;
  description: string;
  /** The `theme-color` for the browser chrome and iOS status bar, under light and dark system appearance. */
  chrome: { light: string; dark: string };
  restOver: Tune;
}

/** Every theme the app offers. Each id is also a `data-theme` value its stylesheet keys on. */
export const THEMES: Record<ThemeId, Theme> = {
  classic: {
    label: 'Classic',
    description: 'Clean and simple. Follows light or dark mode.',
    chrome: { light: '#f2f2f7', dark: '#000000' },
    restOver: { wave: 'sine', volume: 0.4, notes: [0, 0.25, 0.5].map((at) => ({ hz: 880, at, length: 0.15 })) },
  },
  pixel: {
    label: 'Pixel',
    description: 'Retro RPG menus with pixel windows and type.',
    chrome: { light: '#0a0a2a', dark: '#0a0a2a' },
    restOver: {
      wave: 'square',
      volume: 0.12,
      notes: [
        { hz: 988, at: 0, length: 0.12 },
        { hz: 1319, at: 0.14, length: 0.32 },
      ],
    },
  },
};

/** The localStorage key the inline script in index.html reads to apply the theme before first paint. */
const STORAGE_KEY = 'theme';

let applied: ThemeId | null = null;

export function applyTheme(id: ThemeId) {
  if (id === applied) return;
  applied = id;
  document.documentElement.dataset.theme = id;
  const { chrome } = THEMES[id];
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    meta.content = meta.media.includes('dark') ? chrome.dark : chrome.light;
  }
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Storage can be unavailable (private mode); the theme then applies once the app loads.
  }
}
