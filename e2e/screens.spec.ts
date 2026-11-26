// Captures every screen at iPhone size in light and dark mode for visual review.
import { expect, type Page, test } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { fixtureJson } from './fixture';

const DIR = 'test-results/screens';

async function seed(page: Page, path: string) {
  await page.goto('./#/settings');
  await page.getByLabel('Backup file').setInputFiles(path);
  await page.getByRole('button', { name: 'Replace with backup' }).click();
  await expect(page.getByRole('status')).toHaveText('Backup imported.');
}

for (const scheme of ['light', 'dark'] as const) {
  test.describe(scheme, () => {
    test.use({ colorScheme: scheme });

    test(`screens (${scheme})`, async ({ page }, info) => {
      const shot = (name: string) => page.screenshot({ path: `${DIR}/${name}-${scheme}.png`, animations: 'disabled' });

      await page.goto('./');
      await expect(page.getByText('No workouts yet')).toBeVisible();
      await shot('01-workouts-empty');
      await page.getByRole('link', { name: 'Dashboard' }).click();
      await shot('02-dashboard-empty');

      const path = info.outputPath('fixture.json');
      await writeFile(path, fixtureJson());
      await seed(page, path);

      await page.getByRole('link', { name: 'Workouts' }).click();
      await shot('03-workouts');

      await page.getByRole('button', { name: 'New', exact: true }).click();
      await expect(page.getByRole('dialog', { name: 'New workout' })).toBeVisible();
      await shot('04-new-workout');
      await page.getByRole('button', { name: /Push day/ }).first().click();
      // Fake time from here so the rest timer can be fast-forwarded.
      await page.clock.install();
      await page.getByRole('button', { name: 'Bench press set 1 done' }).click();
      await page.getByRole('button', { name: 'Bench press set 2 done' }).click();
      await page.clock.runFor(23_000);
      await shot('05-workout-resting');

      await page.getByRole('button', { name: 'Pause rest' }).click();
      await shot('06-workout-paused');
      await page.getByRole('button', { name: 'Resume rest' }).click();
      await page.clock.runFor(70_000);
      await expect(page.getByText('Rest over')).toBeVisible();
      await shot('07-rest-over');
      await page.getByText('Rest over').click();
      await shot('08-workout-presets');

      await page.getByRole('button', { name: 'Add exercise' }).click();
      await page.getByLabel('Exercise name').fill('ro');
      await expect(page.getByRole('button', { name: 'Create “ro”' })).toBeVisible();
      await shot('09-exercise-picker');
      await page.getByRole('button', { name: 'Close' }).click();

      await page.getByRole('button', { name: 'Workout actions' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await shot('10-workout-actions');
      await page.getByRole('button', { name: 'Delete workout' }).click();
      await expect(page.getByRole('dialog', { name: 'Delete workout?' })).toBeVisible();
      await shot('11-delete-confirm');
      await page.getByRole('button', { name: 'Cancel' }).click();

      await page.getByRole('link', { name: 'Dashboard' }).click();
      await shot('12-dashboard');
      await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
      await shot('13-dashboard-bottom');

      await page.getByRole('link', { name: 'Settings' }).click();
      await shot('14-settings');
      await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
      await shot('15-settings-bottom');
    });
  });
}
