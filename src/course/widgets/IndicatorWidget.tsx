import { useId, useMemo } from 'react';
import { newSeed } from '../../lib/random';
import { atLeastOutcomes, indicatorThrows } from '../math4';
import { DIE_FACES } from '../sprites';
import type { WidgetProps } from '../types';
import { INDICATOR_MAX, type IndicatorState } from './state';

const f3 = (value: number) => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 3 }).format(value);
const int = (value: number) => new Intl.NumberFormat('ru-RU').format(value);
const SHOWN = 8;

/** 4.4: индикатор события «сумма двух кубиков ≥ s»; среднее индикаторов оценивает P(A). */
export function IndicatorWidget({ state, onChange }: WidgetProps<IndicatorState>) {
  const { s, thrown, seed } = state;
  const sId = useId();
  const { dice, indicators } = useMemo(() => indicatorThrows(seed, thrown, s), [seed, thrown, s]);
  const hits = indicators.reduce((sum, v) => sum + v, 0);
  const outcomes = atLeastOutcomes(s);
  const p = outcomes / 36;
  const mean = thrown ? hits / thrown : null;
  const se = Math.sqrt((p * (1 - p)) / Math.max(1, thrown));
  const recent = dice.slice(-SHOWN).map((pair, i) => ({ pair, bit: indicators[thrown - Math.min(SHOWN, thrown) + i], key: thrown - Math.min(SHOWN, thrown) + i }));

  const restart = (changes: Partial<IndicatorState>) => onChange({ ...state, ...changes, thrown: 0 });

  return (
    <div className="c-widget">
      <div className="c-range">
        <label htmlFor={sId}>
          Событие A: сумма двух кубиков не меньше <output htmlFor={sId}>s = {s}</output>
        </label>
        <input id={sId} type="range" min={3} max={12} value={s} onChange={(event) => restart({ s: Number(event.target.value) })} />
      </div>
      <div className="c-actions" role="group" aria-label="Бросить пару кубиков">
        {[1, 10, 100, 1000].map((count) => (
          <button key={count} type="button" className="c-btn c-btn--small" disabled={thrown >= INDICATOR_MAX} onClick={() => onChange({ ...state, thrown: Math.min(INDICATOR_MAX, thrown + count) })}>
            +{int(count)}
          </button>
        ))}
        <button type="button" className="c-btn c-btn--small c-btn--ghost" disabled={thrown === 0} onClick={() => restart({ seed: newSeed() })}>
          Сначала
        </button>
      </div>

      <ol className="c-indicators" aria-label={thrown ? `Последние ${recent.length} бросков` : 'Бросков ещё не было'}>
        {recent.length === 0 ? <li className="c-prose-muted">Бросьте кубики: для каждого броска появится индикатор 1 или 0.</li> : null}
        {recent.map(({ pair, bit, key }) => (
          <li key={key} className={bit ? 'c-indicator c-indicator--on' : 'c-indicator'}>
            <span className="c-indicator-dice">
              {pair.map((face, i) => (
                <img key={i} src={DIE_FACES[face - 1]} alt="" width={30} height={30} />
              ))}
            </span>
            <span className="c-indicator-sum">{pair[0] + pair[1]}</span>
            <b aria-label={`сумма ${pair[0] + pair[1]}, I = ${bit}`}>{bit}</b>
          </li>
        ))}
      </ol>

      <dl className="c-readout">
        <div>
          <dt>Бросков</dt>
          <dd>N = {int(thrown)}</dd>
        </div>
        <div>
          <dt>Сумма индикаторов</dt>
          <dd>ΣI = {int(hits)}</dd>
        </div>
        <div>
          <dt>Среднее I = оценка P(A)</dt>
          <dd className="c-accent-dd">{mean === null ? '—' : f3(mean)}</dd>
        </div>
        <div>
          <dt>Точно P(A)</dt>
          <dd className="c-theory-text">
            {outcomes}/36 ≈ {f3(p)}
          </dd>
        </div>
        <div className="c-readout-wide">
          <dt>D(I) = p(1 − p)</dt>
          <dd className="c-theory-text">{f3(p * (1 - p))}</dd>
        </div>
        <div className="c-readout-wide">
          <dt>σ среднего = √(p(1 − p)/N)</dt>
          <dd className="c-theory-text">{thrown ? f3(se) : '—'}</dd>
        </div>
      </dl>
      <p className="c-widget-note">Индикатор — случайная величина: 1, если событие случилось, и 0, если нет. Среднее индикаторов — это частота события, поэтому оно оценивает вероятность.</p>
    </div>
  );
}
