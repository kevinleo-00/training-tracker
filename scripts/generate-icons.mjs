// Renders the pixel art in scripts/icon.ts to the icons the PWA manifest, iOS, and browser tabs need.
// Usage: npm run icons (needs `npx playwright install webkit` once).
import { writeFile } from 'node:fs/promises';
import { webkit } from '@playwright/test';
import { iconSvg } from './icon.ts';

const root = new URL('..', import.meta.url);

// [file, size, art scale]. Maskable icons shrink the art into the 80% safe zone; the background still bleeds to the edge.
const outputs = [
  ['public/apple-touch-icon.png', 180, 1],
  ['public/icon-192.png', 192, 1],
  ['public/icon-512.png', 512, 1],
  ['public/icon-maskable-512.png', 512, 0.8],
];

const browser = await webkit.launch();
const page = await browser.newPage();
for (const [file, size, artScale] of outputs) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<body style="margin:0">${iconSvg({ size, artScale }).replace('<svg ', '<svg style="display:block" ')}</body>`);
  await writeFile(new URL(file, root), await page.screenshot({ type: 'png' }));
  console.log(`wrote ${file}`);
}
await browser.close();

// Browser tabs get the SVG itself, with notched corners like the Pixel theme's windows.
await writeFile(new URL('public/favicon.svg', root), iconSvg({ size: 512, notched: true }));
console.log('wrote public/favicon.svg');
