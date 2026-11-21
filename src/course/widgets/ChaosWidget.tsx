import { useEffect, useMemo, useRef } from 'react';
import { useElementWidth } from '../../hooks/useElementWidth';
import { CANVAS_HEIGHT, CANVAS_WIDTH, VERTEX_NAMES } from '../../lib/chaosGame';
import { formatStatistic } from '../../lib/format';
import { newSeed } from '../../lib/random';
import { VERTICES, chaosPicture } from '../math3';
import { drawBall, prepareCanvas, useSprites } from '../sprites';
import type { WidgetProps } from '../types';
import { CHAOS_MAX, type ChaosState } from './state';

const f = formatStatistic;
const int = (value: number) => new Intl.NumberFormat('ru-RU').format(value);

/** 3.4: игра хаоса — каждая точка случайна, но из них складывается треугольник Серпинского. */
export function ChaosWidget({ state, onChange }: WidgetProps<ChaosState>) {
  const { steps, seed } = state;
  const sprites = useSprites();
  const { ref, width } = useElementWidth<HTMLElement>(640);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const picture = useMemo(() => chaosPicture(seed, steps), [seed, steps]);
  const cellTotal = Math.max(0, steps - 1);

  const W = Math.min(Math.max(280, width), 640);
  const scale = W / CANVAS_WIDTH;
  const H = Math.round(CANVAS_HEIGHT * scale);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = prepareCanvas(canvas, W, H);
    if (!context) return;
    const { points } = picture;
    const dot = steps > 10000 ? 1.3 : steps > 2000 ? 1.6 : 2.2;
    context.fillStyle = '#9aa6ff';
    for (let i = 0; i < steps; i += 1) {
      context.fillRect(points[2 * i] * scale - dot / 2, points[2 * i + 1] * scale - dot / 2, dot, dot);
    }
    if (!sprites) return;
    for (const vertex of VERTICES) drawBall(context, sprites.ballTheory, vertex.x * scale, vertex.y * scale, 11);
    if (steps > 0) drawBall(context, sprites.ballGlass, picture.last.x * scale, picture.last.y * scale, 8);
  });

  const add = (count: number) => onChange({ ...state, steps: Math.min(CHAOS_MAX, steps + count) });

  return (
    <div className="c-widget">
      <div className="c-actions" role="group" aria-label="Поставить точки">
        {[100, 1000, 10000].map((count) => (
          <button key={count} type="button" className="c-btn c-btn--small" disabled={steps >= CHAOS_MAX} onClick={() => add(count)}>
            +{int(count)}
          </button>
        ))}
        <button type="button" className="c-btn c-btn--small c-btn--ghost" disabled={steps === 0} onClick={() => onChange({ steps: 0, seed: newSeed() })}>
          Сначала
        </button>
      </div>

      <figure className="c-chart c-chart--scene c-chaos" ref={ref}>
        <canvas ref={canvasRef} style={{ width: W, height: H, display: 'block', margin: '0 auto' }} role="img" aria-label={`Игра хаоса: ${steps} точек. Вершины A, B, C выбраны ${picture.counts.join(', ')} раз.`} />
      </figure>

      <dl className="c-readout">
        <div>
          <dt>Точек</dt>
          <dd>N = {int(steps)}</dd>
        </div>
        {picture.counts.map((count, i) => (
          <div key={i}>
            <dt>Вершина {VERTEX_NAMES[i]}</dt>
            <dd className="c-accent-dd">{steps ? f(count / steps) : '—'}</dd>
          </div>
        ))}
      </dl>

      <div className="c-cells">
        <p className="c-prose-muted">Доли точек в 9 треугольниках второго уровня (теория — 1/9 ≈ 0,11):</p>
        <table>
          <thead>
            <tr>
              <th scope="col">Последняя \ предпоследняя</th>
              {VERTEX_NAMES.map((name) => (
                <th key={name} scope="col">
                  {name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {picture.cells.map((row, i) => (
              <tr key={i}>
                <th scope="row">{VERTEX_NAMES[i]}</th>
                {row.map((count, j) => (
                  <td key={j}>{cellTotal ? f(count / cellTotal) : '—'}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="c-widget-note">Новая точка — середина пути от текущей точки к случайной вершине (малиновые шарики). Синий шарик — последняя точка. В центральную «дыру» не попадает ни одна точка.</p>
    </div>
  );
}
