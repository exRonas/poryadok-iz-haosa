import { useEffect, useMemo, useRef } from 'react';
import { useElementWidth } from '../../hooks/useElementWidth';
import { newSeed } from '../../lib/random';
import { countInside, insideQuarter, squarePoints } from '../math4';
import { drawBall, prepareCanvas, useSprites } from '../sprites';
import type { WidgetProps } from '../types';
import { AREA_MAX, type AreaState } from './state';

const f4 = (value: number) => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 4 }).format(value);
const int = (value: number) => new Intl.NumberFormat('ru-RU').format(value);

/** 4.2: случайные точки в квадрате; доля попавших в четверть круга оценивает площадь, а значит и π. */
export function AreaWidget({ state, onChange }: WidgetProps<AreaState>) {
  const { thrown, seed } = state;
  const sprites = useSprites();
  const { ref, width } = useElementWidth<HTMLElement>(640);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const points = useMemo(() => squarePoints(seed, AREA_MAX), [seed]);
  const k = useMemo(() => countInside(points, thrown), [points, thrown]);
  const share = thrown ? k / thrown : null;

  const W = Math.min(Math.max(260, width - 16), 480);
  const pad = 14;
  const side = W - 2 * pad;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = prepareCanvas(canvas, W, W);
    if (!context) return;
    const px = (x: number) => pad + x * side;
    const py = (y: number) => pad + (1 - y) * side;
    context.fillStyle = 'rgba(107, 123, 255, 0.07)';
    context.beginPath();
    context.moveTo(px(0), py(0));
    context.arc(px(0), py(0), side, -Math.PI / 2, 0);
    context.closePath();
    context.fill();
    const big = thrown <= 400;
    const r = thrown <= 100 ? 6 : 4;
    const dot = thrown > 5000 ? 1.4 : 2;
    for (let i = 0; i < thrown; i += 1) {
      const x = points[2 * i];
      const y = points[2 * i + 1];
      const inside = insideQuarter(x, y);
      if (big && sprites) drawBall(context, inside ? sprites.ballGlass : sprites.ballGraphite, px(x), py(y), r);
      else {
        context.fillStyle = inside ? '#8290ff' : '#6e6e7a';
        context.fillRect(px(x) - dot / 2, py(y) - dot / 2, dot, dot);
      }
    }
    context.strokeStyle = '#ff4fc8';
    context.lineWidth = 2.5;
    context.shadowColor = 'rgba(255, 79, 200, 0.6)';
    context.shadowBlur = 8;
    context.beginPath();
    context.arc(px(0), py(0), side, -Math.PI / 2, 0);
    context.stroke();
    context.shadowBlur = 0;
    context.strokeStyle = '#d9d9e3';
    context.lineWidth = 2;
    context.strokeRect(pad, pad, side, side);
  });

  const add = (count: number) => onChange({ ...state, thrown: Math.min(AREA_MAX, thrown + count) });

  return (
    <div className="c-widget">
      <div className="c-actions" role="group" aria-label="Бросить точки">
        {[10, 100, 1000, 10000].map((count) => (
          <button key={count} type="button" className="c-btn c-btn--small" disabled={thrown >= AREA_MAX} onClick={() => add(count)}>
            +{int(count)}
          </button>
        ))}
        <button type="button" className="c-btn c-btn--small c-btn--ghost" disabled={thrown === 0} onClick={() => onChange({ thrown: 0, seed: newSeed() })}>
          Сначала
        </button>
      </div>

      <figure className="c-chart c-chart--scene" ref={ref}>
        <canvas
          ref={canvasRef}
          style={{ width: W, height: W, display: 'block', margin: '0 auto' }}
          role="img"
          aria-label={`Квадрат и четверть круга: ${thrown} точек, внутри ${k}`}
        />
      </figure>

      <dl className="c-readout">
        <div>
          <dt>Точек</dt>
          <dd>N = {int(thrown)}</dd>
        </div>
        <div>
          <dt>Внутри</dt>
          <dd>k = {int(k)}</dd>
        </div>
        <div>
          <dt>Доля k/N</dt>
          <dd className="c-accent-dd">{share === null ? '—' : f4(share)}</dd>
        </div>
        <div>
          <dt>Площадь π/4</dt>
          <dd className="c-theory-text">{f4(Math.PI / 4)}</dd>
        </div>
        <div className="c-readout-wide">
          <dt>Оценка π = 4k/N</dt>
          <dd className="c-accent-dd">{share === null ? '—' : f4(4 * share)}</dd>
        </div>
        <div className="c-readout-wide">
          <dt>Ошибка |4k/N − π|</dt>
          <dd>{share === null ? '—' : f4(Math.abs(4 * share - Math.PI))}</dd>
        </div>
      </dl>
      <p className="c-widget-note">Квадрат 1 × 1, малиновая дуга — четверть круга радиуса 1, её площадь π/4. Синие точки внутри, серые снаружи.</p>
    </div>
  );
}
