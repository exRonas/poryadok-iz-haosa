/** Мини-опыты лекций курса 2 «Распределения». */
import { useState } from 'react';
import { formatShare, formatStatistic as f } from '../../lib/format';
import { binomial, choose, moments, normalPdf } from './lectureMath';
import { Bars, DistChart, LinePlot, Slider } from './parts';

const r2 = (v: number) => Math.round(v * 100) / 100;
const r3 = (v: number) => Math.round(v * 1000) / 1000;

/* ---------- 2.1 ---------- */

/** Все пути маленькой доски: выберите ячейку k — подсветятся пути, которые в неё ведут. */
export function PathListDemo() {
  const [m, setM] = useState(4);
  const [k, setK] = useState(2);
  const kk = Math.min(k, m);
  const all = Array.from({ length: 2 ** m }, (_, code) => Array.from({ length: m }, (_, bit) => ((code >> (m - 1 - bit)) & 1) === 1));
  const hits = all.filter((path) => path.filter(Boolean).length === kk);
  return (
    <div className="c-demo-body">
      <Slider label="Уровней m" value={m} min={1} max={5} onChange={setM} />
      <Slider label="Ячейка k (поворотов вправо)" value={kk} min={0} max={m} onChange={setK} />
      <div className="c-chips" aria-label={`Пути в ячейку ${kk}`}>
        {hits.map((path, i) => (
          <span key={i} className="c-chip c-chip--static">
            {path.map((right) => (right ? 'П' : 'Л')).join('')}
          </span>
        ))}
      </div>
      <p className="c-status c-status--ok" role="status">
        Всего путей 2<sup>{m}</sup> = {2 ** m}. В ячейку {kk} ведут {hits.length} = C({m}, {kk}). При p = 0,5 все пути равновероятны, поэтому
        P(X = {kk}) = {hits.length} / {2 ** m} = {f(r3(hits.length / 2 ** m))}.
      </p>
      <p className="c-widget-note">П — поворот вправо, Л — влево. Порядок поворотов разный, а ячейка одна: важно только, сколько было «П».</p>
    </div>
  );
}

/** Треугольник Паскаля: каждое число — сумма двух над ним, это и есть число путей. */
export function PascalDemo() {
  const [rows, setRows] = useState(6);
  const [pick, setPick] = useState<[number, number]>([4, 2]);
  return (
    <div className="c-demo-body">
      <Slider label="Строк" value={rows} min={3} max={10} onChange={setRows} />
      <div className="c-pascal" aria-label="Треугольник Паскаля">
        {Array.from({ length: rows + 1 }, (_, m) => (
          <div key={m} className="c-pascal-row">
            {Array.from({ length: m + 1 }, (_, k) => {
              const on = pick[0] === m && pick[1] === k;
              const parent = pick[0] === m + 1 && (pick[1] === k || pick[1] === k + 1);
              return (
                <button
                  key={k}
                  type="button"
                  className={'c-pascal-cell' + (on ? ' c-pascal-cell--on' : parent ? ' c-pascal-cell--parent' : '')}
                  onClick={() => setPick([m, k])}
                  aria-label={`C(${m}, ${k}) = ${choose(m, k)}`}
                >
                  {choose(m, k)}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <p className="c-status" role="status">
        C({pick[0]}, {pick[1]}) = {choose(pick[0], pick[1])}
        {pick[0] > 0 && pick[1] > 0 && pick[1] < pick[0]
          ? ` = C(${pick[0] - 1}, ${pick[1] - 1}) + C(${pick[0] - 1}, ${pick[1]}) = ${choose(pick[0] - 1, pick[1] - 1)} + ${choose(pick[0] - 1, pick[1])}`
          : ''}
        . В ячейку можно прийти только из двух соседних сверху — поэтому числа складываются.
      </p>
    </div>
  );
}

/* ---------- 2.2 ---------- */

/** Матожидание как взвешенная сумма: таблица k · P(X = k). */
export function ExpectationTableDemo() {
  const [m, setM] = useState(4);
  const [p, setP] = useState(50);
  const probs = binomial(m, p / 100);
  const { mean, variance } = moments(probs);
  return (
    <div className="c-demo-body">
      <div className="c-demo-sliders">
        <Slider label="Уровней m" value={m} min={1} max={8} onChange={setM} />
        <Slider label="p, %" value={p} min={0} max={100} step={5} onChange={setP} show={`${p} %`} />
      </div>
      <table className="c-table">
        <thead>
          <tr>
            <th scope="col">k</th>
            <th scope="col">P(X = k)</th>
            <th scope="col">k · P</th>
            <th scope="col">(k − E)² · P</th>
          </tr>
        </thead>
        <tbody>
          {probs.map((q, k) => (
            <tr key={k}>
              <th scope="row">{k}</th>
              <td>{f(r3(q))}</td>
              <td>{f(r3(k * q))}</td>
              <td>{f(r3((k - mean) ** 2 * q))}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Σ</th>
            <td>1</td>
            <td className="c-theory-text">E = {f(r2(mean))}</td>
            <td className="c-theory-text">D = {f(r2(variance))}</td>
          </tr>
        </tfoot>
      </table>
      <p className="c-status c-status--ok" role="status">
        По формулам: mp = {m} · {f(p / 100)} = {f(r2((m * p) / 100))}, mp(1 − p) = {f(r2((m * p * (100 - p)) / 10000))}. Совпадает с суммами в
        таблице.
      </p>
    </div>
  );
}

/** Дисперсия mp(1 − p) как функция p: максимум при p = 0,5. */
export function VarianceParabolaDemo() {
  const [p, setP] = useState(30);
  const m = 10;
  const items = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((q) => ({
    label: `${q}`,
    value: (m * q * (100 - q)) / 10000,
    tone: q === p ? ('theory' as const) : ('accent' as const),
  }));
  return (
    <div className="c-demo-body">
      <Slider label="p, %" value={p} min={0} max={100} step={10} onChange={setP} show={`${p} %`} />
      <Bars label="Дисперсия при m = 10 и разных p" items={items} max={2.5} format={(v) => f(r2(v))} />
      <p className="c-status" role="status">
        При p = {p} %: D = 10 · {f(p / 100)} · {f(1 - p / 100)} = {f(r2((m * p * (100 - p)) / 10000))}.{' '}
        {p === 50 ? 'Это максимум: шарик «сомневается» сильнее всего.' : p === 0 || p === 100 ? 'Разброса нет: все шарики в одной ячейке.' : ''}
      </p>
    </div>
  );
}

/* ---------- 2.3 ---------- */

/** Одно блуждание шаг за шагом. */
export function WalkStepsDemo() {
  const [steps, setSteps] = useState<number[]>([]);
  const positions = steps.reduce<number[]>((acc, s) => [...acc, acc[acc.length - 1] + s], [0]);
  const add = (count: number) => setSteps([...steps, ...Array.from({ length: count }, () => (Math.random() < 0.5 ? 1 : -1))].slice(0, 400));
  const k = steps.length;
  const S = positions[k];
  const lim = Math.max(10, ...positions.map(Math.abs));
  return (
    <div className="c-demo-body">
      <div className="c-actions">
        <button type="button" className="c-btn c-btn--small" onClick={() => add(1)} disabled={k >= 400}>
          +1 шаг
        </button>
        <button type="button" className="c-btn c-btn--small" onClick={() => add(10)} disabled={k >= 400}>
          +10
        </button>
        <button type="button" className="c-btn c-btn--small" onClick={() => add(100)} disabled={k >= 400}>
          +100
        </button>
        <button type="button" className="c-btn c-btn--small c-btn--ghost" onClick={() => setSteps([])}>
          Сначала
        </button>
      </div>
      <LinePlot
        label={`Положение после ${k} шагов: ${S}`}
        xMax={Math.max(20, k)}
        yMin={-lim}
        yMax={lim}
        yTicks={[-lim, 0, lim].map(Math.round)}
        band={{ lower: (x) => -2 * Math.sqrt(x), upper: (x) => 2 * Math.sqrt(x) }}
        series={[{ points: positions.map((v, i) => [i, v] as const), tone: 'white' }]}
      />
      <dl className="c-readout">
        <div>
          <dt>Шагов k</dt>
          <dd>{k}</dd>
        </div>
        <div>
          <dt>Последний шаг</dt>
          <dd>{k ? (steps[k - 1] > 0 ? '+1' : '−1') : '—'}</dd>
        </div>
        <div>
          <dt>Положение Sₖ</dt>
          <dd className="c-theory-text">{S}</dd>
        </div>
        <div>
          <dt>Коридор ±2√k</dt>
          <dd>±{f(r2(2 * Math.sqrt(k)))}</dd>
        </div>
      </dl>
      <p className="c-widget-note">Зелёный коридор ±2√k: почти все блуждания остаются внутри. Он расширяется, но всё медленнее.</p>
    </div>
  );
}

/** Сравнение k и √k. */
export function SqrtGrowthDemo() {
  const ks = [1, 4, 16, 64, 256];
  return (
    <div className="c-demo-body">
      <table className="c-table">
        <thead>
          <tr>
            <th scope="col">Шагов k</th>
            <th scope="col">Наибольший уход k</th>
            <th scope="col">Типичный уход √k</th>
          </tr>
        </thead>
        <tbody>
          {ks.map((k) => (
            <tr key={k}>
              <td>{k}</td>
              <td>{k}</td>
              <td className="c-theory-text">{Math.sqrt(k)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="c-widget-note">Каждая строка — вчетверо больше шагов, а типичный уход растёт только вдвое.</p>
    </div>
  );
}

/* ---------- 2.4 ---------- */

/** Биномиальное и колокол поверх него. */
export function NormalFitDemo() {
  const [m, setM] = useState(10);
  const [p, setP] = useState(50);
  const [rule, setRule] = useState(1);
  const q = p / 100;
  const probs = binomial(m, q);
  const mu = m * q;
  const sigma = Math.sqrt(m * q * (1 - q));
  const lo = Math.ceil(mu - rule * sigma);
  const hi = Math.floor(mu + rule * sigma);
  const inside = probs.reduce((s, v, k) => (k >= lo && k <= hi ? s + v : s), 0);
  const maxErr = sigma > 0 ? Math.max(...probs.map((v, k) => Math.abs(v - normalPdf(k, mu, sigma)))) : 1;
  return (
    <div className="c-demo-body">
      <div className="c-demo-sliders">
        <Slider label="Уровней m" value={m} min={2} max={60} onChange={setM} />
        <Slider label="p, %" value={p} min={5} max={95} step={5} onChange={setP} show={`${p} %`} />
        <Slider label="Коридор μ ± kσ" value={rule} min={1} max={3} onChange={setRule} show={`k = ${rule}`} />
      </div>
      <DistChart
        label={`Биномиальное B(${m}; ${f(q)}) и нормальная кривая`}
        probs={probs}
        curve={sigma > 0 ? (x) => normalPdf(x, mu, sigma) : undefined}
        highlight={(k) => k >= lo && k <= hi}
        band={{ from: Math.max(0, lo), to: Math.min(m, hi), label: `μ ± ${rule}σ` }}
      />
      <dl className="c-readout">
        <div>
          <dt>μ = mp</dt>
          <dd>{f(r2(mu))}</dd>
        </div>
        <div>
          <dt>σ = √(mp(1 − p))</dt>
          <dd>{f(r2(sigma))}</dd>
        </div>
        <div>
          <dt>Вероятность в коридоре</dt>
          <dd className="c-theory-text">{formatShare(inside)}</dd>
        </div>
        <div>
          <dt>Наибольшее расхождение</dt>
          <dd>{f(r3(maxErr))}</dd>
        </div>
      </dl>
      <p className="c-widget-note">
        Правило 68–95–99,7: при k = 1, 2, 3 вероятность в коридоре приближается к этим числам с ростом m. При p = 5 % и малом m колокол
        перекошен — приближение плохое.
      </p>
    </div>
  );
}
