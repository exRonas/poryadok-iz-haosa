import { useEffect, useId, useMemo, useRef } from 'react';
import { useElementWidth } from '../../hooks/useElementWidth';
import { formatStatistic } from '../../lib/format';
import { newSeed } from '../../lib/random';
import { NOISE_LESSON_SIZE, noiseRun, noiseSigma } from '../math3';
import type { WidgetProps } from '../types';
import { AVERAGING_MAX, type AveragingState } from './state';

const f = formatStatistic;
const SIZE = NOISE_LESSON_SIZE;

/** Серое изображение 48 × 48 → холст; на экране его растягивает CSS без сглаживания. */
function Picture({ rgba, label }: { rgba: Uint8ClampedArray; label: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const context = canvasRef.current?.getContext('2d');
    if (context) context.putImageData(new ImageData(new Uint8ClampedArray(rgba), SIZE, SIZE), 0, 0);
  }, [rgba]);
  return (
    <figure className="c-noise-frame">
      <canvas ref={canvasRef} width={SIZE} height={SIZE} role="img" aria-label={label} />
      <figcaption>{label}</figcaption>
    </figure>
  );
}

/** 3.2: один шумный кадр против среднего n кадров; ошибка среднего ложится на кривую σ/√n. */
export function AveragingWidget({ state, onChange }: WidgetProps<AveragingState>) {
  const { amplitude, frames, seed } = state;
  const aId = useId();
  const nId = useId();
  const { ref, width } = useElementWidth<HTMLElement>(640);
  const sigma = noiseSigma(amplitude);

  const full = useMemo(() => noiseRun(seed, amplitude, AVERAGING_MAX), [seed, amplitude]);
  const current = useMemo(() => noiseRun(seed, amplitude, frames), [seed, amplitude, frames]);
  const single = useMemo(() => noiseRun(seed, amplitude, 1), [seed, amplitude]);
  const singleRgba = useMemo(() => single.toRgba((pixel) => single.mean(pixel)), [single]);
  const meanRgba = useMemo(() => current.toRgba((pixel) => current.mean(pixel)), [current]);
  const error = full.rmse[frames - 1];

  const W = Math.max(280, width);
  const H = W < 480 ? 200 : 240;
  const left = 44;
  const right = W - 12;
  const top = 10;
  const bottom = H - 34;
  const x = (n: number) => left + ((right - left) * (n - 1)) / (AVERAGING_MAX - 1);
  const yMax = Math.max(sigma, full.rmse[0]) * 1.1;
  const y = (v: number) => bottom - ((bottom - top) * v) / yMax;
  const curve = Array.from({ length: AVERAGING_MAX }, (_, i) => `${x(i + 1)},${y(sigma / Math.sqrt(i + 1))}`).join(' ');

  return (
    <div className="c-widget">
      <div className="c-range">
        <label htmlFor={aId}>
          Сила шума <output htmlFor={aId}>σ ≈ {f(sigma)}</output>
        </label>
        <input id={aId} type="range" min={40} max={160} step={20} value={amplitude} onChange={(event) => onChange({ ...state, amplitude: Number(event.target.value) })} />
      </div>
      <div className="c-range">
        <label htmlFor={nId}>
          Усреднить кадров <output htmlFor={nId}>n = {frames}</output>
        </label>
        <input id={nId} type="range" min={1} max={AVERAGING_MAX} value={frames} onChange={(event) => onChange({ ...state, frames: Number(event.target.value) })} />
      </div>
      <div className="c-actions">
        <button type="button" className="c-btn c-btn--small c-btn--ghost" onClick={() => onChange({ ...state, seed: newSeed() })}>
          Другой шум
        </button>
      </div>

      <div className="c-noise-pair">
        <Picture rgba={singleRgba} label="Один кадр" />
        <Picture rgba={meanRgba} label={`Среднее ${frames} ${frames % 10 === 1 && frames !== 11 ? 'кадра' : 'кадров'}`} />
      </div>

      <figure className="c-chart c-chart--scene" ref={ref}>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Ошибка среднего ${frames} кадров ${f(error)}, теория σ/√n = ${f(sigma / Math.sqrt(frames))}`}>
          {[0, yMax / 2].map((v) => (
            <g key={v}>
              <line className="c-gridline" x1={left} x2={right} y1={y(v)} y2={y(v)} />
              <text className="c-tick" x={left - 8} y={y(v) + 4} textAnchor="end">
                {Math.round(v)}
              </text>
            </g>
          ))}
          {[1, 16, 32, 48, 64].map((n) => (
            <text key={n} className="c-tick c-tick--x" x={x(n)} y={bottom + 16} textAnchor="middle">
              {n}
            </text>
          ))}
          <polyline points={curve} fill="none" stroke="#ff4fc8" strokeWidth={2.5} style={{ filter: 'drop-shadow(0 0 6px rgba(255, 79, 200, 0.6))' }} />
          {full.rmse.slice(0, frames).map((value, i) => (
            <circle key={i} cx={x(i + 1)} cy={y(value)} r={i === frames - 1 ? 6 : 3} fill="#6b7bff" stroke={i === frames - 1 ? '#fff' : 'none'} strokeWidth={1.5} />
          ))}
          <text className="c-axis-label" x={(left + right) / 2} y={H - 4} textAnchor="middle">
            Число кадров n
          </text>
        </svg>
      </figure>

      <dl className="c-readout">
        <div>
          <dt>Шум кадра σ</dt>
          <dd>{f(sigma)}</dd>
        </div>
        <div>
          <dt>Кадров</dt>
          <dd>n = {frames}</dd>
        </div>
        <div>
          <dt>Ошибка среднего</dt>
          <dd className="c-accent-dd">{f(error)}</dd>
        </div>
        <div>
          <dt>Теория σ/√n</dt>
          <dd className="c-theory-text">{f(sigma / Math.sqrt(frames))}</dd>
        </div>
      </dl>
      <p className="c-widget-note">Синие точки — измеренная ошибка (корень из среднего квадрата по всем пикселям), малиновая кривая — σ/√n. Шум в 4 раза тише — нужно 16 кадров.</p>
    </div>
  );
}
