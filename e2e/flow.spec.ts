import { expect, type Page, test } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { readSaved } from './saved';

const pad = (n: number) => String(n).padStart(2, '0');
const localDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const daysAgo = (n: number) => localDate(new Date(Date.now() - n * 86_400_000));

const setRow = (page: Page, n: number) => ({
  weight: page.getByLabel(`Bench press set ${n} weight`),
  reps: page.getByLabel(`Bench press set ${n} reps`),
  done: page.getByRole('button', { name: `Bench press set ${n} done` }),
});

test.beforeEach(async ({ page }) => {
  // Desktop WebKit may offer a native share sheet; the phone path is covered by the download fallback here.
  await page.addInitScript(() => Object.defineProperty(navigator, 'canShare', { value: undefined }));
});

test('log a workout, rest, persist, copy as plan, see progress, and round-trip a backup', async ({ page }, info) => {
  await page.goto('./');
  await expect(page.getByText('No workouts yet')).toBeVisible();

  // Create a workout.
  await page.getByRole('button', { name: 'New', exact: true }).click();
  await page.getByPlaceholder('Push day').fill('Push day');
  await page.getByRole('button', { name: 'Start blank workout' }).click();
  await expect(page.getByLabel('Workout name')).toHaveValue('Push day');

  // Add an exercise through the picker's "create new" row.
  await page.getByRole('button', { name: 'Add exercise' }).click();
  await page.getByLabel('Exercise name').fill('Bench press');
  await page.getByRole('button', { name: 'Create “Bench press”' }).click();

  // Log three sets: new sets copy the previous one.
  await setRow(page, 1).weight.fill('60');
  await setRow(page, 1).reps.fill('8');
  await page.getByRole('button', { name: 'Add set' }).click();
  await page.getByRole('button', { name: 'Add set' }).click();
  await expect(setRow(page, 3).weight).toHaveValue('60');
  await expect(setRow(page, 3).reps).toHaveValue('8');
  await setRow(page, 3).weight.fill('62,5'); // iOS decimal pads type a comma in many locales
  await setRow(page, 3).weight.blur();
  await expect(setRow(page, 3).weight).toHaveValue('62.5');

  // Checking a set done starts the rest timer with the last preset (1:30 by default).
  await expect(page.getByRole('timer')).toHaveCount(0);
  await setRow(page, 1).done.click();
  const timer = page.getByRole('timer', { name: 'Rest timer' });
  await expect(timer).toContainText(/1:(30|29|28)/);
  await expect(timer).toContainText('Resting');
  await setRow(page, 2).done.click();
  await setRow(page, 3).done.click();
  for (const n of [1, 2, 3]) await expect(setRow(page, n).done).toHaveAttribute('aria-pressed', 'true');

  // The timer stays visible on other tabs.
  await page.getByRole('link', { name: 'Dashboard' }).click();
  await expect(timer).toBeVisible();
  await page.goBack();

  // Move this workout a week back so the dashboard has a trend.
  await page.getByLabel('Workout date').fill(daysAgo(7));

  // Reload: data and the running timer persist.
  await expect.poll(() => readSaved(page)).toContain(daysAgo(7));
  await page.reload();
  await expect(page.getByLabel('Workout name')).toHaveValue('Push day');
  await expect(page.getByLabel('Workout date')).toHaveValue(daysAgo(7));
  await expect(setRow(page, 3).weight).toHaveValue('62.5');
  for (const n of [1, 2, 3]) await expect(setRow(page, n).done).toHaveAttribute('aria-pressed', 'true');
  await expect(timer).toBeVisible();
  await page.getByRole('button', { name: 'Cancel rest' }).click();
  await expect(timer).toHaveCount(0);

  // Copy it as today's plan from the list: same sets, none done.
  await page.locator('.back-link').click();
  await page.getByRole('button', { name: 'New', exact: true }).click();
  await page.getByRole('button', { name: /Push day/ }).click();
  await expect(page.getByLabel('Workout date')).toHaveValue(daysAgo(0));
  await expect(setRow(page, 3).weight).toHaveValue('62.5');
  for (const n of [1, 2, 3]) await expect(setRow(page, n).done).toHaveAttribute('aria-pressed', 'false');

  // Beat last week's top set and finish the plan.
  await setRow(page, 3).weight.fill('70');
  for (const n of [1, 2, 3]) await setRow(page, n).done.click();
  await page.getByRole('button', { name: 'Cancel rest' }).click();

  // Dashboard: weekly counts and the exercise trend.
  await page.getByRole('link', { name: 'Dashboard' }).click();
  const tile = (label: string) => page.locator('.tile').filter({ hasText: label }).locator('.tile-value');
  await expect(tile('This week')).toHaveText('1');
  await expect(tile('30 days')).toHaveText('2');
  await expect(tile('Streak')).toHaveText('2');
  await expect(page.getByLabel('Exercise')).toHaveValue(/.+/);
  await expect(page.getByLabel('Exercise').locator('option:checked')).toHaveText('Bench press');
  await expect(page.locator('.record').filter({ hasText: 'Heaviest set' })).toContainText('70 kg × 8');
  await expect(page.locator('.record').filter({ hasText: 'Best est. 1RM' })).toContainText('88.7 kg');
  const trend = page.getByRole('table', { name: /Bench press: estimated 1RM/ });
  await expect(trend.locator('tbody tr')).toHaveCount(2);
  await expect(trend.locator('tbody tr').nth(0)).toContainText('62.5 kg');
  await expect(trend.locator('tbody tr').nth(1)).toContainText('70 kg');
  await expect(page.locator('.chart-readout').filter({ hasText: /^Week of .* · 1 workout$/ })).toBeVisible();

  // Export a backup.
  await page.getByRole('link', { name: 'Settings' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export backup (JSON)' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe(`training-backup-${daysAgo(0)}.json`);
  const backupPath = info.outputPath('backup.json');
  await download.saveAs(backupPath);
  const backup = JSON.parse(await readFile(backupPath, 'utf8'));
  expect(Object.keys(backup.workouts)).toHaveLength(2);

  // A broken file is rejected with a visible message and changes nothing.
  const badPath = info.outputPath('bad.json');
  await writeFile(badPath, JSON.stringify({ ...backup, version: 7 }));
  await page.getByLabel('Backup file').setInputFiles(badPath);
  await expect(page.getByRole('alert')).toContainText('Not a valid backup');

  // Delete a workout (confirmed in-app), then restore it from the backup.
  await page.getByRole('link', { name: 'Workouts' }).click();
  await page.locator('.workout-card').first().click();
  await page.getByRole('button', { name: 'Workout actions' }).click();
  await page.getByRole('button', { name: 'Delete workout' }).click();
  await expect(page.getByRole('dialog', { name: 'Delete workout?' })).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete workout' }).click();
  await expect(page.locator('.workout-card')).toHaveCount(1);

  await page.getByRole('link', { name: 'Settings' }).click();
  await page.getByLabel('Backup file').setInputFiles(backupPath);
  await expect(page.getByRole('dialog', { name: 'Replace all data?' })).toContainText('Import 2 workouts');
  await page.getByRole('button', { name: 'Replace with backup' }).click();
  await expect(page.getByRole('status')).toHaveText('Backup imported.');
  await page.reload();
  await page.getByRole('link', { name: 'Workouts' }).click();
  await expect(page.locator('.workout-card')).toHaveCount(2);
});
