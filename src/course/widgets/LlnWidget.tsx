import { useId, useMemo } from 'react';
import { useElementWidth } from '../../hooks/useElementWidth';
import { formatStatistic } from '../../lib/format';
import { newSeed } from '../../lib/random';
import { coinTosses, frequencySigma, runningFrequency } from '../math3';
import coinGlass from '../sprites/coin-glass.webp';
import coinGraphite from '../sprites/coin-graphite.webp';
import type { WidgetProps } from '../types';
import { LLN_MAX, type LlnState } from './state';

const f = formatStatistic;
const f3 = (value: number) => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 3 }).format(value);
const SHOWN = 20;

/** 3.1: монетка с вероятностью p; частота успеха по мере бросков ложится на p внутри раструба p ± 2σ. */
export function LlnWidget({ state, onChange }: WidgetProps<LlnState>) {
  const { thrown, seed } = state;
  const p = state.p / 100;
  const pId = useId();
  const { ref, width } = useElementWidth<HTMLElement>(640);
  const tosses = useMemo(() => coinTosses(seed, thrown, p), [seed, thrown, p]);
  const frequency = useMemo(() => runningFrequency(tosses), [tosses]);
  const hits = thrown ? Math.round(frequency[thrown - 1] * thrown) : 0;
  const w = thrown ? frequency[thrown - 1] : null;
  const sigma = frequencySigma(p, thrown);

  const W = Math.max(280, width);
  const H = W < 480 ? 240 : 300;
  const left = 40;
  const right = W - 12;
  const top = 10;
  const bottom = H - 34;
  const logMax = Math.log10(LLN_MAX);
  const x = (n: number) => left + ((right - left) * Math.log10(n)) / logMax;
  const y = (v: number) => bottom - (bottom - top) * v;
  const clampY = (v: number) => y(Math.min(1, Math.max(0, v)));

  // Ломаная частоты: около 400 точек в логарифмической шкале.
  const line: string[] = [];
  let last = 0;
  for (let i = 0; i <= 400 && thrown > 0; i += 1) {
    const n = Math.min(thrown, Math.max(1, Math.round(10 ** ((logMax * i) / 400))));
    if (n === last) continue;
    last = n;
    line.push(`${x(n)},${y(frequency[n - 1])}`);
    if (n === thrown) break;
  }
  const funnel = (sign: number) =>
    Array.from({ length: 81 }, (_, i) => {
      const n = 10 ** ((logMax * i) / 80);
      return `${x(n)},${clampY(p + sign * 2 * frequencySigma(p, n))}`;
    }).join(' ');

  const restart = (changes: Partial<LlnState>) => onChange({ ...state, ...changes, thrown: 0 });
  const recent = tosses.slice(-SHOWN);

  return (
    <div className="c-widget">
      <div className="c-range">
        <label htmlFor={pId}>
          Вероятность успеха <output htmlFor={pId}>p = {f(p)}</output>
        </label>
        <input id={pId} type="range" min={10} max={90} step={10} value={state.p} onChange={(event) => restart({ p: Number(event.target.value) })} />
      </div>
      <div className="c-actions" role="group" aria-label="Бросить монету">
        {[10, 100, 1000].map((count) => (
          <button key={count} type="button" className="c-btn c-btn--small" disabled={thrown >= LLN_MAX} onClick={() => onChange({ ...state, thrown: Math.min(LLN_MAX, thrown + count) })}>
            +{count}
          </button>
        ))}
        <button type="button" className="c-btn c-btn--small c-btn--ghost" disabled={thrown === 0} onClick={() => restart({ seed: newSeed() })}>
          Сначала
        </button>
      </div>

      <div className="c-coins" aria-label={thrown ? `Последние ${recent.length} бросков: успехов ${recent.filter(Boolean).length}` : 'Бросков ещё не было'}>
        {recent.length === 0 ? <span className="c-prose-muted">Бросьте монету: синяя — успех, серая — неудача.</span> : null}
        {recent.map((hit, index) => (
          <img key={thrown - recent.length + index} src={hit ? coinGlass : coinGraphite} alt="" width={26} height={26} />
        ))}
      </div>

      <figure className="c-chart c-chart--scene" ref={ref}>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Частота успеха после ${thrown} бросков${w === null ? '' : ` — ${f3(w)}`}; вероятность ${f(p)}`}>
          {[0, 0.5, 1].map((v) => (
            <g key={v}>
              <line className="c-gridline" x1={left} x2={right} y1={y(v)} y2={y(v)} />
              <text className="c-tick" x={left - 8} y={y(v) + 4} textAnchor="end">
                {f(v)}
              </text>
            </g>
          ))}
          {[1, 10, 100, 1000].map((n) => (
            <text key={n} className="c-tick c-tick--x" x={x(n)} y={bottom + 16} textAnchor="middle">
              {n}
            </text>
          ))}
          <g fill="none" stroke="#ff4fc8" strokeWidth={2} aria-hidden="true" style={{ filter: 'drop-shadow(0 0 6px rgba(255, 79, 200, 0.6))' }}>
            <line x1={left} x2={right} y1={y(p)} y2={y(p)} strokeWidth={2.5} />
            <polyline points={funnel(1)} strokeDasharray="6 5" />
            <polyline points={funnel(-1)} strokeDasharray="6 5" />
          </g>
          {line.length ? <polyline points={line.join(' ')} fill="none" stroke="#6b7bff" strokeWidth={2.4} strokeLinejoin="round" /> : null}
          {w !== null ? <circle cx={x(thrown)} cy={y(w)} r={6} fill="#6b7bff" stroke="#fff" strokeWidth={1.5} /> : null}
          <text className="c-axis-label" x={(left + right) / 2} y={H - 4} textAnchor="middle">
            Число бросков n (логарифмическая шкала)
          </text>
        </svg>
      </figure>

      <dl className="c-readout">
        <div>
          <dt>Бросков</dt>
          <dd>n = {thrown}</dd>
        </div>
        <div>
          <dt>Успехов</dt>
          <dd>{hits}</dd>
        </div>
        <div>
          <dt>Частота w</dt>
          <dd className="c-accent-dd">{w === null ? '—' : f3(w)}</dd>
        </div>
        <div>
          <dt>Вероятность</dt>
          <dd className="c-theory-text">p = {f(p)}</dd>
        </div>
        <div className="c-readout-wide">
          <dt>Отклонение |w − p|</dt>
          <dd>{w === null ? '—' : f3(Math.abs(w - p))}</dd>
        </div>
        <div className="c-readout-wide">
          <dt>2σ = 2√(p(1 − p)/n)</dt>
          <dd className="c-theory-text">{thrown ? f3(2 * sigma) : '—'}</dd>
        </div>
      </dl>
      <p className="c-widget-note">Синяя линия — частота, малиновая прямая — p, пунктир — p ± 2σ. Раструб сужается как 1/√n.</p>
    </div>
  );
}
