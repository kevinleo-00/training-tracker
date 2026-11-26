import { expect, test } from '@playwright/test';
import { readSaved } from './saved';

declare global {
  interface Window {
    themeAtFirstPaint?: string;
  }
}

test('switch to the pixel theme, keep it across a reload without a classic flash, and switch back', async ({ page }) => {
  // Records the theme at the moment <body> appears, before the browser can paint anything.
  await page.addInitScript(() => {
    const observer = new MutationObserver(() => {
      if (!document.body) return;
      window.themeAtFirstPaint = document.documentElement.dataset.theme ?? 'none';
      observer.disconnect();
    });
    observer.observe(document, { childList: true, subtree: true });
  });
  const html = page.locator('html');
  const themeColor = page.locator('meta[name="theme-color"]').first();

  await page.goto('./#/settings');
  const picker = page.getByRole('radiogroup', { name: 'Theme' });
  const classic = picker.getByRole('radio', { name: /Classic/ });
  const pixel = picker.getByRole('radio', { name: /Pixel/ });
  await expect(classic).toHaveAttribute('aria-checked', 'true');
  await expect(html).toHaveAttribute('data-theme', 'classic');

  await pixel.click();
  await expect(html).toHaveAttribute('data-theme', 'pixel');
  await expect(pixel).toHaveAttribute('aria-checked', 'true');
  await expect(classic).toHaveAttribute('aria-checked', 'false');
  await expect(themeColor).not.toHaveAttribute('content', '#f2f2f7');
  await expect.poll(() => readSaved(page)).toContain('"theme":"pixel"');

  await page.reload({ waitUntil: 'domcontentloaded' });
  expect(await page.evaluate(() => window.themeAtFirstPaint)).toBe('pixel');
  await expect(pixel).toHaveAttribute('aria-checked', 'true');
  await expect(html).toHaveAttribute('data-theme', 'pixel');

  await classic.click();
  await expect(html).toHaveAttribute('data-theme', 'classic');
  await expect.poll(() => readSaved(page)).toContain('"theme":"classic"');
  await page.reload({ waitUntil: 'domcontentloaded' });
  expect(await page.evaluate(() => window.themeAtFirstPaint)).not.toBe('pixel');
  await expect(classic).toHaveAttribute('aria-checked', 'true');
});
