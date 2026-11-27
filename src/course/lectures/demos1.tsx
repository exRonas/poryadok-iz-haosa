/** Мини-опыты лекций курса 1 «Описательная статистика». */
import { useState } from 'react';
import { formatShare, formatStatistic as f } from '../../lib/format';
import { counts, iqrFences, mean, median, variance } from './lectureMath';
import { Bars, DotLine, Slider } from './parts';

const r2 = (v: number) => Math.round(v * 100) / 100;
const die = () => 1 + Math.floor(Math.random() * 6);

/* ---------- 1.1 ---------- */

/** Кубики: щёлкните по результату, чтобы поменять его, — таблица частот и гистограмма пересчитаются. */
export function FrequencyTableDemo() {
  const [xs, setXs] = useState<number[]>([3, 5, 1, 6, 3, 2, 3, 5, 4, 6, 3, 2]);
  const [relative, setRelative] = useState(false);
  const n = counts(xs, 1, 6);
  const N = xs.length;
  const bump = (i: number) => setXs(xs.map((x, j) => (j === i ? (x % 6) + 1 : x)));
  return (
    <div className="c-demo-body">
      <div className="c-chips" aria-label="Результаты бросков">
        {xs.map((x, i) => (
          <button key={i} type="button" className="c-chip" onClick={() => bump(i)} aria-label={`Бросок ${i + 1}: ${x}. Нажмите, чтобы поменять`}>
            {x}
          </button>
        ))}
      </div>
      <div className="c-actions">
        <button type="button" className="c-btn c-btn--small" onClick={() => setXs([...xs, die()])}>
          + бросок
        </button>
        <button type="button" className="c-btn c-btn--small c-btn--ghost" onClick={() => setXs(xs.slice(0, -1))} disabled={N <= 1}>
          − бросок
        </button>
        <button type="button" className="c-btn c-btn--small c-btn--ghost" onClick={() => setXs(Array.from({ length: 60 }, die))}>
          60 случайных
        </button>
        <button type="button" className="c-toggle" aria-pressed={relative} onClick={() => setRelative(!relative)}>
          {relative ? 'Показаны доли wₖ' : 'Показаны частоты nₖ'}
        </button>
      </div>
      <div className="c-demo-split">
        <table className="c-table">
          <thead>
            <tr>
              <th scope="col">k</th>
              <th scope="col">nₖ</th>
              <th scope="col">wₖ = nₖ / N</th>
            </tr>
          </thead>
          <tbody>
            {n.map((c, k) => (
              <tr key={k}>
                <th scope="row">{k + 1}</th>
                <td>{c}</td>
                <td>
                  {c} / {N} = {f(r2(c / N))}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Σ</th>
              <td>{N}</td>
              <td>1</td>
            </tr>
          </tfoot>
        </table>
        <Bars
          label="Гистограмма частот"
          max={relative ? Math.max(0.35, ...n.map((c) => c / N)) : undefined}
          format={relative ? formatShare : f}
          items={n.map((c, k) => ({ label: k + 1, value: relative ? c / N : c, tone: 'accent' as const }))}
        />
      </div>
      <p className="c-widget-note">Нажмите на любой результат — он увеличится на 1. Сумма nₖ всегда равна N, сумма wₖ — единице.</p>
    </div>
  );
}

/** Рост 30 учеников: ширина интервала меняет вид гистограммы. */
const HEIGHTS = [
  148, 151, 152, 154, 155, 156, 157, 157, 158, 159, 160, 160, 161, 161, 162, 162, 163, 163, 164, 165, 165, 166, 167, 168, 169, 170, 172, 174,
  177, 181,
];
export function BinWidthDemo() {
  const [width, setWidth] = useState(5);
  const from = 145;
  const bins: { label: string; value: number }[] = [];
  for (let a = from; a < 185; a += width) {
    const b = a + width;
    bins.push({ label: `${a}–${b}`, value: HEIGHTS.filter((h) => h >= a && h < b).length });
  }
  const verdict = width <= 2 ? 'Слишком узко: много пустых и «зубчатых» столбиков, форму не видно.' : width >= 15 ? 'Слишком широко: всё слилось в 2–3 столбика, детали потеряны.' : 'Хорошо: видна форма — горб в середине и хвосты по краям.';
  return (
    <div className="c-demo-body">
      <Slider label="Ширина интервала, см" value={width} min={1} max={20} onChange={setWidth} />
      <Bars label="Гистограмма роста 30 учеников" items={bins.map((b) => ({ ...b, tone: 'accent' as const }))} />
      <p className="c-status" role="status">
        {bins.length} {bins.length === 1 ? 'интервал' : 'интервалов'}. {verdict}
      </p>
    </div>
  );
}

/* ---------- 1.2 ---------- */

/** Значения на ползунках: точка равновесия (среднее) и середина ряда (медиана). */
export function MeanMedianDemo() {
  const [xs, setXs] = useState<number[]>([2, 4, 5, 7, 12]);
  const m = mean(xs);
  const me = median(xs);
  const sorted = [...xs].map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const N = xs.length;
  const middle = N % 2 ? [Math.floor(N / 2)] : [N / 2 - 1, N / 2];
  const deviations = xs.map((x) => x - m);
  return (
    <div className="c-demo-body">
      <DotLine
        values={xs}
        min={0}
        max={20}
        step={2}
        label={`Значения ${xs.join(', ')}; среднее ${f(r2(m))}, медиана ${f(me)}`}
        marks={[
          { value: m, label: 'x̄', tone: 'theory' },
          { value: me, label: 'Me', tone: 'white' },
        ]}
      />
      <div className="c-demo-sliders">
        {xs.map((x, i) => (
          <Slider key={i} label={`x${'₁₂₃₄₅₆₇'[i]}`} value={x} min={0} max={20} onChange={(v) => setXs(xs.map((y, j) => (j === i ? v : y)))} />
        ))}
      </div>
      <div className="c-actions">
        <button type="button" className="c-btn c-btn--small" disabled={N >= 7} onClick={() => setXs([...xs, 10])}>
          + значение
        </button>
        <button type="button" className="c-btn c-btn--small c-btn--ghost" disabled={N <= 2} onClick={() => setXs(xs.slice(0, -1))}>
          − значение
        </button>
      </div>
      <p className="c-prose-muted">Упорядоченный ряд (середина подсвечена):</p>
      <div className="c-chips">
        {sorted.map((s, pos) => (
          <span key={s.i} className={'c-chip c-chip--static' + (middle.includes(pos) ? ' c-chip--hot' : '')}>
            {s.v}
          </span>
        ))}
      </div>
      <dl className="c-readout">
        <div>
          <dt>Среднее x̄</dt>
          <dd className="c-theory-text">
            {xs.reduce((a, b) => a + b, 0)} / {N} = {f(r2(m))}
          </dd>
        </div>
        <div>
          <dt>Медиана Me</dt>
          <dd>{N % 2 ? f(me) : `(${sorted[middle[0]].v} + ${sorted[middle[1]].v}) / 2 = ${f(me)}`}</dd>
        </div>
        <div className="c-readout-wide" style={{ gridColumn: '1 / -1' }}>
          <dt>Отклонения от среднего xᵢ − x̄ и их сумма</dt>
          <dd className="c-dd-small">
            {deviations.map((d) => f(r2(d))).join(' + ')} = {f(r2(deviations.reduce((a, b) => a + b, 0)))}
          </dd>
        </div>
      </dl>
      <p className="c-widget-note">Утащите одно значение вправо до 20: среднее поедет за ним, а медиана сдвинется, только если поменяется порядок.</p>
    </div>
  );
}

/** Мода: самое частое значение. Размеры обуви в магазине. */
export function ModeDemo() {
  const sizes = [36, 37, 38, 39, 40, 41, 42];
  const [sold, setSold] = useState([1, 3, 6, 4, 3, 1, 1]);
  const top = Math.max(...sold);
  const modes = sizes.filter((_, i) => sold[i] === top);
  const all = sizes.flatMap((s, i) => Array.from({ length: sold[i] }, () => s));
  return (
    <div className="c-demo-body">
      <Bars
        label="Продажи по размерам"
        items={sizes.map((s, i) => ({ label: s, value: sold[i], tone: sold[i] === top ? ('theory' as const) : ('accent' as const) }))}
      />
      <div className="c-chips">
        {sizes.map((s, i) => (
          <button key={s} type="button" className="c-chip" onClick={() => setSold(sold.map((v, j) => (j === i ? v + 1 : v)))}>
            +1 к {s}
          </button>
        ))}
        <button type="button" className="c-btn c-btn--small c-btn--ghost" onClick={() => setSold([1, 3, 6, 4, 3, 1, 1])}>
          Сбросить
        </button>
      </div>
      <dl className="c-readout">
        <div>
          <dt>Мода</dt>
          <dd className="c-theory-text">{modes.join(' и ')}</dd>
        </div>
        <div>
          <dt>Медиана</dt>
          <dd>{f(median(all))}</dd>
        </div>
        <div>
          <dt>Среднее</dt>
          <dd>{f(r2(mean(all)))}</dd>
        </div>
      </dl>
      <p className="c-widget-note">Магазину нужен самый ходовой размер — мода, а не средний «38,6», которого не бывает в продаже.</p>
    </div>
  );
}

/* ---------- 1.3 ---------- */

/** Две группы с одним средним: растягивайте вторую и смотрите на таблицу отклонений. */
export function SpreadTableDemo() {
  const [k, setK] = useState(2);
  const base = [-2, -1, 0, 1, 2];
  const a = base.map((d) => 10 + d);
  const b = base.map((d) => r2(10 + d * k));
  const m = mean(b);
  const D = variance(b);
  return (
    <div className="c-demo-body">
      <Slider label="Растяжение группы Б" value={k} min={0} max={4} step={0.5} onChange={setK} show={`×${f(k)}`} />
      <DotLine values={a} min={0} max={20} step={2} label="Группа А" marks={[{ value: 10, label: 'x̄ А', tone: 'theory' }]} />
      <DotLine values={b} min={0} max={20} step={2} label="Группа Б" marks={[{ value: m, label: 'x̄ Б', tone: 'theory' }]} />
      <table className="c-table">
        <thead>
          <tr>
            <th scope="col">xᵢ (Б)</th>
            <th scope="col">xᵢ − x̄</th>
            <th scope="col">(xᵢ − x̄)²</th>
          </tr>
        </thead>
        <tbody>
          {b.map((x, i) => (
            <tr key={i}>
              <td>{f(x)}</td>
              <td>{f(r2(x - m))}</td>
              <td>{f(r2((x - m) ** 2))}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Среднее</th>
            <td>0</td>
            <td className="c-theory-text">D = {f(r2(D))}</td>
          </tr>
        </tfoot>
      </table>
      <dl className="c-readout">
        <div>
          <dt>Размах R</dt>
          <dd>
            А: {f(4)} · Б: {f(r2(Math.max(...b) - Math.min(...b)))}
          </dd>
        </div>
        <div>
          <dt>Дисперсия D</dt>
          <dd>
            А: {f(variance(a))} · Б: {f(r2(D))}
          </dd>
        </div>
        <div>
          <dt>σ = √D</dt>
          <dd className="c-theory-text">
            А: {f(r2(Math.sqrt(variance(a))))} · Б: {f(r2(Math.sqrt(D)))}
          </dd>
        </div>
      </dl>
      <p className="c-widget-note">Среднее у обеих групп 10. При растяжении ×2 σ растёт вдвое, а D — вчетверо. При ×0 все значения равны и разброс нулевой.</p>
    </div>
  );
}

/** Правило «σ-коридора»: какая доля значений попадает в x̄ ± σ и x̄ ± 2σ. */
export function SigmaBandDemo() {
  const [c, setC] = useState(1);
  const data = HEIGHTS;
  const m = mean(data);
  const s = Math.sqrt(variance(data));
  const inside = data.filter((h) => Math.abs(h - m) <= c * s).length;
  return (
    <div className="c-demo-body">
      <Slider label="Ширина коридора, в σ" value={c} min={0.5} max={3} step={0.5} onChange={setC} show={`± ${f(c)}σ`} />
      <DotLine
        values={data}
        min={145}
        max={185}
        step={5}
        label={`Рост 30 учеников, коридор x̄ ± ${f(c)}σ`}
        bands={[{ from: m - c * s, to: m + c * s, label: `x̄ ± ${f(c)}σ` }]}
        marks={[{ value: m, label: 'x̄', tone: 'theory' }]}
      />
      <p className="c-status c-status--ok" role="status">
        x̄ = {f(r2(m))} см, σ = {f(r2(s))} см. В коридор попали {inside} из {data.length} — {formatShare(inside / data.length)}.
      </p>
      <p className="c-widget-note">Для «колоколообразных» данных в x̄ ± σ обычно попадает около двух третей значений, в x̄ ± 2σ — почти все.</p>
    </div>
  );
}

/* ---------- 1.4 ---------- */

const SALARIES = [180, 200, 210, 220, 230, 240, 250, 260, 280];

/** Зарплаты в фирме: директор двигает среднее, медиана почти не меняется. */
export function OutlierSalaryDemo() {
  const [boss, setBoss] = useState(300);
  const xs = [...SALARIES, boss];
  const m = mean(xs);
  const me = median(xs);
  const fences = iqrFences(xs);
  const flagged = xs.map((x, i) => (x < fences.low || x > fences.high ? i : -1)).filter((i) => i >= 0);
  const below = xs.filter((x) => x < m).length;
  return (
    <div className="c-demo-body">
      <Slider label="Зарплата директора, тыс." value={boss} min={250} max={3000} step={50} onChange={setBoss} />
      <DotLine
        values={xs}
        min={100}
        max={Math.max(500, Math.ceil((boss * 1.1) / 100) * 100)}
        flagged={flagged}
        label={`Зарплаты 10 сотрудников; среднее ${f(Math.round(m))}, медиана ${f(me)}`}
        bands={[{ from: Math.max(100, fences.low), to: fences.high, label: 'норма по 1,5·IQR' }]}
        marks={[
          { value: m, label: 'x̄', tone: 'theory' },
          { value: me, label: 'Me', tone: 'white' },
        ]}
      />
      <dl className="c-readout">
        <div>
          <dt>Среднее</dt>
          <dd className="c-theory-text">{f(Math.round(m))}</dd>
        </div>
        <div>
          <dt>Медиана</dt>
          <dd>{f(me)}</dd>
        </div>
        <div>
          <dt>Получают меньше среднего</dt>
          <dd>{below} из 10</dd>
        </div>
        <div>
          <dt>Граница выброса Q3 + 1,5·IQR</dt>
          <dd>{f(Math.round(fences.high))}</dd>
        </div>
      </dl>
      <p className={'c-status' + (flagged.length ? '' : ' c-status--ok')} role="status">
        {flagged.length
          ? `Директор — выброс: его зарплата выше границы ${f(Math.round(fences.high))}. Среднее «приукрашивает» типичную зарплату.`
          : 'Выбросов нет: все значения внутри границ, среднее и медиана близки.'}
      </p>
    </div>
  );
}

/** Сила одного выброса падает с ростом N: Δx̄ = Δ / N. */
export function OutlierWeightDemo() {
  const sizes = [2, 5, 10, 20, 50, 100, 200];
  const [at, setAt] = useState(2);
  const n = sizes[at];
  const delta = 100;
  return (
    <div className="c-demo-body">
      <Slider label="Объём выборки N" value={at} min={0} max={sizes.length - 1} onChange={setAt} show={String(n)} />
      <Bars
        label="Сдвиг среднего при ошибке +100 в одном значении"
        max={50}
        items={sizes.map((k) => ({ label: `N=${k}`, value: delta / k, tone: k === n ? ('theory' as const) : ('muted' as const) }))}
      />
      <p className="c-status" role="status">
        Одно значение ошиблось на +100 → среднее сдвинулось на 100 / {n} = {f(r2(delta / n))}. Медиана не сдвинулась вообще.
      </p>
    </div>
  );
}
