import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { useElementWidth } from '../hooks/useElementWidth';
import { drawBall, prepareCanvas, useSprites } from './sprites';

export interface RailHelpers {
  context: CanvasRenderingContext2D;
  /** Значение → x на холсте. */
  x: (value: number) => number;
  /** Пикселей на единицу шкалы. */
  unit: number;
  /** Высота рейки на холсте. */
  railY: number;
}

interface Props {
  values: readonly number[];
  domain: readonly [number, number];
  /** Тащат точку index в значение value (непрерывное — округляет вызывающий). */
  onMove: (index: number, value: number) => void;
  /** Слой под шариками: квадраты отклонений, линии среднего. */
  underlay?: (helpers: RailHelpers) => void;
  /** Метки под рейкой: значение, цвет, подпись. */
  markers?: readonly { value: number; color: string; label: string }[];
  /** Высота свободного места над рейкой (для квадратов и стопок), px. */
  above?: number;
  /** То же в единицах шкалы — когда над рейкой рисуются квадраты в масштабе оси. */
  aboveUnits?: number;
  ticks: readonly number[];
  label: string;
  /** Какой деталью рисовать точку (по умолчанию — стеклянный шарик). */
  sprite?: (index: number) => 'ballGlass' | 'ballChrome';
}

/** Ряд точек-шариков на хромовой рейке: любую можно тащить мышью, пальцем или стрелками. */
export function RailScene({ values, domain, onMove, underlay, markers = [], above: abovePx = 120, aboveUnits, ticks, label, sprite }: Props) {
  const sprites = useSprites();
  const { ref, width } = useElementWidth<HTMLDivElement>(640);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const [focus, setFocus] = useState(0);

  const W = Math.max(300, width);
  const pad = 22;
  const unit = (W - 2 * pad) / (domain[1] - domain[0]);
  const r = Math.max(9, Math.min(13, unit * 0.45));
  const above = aboveUnits ? aboveUnits * unit + 16 : abovePx;
  const railY = above + 20;
  const H = railY + 30 + (markers.length ? 66 : 0) + 6;
  const x = (value: number) => pad + (value - domain[0]) * unit;

  // Шарики, которые налезают друг на друга, ставятся стопкой — каждый виден и его можно схватить.
  const order = values.map((_, i) => i).sort((a, b) => values[a] - values[b]);
  const levels = Array<number>(values.length).fill(0);
  const lastX: number[] = [];
  for (const i of order) {
    let level = 0;
    while (lastX[level] !== undefined && x(values[i]) - lastX[level] < 2 * r - 1) level += 1;
    levels[i] = level;
    lastX[level] = x(values[i]);
  }
  const ballY = (i: number) => railY - r - 3 - levels[i] * (2 * r - 2);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !sprites) return;
    const context = prepareCanvas(canvas, W, H);
    if (!context) return;
    underlay?.({ context, x, unit, railY });
    context.drawImage(sprites.rail, pad - 6, railY - 5, W - 2 * pad + 12, 10);
    context.font = '13px Consolas, "Courier New", monospace';
    context.textAlign = 'center';
    context.fillStyle = '#a1a1aa';
    for (const tick of ticks) context.fillText(String(tick).replace('-', '−'), x(tick), railY + 24);
    markers.forEach((marker, i) => {
      const mx = x(marker.value);
      context.fillStyle = marker.color;
      context.beginPath();
      context.moveTo(mx, railY + 32);
      context.lineTo(mx + 7, railY + 44);
      context.lineTo(mx - 7, railY + 44);
      context.closePath();
      context.fill();
      context.font = '700 13px Consolas, "Courier New", monospace';
      // Близкие метки расходятся: левая подписывается влево, правая — вправо; совпавшие — в две строки.
      const other = markers.find((_, j) => j !== i && Math.abs(x(markers[j].value) - mx) < 90);
      const ox = other ? x(other.value) : mx;
      const same = other !== undefined && Math.abs(ox - mx) < 4;
      context.textAlign = !other || same ? 'center' : mx < ox ? 'right' : 'left';
      const shiftX = !other || same ? 0 : mx < ox ? 4 : -4;
      context.fillText(marker.label, mx + shiftX, railY + 62 + (same && i % 2 ? 16 : 0));
    });
    values.forEach((value, i) => {
      const image = sprite?.(i) === 'ballChrome' ? sprites.ballChrome : sprites.ballGlass;
      drawBall(context, image, x(value), ballY(i), i === drag ? r * 1.15 : r);
    });
  });

  const pointer = (event: PointerEvent) => {
    const canvas = canvasRef.current;
    const box = canvas?.getBoundingClientRect();
    if (!canvas || !box || !box.width) return { px: 0, py: 0 };
    // Учёт CSS zoom (режим «Проектор»): переводим экранные пиксели в пиксели холста.
    const k = canvas.offsetWidth / box.width;
    return { px: (event.clientX - box.left) * k, py: (event.clientY - box.top) * k };
  };
  const onDown = (event: PointerEvent<HTMLCanvasElement>) => {
    const { px, py } = pointer(event);
    let best = -1;
    let bestDist = Infinity;
    values.forEach((value, i) => {
      const dist = Math.hypot(px - x(value), py - ballY(i));
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    if (best < 0 || bestDist > r * 2.2) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag(best);
    setFocus(best);
  };
  const onPointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    if (drag === null) return;
    const { px } = pointer(event);
    onMove(drag, Math.min(domain[1], Math.max(domain[0], domain[0] + (px - pad) / unit)));
  };
  const onKey = (event: KeyboardEvent) => {
    const dir = event.key === 'ArrowRight' || event.key === 'ArrowUp' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowDown' ? -1 : 0;
    if (event.key === 'Tab' || (!dir && event.key !== 'n')) return;
    event.preventDefault();
    if (event.key === 'n') {
      setFocus((focus + 1) % values.length);
      return;
    }
    const step = event.shiftKey ? 5 : 1;
    onMove(focus, Math.min(domain[1], Math.max(domain[0], values[focus] + dir * step)));
  };

  return (
    <figure className="c-chart c-chart--scene" ref={ref}>
      <canvas
        ref={canvasRef}
        tabIndex={0}
        style={{ width: '100%', height: H, display: 'block', touchAction: 'pan-y', cursor: drag === null ? 'grab' : 'grabbing' }}
        role="application"
        aria-label={`${label} Клавиатура: стрелки двигают точку ${focus + 1} (Shift — на 5), клавиша N — следующая точка.`}
        onPointerDown={onDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => setDrag(null)}
        onPointerCancel={() => setDrag(null)}
        onKeyDown={onKey}
      />
    </figure>
  );
}
