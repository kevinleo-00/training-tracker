import { expect, type Page, test } from '@playwright/test';
import { readSaved } from './saved';

declare global {
  interface Window {
    langAtFirstPaint?: string;
  }
}

/** Records `<html lang>` at the moment <body> appears, before the browser can paint anything. */
async function recordLangAtFirstPaint(page: Page) {
  await page.addInitScript(() => {
    const observer = new MutationObserver(() => {
      if (!document.body) return;
      window.langAtFirstPaint = document.documentElement.lang;
      observer.disconnect();
    });
    observer.observe(document, { childList: true, subtree: true });
  });
}

const languages = [
  { name: '简体中文', lang: 'zh-Hans', language: '语言', workouts: '训练', dashboard: '统计', settings: '设置', empty: '还没有训练记录', noProgress: '还没有可显示的进度' },
  { name: '繁體中文', lang: 'zh-Hant', language: '語言', workouts: '訓練', dashboard: '統計', settings: '設定', empty: '還沒有訓練紀錄', noProgress: '還沒有可以顯示的進度' },
  { name: '日本語', lang: 'ja', language: '言語', workouts: 'ワークアウト', dashboard: '統計', settings: '設定', empty: 'ワークアウトはまだありません', noProgress: 'まだ表示できる記録がありません' },
  { name: '한국어', lang: 'ko', language: '언어', workouts: '운동', dashboard: '통계', settings: '설정', empty: '아직 운동 기록이 없습니다', noProgress: '아직 표시할 기록이 없습니다' },
  { name: 'English', lang: 'en', language: 'Language', workouts: 'Workouts', dashboard: 'Dashboard', settings: 'Settings', empty: 'No workouts yet', noProgress: 'No progress to show yet' },
];

test('switch to each language, keep it across a reload with lang set before first paint, and switch back', async ({ page }) => {
  await recordLangAtFirstPaint(page);
  const html = page.locator('html');
  const heading = page.getByRole('heading', { level: 1 });
  const tab = (name: string) => page.getByRole('navigation').getByRole('link', { name, exact: true });

  await page.goto('./#/settings');
  await expect(html).toHaveAttribute('lang', 'en');
  const automatic = page.getByRole('radiogroup', { name: 'Language' }).getByRole('radio', { name: /^Automatic/ });
  await expect(automatic).toHaveAttribute('aria-checked', 'true');

  for (const l of languages) {
    // Each language keeps its own name in every UI language, so the same radio works from any of them.
    await page.getByRole('radio', { name: l.name, exact: true }).click();
    await expect(html).toHaveAttribute('lang', l.lang);
    await expect(heading).toHaveText(l.settings);
    const picker = page.getByRole('radiogroup', { name: l.language });
    await expect(picker.getByRole('radio', { name: l.name, exact: true })).toHaveAttribute('aria-checked', 'true');
    await expect(picker.getByRole('radio', { checked: true })).toHaveCount(1);

    await tab(l.workouts).click();
    await expect(heading).toHaveText(l.workouts);
    await expect(page.getByText(l.empty)).toBeVisible();
    await tab(l.dashboard).click();
    await expect(page.getByText(l.noProgress)).toBeVisible();

    await expect.poll(() => readSaved(page)).toContain(`"language":"${l.lang}"`);
    await page.reload({ waitUntil: 'domcontentloaded' });
    expect(await page.evaluate(() => window.langAtFirstPaint)).toBe(l.lang);
    await expect(page.getByText(l.noProgress)).toBeVisible();
    await expect(html).toHaveAttribute('lang', l.lang);
    await tab(l.settings).click();
  }

  // Back to following the device, which Playwright reports as en-US.
  await page.getByRole('radio', { name: '日本語', exact: true }).click();
  await expect(html).toHaveAttribute('lang', 'ja');
  await page.getByRole('radiogroup', { name: '言語' }).getByRole('radio', { name: /^端末の設定に従う/ }).click();
  await expect(html).toHaveAttribute('lang', 'en');
  await expect(heading).toHaveText('Settings');
  await expect(automatic).toHaveAttribute('aria-checked', 'true');
  await expect.poll(() => readSaved(page)).toContain('"language":"system"');
  await page.reload({ waitUntil: 'domcontentloaded' });
  expect(await page.evaluate(() => window.langAtFirstPaint)).toBe('en');
  await expect(heading).toHaveText('Settings');
});

test.describe('on a device set to Traditional Chinese (Taiwan)', () => {
  test.use({ locale: 'zh-TW' });

  test('follows the device language until another one is picked', async ({ page }) => {
    await page.goto('./#/settings');
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-Hant');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('設定');
    const automatic = page.getByRole('radiogroup', { name: '語言' }).getByRole('radio', { name: /^跟隨系統/ });
    await expect(automatic).toHaveAttribute('aria-checked', 'true');
    // The automatic row names the language it resolved to.
    await expect(automatic).toContainText('繁體中文');
  });
});
