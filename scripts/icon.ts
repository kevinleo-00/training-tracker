// The app icon as pixel art in the Pixel theme's palette: one character per pixel, '.' shows the background.
export const ICON = {
  background: '#182a84',
  palette: {
    o: '#0a0a2a', // outline
    w: '#ffffff', // plate
    s: '#b4bef0', // plate shade
    m: '#6e7fd6', // outer plate
    g: '#ffd23f', // handle
    d: '#c8901e', // handle shade
  } as Record<string, string>,
  rows: [
    '................',
    '................',
    '...oo......oo...',
    '..owso....oswo..',
    '..owso....oswo..',
    '.omwso....oswmo.',
    '.omwsooooooswmo.',
    '.omwsggggggswmo.',
    '.omwsddddddswmo.',
    '.omwsooooooswmo.',
    '.omwso....oswmo.',
    '..owso....oswo..',
    '..owso....oswo..',
    '...oo......oo...',
    '................',
    '................',
  ],
};

interface IconOptions {
  /** Rendered width and height in CSS pixels. */
  size: number;
  /** Shrinks the art around the center, leaving the background full bleed. */
  artScale?: number;
  /** Cuts one pixel from each corner, like the Pixel theme's window frames. */
  notched?: boolean;
}

export function iconSvg({ size, artScale = 1, notched = false }: IconOptions): string {
  const n = ICON.rows.length;
  // One path per color so neighboring pixels fill as one shape, with no seams when scaled.
  const cells = new Map<string, string[]>();
  ICON.rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch !== '.') cells.set(ch, [...(cells.get(ch) ?? []), `M${x} ${y}h1v1h-1z`]);
    }),
  );
  const art = [...cells].map(([ch, d]) => `<path fill="${ICON.palette[ch]}" d="${d.join('')}"/>`).join('');
  const background = notched
    ? `<path fill="${ICON.background}" d="M1 0H${n - 1}V1H${n}V${n - 1}H${n - 1}V${n}H1V${n - 1}H0V1H1Z"/>`
    : `<rect width="${n}" height="${n}" fill="${ICON.background}"/>`;
  const c = n / 2;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" width="${size}" height="${size}" shape-rendering="crispEdges">` +
    background +
    `<g transform="translate(${c} ${c}) scale(${artScale}) translate(${-c} ${-c})">${art}</g>` +
    `</svg>\n`
  );
}
