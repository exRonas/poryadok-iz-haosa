import { useEffect, useMemo, useRef } from 'react';
import { useElementWidth } from '../../hooks/useElementWidth';
import { formatStatistic } from '../../lib/format';
import { newSeed } from '../../lib/random';
import { SHARE_CELLS, SHARE_GRID, SHARE_MASK, SHARE_TRUE, shareDraws, shareEstimate } from '../math4';
import { prepareCanvas, useSprites } from '../sprites';
import type { WidgetProps } from '../types';
import { SHARE_MAX, type ShareState } from './state';

const f = formatStatistic;
const f3 = (value: number) => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 3 }).format(value);

/** 4.1: случайные клетки открывают скрытый рисунок; доля рисунка в выборке оценивает долю на всём поле. */
export function ShareWidget({ state, onChange }: WidgetProps<ShareState>) {
  const { opened, seed, reveal } = state;
  const sprites = useSprites();
  const { ref, width } = useElementWidth<HTMLElement>(640);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const draws = useMemo(() => shareDraws(seed, opened), [seed, opened]);
  const seen = useMemo(() => new Set(draws), [draws]);
  const k = draws.filter((cell) => SHARE_MASK[cell]).length;
  const { p, se } = shareEstimate(k, opened);
  const covered = opened > 0 && Math.abs(SHARE_TRUE - p) <= 2 * se;

  const W = Math.min(Math.max(260, width - 16), 520);
  const cell = W / SHARE_GRID;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !sprites) return;
    const context = prepareCanvas(canvas, W, W);
    if (!context) return;
    const pad = cell * 0.06;
    const last = draws[draws.length - 1];
    for (let index = 0; index < SHARE_CELLS; index += 1) {
      const x = (index % SHARE_GRID) * cell;
      const y = Math.floor(index / SHARE_GRID) * cell;
      const isOpen = seen.has(index);
      // При показе рисунка неоткрытые клетки рисунка видны полупрозрачными, неоткрытый фон остаётся закрытым.
      const ghost = !isOpen && reveal && SHARE_MASK[index] === 1;
      const image = isOpen || ghost ? (SHARE_MASK[index] ? sprites.tileGlass : sprites.tileGraphite) : sprites.tileClosed;
      context.globalAlpha = ghost ? 0.45 : 1;
      context.drawImage(image, x + pad, y + pad, cell - 2 * pad, cell - 2 * pad);
      if (index === last) {
        context.globalAlpha = 1;
        context.strokeStyle = '#ffffff';
        context.lineWidth = 2;
        context.strokeRect(x + 1, y + 1, cell - 2, cell - 2);
      }
    }
    context.globalAlpha = 1;
  });

  const open = (count: number) => onChange({ ...state, opened: Math.min(SHARE_MAX, opened + count) });

  return (
    <div className="c-widget">
      <div className="c-toolbar">
        <div className="c-actions" role="group" aria-label="Открыть клетки">
          {[1, 10, 50].map((count) => (
            <button key={count} type="button" className="c-btn c-btn--small" disabled={opened >= SHARE_MAX} onClick={() => open(count)}>
              +{count}
            </button>
          ))}
          <button type="button" className="c-btn c-btn--small c-btn--ghost" disabled={opened === 0} onClick={() => onChange({ ...state, opened: 0, seed: newSeed() })}>
            Сначала
          </button>
        </div>
        <button type="button" className="c-toggle" aria-pressed={reveal} onClick={() => onChange({ ...state, reveal: !reveal })}>
          Показать весь рисунок
        </button>
      </div>

      <figure className="c-chart c-chart--scene" ref={ref}>
        <canvas
          ref={canvasRef}
          style={{ width: W, height: W, display: 'block', margin: '0 auto' }}
          role="img"
          aria-label={`Поле ${SHARE_GRID} × ${SHARE_GRID}: открыто ${opened} раз, в рисунок — ${k}`}
        />
      </figure>

      <dl className="c-readout">
        <div>
          <dt>Открытий</dt>
          <dd>n = {opened}</dd>
        </div>
        <div>
          <dt>В рисунок</dt>
          <dd>k = {k}</dd>
        </div>
        <div>
          <dt>Оценка доли p̂ = k/n</dt>
          <dd className="c-accent-dd">{opened ? f3(p) : '—'}</dd>
        </div>
        <div>
          <dt>Оценка числа клеток</dt>
          <dd className="c-accent-dd">{opened ? f(p * SHARE_CELLS) : '—'}</dd>
        </div>
        <div className="c-readout-wide">
          <dt>Интервал p̂ ± 2σ̂</dt>
          <dd>{opened ? `${f3(Math.max(0, p - 2 * se))} … ${f3(Math.min(1, p + 2 * se))}` : '—'}</dd>
        </div>
        <div className="c-readout-wide">
          <dt>Истинная доля</dt>
          <dd className="c-theory-text">{reveal ? `${f3(SHARE_TRUE)}${opened ? (covered ? ' — внутри интервала' : ' — вне интервала') : ''}` : 'скрыта'}</dd>
        </div>
      </dl>
      <p className="c-widget-note">Клетка выбирается наугад и может открыться повторно — так выборка остаётся независимой. Синее стекло — рисунок, серый графит — фон.</p>
    </div>
  );
}
