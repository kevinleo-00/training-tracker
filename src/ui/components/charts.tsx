import { type PointerEvent, useId, useState } from 'react';

const formatAxisNumber = (v: number) => String(Math.round(v * 10) / 10);

const W = 340;
const H = 160;
const PAD = { top: 10, right: 8, bottom: 22, left: 34 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

/** The smallest 1, 2, 2.5, or 5 times a power of ten that is at least `raw`. */
function niceStep(raw: number): number {
  const power = 10 ** Math.floor(Math.log10(raw));
  return ([1, 2, 2.5, 5, 10].find((m) => m * power >= raw) ?? 10) * power;
}

/** A round lower and upper bound around [lo, hi], split into two or three even steps. */
function niceRange(lo: number, hi: number): number[] {
  const step = niceStep(Math.max(hi - lo, 1) / 2);
  const start = Math.max(0, Math.floor(lo / step) * step);
  const ticks = [start];
  while (ticks.at(-1)! < hi) ticks.push(ticks.at(-1)! + step);
  if (ticks.length < 2) ticks.push(start + step);
  return ticks;
}

/** A round upper bound with three evenly spaced gridlines below it. */
function niceMax(value: number): number {
  if (value <= 0) return 1;
  const step = 10 ** Math.floor(Math.log10(value / 2));
  const candidates = [1, 2, 2.5, 5, 10].map((m) => m * step * 2);
  return candidates.find((c) => c >= value) ?? value;
}

/** The pointer's x position in viewBox units. */
function pointerX(e: PointerEvent<SVGSVGElement>): number {
  const box = e.currentTarget.getBoundingClientRect();
  return ((e.clientX - box.left) / box.width) * W;
}

function Gridlines({ ticks, y, format }: { ticks: number[]; y: (v: number) => number; format: (v: number) => string }) {
  return (
    <g className="chart-grid">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} />
          <text x={PAD.left - 6} y={y(t)} dy="0.32em" textAnchor="end">
            {format(t)}
          </text>
        </g>
      ))}
    </g>
  );
}

/** A round dot drawn as a rect, so a theme can square its corners in CSS. */
function Dot({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return <rect className="chart-dot" x={cx - r} y={cy - r} width={2 * r} height={2 * r} rx={r} />;
}

export interface Bar {
  key: string;
  label: string;
  value: number;
}

export function BarChart({
  title,
  bars,
  formatTick,
  describe,
}: {
  title: string;
  bars: Bar[];
  formatTick: (v: number) => string;
  describe: (bar: Bar) => string;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const clipId = useId();
  const max = niceMax(Math.max(...bars.map((b) => b.value)));
  const band = PLOT_W / bars.length;
  const barW = Math.min(18, band - 6);
  const y = (v: number) => PAD.top + PLOT_H - (v / max) * PLOT_H;
  const shown = bars[selected ?? bars.length - 1];
  const select = (e: PointerEvent<SVGSVGElement>) =>
    setSelected(Math.max(0, Math.min(bars.length - 1, Math.floor((pointerX(e) - PAD.left) / band))));

  return (
    <figure className="chart">
      <figcaption className="chart-readout" aria-live="polite">
        {shown ? describe(shown) : ''}
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title} onPointerDown={select} onPointerMove={(e) => e.buttons && select(e)}>
        <Gridlines ticks={[0, max / 2, max]} y={y} format={formatTick} />
        {/* Bars run past the baseline and get clipped there, so only their top corners show rounding. */}
        <clipPath id={clipId}>
          <rect width={W} height={PAD.top + PLOT_H} />
        </clipPath>
        {bars.map((b, i) => {
          const x = PAD.left + i * band + (band - barW) / 2;
          const h = PLOT_H * (b.value / max);
          const r = Math.min(4, h, barW / 2);
          return (
            <g key={b.key}>
              {h > 0 && (
                <rect
                  className={selected === i ? 'chart-bar selected' : 'chart-bar'}
                  clipPath={`url(#${clipId})`}
                  x={x}
                  y={y(b.value)}
                  width={barW}
                  height={h + r}
                  rx={r}
                />
              )}
              {(bars.length - 1 - i) % 4 === 0 && (
                <text className="chart-axis" x={x + barW / 2} y={H - 6} textAnchor="middle">
                  {b.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <table className="sr-only">
        <caption>{title}</caption>
        <tbody>
          {bars.map((b) => (
            <tr key={b.key}>
              <th scope="row">{b.label}</th>
              <td>{describe(b)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

export interface LinePoint {
  /** Position on the x axis, e.g. days since the first point. */
  x: number;
  label: string;
  values: number[];
}

export interface LineSeries {
  name: string;
  className: string;
}

export function LineChart({
  title,
  series,
  points,
  formatValue,
}: {
  title: string;
  series: LineSeries[];
  points: LinePoint[];
  formatValue: (v: number) => string;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const all = points.flatMap((p) => p.values);
  const ticks = niceRange(Math.min(...all), Math.max(...all));
  const lo = ticks[0]!;
  const hi = ticks.at(-1)!;
  const first = points[0]?.x ?? 0;
  const span = (points.at(-1)?.x ?? 0) - first;
  const x = (v: number) => (span === 0 ? PAD.left + PLOT_W / 2 : PAD.left + ((v - first) / span) * PLOT_W);
  const y = (v: number) => PAD.top + PLOT_H - ((v - lo) / (hi - lo)) * PLOT_H;
  const active = selected ?? points.length - 1;
  const shown = points[active];

  const select = (e: PointerEvent<SVGSVGElement>) => {
    const px = pointerX(e);
    let best = 0;
    points.forEach((p, i) => {
      if (Math.abs(x(p.x) - px) < Math.abs(x(points[best]!.x) - px)) best = i;
    });
    setSelected(best);
  };

  return (
    <figure className="chart">
      <figcaption className="chart-readout" aria-live="polite">
        {shown?.label}
      </figcaption>
      <div className="chart-legend">
        {series.map((s, i) => (
          <span key={s.name} className="legend-item">
            <span className={`legend-swatch ${s.className}`} />
            {s.name}
            {shown && <strong>{formatValue(shown.values[i] ?? 0)}</strong>}
          </span>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title} onPointerDown={select} onPointerMove={(e) => e.buttons && select(e)}>
        <Gridlines ticks={ticks} y={y} format={formatAxisNumber} />
        {shown && <line className="chart-crosshair" x1={x(shown.x)} x2={x(shown.x)} y1={PAD.top} y2={PAD.top + PLOT_H} />}
        {series.map((s, si) => (
          <g key={s.name} className={s.className}>
            <polyline className="chart-line" points={points.map((p) => `${x(p.x)},${y(p.values[si] ?? 0)}`).join(' ')} />
            {points.map((p, i) => (
              <Dot key={i} cx={x(p.x)} cy={y(p.values[si] ?? 0)} r={i === active ? 5 : 4} />
            ))}
          </g>
        ))}
        {points.length > 0 && (
          <g className="chart-axis">
            <text x={x(points[0]!.x)} y={H - 6} textAnchor={points.length === 1 ? 'middle' : 'start'}>
              {points[0]!.label}
            </text>
            {points.length > 1 && (
              <text x={x(points.at(-1)!.x)} y={H - 6} textAnchor="end">
                {points.at(-1)!.label}
              </text>
            )}
          </g>
        )}
      </svg>
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            {series.map((s) => (
              <th key={s.name} scope="col">
                {s.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {points.map((p, i) => (
            <tr key={i}>
              <th scope="row">{p.label}</th>
              {p.values.map((v, j) => (
                <td key={j}>{formatValue(v)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
