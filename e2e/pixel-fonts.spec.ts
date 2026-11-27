import { expect, test } from '@playwright/test';

// Browsers fetch a web font only when text on the page needs its glyphs, so a loaded face proves the heading drew with it.
const languages = [
  { name: '简体中文', lang: 'zh-Hans', face: 'Fusion Pixel SC' },
  { name: '繁體中文', lang: 'zh-Hant', face: 'Fusion Pixel TC' },
  { name: '日本語', lang: 'ja', face: 'DotGothic16 Japanese' },
  { name: '한국어', lang: 'ko', face: 'Fusion Pixel KR' },
];

for (const { name, lang, face } of languages) {
  test(`pixel theme draws ${lang} text in a pixel font`, async ({ page }) => {
    await page.goto('./#/settings');
    await page.getByRole('radiogroup', { name: 'Theme' }).getByRole('radio', { name: /Pixel/ }).click();
    await page.getByRole('radio', { name, exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', lang);

    const loaded = () =>
      page.evaluate(async () => {
        await document.fonts.ready;
        return [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replace(/"/g, ''));
      });
    await expect.poll(loaded).toContain(face);
  });
}
