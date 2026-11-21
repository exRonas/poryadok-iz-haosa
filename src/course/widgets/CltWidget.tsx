import { useId, useMemo } from 'react';
import { formatStatistic } from '../../lib/format';
import { newSeed } from '../../lib/random';
import { ColumnsChart } from '../ColumnsChart';
import { variance } from '../math';
import { normalDensity } from '../math2';
import { DIE_MEAN, DIE_VARIANCE, diceThrows } from '../math3';
import { DIE_FACES } from '../sprites';
import type { WidgetProps } from '../types';
import { CLT_MAX, type CltState } from './state';

const f = formatStatistic;
const word = (n: number) => (n === 1 ? 'кубик' : n < 5 ? 'кубика' : 'кубиков');

/** 3.3: суммы n кубиков; гистограмма выборки с ростом n принимает форму нормальной кривой. */
export function CltWidget({ state, onChange }: WidgetProps<CltState>) {
  const { dice, thrown, seed } = state;
  const nId = useId();
  const throws = useMemo(() => diceThrows(seed, thrown, dice), [seed, thrown, dice]);
  const sums = useMemo(() => throws.map((faces) => faces.reduce((s, v) => s + v, 0)), [throws]);

  const counts = Array<number>(5 * dice + 1).fill(0);
  for (const sum of sums) counts[sum - dice] += 1;
  const shares = counts.map((count) => (thrown ? count / thrown : 0));
  const mu = DIE_MEAN * dice;
  const d = DIE_VARIANCE * dice;
  const sigma = Math.sqrt(d);
  const mean = thrown ? sums.reduce((s, v) => s + v, 0) / thrown : null;
  const sampleD = thrown > 1 ? variance(sums) : null;
  const inside = sums.filter((s) => Math.abs(s - mu) <= 2 * sigma).length;
  const lastThrow = throws[throws.length - 1] ?? null;

  const restart = (changes: Partial<CltState>) => onChange({ ...state, ...changes, thrown: 0 });

  return (
    <div className="c-widget">
      <div className="c-range">
        <label htmlFor={nId}>
          Кубиков в броске <output htmlFor={nId}>n = {dice}</output>
        </label>
        <input id={nId} type="range" min={1} max={12} value={dice} onChange={(event) => restart({ dice: Number(event.target.value) })} />
      </div>
      <div className="c-actions" role="group" aria-label="Бросить кубики">
        {[10, 100, 1000].map((count) => (
          <button key={count} type="button" className="c-btn c-btn--small" disabled={thrown >= CLT_MAX} onClick={() => onChange({ ...state, thrown: Math.min(CLT_MAX, thrown + count) })}>
            +{count}
          </button>
        ))}
        <button type="button" className="c-btn c-btn--small c-btn--ghost" disabled={thrown === 0} onClick={() => restart({ seed: newSeed() })}>
          Сначала
        </button>
      </div>

      <div className="c-dice" aria-label={lastThrow ? `Последний бросок: ${lastThrow.join(', ')}, сумма ${lastThrow.reduce((s, v) => s + v, 0)}` : 'Бросков ещё не было'}>
        {lastThrow ? (
          <>
            {lastThrow.map((face, i) => (
              <img key={i} src={DIE_FACES[face - 1]} alt="" width={48} height={48} />
            ))}
            <span className="c-dice-sum">= {lastThrow.reduce((s, v) => s + v, 0)}</span>
          </>
        ) : (
          <span className="c-prose-muted">Бросьте {dice} {word(dice)} — здесь появится последний бросок.</span>
        )}
      </div>

      <ColumnsChart
        values={shares}
        variant="sample"
        format={(value) => f(value)}
        curve={(i) => normalDensity(i + dice, mu, sigma)}
        band={[mu - 2 * sigma - dice, mu + 2 * sigma - dice]}
        labelEvery={Math.ceil((5 * dice + 1) / 12)}
        labelOf={(i) => String(i + dice)}
        height={240}
        label={`Доли сумм ${dice} ${word(dice)} после ${thrown} бросков и нормальная кривая N(${f(mu)}; ${f(d)})`}
      />

      <dl className="c-readout">
        <div>
          <dt>Бросков</dt>
          <dd>N = {thrown}</dd>
        </div>
        <div>
          <dt>Внутри μ ± 2σ</dt>
          <dd>{thrown ? `${Math.round((inside / thrown) * 100)} %` : '—'}</dd>
        </div>
        <div>
          <dt>Среднее суммы</dt>
          <dd className="c-accent-dd">{mean === null ? '—' : f(mean)}</dd>
        </div>
        <div>
          <dt>Теория E = 3,5n</dt>
          <dd className="c-theory-text">{f(mu)}</dd>
        </div>
        <div>
          <dt>Дисперсия выборки</dt>
          <dd className="c-accent-dd">{sampleD === null ? '—' : f(sampleD)}</dd>
        </div>
        <div>
          <dt>Теория D = 35n/12</dt>
          <dd className="c-theory-text">{f(d)}</dd>
        </div>
      </dl>
      <p className="c-widget-note">Синее стекло — доли сумм в опыте, малиновая кривая — нормальная плотность с теми же E и D. При одном кубике столбики ровные, при 3–4 уже похожи на колокол.</p>
    </div>
  );
}
