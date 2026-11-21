import { useEffect, useId, useRef, useState, type PointerEvent } from 'react';
import { useElementWidth } from '../../hooks/useElementWidth';
import { formatStatistic } from '../../lib/format';
import { summarize } from '../../lib/statistics';
import { isBalanced } from '../math';
import { SEESAW, type SeesawState, isSettled, seesawStart, seesawStep } from '../physics';
import { drawBall, prefersReducedMotion, prepareCanvas, useSprites } from '../sprites';
import type { WidgetProps } from '../types';
import { balanceInitial, type BalanceState } from './state';

const f = formatStatistic;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const round1 = (value: number) => Math.round(value * 10) / 10;
type Drag = { kind: 'pivot' } | { kind: 'ball'; index: number } | null;

/**
 * Качели с физикой: шарики-наблюдения катятся по наклонённой доске, среднее и медиана меняются на глазах.
 * Доска уравновешена, только когда опора стоит в среднем x̄ — её нужно ловить.
 */
export function BalanceWidget({ state, onChange }: WidgetProps<BalanceState>) {
  const pivotId = useId();
  const sprites = useSprites();
  const { ref, width } = useElementWidth<HTMLDivElement>(640);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sim = useRef<SeesawState>(seesawStart(state.values));
  const pivotRef = useRef(state.pivot);
  const drag = useRef<Drag>(null);
  const frame = useRef(0);
  const [snapshot, setSnapshot] = useState(() => ({ xs: state.values, theta: 0, pivot: state.pivot }));
  const reduce = useRef(false);
  const visible = useRef(false);

  const W = Math.max(300, width);
  const H = 320;
  const margin = 28;
  const ppu = (W - 2 * margin) / SEESAW.length;
  const ground = H - 96;
  const fulcrumH = clamp(ppu * 2.8, 56, 92);
  const beamY = ground - fulcrumH;
  const r = (SEESAW.ballGap / 2) * ppu;
  const x = (u: number) => margin + u * ppu;

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas || !sprites) return;
    const context = prepareCanvas(canvas, W, H);
    if (!context) return;
    const { theta, xs } = sim.current;
    const pivot = pivotRef.current;
    const stats = summarize(xs);
    const balanced = isBalanced(xs, pivot);

    // Рейка-ось и деления
    const railW = (SEESAW.length + 0.8) * ppu;
    const railH = (sprites.rail.height / sprites.rail.width) * railW;
    context.drawImage(sprites.rail, x(-0.4), ground - railH / 2, railW, railH);
    context.font = '13px Consolas, "Courier New", monospace';
    context.textAlign = 'center';
    context.fillStyle = '#a1a1aa';
    const stepTick = W < 480 ? 5 : 2;
    for (let u = 0; u <= SEESAW.length; u += stepTick) context.fillText(String(u), x(u), ground + 24);

    // Метки среднего (малиновая) и медианы (белая) под осью
    const mean = stats.mean ?? 0;
    const median = stats.median ?? 0;
    context.fillStyle = '#ff4fc8';
    context.beginPath();
    context.moveTo(x(mean), ground + 32);
    context.lineTo(x(mean) + 8, ground + 46);
    context.lineTo(x(mean) - 8, ground + 46);
    context.closePath();
    context.fill();
    context.font = '700 14px Consolas, "Courier New", monospace';
    context.fillText('x̄ = ' + f(round1(mean)), x(mean), ground + 64);
    context.fillStyle = '#ffffff';
    context.fillRect(x(median) - 1.5, ground + 30, 3, 14);
    const crowded = Math.abs(x(median) - x(mean)) < 70;
    context.fillText('Me = ' + f(round1(median)), x(median), ground + (crowded ? 84 : 64));

    // Опора
    const fulcrum = balanced ? sprites.fulcrumHot : sprites.fulcrum;
    const fH = fulcrumH + 4;
    const fW = (fulcrum.width / fulcrum.height) * fH;
    context.drawImage(fulcrum, x(pivot) - fW / 2, beamY - 2, fW, fH);

    // Доска с шариками, наклон вокруг опоры
    const beamW = (SEESAW.length + 0.6) * ppu;
    const beamH = Math.max(10, (sprites.beam.height / sprites.beam.width) * beamW);
    context.save();
    context.translate(x(pivot), beamY);
    context.rotate((theta * Math.PI) / 180);
    context.drawImage(sprites.beam, (-0.3 - pivot) * ppu, -beamH / 2, beamW, beamH);
    xs.forEach((u, i) => {
      const held = drag.current?.kind === 'ball' && drag.current.index === i;
      drawBall(context, sprites.ballGlass, (u - pivot) * ppu, -beamH * 0.28 - r, held ? r * 1.12 : r);
    });
    context.restore();
  };

  const tick = () => {
    if (!visible.current) {
      frame.current = 0;
      return;
    }
    const held = drag.current?.kind === 'ball' ? drag.current.index : null;
    if (reduce.current) {
      let s = sim.current;
      for (let i = 0; i < 1200 && !isSettled(s); i += 1) s = seesawStep(s, pivotRef.current, 1 / 60, held);
      sim.current = s;
    } else {
      sim.current = seesawStep(sim.current, pivotRef.current, 1 / 60, held);
    }
    draw();
    setSnapshot({ xs: sim.current.xs, theta: sim.current.theta, pivot: pivotRef.current });
    if (!isSettled(sim.current) || drag.current) {
      frame.current = requestAnimationFrame(tick);
    } else {
      frame.current = 0;
      onChange({ values: sim.current.xs.map(round1), pivot: round1(pivotRef.current) });
    }
  };
  const wake = () => {
    if (!frame.current) frame.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    reduce.current = prefersReducedMotion();
    draw();
    // Физика идёт, только пока качели видны: иначе шарики скатились бы, пока урок не прокручен до опыта.
    const canvas = canvasRef.current;
    const observer = new IntersectionObserver(([entry]) => {
      visible.current = entry.isIntersecting;
      if (visible.current) wake();
    });
    if (canvas) observer.observe(canvas);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame.current);
      frame.current = 0;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sprites, W]);

  const toUnits = (event: PointerEvent) => {
    const canvas = canvasRef.current;
    const box = canvas?.getBoundingClientRect();
    if (!canvas || !box || !box.width) return { u: 0, y: 0 };
    // Учёт CSS zoom (режим «Проектор»): переводим экранные пиксели в пиксели холста.
    const k = canvas.offsetWidth / box.width;
    return { u: ((event.clientX - box.left) * k - margin) / ppu, y: (event.clientY - box.top) * k };
  };

  const onDown = (event: PointerEvent<HTMLCanvasElement>) => {
    const { u, y } = toUnits(event);
    const { xs, theta } = sim.current;
    const pivot = pivotRef.current;
    const tilt = (theta * Math.PI) / 180;
    // Шарик: ищем ближайший к точке нажатия с учётом наклона доски.
    let best = -1;
    let bestDist = Infinity;
    xs.forEach((bu, i) => {
      const dx = (bu - pivot) * ppu;
      const bx = x(pivot) + dx * Math.cos(tilt);
      const by = beamY + dx * Math.sin(tilt) - r - 5;
      const dist = Math.hypot(x(u) - bx, y - by);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    if (best >= 0 && bestDist < r * 1.6) drag.current = { kind: 'ball', index: best };
    else if (Math.abs(x(u) - x(pivot)) < 36 && y > beamY - 10 && y < ground + 12) drag.current = { kind: 'pivot' };
    else return;
    event.currentTarget.setPointerCapture(event.pointerId);
    wake();
  };
  const onMove = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!drag.current) return;
    const { u } = toUnits(event);
    if (drag.current.kind === 'pivot') {
      pivotRef.current = clamp(round1(u), 0, SEESAW.length);
    } else {
      const xs = [...sim.current.xs];
      xs[drag.current.index] = clamp(u, 0, SEESAW.length);
      sim.current = { ...sim.current, xs };
    }
    wake();
  };
  const onUp = () => {
    if (drag.current?.kind === 'pivot') {
      // Опора рядом с равновесием «защёлкивается» ровно в среднем.
      const mean = summarize(sim.current.xs).mean ?? 0;
      if (isBalanced(sim.current.xs, pivotRef.current)) pivotRef.current = Math.round(mean * 100) / 100;
    }
    drag.current = null;
    wake();
  };

  const setPivot = (value: number) => {
    pivotRef.current = clamp(value, 0, SEESAW.length);
    wake();
  };
  const reset = () => {
    const start = balanceInitial();
    sim.current = seesawStart(start.values);
    pivotRef.current = start.pivot;
    onChange(start);
    wake();
  };

  const stats = summarize(snapshot.xs);
  const balanced = isBalanced(snapshot.xs, snapshot.pivot);
  const lean = snapshot.xs.reduce((sum, u) => sum + (u - snapshot.pivot), 0);
  const leanShown = Math.abs(lean) < 0.05 ? 0 : lean;

  return (
    <div className="c-widget" ref={ref}>
      <figure className="c-chart c-chart--scene">
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: H, display: 'block', touchAction: 'pan-y', cursor: drag.current ? 'grabbing' : 'grab' }}
          role="img"
          aria-label={`Качели: шарики в точках ${snapshot.xs.map((u) => f(round1(u))).join(', ')}, опора в ${f(round1(snapshot.pivot))}. ${balanced ? 'Равновесие.' : 'Доска наклонена.'}`}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        />
      </figure>

      <div className="c-range">
        <label htmlFor={pivotId}>
          Опора <output htmlFor={pivotId}>{f(round1(snapshot.pivot))}</output>
        </label>
        <input id={pivotId} type="range" min={0} max={SEESAW.length} step={0.1} value={round1(snapshot.pivot)} onChange={(event) => setPivot(Number(event.target.value))} onPointerUp={onUp} onKeyUp={onUp} />
      </div>

      <p className={'c-status' + (balanced ? ' c-status--ok' : '')} role="status">
        {balanced
          ? `Равновесие: опора стоит в среднем, x̄ = ${f(round1(stats.mean ?? 0))}.`
          : leanShown > 0
            ? 'Перевешивает правая сторона — шарики катятся вправо. Сдвиньте опору вправо, к среднему.'
            : 'Перевешивает левая сторона — шарики катятся влево. Сдвиньте опору влево, к среднему.'}
      </p>

      <dl className="c-readout">
        <div>
          <dt>Перевес Σ(xᵢ − опора)</dt>
          <dd>{f(round1(leanShown))}</dd>
        </div>
        <div>
          <dt>Наклон доски</dt>
          <dd>{f(Math.round(Math.abs(snapshot.theta)))}°</dd>
        </div>
        <div>
          <dt>Медиана</dt>
          <dd>{f(round1(stats.median ?? 0))}</dd>
        </div>
        <div>
          <dt>Среднее</dt>
          <dd className="c-theory-text">{f(round1(stats.mean ?? 0))}</dd>
        </div>
        <div className="c-readout-wide" style={{ gridColumn: '1 / -1' }}>
          <dt>Среднее по формуле</dt>
          <dd className="c-dd-small">
            x̄ = ({snapshot.xs.map((u) => f(round1(u))).join(' + ')}) / {snapshot.xs.length} = {f(round1(stats.mean ?? 0))}
          </dd>
        </div>
      </dl>
      <div className="c-actions">
        <button type="button" className="c-btn c-btn--small c-btn--ghost" onClick={reset}>
          Вернуть шарики на места
        </button>
      </div>
      <p className="c-widget-note">
        Тащите опору или любой шарик. Пока опора не под средним, доска наклоняется и шарики скатываются — среднее уезжает, догоняйте его.
      </p>
    </div>
  );
}
