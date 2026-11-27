/** Мини-опыты лекций курса 3 «Предельные теоремы». */
import { useMemo, useState } from 'react';
import { createRng } from '../../lib/random';
import { formatShare, formatStatistic as f } from '../../lib/format';
import { moments, normalPdf, sumDistribution } from './lectureMath';
import { DistChart, LinePlot, Slider } from './parts';
import { Dice3D, type DieKind } from './Dice3D';
import { Coin3D } from './Coin3D';

const r2 = (v: number) => Math.round(v * 100) / 100;
const r3 = (v: number) => Math.round(v * 1000) / 1000;

/* ---------- 3.1 ---------- */

/** Монетка: частота орлов и проверка «ошибки игрока». */
export function CoinRunDemo() {
  const [flips, setFlips] = useState<boolean[]>([]);
  const add = (count: number) => setFlips([...flips, ...Array.from({ length: count }, () => Math.random() < 0.5)].slice(-20000));
  const n = flips.length;
  const heads = flips.filter(Boolean).length;
  let run = 0;
  for (let i = n - 1; i >= 0 && flips[i] === flips[n - 1]; i -= 1) run += 1;
  // После трёх орлов подряд — что выпало следующим?
  let after = 0;
  let afterHeads = 0;
  for (let i = 3; i < n; i += 1) {
    if (flips[i - 1] && flips[i - 2] && flips[i - 3]) {
      after += 1;
      if (flips[i]) afterHeads += 1;
    }
  }
  return (
    <div className="c-demo-body">
      <Coin3D onFlip={(h) => setFlips((prev) => [...prev, h].slice(-20000))} />
      <div className="c-actions">
        <button type="button" className="c-btn c-btn--small" onClick={() => add(100)}>
          +100
        </button>
        <button type="button" className="c-btn c-btn--small" onClick={() => add(5000)}>
          +5000
        </button>
        <button type="button" className="c-btn c-btn--small c-btn--ghost" onClick={() => setFlips([])}>
          Сначала
        </button>
      </div>
      <div className="c-chips" aria-label="Последние броски">
        {flips.slice(-16).map((h, i) => (
          <span key={i} className={'c-chip c-chip--static' + (h ? ' c-chip--hot' : '')}>
            {h ? 'О' : 'Р'}
          </span>
        ))}
      </div>
      <dl className="c-readout">
        <div>
          <dt>Бросков n</dt>
          <dd>{n}</dd>
        </div>
        <div>
          <dt>Частота орлов</dt>
          <dd className="c-theory-text">{n ? formatShare(heads / n) : '—'}</dd>
        </div>
        <div>
          <dt>Текущая серия</dt>
          <dd>{n ? `${run} × ${flips[n - 1] ? 'орёл' : 'решка'}` : '—'}</dd>
        </div>
        <div>
          <dt>Орёл после трёх орлов</dt>
          <dd>{after ? `${afterHeads} из ${after} = ${formatShare(afterHeads / after)}` : 'ещё не было'}</dd>
        </div>
      </dl>
      <p className="c-widget-note">
        Наберите несколько тысяч бросков: после серии из трёх орлов орёл выпадает всё так же примерно в половине случаев. Монета не «должна»
        решку.
      </p>
    </div>
  );
}

/** Сколько опытов нужно для заданной точности: σ_w и оценка Чебышёва. */
export function ErrorBudgetDemo() {
  const [power, setPower] = useState(2);
  const n = 10 ** power;
  const p = 0.5;
  const sigma = Math.sqrt((p * (1 - p)) / n);
  const eps = 0.05;
  const cheb = Math.min(1, (p * (1 - p)) / (n * eps * eps));
  return (
    <div className="c-demo-body">
      <Slider label="Число опытов n" value={power} min={1} max={5} onChange={setPower} show={n.toLocaleString('ru-RU')} />
      <dl className="c-readout">
        <div>
          <dt>σ частоты √(p(1 − p)/n)</dt>
          <dd className="c-theory-text">{f(r3(sigma))}</dd>
        </div>
        <div>
          <dt>95 % серий в пределах</dt>
          <dd>p ± {f(r3(2 * sigma))}</dd>
        </div>
        <div className="c-readout-wide" style={{ gridColumn: '1 / -1' }}>
          <dt>Неравенство Чебышёва: P(|w − p| ≥ 0,05) ≤ p(1 − p) / (n · 0,05²)</dt>
          <dd>≤ {f(r3(cheb))}</dd>
        </div>
      </dl>
      <p className="c-widget-note">Каждый шаг ползунка — в 10 раз больше опытов, а погрешность уменьшается только в √10 ≈ 3,16 раза.</p>
    </div>
  );
}

/* ---------- 3.2 ---------- */

const TRUE = (x: number) => 50 + 30 * Math.sin(x / 9) + (x > 60 && x < 80 ? 20 : 0);

/** Сигнал с шумом: усредняем n записей, шум падает как σ/√n. */
export function SignalAverageDemo() {
  const [n, setN] = useState(1);
  const [sigma, setSigma] = useState(20);
  const [seed, setSeed] = useState(7);
  const xs = Array.from({ length: 121 }, (_, i) => i);
  const averaged = useMemo(() => {
    const rng = createRng(seed);
    const gauss = () => Math.sqrt(-2 * Math.log(rng() || 1e-9)) * Math.cos(2 * Math.PI * rng());
    return xs.map((x) => {
      let s = 0;
      for (let t = 0; t < n; t += 1) s += TRUE(x) + sigma * gauss();
      return s / n;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, sigma, seed]);
  const rmse = Math.sqrt(averaged.reduce((s, v, i) => s + (v - TRUE(i)) ** 2, 0) / averaged.length);
  return (
    <div className="c-demo-body">
      <div className="c-demo-sliders">
        <Slider label="Записей n" value={n} min={1} max={64} onChange={setN} />
        <Slider label="Шум σ" value={sigma} min={0} max={40} step={5} onChange={setSigma} />
      </div>
      <LinePlot
        label={`Среднее ${n} зашумлённых записей и истинный сигнал`}
        xMax={120}
        yMin={-20}
        yMax={120}
        yTicks={[0, 50, 100]}
        series={[
          { points: averaged.map((v, i) => [i, v] as const), tone: 'accent' },
          { points: xs.map((x) => [x, TRUE(x)] as const), tone: 'theory' },
        ]}
      />
      <dl className="c-readout">
        <div>
          <dt>Ошибка среднего (измерено)</dt>
          <dd className="c-theory-text">{f(r2(rmse))}</dd>
        </div>
        <div>
          <dt>Теория σ/√n</dt>
          <dd>{f(r2(sigma / Math.sqrt(n)))}</dd>
        </div>
      </dl>
      <div className="c-actions">
        <button type="button" className="c-btn c-btn--small c-btn--ghost" onClick={() => setSeed(seed + 1)}>
          Новые записи
        </button>
      </div>
      <p className="c-widget-note">Синяя линия — среднее записей, малиновая — истинный сигнал. Поставьте n = 4, 16, 64: каждый раз шум вдвое меньше.</p>
    </div>
  );
}

/* ---------- 3.3 ---------- */

const SHAPES: Record<string, { label: string; probs: number[] }> = {
  fair: { label: 'Честный кубик', probs: [1, 1, 1, 1, 1, 1].map((v) => v / 6) },
  skew: { label: 'Кривой кубик (часто 1)', probs: [6, 2, 1, 1, 1, 1].map((v) => v / 12) },
  edges: { label: 'Только 1 и 6', probs: [1, 0, 0, 0, 0, 1].map((v) => v / 2) },
};

function rollFace(probs: readonly number[]) {
  let u = Math.random();
  for (let i = 0; i < probs.length; i += 1) {
    u -= probs[i];
    if (u < 0) return i + 1;
  }
  return probs.length;
}

/** Точное распределение суммы n кубиков и кривая Гаусса поверх. */
export function DiceSumDemo() {
  const [n, setN] = useState(1);
  const [shape, setShape] = useState('fair');
  const base = SHAPES[shape].probs;
  const dist = sumDistribution(base, n);
  const { mean, variance } = moments(dist, n);
  const sd = Math.sqrt(variance);
  const [sums, setSums] = useState<number[]>([]);
  const changeN = (v: number) => {
    setN(v);
    setSums([]);
  };
  const empirical = dist.map((_, i) => (sums.length ? sums.filter((s) => s === n + i).length / sums.length : 0));
  return (
    <div className="c-demo-body">
      <Dice3D key={shape} kind={shape as DieKind} probs={base} n={n} onRoll={(s) => setSums((prev) => [...prev, s])} />
      {(
        <div className="c-actions">
          <button
            type="button"
            className="c-btn c-btn--small c-btn--ghost"
            onClick={() =>
              setSums((prev) => [
                ...prev,
                ...Array.from({ length: 100 }, () => Array.from({ length: n }, () => rollFace(base)).reduce((a, b) => a + b, 0)),
              ])
            }
          >
            +100 бросков без анимации
          </button>
        </div>
      )}
      {sums.length ? (
        <DistChart
          label={`Ваши броски: ${sums.length}. Столбики — доли сумм, кривая — нормальное приближение`}
          probs={empirical}
          from={n}
          curve={n > 1 ? (x) => normalPdf(x, mean, sd) : undefined}
        />
      ) : null}
      <div className="c-segmented" role="group" aria-label="Форма одного слагаемого">
        {Object.entries(SHAPES).map(([key, s]) => (
          <button key={key} type="button" className="c-toggle" aria-pressed={shape === key} onClick={() => { setShape(key); setSums([]); }}>
            {s.label}
          </button>
        ))}
      </div>
      <Slider label="Кубиков n" value={n} min={1} max={12} onChange={changeN} />
      <DistChart
        label={`Распределение суммы ${n} кубиков`}
        probs={dist}
        from={n}
        curve={n > 1 ? (x) => normalPdf(x, mean, sd) : undefined}
      />
      <dl className="c-readout">
        <div>
          <dt>E(Sₙ) = nμ</dt>
          <dd>{f(r2(mean))}</dd>
        </div>
        <div>
          <dt>D(Sₙ) = nσ²</dt>
          <dd>{f(r2(variance))}</dd>
        </div>
      </dl>
      <p className="c-widget-note">Это точные вероятности, без случайности. Какую бы форму ни выбрать, с ростом n сумма ложится на колокол.</p>
    </div>
  );
}

/* ---------- 3.4 ---------- */

const TRI: [number, number][] = [
  [320, 20],
  [40, 300],
  [600, 300],
];
const SQUARE: [number, number][] = [
  [80, 20],
  [560, 20],
  [560, 300],
  [80, 300],
];

/** Игра хаоса по шагам: видно выбранную вершину и середину отрезка. */
export function ChaosStepsDemo() {
  const [square, setSquare] = useState(false);
  const [ratio, setRatio] = useState(50);
  const verts = square ? SQUARE : TRI;
  const [state, setState] = useState<{ pts: [number, number][]; last: number | null }>({ pts: [[300, 200]], last: null });
  const step = (count: number) =>
    setState((prevState) => {
    const pts = [...prevState.pts];
    let last = prevState.last;
    for (let i = 0; i < count; i += 1) {
      const v = Math.floor(Math.random() * verts.length);
      const [px, py] = pts[pts.length - 1];
      const t = ratio / 100;
      pts.push([px + (verts[v][0] - px) * t, py + (verts[v][1] - py) * t]);
      last = v;
    }
    return { pts: pts.slice(-6000), last };
    });
  const reset = (sq: boolean, r: number) => {
    setSquare(sq);
    setRatio(r);
    setState({ pts: [[300, 200]], last: null });
  };
  const cur = state.pts[state.pts.length - 1];
  const prev = state.pts.length > 1 ? state.pts[state.pts.length - 2] : null;
  return (
    <div className="c-demo-body">
      <div className="c-segmented" role="group" aria-label="Фигура">
        <button type="button" className="c-toggle" aria-pressed={!square} onClick={() => reset(false, 50)}>
          Треугольник, ½
        </button>
        <button type="button" className="c-toggle" aria-pressed={square && ratio === 50} onClick={() => reset(true, 50)}>
          Квадрат, ½
        </button>
        <button type="button" className="c-toggle" aria-pressed={square && ratio !== 50} onClick={() => reset(true, 67)}>
          Квадрат, ⅔
        </button>
      </div>
      <svg className="c-dotline" viewBox="0 0 640 320" role="img" aria-label={`Игра хаоса: ${state.pts.length - 1} шагов`}>
        {verts.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={state.last === i ? 10 : 7} className="c-tri-vertex" />
        ))}
        {state.pts.slice(1).map(([x, y], i) => (
          <rect key={i} x={x - 1} y={y - 1} width={2} height={2} className="c-tri-pt" />
        ))}
        {prev && state.last !== null ? <line x1={prev[0]} y1={prev[1]} x2={verts[state.last][0]} y2={verts[state.last][1]} className="c-tri-seg" /> : null}
        <circle cx={cur[0]} cy={cur[1]} r={5} className="c-tri-cur" />
      </svg>
      <div className="c-actions">
        <button type="button" className="c-btn c-btn--small" onClick={() => step(1)}>
          1 шаг
        </button>
        <button type="button" className="c-btn c-btn--small" onClick={() => step(100)}>
          +100
        </button>
        <button type="button" className="c-btn c-btn--small" onClick={() => step(3000)}>
          +3000
        </button>
        <button type="button" className="c-btn c-btn--small c-btn--ghost" onClick={() => reset(square, ratio)}>
          Сначала
        </button>
      </div>
      <p className="c-widget-note">
        Делайте по одному шагу: пунктир ведёт к случайной вершине, белая точка встаёт на его {ratio === 50 ? 'середину' : 'две трети'}. Треугольник
        даёт фрактал, квадрат с ½ — сплошное облако, а квадрат с ⅔ — снова узор.
      </p>
    </div>
  );
}
