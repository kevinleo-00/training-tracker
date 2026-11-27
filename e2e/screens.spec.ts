// Captures every screen at iPhone size for visual review: English in light, dark, and pixel, and every
// other language in light and pixel. English goes to test-results/screens, other languages to a
// subfolder named by locale.
import { expect, type Page, test } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { type Locale, LOCALES, type ThemeId } from '../src/domain/types';
import { i18n, LANGUAGE_NAMES } from '../src/ui/i18n';
import { fixtureJson } from './fixture';

const DIR = 'test-results/screens';

const variants: { name: string; colorScheme: 'light' | 'dark'; theme: ThemeId; locales: readonly Locale[] }[] = [
  { name: 'light', colorScheme: 'light', theme: 'classic', locales: LOCALES },
  { name: 'dark', colorScheme: 'dark', theme: 'classic', locales: ['en'] },
  { name: 'pixel', colorScheme: 'light', theme: 'pixel', locales: LOCALES },
];

async function seed(page: Page, path: string, locale: Locale) {
  const { t } = i18n(locale);
  await page.goto('./#/settings');
  await page.getByLabel(t.backup.file).setInputFiles(path);
  await page.getByRole('button', { name: t.backup.replaceConfirm }).click();
  await expect(page.getByRole('status')).toHaveText(t.backup.imported);
}

for (const { name: variant, colorScheme, theme, locales } of variants) {
  for (const locale of locales) {
    test.describe(`${variant} ${locale}`, () => {
      test.use({ colorScheme });

      test(`screens (${variant}, ${locale})`, async ({ page }, info) => {
        const { t } = i18n(locale);
        const folder = locale === 'en' ? DIR : `${DIR}/${locale}`;
        const shot = async (name: string) => {
          // Fonts load when text first needs them; wait so no fallback glyphs get captured.
          await page.evaluate(() => document.fonts.ready);
          await page.screenshot({ path: `${folder}/${name}-${variant}.png`, animations: 'disabled' });
        };
        const tab = (label: string) => page.getByRole('navigation').getByRole('link', { name: label, exact: true });

        await page.goto('./#/settings');
        await page.getByRole('radiogroup', { name: 'Theme' }).getByRole('radio', { name: new RegExp(theme, 'i') }).click();
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
        await page.getByRole('radio', { name: LANGUAGE_NAMES[locale], exact: true }).click();
        await expect(page.locator('html')).toHaveAttribute('lang', locale);
        await tab(t.tabs.workouts).click();
        await expect(page.getByText(t.workouts.emptyTitle)).toBeVisible();
        await shot('01-workouts-empty');
        await tab(t.tabs.dashboard).click();
        await shot('02-dashboard-empty');

        const path = info.outputPath('fixture.json');
        await writeFile(path, fixtureJson(theme, locale));
        await seed(page, path, locale);

        await tab(t.tabs.workouts).click();
        await shot('03-workouts');

        await page.getByRole('button', { name: t.workouts.new, exact: true }).click();
        await expect(page.getByRole('dialog', { name: t.workouts.newTitle })).toBeVisible();
        await shot('04-new-workout');
        await page.getByRole('button', { name: /Push day/ }).first().click();
        // Fake time from here so the rest timer can be fast-forwarded.
        await page.clock.install();
        await page.getByRole('button', { name: t.workout.setDone('Bench press', 1) }).click();
        await page.getByRole('button', { name: t.workout.setDone('Bench press', 2) }).click();
        await page.clock.runFor(23_000);
        await shot('05-workout-resting');

        await page.getByRole('button', { name: t.timer.pause }).click();
        await shot('06-workout-paused');
        await page.getByRole('button', { name: t.timer.resume }).click();
        await page.clock.runFor(70_000);
        await expect(page.getByText(t.timer.over)).toBeVisible();
        await shot('07-rest-over');
        await page.getByText(t.timer.over).click();
        await shot('08-workout-presets');

        await page.getByRole('button', { name: t.workout.addExercise }).click();
        await page.getByLabel(t.picker.name).fill('ro');
        await expect(page.getByRole('button', { name: t.picker.create('ro') })).toBeVisible();
        await shot('09-exercise-picker');
        await page.getByRole('button', { name: t.common.close }).click();

        await page.getByRole('button', { name: t.workout.actions }).click();
        await expect(page.getByRole('dialog')).toBeVisible();
        await shot('10-workout-actions');
        await page.getByRole('button', { name: t.workout.delete }).click();
        await expect(page.getByRole('dialog', { name: t.workout.deleteTitle })).toBeVisible();
        await shot('11-delete-confirm');
        await page.getByRole('button', { name: t.common.cancel }).click();

        await tab(t.tabs.dashboard).click();
        await shot('12-dashboard');
        await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
        await shot('13-dashboard-bottom');

        await tab(t.tabs.settings).click();
        await shot('14-settings');
        await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
        await shot('15-settings-bottom');
      });
    });
  }
}
