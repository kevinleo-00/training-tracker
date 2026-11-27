import { describe, expect, it } from 'vitest';
import { ICON, iconSvg } from './icon';

const size = ICON.rows.length;
const center = size / 2;

function artCells() {
  return ICON.rows.flatMap((row, y) => [...row].flatMap((ch, x) => (ch === '.' ? [] : [{ x, y }])));
}

describe('app icon', () => {
  it('is a square grid of known colors', () => {
    for (const row of ICON.rows) {
      expect(row).toHaveLength(size);
      for (const ch of row) expect(ch === '.' || ch in ICON.palette).toBe(true);
    }
  });

  it('keeps the art inside the maskable safe zone once shrunk to 80%', () => {
    // Launchers may crop a maskable icon to a circle of 80% of its width; at 80% scale the art may fill a circle as wide as the grid.
    for (const { x, y } of artCells()) {
      for (const [cx, cy] of [[x, y], [x + 1, y], [x, y + 1], [x + 1, y + 1]] as const) {
        expect(Math.hypot(cx - center, cy - center)).toBeLessThanOrEqual(center);
      }
    }
  });

  it('draws every art pixel in its palette color', () => {
    const svg = iconSvg({ size: 512 });
    for (const color of Object.values(ICON.palette)) expect(svg).toContain(`fill="${color}"`);
    expect(svg).toContain(`viewBox="0 0 ${size} ${size}"`);
  });
});
