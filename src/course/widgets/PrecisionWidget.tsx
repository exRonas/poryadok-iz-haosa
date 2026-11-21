import { useId, useMemo } from 'react';
import { newSeed } from '../../lib/random';
import { ColumnsChart } from '../ColumnsChart';
import { normalDensity } from '../math2';
import { PRECISION_REPEATS, PRECISION_SIZES, histogram, piEstimates, piSigma } from '../math4';
import type { WidgetProps } from '../types';
import type { PrecisionState } from './state';

const f3 = (value: number) => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 3 }).format(value);
const int = (value: number) => new Intl.NumberFormat('ru-RU').format(value);
const BINS = 17;

/** 4.3: 200 независимых оценок π по n точкам; разброс оценок падает как 1/√n. */
export function PrecisionWidget({ state, onChange }: WidgetProps<PrecisionState>) {
  const { size, seed } = state;
  const n = PRECISION_SIZES[size];
  const nId = useId();
  const estimates = useMemo(() => piEstimates(seed, n), [seed, n]);
  // Шкала π ± 4σ своя для каждого n: форма колокола остаётся видна, а сужение читается по подписям оси.
  const FROM = Math.PI - 4 * piSigma(n);
  const TO = Math.PI + 4 * piSigma(n);
  const WIDTH = (TO - FROM) / BINS;
  const counts = histogram(estimates, FROM, TO, BINS);
  const shares = counts.map((count) => count / PRECISION_REPEATS);
  const mean = estimates.reduce((s, v) => s + v, 0) / PRECISION_REPEATS;
  const sd = Math.sqrt(estimates.reduce((s, v) => s + (v - mean) ** 2, 0) / PRECISION_REPEATS);
  const sigma = piSigma(n);
  const within = estimates.filter((v) => Math.abs(v - Math.PI) <= 2 * sigma).length;
  const centre = (i: number) => FROM + WIDTH * (i + 0.5);
  // Доля оценок в столбике по нормальному закону ≈ плотность · ширина столбика.
  const curve = (x: number) => normalDensity(FROM + WIDTH * (x + 0.5), Math.PI, sigma) * WIDTH;

  return (
    <div className="c-widget">
      <div className="c-range">
        <label htmlFor={nId}>
          Точек в одной оценке <output htmlFor={nId}>n = {int(n)}</output>
        </label>
        <input
          id={nId}
          type="range"
          min={0}
          max={PRECISION_SIZES.length - 1}
          value={size}
          aria-valuetext={`${n} точек`}
          onChange={(event) => onChange({ ...state, size: Number(event.target.value) })}
        />
      </div>
      <div className="c-actions">
        <button type="button" className="c-btn c-btn--small c-btn--ghost" onClick={() => onChange({ ...state, seed: newSeed() })}>
          Новые 200 оценок
        </button>
      </div>

      <ColumnsChart
        values={shares}
        variant="sample"
        format={(value) => f3(value)}
        curve={curve}
        band={[(Math.PI - 2 * sigma - FROM) / WIDTH - 0.5, (Math.PI + 2 * sigma - FROM) / WIDTH - 0.5]}
        labelEvery={4}
        labelOf={(i) => f3(centre(i))}
        height={240}
        label={`${PRECISION_REPEATS} оценок π по ${n} точкам: разброс ${f3(sd)}, теория ${f3(sigma)}`}
      />

      <dl className="c-readout">
        <div>
          <dt>Среднее оценок</dt>
          <dd className="c-accent-dd">{f3(mean)}</dd>
        </div>
        <div>
          <dt>π</dt>
          <dd className="c-theory-text">{f3(Math.PI)}</dd>
        </div>
        <div>
          <dt>σ по 200 оценкам</dt>
          <dd className="c-accent-dd">{f3(sd)}</dd>
        </div>
        <div>
          <dt>Теория 4√(p(1 − p)/n)</dt>
          <dd className="c-theory-text">{f3(sigma)}</dd>
        </div>
        <div className="c-readout-wide" style={{ gridColumn: '1 / -1' }}>
          <dt>Внутри π ± 2σ</dt>
          <dd>
            {within} из {PRECISION_REPEATS} оценок ({Math.round((within / PRECISION_REPEATS) * 100)} %)
          </dd>
        </div>
      </dl>
      <p className="c-widget-note">Каждый столбик — доля из 200 оценок в своём интервале. Шкала — π ± 4σ: следите за подписями оси, с каждым шагом ползунка (вчетверо больше точек) она сжимается вдвое. Здесь p = π/4.</p>
    </div>
  );
}
