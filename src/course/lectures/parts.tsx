/** Общие детали мини-опытов: числовая ось с точками и простые столбики. */
import type { ReactNode } from 'react';
import { formatStatistic as f } from '../../lib/format';

export interface Mark {
  value: number;
  label: string;
  tone: 'theory' | 'accent' | 'white' | 'ok' | 'bad';
}

/** Ось с точками-наблюдениями. Одинаковые значения встают столбиком друг на друга. */
export function DotLine({
  values,
  min,
  max,
  marks = [],
  bands = [],
  flagged = [],
  step,
  label,
}: {
  values: readonly number[];
  min: number;
  max: number;
  marks?: Mark[];
  bands?: { from: number; to: number; label: string }[];
  flagged?: readonly number[];
  step?: number;
  label: string;
}) {
  const W = 640;
  const pad = 24;
  const axis = 120;
  const x = (v: number) => pad + ((Math.min(max, Math.max(min, v)) - min) / (max - min || 1)) * (W - 2 * pad);
  const tick = step ?? niceStep(max - min);
  const ticks: number[] = [];
  for (let t = Math.ceil(min / tick) * tick; t <= max + 1e-9; t += tick) ticks.push(Math.round(t * 1000) / 1000);
  const stack = new Map<number, number>();
  const H = axis + 70;
  return (
    <svg className="c-dotline" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      {bands.map((b) => (
        <g key={b.label}>
          <rect x={x(b.from)} y={20} width={Math.max(0, x(b.to) - x(b.from))} height={axis - 20} className="c-dotline-band" />
          <text x={(x(b.from) + x(b.to)) / 2} y={14} className="c-dotline-bandtext">
            {b.label}
          </text>
        </g>
      ))}
      <line x1={pad} x2={W - pad} y1={axis} y2={axis} className="c-dotline-axis" />
      {ticks.map((t) => (
        <g key={t}>
          <line x1={x(t)} x2={x(t)} y1={axis} y2={axis + 6} className="c-dotline-axis" />
          <text x={x(t)} y={axis + 22} className="c-dotline-tick">
            {f(t)}
          </text>
        </g>
      ))}
      {values.map((v, i) => {
        const key = Math.round(v * 10);
        const level = stack.get(key) ?? 0;
        stack.set(key, level + 1);
        return (
          <circle
            key={i}
            cx={x(v)}
            cy={axis - 11 - level * 19}
            r={8}
            className={'c-dotline-dot' + (flagged.includes(i) ? ' c-dotline-dot--bad' : '')}
          />
        );
      })}
      {marks.map((m, i) => (
        <g key={m.label} className={`c-mark c-mark--${m.tone}`}>
          <line x1={x(m.value)} x2={x(m.value)} y1={24} y2={axis + 30} />
          <text x={x(m.value)} y={axis + 44 + (i % 2) * 18}>
            {m.label} = {f(Math.round(m.value * 100) / 100)}
          </text>
        </g>
      ))}
    </svg>
  );
}

function niceStep(range: number): number {
  const raw = range / 8;
  const p = 10 ** Math.floor(Math.log10(raw || 1));
  const n = raw / p;
  return (n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10) * p;
}

/** Столбики: высота пропорциональна значению, подпись снизу, число сверху. */
export function Bars({
  items,
  max,
  format = (v) => f(v),
  label,
}: {
  items: { label: ReactNode; value: number; tone?: 'accent' | 'theory' | 'muted' }[];
  max?: number;
  format?: (v: number) => string;
  label: string;
}) {
  const top = max ?? Math.max(1e-9, ...items.map((i) => i.value));
  return (
    <div className="c-bars" role="img" aria-label={label}>
      {items.map((item, i) => (
        <div key={i} className="c-bars-col">
          <span className="c-bars-num">{format(item.value)}</span>
          <span className={'c-bars-bar' + (item.tone ? ` c-bars-bar--${item.tone}` : '')} style={{ height: `${(item.value / top) * 100}%` }} />
          <span className="c-bars-label">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

/** Ползунок с подписью и текущим значением. */
export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  show,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  show?: string;
}) {
  return (
    <label className="c-range c-range--demo">
      <span>
        {label} <output>{show ?? f(value)}</output>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

/** Распределение: столбики вероятностей по значениям from.. и, по желанию, гладкая кривая поверх. */
export function DistChart({
  probs,
  from = 0,
  curve,
  highlight,
  band,
  label,
  labelEvery,
}: {
  probs: readonly number[];
  from?: number;
  curve?: (x: number) => number;
  highlight?: (value: number) => boolean;
  band?: { from: number; to: number; label: string };
  label: string;
  labelEvery?: number;
}) {
  const W = 640;
  const H = 240;
  const padX = 16;
  const top = 18;
  const base = H - 28;
  const n = probs.length;
  const slot = (W - 2 * padX) / n;
  const peak = Math.max(1e-9, ...probs, ...(curve ? probs.map((_, i) => curve(from + i)) : []));
  const y = (q: number) => base - (q / peak) * (base - top);
  const cx = (v: number) => padX + (v - from + 0.5) * slot;
  const every = labelEvery ?? Math.max(1, Math.ceil(n / 12));
  let path = '';
  if (curve) {
    const steps = 160;
    for (let s = 0; s <= steps; s += 1) {
      const v = from - 0.5 + (n * s) / steps;
      path += `${s ? 'L' : 'M'}${cx(v).toFixed(1)},${y(curve(v)).toFixed(1)}`;
    }
  }
  return (
    <svg className="c-dotline" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      {band ? (
        <g>
          <rect x={cx(band.from) - slot / 2} y={top - 6} width={Math.max(0, cx(band.to) - cx(band.from) + slot)} height={base - top + 6} className="c-dotline-band" />
          <text x={(cx(band.from) + cx(band.to)) / 2} y={12} className="c-dotline-bandtext">
            {band.label}
          </text>
        </g>
      ) : null}
      {probs.map((q, i) => (
        <rect
          key={i}
          x={cx(from + i) - slot * 0.4}
          y={y(q)}
          width={slot * 0.8}
          height={Math.max(0, base - y(q))}
          rx={Math.min(4, slot * 0.2)}
          className={highlight?.(from + i) ? 'c-dist-bar c-dist-bar--hot' : 'c-dist-bar'}
        />
      ))}
      {path ? <path d={path} className="c-dist-curve" /> : null}
      <line x1={padX} x2={W - padX} y1={base} y2={base} className="c-dotline-axis" />
      {probs.map((_, i) =>
        (from + i) % every === 0 ? (
          <text key={i} x={cx(from + i)} y={base + 18} className="c-dotline-tick">
            {from + i}
          </text>
        ) : null,
      )}
    </svg>
  );
}

/** Линии по точкам: несколько рядов значений и, по желанию, коридор. */
export function LinePlot({
  series,
  xMax,
  yMin,
  yMax,
  band,
  label,
  yTicks = [],
}: {
  series: { points: readonly (readonly [number, number])[]; tone: 'accent' | 'theory' | 'white' | 'muted' }[];
  xMax: number;
  yMin: number;
  yMax: number;
  band?: { lower: (x: number) => number; upper: (x: number) => number };
  label: string;
  yTicks?: number[];
}) {
  const W = 640;
  const H = 240;
  const padL = 44;
  const padR = 12;
  const top = 10;
  const base = H - 24;
  const X = (x: number) => padL + (x / (xMax || 1)) * (W - padL - padR);
  const Y = (v: number) => base - ((Math.min(yMax, Math.max(yMin, v)) - yMin) / (yMax - yMin || 1)) * (base - top);
  const d = (pts: readonly (readonly [number, number])[]) => pts.map(([a, b], i) => `${i ? 'L' : 'M'}${X(a).toFixed(1)},${Y(b).toFixed(1)}`).join('');
  let bandPath = '';
  if (band) {
    const xs = Array.from({ length: 121 }, (_, i) => Math.max(1, (xMax * i) / 120));
    bandPath = xs.map((x, i) => `${i ? 'L' : 'M'}${X(x).toFixed(1)},${Y(band.upper(x)).toFixed(1)}`).join('') + [...xs].reverse().map((x) => `L${X(x).toFixed(1)},${Y(band.lower(x)).toFixed(1)}`).join('') + 'Z';
  }
  return (
    <svg className="c-dotline" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      {bandPath ? <path d={bandPath} className="c-dotline-band" /> : null}
      {yTicks.map((t) => (
        <g key={t}>
          <line x1={padL} x2={W - padR} y1={Y(t)} y2={Y(t)} className="c-grid-line" />
          <text x={padL - 6} y={Y(t) + 4} className="c-dotline-tick" style={{ textAnchor: 'end' }}>
            {f(t)}
          </text>
        </g>
      ))}
      <line x1={padL} x2={W - padR} y1={base} y2={base} className="c-dotline-axis" />
      {series.map((s, i) => (
        <path key={i} d={d(s.points)} className={`c-line c-line--${s.tone}`} />
      ))}
    </svg>
  );
}