// Renders scripts/icon.svg to the PNG icons the PWA manifest and iOS need.
// Usage: npm run icons (needs `npx playwright install webkit` once).
import { readFile, writeFile } from 'node:fs/promises';
import { webkit } from '@playwright/test';

const root = new URL('..', import.meta.url);
const svg = await readFile(new URL('scripts/icon.svg', root), 'utf8');

// [file, size, art scale]. Maskable icons shrink the art into the 80% safe zone; the background still bleeds to the edge.
const outputs = [
  ['public/apple-touch-icon.png', 180, 1],
  ['public/icon-192.png', 192, 1],
  ['public/icon-512.png', 512, 1],
  ['public/icon-maskable-512.png', 512, 0.8],
];

const browser = await webkit.launch();
const page = await browser.newPage();
for (const [file, size, scale] of outputs) {
  await page.setViewportSize({ width: size, height: size });
  const art = svg
    .replace('transform="rotate(', `transform="translate(256 256) scale(${scale}) translate(-256 -256) rotate(`)
    .replace('<svg ', `<svg width="${size}" height="${size}" style="display:block" `);
  await page.setContent(`<body style="margin:0">${art}</body>`);
  await writeFile(new URL(file, root), await page.screenshot({ type: 'png' }));
  console.log(`wrote ${file}`);
}
await browser.close();

// The favicon is the same art as SVG with rounded corners for browser tabs.
await writeFile(new URL('public/favicon.svg', root), svg.replace('<rect width="512" height="512"', '<rect width="512" height="512" rx="112"'));
console.log('wrote public/favicon.svg');
