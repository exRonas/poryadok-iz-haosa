import { SpatialView } from '../components/SpatialPlot';
import { triangleScene } from '../lib/experimentScenes';
import ballChrome from '../course/sprites/ball-chrome.webp';
import ballGlass from '../course/sprites/ball-glass.webp';
import ballTheory from '../course/sprites/ball-theory.webp';
import { useEffect, useRef, useState } from 'react';
import { RangeField, RunControls, Segmented } from '../components/Charts';
import { Readouts } from '../components/Readouts';
import { Reveal } from '../components/Reveal';
import { useFrameLoop } from '../hooks/useFrameLoop';
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  CHECKPOINTS,
  CLASSIC_FRACTION,
  COMPARE_WEIGHTS,
  ChaosRun,
  EQUAL_WEIGHTS,
  SKEWED_WEIGHTS,
  VERTEX_NAMES,
  VERTICES,
  describePattern,
  parseWeights,
  patternName,
  toProbabilities,
  type Triple,
  type VertexIndex,
} from '../lib/chaosGame';
import { downloadBlob } from '../lib/csv';
import { DENSITY_STOPS, DensityMap, ORDER_STOPS, cssGradient, type ColorMode } from '../lib/densityMap';
import { formatInteger, formatShare, formatStatistic } from '../lib/format';
import { createRng, newSeed } from '../lib/random';

type Draft = [string, string, string];

const SPEEDS = [
  { label: 'Медленно', stepsPerSecond: 8 },
  { label: 'Средне', stepsPerSecond: 800 },
  { label: 'Быстро', stepsPerSecond: 12000 },
] as const;

const PRESETS: readonly { label: string; draft: Draft }[] = [
  { label: 'Равные шансы', draft: ['1', '1', '1'] },
  { label: '60/30/10', draft: ['60', '30', '10'] },
  { label: '0/1/1', draft: ['0', '1', '1'] },
];

const COLOR_MODES = [
  { value: 'vertex', label: 'По вершине' },
  { value: 'density', label: 'По плотности' },
  { value: 'order', label: 'По порядку' },
] as const;

const COMPARE_STEPS = [5000, 20000, 100000] as const;
const VERTEX_INDEXES = [0, 1, 2] as const;
const LABEL_OFFSETS = [
  { x: 34, y: 8 },
  { x: -2, y: 30 },
  { x: 2, y: 30 },
] as const;

interface Snapshot {
  steps: number;
  counts: Triple;
  x: number;
  y: number;
  previousX: number;
  previousY: number;
  lastVertex: VertexIndex | null;
  countsAtThirty: Triple | null;
  checkpoints: Partial<Record<number, Triple>>;
}

const takeSnapshot = (run: ChaosRun): Snapshot => ({
  steps: run.steps,
  counts: [...run.counts],
  x: run.x,
  y: run.y,
  previousX: run.previousX,
  previousY: run.previousY,
  lastVertex: run.lastVertex,
  countsAtThirty: run.countsAtThirty,
  checkpoints: { ...run.checkpoints },
});

const shares = (counts: Triple) => {
  const total = counts[0] + counts[1] + counts[2];
  return VERTEX_INDEXES.map((index) => (total === 0 ? '—' : formatShare(counts[index] / total))).join(' · ');
};

function ColorLegend({ mode }: { mode: ColorMode }) {
  if (mode === 'vertex') {
    return (
      <p className="color-legend" data-testid="color-legend">
        {VERTEX_INDEXES.map((index) => (
          <span key={index} className={`vertex-${index}`}>
            ● точка после выбора {VERTEX_NAMES[index]}
          </span>
        ))}
        <span className="hint">яркость растёт с числом попаданий</span>
      </p>
    );
  }
  return (
    <div className="color-legend" data-testid="color-legend">
      <span>{mode === 'density' ? 'мало попаданий' : 'ранние шаги'}</span>
      <i className="gradient-bar" style={{ background: cssGradient(mode === 'density' ? DENSITY_STOPS : ORDER_STOPS) }} />
      <span>{mode === 'density' ? 'много (логарифмическая шкала)' : 'поздние шаги'}</span>
    </div>
  );
}

/** Сохраняет рисунок в PNG: фон, точки, контур треугольника и подписи вершин. */
function exportPng(canvas: HTMLCanvasElement | null, title: string) {
  if (!canvas) return;
  const out = document.createElement('canvas');
  out.width = canvas.width;
  out.height = canvas.height + 40;
  const context = out.getContext('2d');
  if (!context) return;
  const styles = getComputedStyle(canvas);
  context.fillStyle = styles.getPropertyValue('--deep').trim() || '#071530';
  context.fillRect(0, 0, out.width, out.height);
  context.drawImage(canvas, 0, 0);
  context.strokeStyle = styles.getPropertyValue('--rule-strong').trim() || '#7d97c2';
  context.lineWidth = 2;
  context.beginPath();
  VERTICES.forEach((vertex, index) => (index === 0 ? context.moveTo(vertex.x, vertex.y) : context.lineTo(vertex.x, vertex.y)));
  context.closePath();
  context.stroke();
  context.fillStyle = '#f3f7ff';
  context.font = '600 22px sans-serif';
  VERTEX_INDEXES.forEach((index) => {
    context.textAlign = index === 2 ? 'right' : 'left';
    context.fillText(VERTEX_NAMES[index], VERTICES[index].x + LABEL_OFFSETS[index].x, VERTICES[index].y + LABEL_OFFSETS[index].y);
  });
  context.textAlign = 'left';
  context.font = '500 18px sans-serif';
  context.fillText(title, 16, out.height - 14);
  out.toBlob((blob) => {
    if (blob) downloadBlob('igra-haosa.png', blob);
  }, 'image/png');
}

/* ---------- Сравнение двух рисунков ---------- */

function CompareSide({
  weights,
  draft,
  onDraft,
  map,
  counts,
  sharedMax,
  mode,
  side,
  active,
  reliefMax,
}: {
  weights: Triple;
  draft: Draft;
  onDraft: (draft: Draft) => void;
  map: DensityMap;
  counts: Triple;
  sharedMax: number;
  mode: ColorMode;
  side: 'left' | 'right';
  active: boolean;
  reliefMax: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const parsed = parseWeights(draft);
  useEffect(() => {
    const context = canvasRef.current?.getContext('2d');
    if (context) map.draw(context, mode, mode === 'density' ? sharedMax : undefined);
  }, [map, mode, sharedMax]);
  return (
    <figure className="compare-item" data-testid={`compare-${side}`}>
      <SpatialView title={'Веса '+weights.join(' · ')} label={'Плотность при весах '+weights.join(' · ')} active={active}
        caption="Высота на общей шкале двух рисунков." build={() => triangleScene(map, mode, reliefMax)}>
        <canvas ref={canvasRef} width={CANVAS_WIDTH / 2} height={CANVAS_HEIGHT / 2} role="img" aria-label={`Рисунок при весах ${weights.join(':')}`} />
      </SpatialView>
      <figcaption>
        <div className="weights weights--compact">
          {VERTEX_INDEXES.map((index) => (
            <label key={index} className={`vertex-${index}`}>
              {VERTEX_NAMES[index]}
              <input
                className="input input--short"
                type="text"
                inputMode="decimal"
                value={draft[index]}
                aria-invalid={!parsed.ok}
                onChange={(event) => {
                  const next: Draft = [...draft];
                  next[index] = event.target.value;
                  onDraft(next);
                }}
              />
            </label>
          ))}
        </div>
        {!parsed.ok ? <span className="hint hint--error">{parsed.error}</span> : null}
        <span data-testid={`compare-${side}-shares`}>
          Фактические доли A · B · C: {shares(counts)}
        </span>
        <span className="hint">Заданные: {toProbabilities(weights).map(formatShare).join(' · ')}</span>
      </figcaption>
    </figure>
  );
}

function buildCompare(weights: Triple, steps: number, seed: number, fraction: number) {
  const map = new DensityMap(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 1, 0.5);
  const run = new ChaosRun(weights, createRng(seed), fraction);
  for (let step = 0; step < steps; step += 1) {
    const vertex = run.step();
    map.add(run.x, run.y, vertex);
  }
  return { map, counts: [...run.counts] as unknown as Triple };
}

function CompareMode({ fraction, mode, active }: { fraction: number; mode: ColorMode; active: boolean }) {
  const [left, setLeft] = useState<Draft>(['1', '1', '1']);
  const [right, setRight] = useState<Draft>(COMPARE_WEIGHTS.map(String) as Draft);
  const [leftWeights, setLeftWeights] = useState<Triple>(EQUAL_WEIGHTS);
  const [rightWeights, setRightWeights] = useState<Triple>(COMPARE_WEIGHTS);
  const [steps, setSteps] = useState<number>(20000);
  const [seed, setSeed] = useState(newSeed);
  const [result, setResult] = useState(() => ({
    left: buildCompare(EQUAL_WEIGHTS, 20000, seed, fraction),
    right: buildCompare(COMPARE_WEIGHTS, 20000, seed, fraction),
  }));

  useEffect(() => {
    setResult({ left: buildCompare(leftWeights, steps, seed, fraction), right: buildCompare(rightWeights, steps, seed, fraction) });
  }, [leftWeights, rightWeights, steps, seed, fraction]);

  const onDraft = (side: 'left' | 'right') => (draft: Draft) => {
    (side === 'left' ? setLeft : setRight)(draft);
    const parsed = parseWeights(draft);
    if (parsed.ok) (side === 'left' ? setLeftWeights : setRightWeights)(parsed.weights);
  };
  const sharedMax = Math.max(result.left.map.maxCount, result.right.map.maxCount);
  const reliefMax = Math.max(...result.left.map.relief, ...result.right.map.relief);

  return (
    <section className="compare-mode" data-testid="compare-mode" aria-labelledby="compare-title">
      <h3 id="compare-title">Сравнить два рисунка</h3>
      <p className="hint">
        У обеих сторон одинаковые старт в A, число шагов, t и одна и та же последовательность случайных чисел (seed {seed}).
        Отличаются только веса. {mode === 'density' ? 'Карты плотности используют общую шкалу яркости.' : ''}
      </p>
      <div className="compare">
        <CompareSide side="left" weights={leftWeights} draft={left} onDraft={onDraft('left')} map={result.left.map} counts={result.left.counts} sharedMax={sharedMax} mode={mode} active={active} reliefMax={reliefMax} />
        <CompareSide side="right" weights={rightWeights} draft={right} onDraft={onDraft('right')} map={result.right.map} counts={result.right.counts} sharedMax={sharedMax} mode={mode} active={active} reliefMax={reliefMax} />
      </div>
      <ColorLegend mode={mode} />
      <Segmented
        legend="Шагов на каждой стороне"
        options={COMPARE_STEPS.map((value) => ({ value, label: formatInteger(value) }))}
        value={steps}
        onChange={setSteps}
      />
      <RunControls
        seed={seed}
        onRepeat={() => setResult({ left: buildCompare(leftWeights, steps, seed, fraction), right: buildCompare(rightWeights, steps, seed, fraction) })}
        onNew={() => setSeed(newSeed())}
        note="При одинаковых весах обе стороны дают одинаковый рисунок."
      />
    </section>
  );
}

/* ---------- Основной опыт ---------- */

export function SierpinskiTriangle({ active }: { active: boolean }) {
  const [applied, setApplied] = useState<Triple>(EQUAL_WEIGHTS);
  const [draft, setDraft] = useState<Draft>(['1', '1', '1']);
  const [fraction, setFraction] = useState(CLASSIC_FRACTION);
  const [running, setRunning] = useState(false);
  const [speedIndex, setSpeedIndex] = useState(1);
  const [mode, setMode] = useState<ColorMode>('vertex');
  const [compare, setCompare] = useState(false);
  const [seed, setSeed] = useState(newSeed);
  const [map] = useState(() => new DensityMap(CANVAS_WIDTH, CANVAS_HEIGHT, 2));

  const runRef = useRef<ChaosRun | null>(null);
  runRef.current ??= new ChaosRun(EQUAL_WEIGHTS, createRng(seed), CLASSIC_FRACTION);
  const [snapshot, setSnapshot] = useState<Snapshot>(() => takeSnapshot(runRef.current as ChaosRun));

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stepBank = useRef(0);
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const parsed = parseWeights(draft);
  const draftProbabilities = parsed.ok ? toProbabilities(parsed.weights) : null;
  const appliedProbabilities = toProbabilities(applied);
  const isDirty = !parsed.ok || parsed.weights.some((weight, index) => weight !== applied[index]);
  const speed = SPEEDS[speedIndex].stepsPerSecond;

  const paint = () => {
    const context = canvasRef.current?.getContext('2d');
    if (context) map.draw(context, modeRef.current);
  };

  // Переключение окраски перекрашивает накопленный рисунок.
  useEffect(paint, [mode, map, compare]);

  const advance = (count: number) => {
    const run = runRef.current as ChaosRun;
    for (let index = 0; index < count; index += 1) {
      const vertex = run.step();
      map.add(run.x, run.y, vertex);
    }
    paint();
    setSnapshot(takeSnapshot(run));
  };

  const startExperiment = (weights: Triple, nextFraction: number, nextSeed: number) => {
    setRunning(false);
    stepBank.current = 0;
    map.clear();
    paint();
    const run = new ChaosRun(weights, createRng(nextSeed), nextFraction);
    runRef.current = run;
    setSnapshot(takeSnapshot(run));
  };

  const applySettings = () => {
    if (!parsed.ok) return;
    setApplied(parsed.weights);
    startExperiment(parsed.weights, fraction, seed);
  };

  const changeFraction = (value: number) => {
    setFraction(value);
    startExperiment(applied, value, seed);
  };

  const newRun = () => {
    const next = newSeed();
    setSeed(next);
    startExperiment(applied, fraction, next);
  };

  useFrameLoop(active && running && !compare, (elapsed) => {
    stepBank.current += (elapsed * speed) / 1000;
    const count = Math.floor(stepBank.current);
    if (count === 0) return;
    stepBank.current -= count;
    advance(count);
  });

  const showMove = snapshot.lastVertex !== null && (!running || speed <= SPEEDS[0].stepsPerSecond);
  const moveTarget = snapshot.lastVertex !== null ? VERTICES[snapshot.lastVertex] : null;
  const name = patternName(fraction);

  let status: string;
  if (snapshot.steps === 0) status = 'Старт в вершине A. Сделайте шаг или запустите построение.';
  else if (running) status = 'Идёт построение.';
  else if (snapshot.lastVertex !== null)
    status = `Шаг ${formatInteger(snapshot.steps)}: выбрана вершина ${VERTEX_NAMES[snapshot.lastVertex]}. Новая точка стоит на доле t = ${formatStatistic(fraction)} пути от предыдущей точки к вершине.`;
  else status = '';

  return (
    <section className="experiment" id="panel-triangle" hidden={!active}>
      <div className="experiment-head">
        <h2>Треугольник Серпинского</h2>
        <p className="action-line">Нажми «Запустить» и смотри, как из случайных шагов складывается узор.</p>
      </div>

      <div className="viz-column">
        <div className="viz-pin">
          <div className="picture-toolbar">
            <Segmented legend="Окраска" options={COLOR_MODES} value={mode} onChange={setMode} />
            <Segmented
              legend="Режим"
              options={[
                { value: 'single', label: 'Один рисунок' },
                { value: 'compare', label: 'Сравнить два' },
              ]}
              value={compare ? 'compare' : 'single'}
              onChange={(value) => {
                setRunning(false);
                setCompare(value === 'compare');
              }}
            />
          </div>
          {compare ? (
            <CompareMode fraction={fraction} mode={mode} active={active} />
          ) : (
            <>
              <p className="pattern-name" data-testid="pattern-name">
                {name}
              </p>
              <SpatialView title="Плотность фрактала" label="Плотность фрактала" active={active}
                caption="Высота показывает число шагов в участке по логарифмической шкале. Поверните сцену, чтобы сравнить вершины."
                build={() => triangleScene(map, mode)}>
              <div className="triangle">
                <canvas
                  ref={canvasRef}
                  width={CANVAS_WIDTH}
                  height={CANVAS_HEIGHT}
                  role="img"
                  aria-label={`${name}: точки опыта с вершинами A, B и C. Сделано шагов: ${snapshot.steps}.`}
                />
                <svg viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`} aria-hidden="true">
                  <polygon className="triangle-outline" points={VERTICES.map((point) => `${point.x},${point.y}`).join(' ')} />
                  {/* Вершины, текущая и прошлая точки — шарики-детали из Blender. */}
                  {VERTICES.map((point, index) => (
                    <image key={index} href={ballTheory} x={point.x - 11} y={point.y - 11} width={22} height={22} />
                  ))}
                  {showMove && moveTarget ? (
                    <>
                      <line className="triangle-move" x1={snapshot.previousX} y1={snapshot.previousY} x2={moveTarget.x} y2={moveTarget.y} />
                      <circle className="triangle-vertex-pick" cx={moveTarget.x} cy={moveTarget.y} r="14" />
                      <image href={ballChrome} x={snapshot.previousX - 8} y={snapshot.previousY - 8} width={16} height={16} />
                    </>
                  ) : null}
                  <image className="triangle-current-ball" href={ballGlass} x={snapshot.x - 11} y={snapshot.y - 11} width={22} height={22} />
                  {VERTEX_INDEXES.map((index) => (
                    <text
                      key={index}
                      className={`triangle-label vertex-${index}`}
                      x={VERTICES[index].x + LABEL_OFFSETS[index].x}
                      y={VERTICES[index].y + LABEL_OFFSETS[index].y}
                      textAnchor={index === 2 ? 'end' : 'start'}
                    >
                      {VERTEX_NAMES[index]}
                    </text>
                  ))}
                </svg>
              </div>
              </SpatialView>
              <ColorLegend mode={mode} />
              {showMove ? (
                <p className="hint triangle-legend">
                  <span className="dot dot--previous" /> предыдущая точка · <span className="dot dot--vertex" /> выбранная вершина ·{' '}
                  <span className="dot dot--current" /> новая точка
                </p>
              ) : null}
              <p className="status" aria-live={running ? 'off' : 'polite'} data-testid="triangle-status">
                {status}
              </p>
            </>
          )}
        </div>
      </div>

      <div className="side-column">
        {compare ? (
          <>
            <RangeField
              id="chaos-fraction"
              label="Доля пути до вершины t"
              value={fraction}
              min={0.1}
              max={0.9}
              step={0.01}
              onChange={changeFraction}
              display={formatStatistic(fraction)}
              marks={[{ value: 0.5, label: '0,5 — классика' }]}
            />
            <p className="hint">В режиме сравнения веса задаются под каждым рисунком.</p>
          </>
        ) : (
          <>
            <div className="actions actions--four">
              <button className="btn" type="button" disabled={running} onClick={() => advance(1)}>
                1 шаг
              </button>
              <button className="btn btn--primary" type="button" disabled={running} onClick={() => setRunning(true)}>
                {snapshot.steps > 0 ? 'Продолжить' : 'Запустить'}
              </button>
              <button className="btn" type="button" disabled={!running} onClick={() => setRunning(false)}>
                Пауза
              </button>
              <button className="btn btn--quiet" type="button" onClick={newRun}>
                Сбросить
              </button>
            </div>
            <Readouts items={[{ label: 'Шаги', value: formatInteger(snapshot.steps), tone: 'amber', testId: 'triangle-steps' }]} />
            <Segmented
              legend="Скорость построения"
              options={SPEEDS.map((option, index) => ({ value: index, label: option.label }))}
              value={speedIndex}
              onChange={setSpeedIndex}
            />
            <RangeField
              id="chaos-fraction"
              label="Доля пути до вершины t"
              value={fraction}
              min={0.1}
              max={0.9}
              step={0.01}
              onChange={changeFraction}
              display={formatStatistic(fraction)}
              marks={[{ value: 0.5, label: '0,5 — классика' }]}
            />
    
            <fieldset className="settings">
              <legend>Веса вершин</legend>
              <div className="segmented-options">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    className="chip"
                    type="button"
                    aria-pressed={preset.draft.every((value, index) => value === draft[index])}
                    onClick={() => setDraft([...preset.draft])}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <div className="weights">
                {VERTEX_INDEXES.map((index) => (
                  <div className="weight" key={index}>
                    <label htmlFor={`weight-${index}`} className={`vertex-${index}`}>
                      Вес {VERTEX_NAMES[index]}
                    </label>
                    <input
                      id={`weight-${index}`}
                      className="input"
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      value={draft[index]}
                      aria-invalid={!parsed.ok}
                      onChange={(event) => {
                        const next: Draft = [...draft];
                        next[index] = event.target.value;
                        setDraft(next);
                      }}
                    />
                    <output data-testid={`draft-probability-${index}`}>
                      {draftProbabilities ? formatShare(draftProbabilities[index]) : 'нет значения'}
                    </output>
                  </div>
                ))}
              </div>
              {!parsed.ok ? (
                <p className="hint hint--error" role="alert">
                  {parsed.error}
                </p>
              ) : isDirty ? (
                <p className="hint">Новые веса начнут действовать после применения.</p>
              ) : null}
              <button className={parsed.ok && isDirty ? 'btn btn--primary' : 'btn'} type="button" disabled={!parsed.ok} onClick={applySettings}>
                Применить и начать новый опыт
              </button>
            </fieldset>
            <details className="more">
              <summary>Таблицы частот и сохранение PNG</summary>
              <button className="btn" type="button" disabled={snapshot.steps === 0} onClick={() => exportPng(canvasRef.current, `${name}, ${formatInteger(snapshot.steps)} шагов`)}>
                Сохранить рисунок в 2D (PNG)
              </button>
                <div className="table-scroll">
                <table className="data-table">
                  <caption>Вершины в текущем опыте</caption>
                  <thead>
                    <tr>
                      <th scope="col">Вершина</th>
                      <th scope="col">Вероятность</th>
                      <th scope="col">Выборы</th>
                      <th scope="col">Частота</th>
                    </tr>
                  </thead>
                  <tbody>
                    {VERTEX_INDEXES.map((index) => (
                      <tr key={index}>
                        <th scope="row" className={`vertex-${index}`}>
                          {VERTEX_NAMES[index]}
                        </th>
                        <td data-testid={`triangle-probability-${index}`}>{formatShare(appliedProbabilities[index])}</td>
                        <td data-testid={`triangle-count-${index}`}>{formatInteger(snapshot.counts[index])}</td>
                        <td data-testid={`triangle-frequency-${index}`}>
                          {snapshot.steps === 0 ? 'нет данных' : formatShare(snapshot.counts[index] / snapshot.steps)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
  
              <div className="table-scroll">
                <table className="data-table" data-testid="triangle-checkpoints">
                  <caption>Зафиксировано автоматически</caption>
                  <thead>
                    <tr>
                      <th scope="col">После шагов</th>
                      {VERTEX_INDEXES.map((index) => (
                        <th scope="col" key={index}>
                          {VERTEX_NAMES[index]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {CHECKPOINTS.map((step) => {
                      const counts = snapshot.checkpoints[step];
                      return (
                        <tr key={step}>
                          <th scope="row">{formatInteger(step)}</th>
                          {VERTEX_INDEXES.map((index) => (
                            <td key={index}>{counts ? `${counts[index]} (${formatShare(counts[index] / step)})` : '—'}</td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
  
              </details>

            <RunControls seed={seed} onRepeat={() => startExperiment(applied, fraction, seed)} onNew={newRun} />
          </>
        )}
      </div>

      <div className="notes">
        <section className="explain">
          <h3>Что показывает узор</h3>
          <p data-testid="triangle-note">{describePattern(applied, fraction)}</p>
          <p className="hint">
            Сравните два рисунка в режиме «Сравнить два»: у них общий seed, поэтому разница вызвана только весами. Пресет
            60/30/10 — это те же доли, что и {SKEWED_WEIGHTS.join(':')}.
          </p>
        </section>

        <Reveal
          question="Обязана ли вершина с вероятностью 1/3 выпасть ровно 10 раз за 30 шагов?"
          openLabel="Показать ответ"
          closeLabel="Скрыть ответ"
          locked={snapshot.steps === 0}
          lockedHint="Ответ откроется после запуска опыта."
        >
          <p>
            Нет. 10 раз это среднее значение, а не обязательный результат. Ровно 10 выпадений случаются примерно в 15,3&nbsp;%
            опытов, а от 7 до 13 выпадений примерно в 82,6&nbsp;%.
          </p>
          {snapshot.countsAtThirty && applied[0] === applied[1] && applied[1] === applied[2] ? (
            <p data-testid="triangle-thirty">
              В этом опыте за первые 30 шагов: A выпала {snapshot.countsAtThirty[0]}, B выпала {snapshot.countsAtThirty[1]}, C выпала{' '}
              {snapshot.countsAtThirty[2]}.
            </p>
          ) : null}
        </Reveal>
      </div>
    </section>
  );
}
