import { SpatialView } from '../components/SpatialPlot';
import { silhouetteScene } from '../lib/experimentScenes';
import { drawBall, useSprites, type Sprites } from '../course/sprites';
import { useEffect, useRef, useState } from 'react';
import { LineChart, RangeField, RunControls, Segmented } from '../components/Charts';
import { useFrameLoop } from '../hooks/useFrameLoop';
import { formatInteger, formatOneDecimal } from '../lib/format';
import { createRng, newSeed } from '../lib/random';
import {
  SILHOUETTE_SIZE,
  Throws,
  circleMask,
  emptyMask,
  maskShare,
  ringMask,
  starMask,
  stroke,
  type Mask,
} from '../lib/silhouette';

const VIEW = 480;
const MAX_POINTS = 1_000_000;
const percent = (share: number) => `${formatOneDecimal(share * 100)} %`;
const pointSize = (index: number) => (index < 2000 ? 4 : index < 20000 ? 3 : 2);

/** Слой точек: новые точки дорисовываются к уже нарисованным, поэтому даже миллион бросков не тормозит. */
interface PointsLayer {
  canvas: HTMLCanvasElement;
  throws: Throws | null;
  drawn: number;
  withSprites: boolean;
}

/** Первые точки рисуются шариками-деталями из Blender: стекло внутри фигуры, графит снаружи. */
const SPRITE_POINTS = 2000;

function syncPoints(layer: PointsLayer, throws: Throws | null, sprites: Sprites | null) {
  const context = layer.canvas.getContext('2d');
  if (!context) return;
  // Детали догрузились после первых точек — перерисовываем слой целиком.
  if (sprites && !layer.withSprites) {
    layer.withSprites = true;
    layer.throws = null;
  }
  if (layer.throws !== throws) {
    context.clearRect(0, 0, VIEW, VIEW);
    layer.throws = throws;
    layer.drawn = 0;
  }
  if (!throws) return;
  for (let index = layer.drawn; index < throws.total; index += 1) {
    const x = throws.xs[index] * VIEW;
    const y = throws.ys[index] * VIEW;
    if (sprites && index < SPRITE_POINTS) {
      drawBall(context, throws.inside[index] ? sprites.ballGlass : sprites.ballGraphite, x, y, index < 200 ? 5 : 3.5);
      continue;
    }
    const size = pointSize(index);
    context.fillStyle = throws.inside[index] ? '#6b7bff' : '#7a7a88';
    context.fillRect(x - size / 2, y - size / 2, size, size);
  }
  layer.drawn = throws.total;
}

function maskImage(mask: Mask, drawing: boolean): HTMLCanvasElement {
  const buffer = document.createElement('canvas');
  buffer.width = SILHOUETTE_SIZE;
  buffer.height = SILHOUETTE_SIZE;
  const context = buffer.getContext('2d');
  if (!context) return buffer;
  const image = context.createImageData(SILHOUETTE_SIZE, SILHOUETTE_SIZE);
  const [r, g, b] = drawing ? [243, 247, 255] : [74, 92, 255];
  for (let index = 0; index < mask.length; index += 1) {
    if (!mask[index]) continue;
    image.data[index * 4] = r;
    image.data[index * 4 + 1] = g;
    image.data[index * 4 + 2] = b;
    image.data[index * 4 + 3] = drawing ? 255 : 70;
  }
  context.putImageData(image, 0, 0);
  return buffer;
}

export function Silhouette({ active }: { active: boolean }) {
  const [phase, setPhase] = useState<'draw' | 'throw'>('draw');
  const [tool, setTool] = useState<'brush' | 'eraser'>('brush');
  const [brush, setBrush] = useState(10);
  const [hideMask, setHideMask] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [seed, setSeed] = useState(newSeed);
  const [, setVersion] = useState(0);
  const maskRef = useRef<Mask>(ringMask());
  const maskVersion = useRef(1);
  const experimentVersion = useRef(0);
  const throwsRef = useRef<Throws | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sprites = useSprites();
  const layerRef = useRef<PointsLayer | null>(null);
  const last = useRef<[number, number] | null>(null);
  const maskCache = useRef<{ mask: Mask; drawing: boolean; version: number; image: HTMLCanvasElement } | null>(null);
  const refresh = () => setVersion((value) => value + 1);

  const throws = throwsRef.current;
  const drawing = phase === 'draw';
  const mask = !drawing && throws ? throws.mask : maskRef.current;
  const trueShare = maskShare(mask);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    if (!layerRef.current) {
      const layerCanvas = document.createElement('canvas');
      layerCanvas.width = VIEW;
      layerCanvas.height = VIEW;
      layerRef.current = { canvas: layerCanvas, throws: null, drawn: 0, withSprites: false };
    }
    const styles = getComputedStyle(canvas);
    context.fillStyle = styles.getPropertyValue('--deep').trim() || '#071530';
    context.fillRect(0, 0, VIEW, VIEW);
    if (drawing || !hideMask) {
      const cache = maskCache.current;
      if (!cache || cache.mask !== mask || cache.drawing !== drawing || cache.version !== maskVersion.current) {
        maskCache.current = { mask, drawing, version: maskVersion.current, image: maskImage(mask, drawing) };
      }
      context.imageSmoothingEnabled = false;
      context.drawImage((maskCache.current as { image: HTMLCanvasElement }).image, 0, 0, VIEW, VIEW);
    }
    if (!drawing) {
      syncPoints(layerRef.current, throws, sprites);
      context.drawImage(layerRef.current.canvas, 0, 0);
    }
    if (sprites) {
      // Поле броска в хромовой рамке-детали (маска рисовалась без сглаживания — рамке оно нужно).
      context.imageSmoothingEnabled = true;
      context.drawImage(sprites.frameWide, 0, 0, VIEW, VIEW);
    } else {
      context.strokeStyle = styles.getPropertyValue('--paper').trim() || '#f3f7ff';
      context.globalAlpha = 0.4;
      context.strokeRect(0.5, 0.5, VIEW - 1, VIEW - 1);
      context.globalAlpha = 1;
    }
  });

  const setMask = (next: Mask) => {
    maskRef.current = next;
    maskVersion.current += 1;
    refresh();
  };

  const toMask = (event: React.PointerEvent<HTMLCanvasElement>): [number, number] => {
    const rect = event.currentTarget.getBoundingClientRect();
    return [((event.clientX - rect.left) / rect.width) * SILHOUETTE_SIZE, ((event.clientY - rect.top) / rect.height) * SILHOUETTE_SIZE];
  };

  const paintAt = (point: [number, number]) => {
    stroke(maskRef.current, last.current ?? point, point, brush, tool === 'brush' ? 1 : 0);
    last.current = point;
    maskVersion.current += 1;
    refresh();
  };

  const startExperiment = (nextSeed: number = seed, force = false) => {
    // Если рисунок не менялся, продолжаем прежний опыт; новый рисунок — новый опыт.
    if (force || !throwsRef.current || experimentVersion.current !== maskVersion.current) {
      throwsRef.current = new Throws(Uint8Array.from(maskRef.current), createRng(nextSeed));
      experimentVersion.current = maskVersion.current;
    }
    setPhase('throw');
    setPlaying(false);
    refresh();
  };

  const add = (count: number) => {
    const current = throwsRef.current;
    if (!current) return;
    current.add(Math.min(count, MAX_POINTS - current.total));
    refresh();
  };

  useFrameLoop(active && playing && !drawing, () => {
    const current = throwsRef.current;
    if (!current || current.total >= MAX_POINTS) {
      setPlaying(false);
      return;
    }
    // Автозапуск ускоряется: сначала видны отдельные точки, потом — общая картина.
    add(Math.min(5000, Math.max(5, Math.floor(current.total * 0.02))));
  });

  const total = throws?.total ?? 0;
  const hits = throws?.hits ?? 0;
  // Не больше 600 точек графика: берём их прямо по номерам бросков, не обходя весь массив.
  const sampleCount = Math.min(600, total);
  const estimatePoints = throws
    ? Array.from({ length: sampleCount }, (_, k) => {
        const index = sampleCount === 1 ? 0 : Math.round((k * (total - 1)) / (sampleCount - 1));
        return [index + 1, throws.estimates[index]] as const;
      })
    : [];

  return (
    <section className="experiment experiment--silhouette" id="panel-silhouette" hidden={!active}>
      <div className="experiment-head">
        <h2>Нарисуй силуэт точками</h2>
        <p className="action-line" data-testid="silhouette-action">
          {drawing
            ? 'Нарисуй фигуру кистью или выбери готовую, затем нажми «Начать опыт».'
            : 'Бросай случайные точки. Синие стеклянные попали внутрь силуэта. Можно ли по ним оценить площадь рисунка?'}
        </p>
      </div>

      <div className="viz-column">
        <div className="silhouette-canvas">
          <canvas
            ref={canvasRef}
            width={VIEW}
            height={VIEW}
            data-testid="silhouette-canvas"
            className={drawing ? 'silhouette-draw' : undefined}
            role="img"
            aria-label={drawing ? 'Холст для рисования силуэта' : `Броски точек: ${hits} внутри из ${total}`}
            onPointerDown={(event) => {
              if (!drawing) return;
              event.currentTarget.setPointerCapture(event.pointerId);
              last.current = null;
              paintAt(toMask(event));
            }}
            onPointerMove={(event) => {
              if (!drawing || last.current === null) return;
              paintAt(toMask(event));
            }}
            onPointerUp={() => {
              last.current = null;
            }}
            onPointerCancel={() => {
              last.current = null;
            }}
          />
          {!drawing ? (
            <p className="chart-legend silhouette-legend">
              <span className="legend-swatch legend-swatch--in">● внутри силуэта</span>
              <span className="legend-swatch legend-swatch--out">■ снаружи</span>
              {!hideMask ? <span className="legend-swatch legend-swatch--mask">▒ исходный рисунок</span> : null}
            </p>
          ) : null}
        </div>
        <SpatialView title="Слои попаданий" label="Слои попаданий" active={active}
          caption="Точки внутри фигуры подняты над основанием, промахи лежат внизу. На сцене показано до 1600 точек."
          build={() => silhouetteScene(mask, drawing ? null : throws, !drawing && hideMask)} />
        {!drawing ? (
          <div className="viz-secondary">
            <LineChart
              series={[
                { points: estimatePoints, className: 'series-amber', label: 'Оценка: внутри ÷ всего' },
                { points: [[1, trueShare], [Math.max(2, total), trueShare]], className: 'series-cyan', label: `Точная доля по маске ${percent(trueShare)}`, kind: 'dashed' },
              ]}
              xDomain={[1, Math.max(2, total)]}
              yDomain={[0, 1]}
              xLabel="Число брошенных точек"
              yLabel="Оценка доли площади"
              formatX={formatInteger}
              formatY={(value) => `${formatInteger(Math.round(value * 100))} %`}
              ariaLabel="Как меняется оценка доли площади по мере бросков"
            />
          </div>
        ) : null}
      </div>

      <div className="side-column">
        {drawing ? (
          <>
            <Segmented
              legend="Инструмент"
              options={[
                { value: 'brush', label: 'Кисть' },
                { value: 'eraser', label: 'Ластик' },
              ]}
              value={tool}
              onChange={setTool}
            />
            <RangeField id="brush-size" label="Размер кисти" value={brush} min={2} max={30} onChange={setBrush} display={String(brush)} />
            <fieldset className="segmented">
              <legend>Готовые формы</legend>
              <div className="segmented-options">
                <button className="chip" type="button" onClick={() => setMask(circleMask())}>
                  Круг
                </button>
                <button className="chip" type="button" onClick={() => setMask(starMask())}>
                  Звезда
                </button>
                <button className="chip" type="button" onClick={() => setMask(ringMask())}>
                  Кольцо
                </button>
                <button className="chip" type="button" onClick={() => setMask(emptyMask())}>
                  Очистить
                </button>
              </div>
            </fieldset>
            <p className="hint" data-testid="silhouette-painted">
              Закрашено {percent(trueShare)} холста. Можно рисовать фигуры с отверстиями — ластиком.
            </p>
            <button className="btn btn--primary" type="button" onClick={() => startExperiment()} data-testid="silhouette-start">
              Начать опыт
            </button>
          </>
        ) : (
          <>
            <div className="estimate-panel" data-testid="silhouette-panel">
              <p className={total === 0 ? 'estimate-value estimate-value--empty' : 'estimate-value'} data-testid="silhouette-estimate">
                {total === 0 ? 'Пока нет точек' : percent(hits / total)}
              </p>
              <p className="estimate-label">Оценка площади</p>
              <p className="estimate-line" data-testid="silhouette-ratio">
                Внутри фигуры — <span className="estimate-number" data-testid="silhouette-hits">{formatInteger(hits)}</span>{' '}
                из <span className="estimate-number" data-testid="silhouette-total">{formatInteger(total)}</span> точек
              </p>
              <p className="estimate-line" data-testid="silhouette-truth">
                По маске — <span className="estimate-number">{percent(trueShare)}</span>
              </p>
            </div>
            <div className="actions actions--four">
              {[10, 100, 1000, 10000].map((count) => (
                <button key={count} className="btn" type="button" onClick={() => add(count)} disabled={total >= MAX_POINTS}>
                  +{formatInteger(count)}
                </button>
              ))}
            </div>
            <button className="btn btn--primary" type="button" onClick={() => setPlaying(!playing)} disabled={total >= MAX_POINTS}>
              {playing ? 'Пауза' : 'Автозапуск'}
            </button>
            <label className="check">
              <input type="checkbox" checked={hideMask} onChange={(event) => setHideMask(event.target.checked)} data-testid="silhouette-hide" />
              <span>Скрыть исходный рисунок</span>
            </label>
            <button
              className="btn btn--quiet"
              type="button"
              onClick={() => {
                setPlaying(false);
                setPhase('draw');
              }}
            >
              Вернуться к рисованию
            </button>
            <RunControls
              seed={seed}
              onRepeat={() => startExperiment(seed, true)}
              onNew={() => {
                const next = newSeed();
                setSeed(next);
                startExperiment(next, true);
              }}
            />
            <details className="more">
              <summary>Почему точки измеряют площадь</summary>
              <div className="more-body">
                <p>
                  Каждая точка падает в любое место квадрата с равными шансами, поэтому вероятность попасть внутрь силуэта
                  равна доле площади, которую он занимает. Доля попаданий — оценка этой вероятности (метод Монте-Карло).
                </p>
                <p>
                  Ошибка оценки обычно порядка √(p(1 − p)/n): при 1000 точках и доле около 30&nbsp;% — примерно 1,5 процентного
                  пункта. Чтобы уменьшить ошибку вдвое, нужно вчетверо больше точек.
                </p>
              </div>
            </details>
          </>
        )}
      </div>
    </section>
  );
}
