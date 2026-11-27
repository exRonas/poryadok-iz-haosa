/** Мини-опыты лекций курса 4 «Оценивание и Монте-Карло». */
import { useState } from 'react';
import { formatShare, formatStatistic as f } from '../../lib/format';
import { Bars, Slider } from './parts';

const r2 = (v: number) => Math.round(v * 100) / 100;
const r3 = (v: number) => Math.round(v * 1000) / 1000;

/* ---------- 4.1 ---------- */

/** Опрос: 20 случайных выборок, у каждой свой доверительный интервал. Сколько из них накрыли правду? */
export function PollIntervalsDemo() {
  const [p, setP] = useState(40);
  const [n, setN] = useState(100);
  const [polls, setPolls] = useState<number[]>([]);
  const truth = p / 100;
  const run = () =>
    setPolls(
      Array.from({ length: 20 }, () => {
        let k = 0;
        for (let i = 0; i < n; i += 1) if (Math.random() < truth) k += 1;
        return k / n;
      }),
    );
  const W = 640;
  const rowH = 14;
  const H = 30 + polls.length * rowH;
  const X = (v: number) => 20 + Math.min(1, Math.max(0, v)) * (W - 40);
  const intervals = polls.map((ph) => {
    const half = 2 * Math.sqrt((ph * (1 - ph)) / n);
    return { ph, lo: ph - half, hi: ph + half, ok: ph - half <= truth && truth <= ph + half };
  });
  const covered = intervals.filter((i) => i.ok).length;
  return (
    <div className="c-demo-body">
      <div className="c-demo-sliders">
        <Slider label="Истинная доля p, %" value={p} min={5} max={95} step={5} onChange={(v) => { setP(v); setPolls([]); }} show={`${p} %`} />
        <Slider label="Опрошено n" value={n} min={10} max={1000} step={10} onChange={(v) => { setN(v); setPolls([]); }} />
      </div>
      <div className="c-actions">
        <button type="button" className="c-btn c-btn--small" onClick={run}>
          Провести 20 опросов
        </button>
      </div>
      {polls.length ? (
        <svg className="c-dotline" style={{ maxHeight: 'none' }} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`20 доверительных интервалов, накрыли правду ${covered}`}>
          <line x1={X(truth)} x2={X(truth)} y1={4} y2={H - 4} className="c-tri-seg" />
          {intervals.map((it, i) => (
            <g key={i}>
              <line x1={X(it.lo)} x2={X(it.hi)} y1={18 + i * rowH} y2={18 + i * rowH} className={it.ok ? 'c-ci c-ci--ok' : 'c-ci c-ci--bad'} />
              <circle cx={X(it.ph)} cy={18 + i * rowH} r={3.5} className={it.ok ? 'c-ci-dot' : 'c-ci-dot c-ci-dot--bad'} />
            </g>
          ))}
        </svg>
      ) : null}
      <p className={'c-status' + (polls.length ? ' c-status--ok' : '')} role="status">
        {polls.length
          ? `Интервал p̂ ± 2σ̂ накрыл истинную долю ${p} % в ${covered} опросах из 20. Ширина интервала около ±${formatShare(2 * Math.sqrt((truth * (1 - truth)) / n))}.`
          : 'Нажмите кнопку: каждая полоска — один опрос и его интервал, белая линия — истинная доля.'}
      </p>
      <p className="c-widget-note">Красные полоски промахнулись — так и должно быть примерно в 1 случае из 20. Увеличьте n: полоски станут короче.</p>
    </div>
  );
}

/* ---------- 4.2 ---------- */

const SHAPES = {
  circle: { label: 'Четверть круга', area: Math.PI / 4, inside: (x: number, y: number) => x * x + y * y <= 1, exact: 'π/4 ≈ 0,785' },
  tri: { label: 'Треугольник', area: 0.5, inside: (x: number, y: number) => y <= 1 - x, exact: '1/2 = 0,5' },
  ring: {
    label: 'Кольцо',
    area: Math.PI * (0.25 - 0.0625),
    inside: (x: number, y: number) => {
      const d = (x - 0.5) ** 2 + (y - 0.5) ** 2;
      return d <= 0.25 && d >= 0.0625;
    },
    exact: 'π(0,5² − 0,25²) ≈ 0,589',
  },
} as const;
type ShapeKey = keyof typeof SHAPES;

/** Площадь любой фигуры точками: нужно лишь уметь проверить, внутри ли точка. */
export function ShapeAreaDemo() {
  const [shape, setShape] = useState<ShapeKey>('circle');
  const [pts, setPts] = useState<[number, number][]>([]);
  const S = SHAPES[shape];
  const add = (count: number) => setPts([...pts, ...Array.from({ length: count }, () => [Math.random(), Math.random()] as [number, number])].slice(-20000));
  const k = pts.filter(([x, y]) => S.inside(x, y)).length;
  const N = pts.length;
  const size = 300;
  return (
    <div className="c-demo-body">
      <div className="c-segmented" role="group" aria-label="Фигура">
        {(Object.keys(SHAPES) as ShapeKey[]).map((key) => (
          <button key={key} type="button" className="c-toggle" aria-pressed={shape === key} onClick={() => { setShape(key); setPts([]); }}>
            {SHAPES[key].label}
          </button>
        ))}
      </div>
      <div className="c-demo-split">
        <svg viewBox={`0 0 ${size} ${size}`} className="c-square" role="img" aria-label={`${N} точек, внутри ${k}`}>
          <rect x={0} y={0} width={size} height={size} className="c-square-bg" />
          {pts.slice(-3000).map(([x, y], i) => (
            <rect key={i} x={x * size - 1.5} y={(1 - y) * size - 1.5} width={3} height={3} className={S.inside(x, y) ? 'c-pt-in' : 'c-pt-out'} />
          ))}
        </svg>
        <div className="c-demo-body">
          <div className="c-actions">
            <button type="button" className="c-btn c-btn--small" onClick={() => add(10)}>
              +10
            </button>
            <button type="button" className="c-btn c-btn--small" onClick={() => add(100)}>
              +100
            </button>
            <button type="button" className="c-btn c-btn--small" onClick={() => add(1000)}>
              +1000
            </button>
            <button type="button" className="c-btn c-btn--small c-btn--ghost" onClick={() => setPts([])}>
              Сначала
            </button>
          </div>
          <dl className="c-readout">
            <div>
              <dt>Точек N / внутри k</dt>
              <dd>
                {N} / {k}
              </dd>
            </div>
            <div>
              <dt>Оценка площади k / N</dt>
              <dd className="c-theory-text">{N ? f(r3(k / N)) : '—'}</dd>
            </div>
            <div>
              <dt>Точная площадь</dt>
              <dd>{S.exact}</dd>
            </div>
            {shape === 'circle' ? (
              <div>
                <dt>Оценка π = 4k / N</dt>
                <dd>{N ? f(r3((4 * k) / N)) : '—'}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      </div>
      <p className="c-widget-note">Квадрат имеет площадь 1, поэтому площадь фигуры — просто доля точек внутри. Формула фигуры для этого не нужна.</p>
    </div>
  );
}

/* ---------- 4.3 ---------- */

/** Калькулятор: сколько точек нужно для заданной точности оценки π. */
export function PointsBudgetDemo() {
  const [digits, setDigits] = useState(2);
  const sigma1 = 4 * Math.sqrt((Math.PI / 4) * (1 - Math.PI / 4)); // σ одной точки для оценки 4·I
  const target = 0.5 * 10 ** -digits; // половина единицы последнего знака
  const need = Math.ceil(((2 * sigma1) / target) ** 2);
  return (
    <div className="c-demo-body">
      <Slider label="Верных знаков после запятой у π" value={digits} min={1} max={5} onChange={setDigits} />
      <Bars
        label="Нужное число точек для 1–5 знаков (логарифмическая шкала)"
        max={12}
        format={(v) => `10^${f(r2(v))}`}
        items={[1, 2, 3, 4, 5].map((d) => ({
          label: `${d} зн.`,
          value: Math.log10(((2 * sigma1) / (0.5 * 10 ** -d)) ** 2),
          tone: d === digits ? ('theory' as const) : ('muted' as const),
        }))}
      />
      <p className="c-status" role="status">
        Чтобы с вероятностью 95 % ошибка была меньше {f(target)}, нужно около {need.toLocaleString('ru-RU')} точек. Каждый новый знак — в 100 раз
        больше точек.
      </p>
    </div>
  );
}

/* ---------- 4.4 ---------- */

const EVENTS = {
  seven: { label: 'Сумма = 7', test: (a: number, b: number) => a + b === 7 },
  double: { label: 'Дубль', test: (a: number, b: number) => a === b },
  big: { label: 'Сумма ≥ 10', test: (a: number, b: number) => a + b >= 10 },
  six: { label: 'Есть шестёрка', test: (a: number, b: number) => a === 6 || b === 6 },
} as const;
type EventKey = keyof typeof EVENTS;

/** Индикатор события на двух кубиках: таблица 36 исходов и среднее из нулей и единиц. */
export function DiceIndicatorDemo() {
  const [ev, setEv] = useState<EventKey>('seven');
  const [rolls, setRolls] = useState<[number, number][]>([]);
  const E = EVENTS[ev];
  const exact = Array.from({ length: 36 }, (_, i) => E.test(1 + Math.floor(i / 6), 1 + (i % 6))).filter(Boolean).length;
  const die = () => 1 + Math.floor(Math.random() * 6);
  const add = (count: number) => setRolls([...rolls, ...Array.from({ length: count }, () => [die(), die()] as [number, number])].slice(-50000));
  const ones = rolls.filter(([a, b]) => E.test(a, b)).length;
  const last = rolls.slice(-12);
  return (
    <div className="c-demo-body">
      <div className="c-segmented" role="group" aria-label="Событие A">
        {(Object.keys(EVENTS) as EventKey[]).map((key) => (
          <button key={key} type="button" className="c-toggle" aria-pressed={ev === key} onClick={() => { setEv(key); setRolls([]); }}>
            {EVENTS[key].label}
          </button>
        ))}
      </div>
      <div className="c-demo-split">
        <div className="c-grid36" aria-label={`Исходы, где I = 1: ${exact} из 36`}>
          <span className="c-grid36-head" />
          {[1, 2, 3, 4, 5, 6].map((b) => (
            <span key={b} className="c-grid36-head">
              {b}
            </span>
          ))}
          {[1, 2, 3, 4, 5, 6].map((a) => [
            <span key={`h${a}`} className="c-grid36-head">
              {a}
            </span>,
            ...[1, 2, 3, 4, 5, 6].map((b) => (
              <span key={`${a}${b}`} className={E.test(a, b) ? 'c-grid36-on' : ''}>
                {E.test(a, b) ? 1 : 0}
              </span>
            )),
          ])}
        </div>
        <div className="c-demo-body">
          <div className="c-actions">
            <button type="button" className="c-btn c-btn--small" onClick={() => add(1)}>
              Бросить
            </button>
            <button type="button" className="c-btn c-btn--small" onClick={() => add(1000)}>
              +1000
            </button>
          </div>
          <div className="c-chips" aria-label="Последние значения индикатора">
            {last.map(([a, b], i) => (
              <span key={i} className={'c-chip c-chip--static' + (E.test(a, b) ? ' c-chip--hot' : '')} title={`${a} и ${b}`}>
                {E.test(a, b) ? 1 : 0}
              </span>
            ))}
          </div>
          <dl className="c-readout">
            <div>
              <dt>Точно P(A)</dt>
              <dd>
                {exact} / 36 = {f(r3(exact / 36))}
              </dd>
            </div>
            <div>
              <dt>Среднее индикаторов</dt>
              <dd className="c-theory-text">{rolls.length ? `${ones} / ${rolls.length} = ${f(r3(ones / rolls.length))}` : '—'}</dd>
            </div>
          </dl>
        </div>
      </div>
      <p className="c-widget-note">Малиновые клетки — исходы, где I = 1. Вероятность — доля таких клеток, а среднее нулей и единиц из бросков сходится к ней.</p>
    </div>
  );
}
