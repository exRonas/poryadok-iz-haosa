import { useEffect, useRef, type CSSProperties } from 'react';
import { useElementWidth } from '../hooks/useElementWidth';
import { drawColumn, prepareCanvas, useSprites } from './sprites';

interface Props {
  values: readonly number[];
  /** 'sample' — синее стекло (опыт), 'theory' — малиновое (формула). */
  variant: 'sample' | 'theory';
  selected?: number | null;
  onSelect?: (index: number) => void;
  /** Подпись над выбранным столбиком. */
  format: (value: number) => string;
  /** Кривая поверх столбиков: значение в той же шкале, что values; x — номер столбика (дробный). */
  curve?: (x: number) => number;
  /** Подсвеченная полоса по номерам столбиков, например μ ± 2σ. */
  band?: readonly [number, number] | null;
  /** Подписи оси: номера столбиков, которые подписать (остальные — без подписи). */
  labelEvery?: number;
  /** Подпись столбика под осью; по умолчанию — его номер. */
  labelOf?: (index: number) => string;
  height?: number;
  label: string;
}

/** Столбики из стеклянных деталей Blender с подписями-кнопками под ними. */
export function ColumnsChart({ values, variant, selected = null, onSelect, format, curve, band = null, labelEvery = 1, labelOf = String, height = 220, label }: Props) {
  const sprites = useSprites();
  const { ref, width } = useElementWidth<HTMLDivElement>(640);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const W = Math.max(300, width);
  const H = height;
  const left = 16;
  const right = W - 16;
  const n = values.length;
  const slot = (right - left) / n;
  const floor = H - 10;
  const top = Math.max(...values, curve ? Math.max(...values.map((_, i) => curve(i))) : 0, 1e-9) * 1.15;
  const y = (value: number) => floor - ((floor - 18) * value) / top;
  const cx = (i: number) => left + slot * (i + 0.5);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !sprites) return;
    const context = prepareCanvas(canvas, W, H);
    if (!context) return;
    if (band) {
      const a = cx(band[0]);
      const b = cx(band[1]);
      context.fillStyle = 'rgba(255, 79, 200, 0.08)';
      context.fillRect(Math.max(left, a), 8, Math.min(right, b) - Math.max(left, a), floor - 8);
    }
    const image = variant === 'theory' ? sprites.columnTheory : sprites.columnGlass;
    values.forEach((value, i) => {
      const w = Math.max(2, slot * 0.72);
      drawColumn(context, image, cx(i) - w / 2, floor, w, floor - y(value));
      if (i === selected) {
        context.fillStyle = '#ffffff';
        context.font = '700 14px Consolas, "Courier New", monospace';
        context.textAlign = 'center';
        context.fillText(format(value), cx(i), Math.max(16, y(value) - 8));
      }
    });
    context.drawImage(sprites.rail, left - 4, floor - 4, right - left + 8, 8);
    if (curve) {
      context.strokeStyle = '#ff4fc8';
      context.lineWidth = 3;
      context.shadowColor = 'rgba(255, 79, 200, 0.6)';
      context.shadowBlur = 10;
      context.beginPath();
      for (let i = 0; i <= 240; i += 1) {
        const x = -0.5 + (n * i) / 240;
        const px = left + slot * (x + 0.5);
        const py = y(curve(x));
        if (i) context.lineTo(px, py);
        else context.moveTo(px, py);
      }
      context.stroke();
      context.shadowBlur = 0;
    }
  });

  const row: CSSProperties = { position: 'relative', height: 30 };
  return (
    <figure className="c-chart c-chart--scene" ref={ref}>
      <canvas ref={canvasRef} style={{ width: '100%', height: H, display: 'block' }} role="img" aria-label={label} />
      <div style={row} role={onSelect ? 'group' : undefined} aria-label={onSelect ? 'Выбор столбика' : undefined}>
        {values.map((value, i) => {
          if (i % labelEvery !== 0 && i !== selected) return null;
          const style: CSSProperties = { position: 'absolute', left: cx(i) - Math.max(slot, 24) / 2, width: Math.max(slot, 24), top: 0 };
          return onSelect ? (
            <button
              key={i}
              type="button"
              className={'c-bin-button' + (i === selected ? ' c-bin-button--on' : '')}
              style={style}
              aria-pressed={i === selected}
              aria-label={`${labelOf(i)}: ${format(value)}`}
              onClick={() => onSelect(i)}
            >
              {labelOf(i)}
            </button>
          ) : (
            <span key={i} className="c-bin-button c-bin-button--static" style={style}>
              {labelOf(i)}
            </span>
          );
        })}
      </div>
    </figure>
  );
}
