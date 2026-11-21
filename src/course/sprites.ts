/**
 * Детали опытов, отрисованные в Blender (tools/render/sprites.py): стеклянные и хромовые шарики,
 * доска, опора, рейка, стеклянный столбик, перегородка, монеты, кубики, плитки клеток и хромовые рамки. Загружаются один раз и рисуются на холсте.
 */
import { useEffect, useState } from 'react';
import ballChrome from './sprites/ball-chrome.webp';
import ballGlass from './sprites/ball-glass.webp';
import ballGraphite from './sprites/ball-graphite.webp';
import ballTheory from './sprites/ball-theory.webp';
import beam from './sprites/beam.webp';
import columnGlass from './sprites/column-glass.webp';
import coinGlass from './sprites/coin-glass.webp';
import coinGraphite from './sprites/coin-graphite.webp';
import columnTheory from './sprites/column-theory.webp';
import die1 from './sprites/die-1.webp';
import die2 from './sprites/die-2.webp';
import die3 from './sprites/die-3.webp';
import die4 from './sprites/die-4.webp';
import die5 from './sprites/die-5.webp';
import die6 from './sprites/die-6.webp';
import divider from './sprites/divider.webp';
import frameCell from './sprites/frame-cell.webp';
import frameWide from './sprites/frame-wide.webp';
import fulcrumHot from './sprites/fulcrum-hot.webp';
import fulcrum from './sprites/fulcrum.webp';
import peg from './sprites/peg.webp';
import rail from './sprites/rail.webp';
import tileClosed from './sprites/tile-closed.webp';
import tileGlass from './sprites/tile-glass.webp';
import tileGraphite from './sprites/tile-graphite.webp';

const SOURCES = {
  ballChrome,
  ballGlass,
  ballGraphite,
  ballTheory,
  beam,
  columnGlass,
  columnTheory,
  coinGlass,
  coinGraphite,
  die1,
  die2,
  die3,
  die4,
  die5,
  die6,
  divider,
  frameCell,
  frameWide,
  fulcrum,
  fulcrumHot,
  peg,
  rail,
  tileClosed,
  tileGlass,
  tileGraphite,
};

export type SpriteName = keyof typeof SOURCES;
export type Sprites = Record<SpriteName, HTMLImageElement>;

let loading: Promise<Sprites> | null = null;
let ready: Sprites | null = null;

/** Детали, если уже загружены, иначе null — для рисования вне React (3D-сцены экспериментов). */
export const getSprites = (): Sprites | null => ready;

export function loadSprites(): Promise<Sprites> {
  loading ??= Promise.all(
    Object.entries(SOURCES).map(
      ([name, src]) =>
        new Promise<[string, HTMLImageElement]>((resolve, reject) => {
          const image = new Image();
          image.decoding = 'async';
          image.onload = () => resolve([name, image]);
          image.onerror = () => reject(new Error('Не загрузилась деталь ' + name));
          image.src = src;
        }),
    ),
  ).then((entries) => {
    ready = Object.fromEntries(entries) as Sprites;
    return ready;
  });
  return loading;
}

/** Хромовая рамка-деталь вокруг квадрата (x, y, side): трубка лежит по краю, половина толщины — снаружи. */
export function drawFrame(context: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, side: number, bar: number): void {
  const grow = side * bar;
  context.drawImage(image, x - grow, y - grow, side + 2 * grow, side + 2 * grow);
}

/** Грань кубика 1…6 — картинка детали (для <img>, без холста). */
export const DIE_FACES: readonly string[] = [die1, die2, die3, die4, die5, die6];

/** Детали или null, пока они грузятся (в собранном файле — мгновенно: картинки встроены). */
export function useSprites(): Sprites | null {
  const [sprites, setSprites] = useState<Sprites | null>(null);
  useEffect(() => {
    let alive = true;
    loadSprites()
      .then((loaded) => alive && setSprites(loaded))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);
  return sprites;
}

/** Холст под плотность пикселей экрана: рисуем в CSS-пикселях, на ретине — чётко. */
export function prepareCanvas(canvas: HTMLCanvasElement, width: number, height: number): CanvasRenderingContext2D | null {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.round(width * ratio);
  const h = Math.round(height * ratio);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const context = canvas.getContext('2d');
  if (!context) return null;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);
  return context;
}

/** Шарик-деталь с центром (x, y) и радиусом r. */
export function drawBall(context: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, r: number): void {
  context.drawImage(image, x - r, y - r, 2 * r, 2 * r);
}

/** Стеклянный столбик высотой height: верх и низ не растягиваются, тянется только середина. */
export function drawColumn(context: CanvasRenderingContext2D, image: HTMLImageElement, x: number, bottom: number, width: number, height: number): void {
  if (height <= 0) return;
  const scale = width / image.width;
  const cap = Math.min(image.width * 0.45, image.height / 2);
  const capPx = Math.min(cap * scale, height / 2);
  const capSrc = capPx / scale;
  const top = bottom - height;
  context.drawImage(image, 0, 0, image.width, capSrc, x, top, width, capPx);
  const middle = height - 2 * capPx;
  if (middle > 0) context.drawImage(image, 0, cap, image.width, image.height - 2 * cap, x, top + capPx, width, middle);
  context.drawImage(image, 0, image.height - capSrc, image.width, capSrc, x, bottom - capPx, width, capPx);
}

export const prefersReducedMotion = (): boolean => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
