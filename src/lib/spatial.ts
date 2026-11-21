import { getSprites, loadSprites } from '../course/sprites';

/** World coordinates: x and y span the floor, z is height. */
export type Point3 = [number, number, number];
export type Camera = { yaw: number; pitch: number };
export const homeCamera: Camera = { yaw: -0.53, pitch: 0.48 };
export const ink = {
  lime: '#8290ff',
  white: '#ececf2',
  faint: '#5a5a66',
  cyan: '#ff4fc8',
  lilac: '#9a9aa8',
  gold: '#ffb0e6',
};

interface Mark {
  points: Point3[];
  color: string;
  width?: number;
  fill?: string;
  radius?: number;
  text?: string;
  layer?: number;
  /** Светящаяся линия: под основной линией рисуется широкий полупрозрачный ореол. */
  glow?: boolean;
  /** Матовая грань без стеклянного блика — для поверхностей из сотен мелких граней. */
  matte?: boolean;
}

export class Scene {
  marks: Mark[] = [];
  line(points: Point3[], color = ink.faint, width = 1) {
    this.marks.push({ points, color, width });
  }
  face(points: Point3[], fill: string, edge = fill, layer = 0) {
    this.marks.push({ points, color: edge, fill, width: 0.65, layer });
  }
  dot(point: Point3, color: string, radius = 0.015) {
    this.marks.push({ points: [point], color, radius });
  }
  label(point: Point3, text: string, color = ink.white) {
    this.marks.push({ points: [point], color, text });
  }
  /** Грань поверхности: без блика и без обводки (стыки граней не видны). */
  surface(points: Point3[], fill: string) {
    this.marks.push({ points, color: fill, fill, width: 0.5, matte: true });
  }
  /** Светящаяся линия (траектории, лучи, кривые теории). */
  glowLine(points: Point3[], color: string, width = 2) {
    this.marks.push({ points, color, width, glow: true });
  }
  /** Мягкая тень на полу под точкой — даёт глубину. Всегда рисуется под объектами. */
  shadow(point: Point3, radius: number) {
    this.marks.push({ points: [[point[0], point[1], 0]], color: '#00000080', radius, layer: -2 });
  }
  /** Брус по осям: [x0, x1] × [y0, y1] × [z0, z1]; colors — верх, бока по X, бока по Y. */
  box(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, colors: readonly string[], layer = 0) {
    const c = (x: number, y: number, z: number): Point3 => [x, y, z];
    this.face([c(x0, y0, z0), c(x1, y0, z0), c(x1, y0, z1), c(x0, y0, z1)], colors[2], colors[2], layer);
    this.face([c(x0, y1, z0), c(x1, y1, z0), c(x1, y1, z1), c(x0, y1, z1)], colors[2], colors[2], layer);
    this.face([c(x0, y0, z0), c(x0, y1, z0), c(x0, y1, z1), c(x0, y0, z1)], colors[1], colors[1], layer);
    this.face([c(x1, y0, z0), c(x1, y1, z0), c(x1, y1, z1), c(x1, y0, z1)], colors[1], colors[1], layer);
    this.face([c(x0, y0, z1), c(x1, y0, z1), c(x1, y1, z1), c(x0, y1, z1)], colors[0], colors[0], layer);
  }
  column(x: number, y: number, z: number, halfX: number, halfY: number, colors: readonly string[]) {
    const base: Point3[] = [
      [x - halfX, y - halfY, 0],
      [x + halfX, y - halfY, 0],
      [x + halfX, y + halfY, 0],
      [x - halfX, y + halfY, 0],
    ];
    const top: Point3[] = base.map(([a, b]) => [a, b, z]);
    for (let k = 0; k < 4; k++) {
      const next = (k + 1) % 4;
      this.face([base[k], base[next], top[next], top[k]], colors[1 + (k % 2)]);
    }
    this.face(top, colors[0]);
  }
}

/** Цвет точки → деталь из Blender: синие — стекло, малиновые — «теоретическое» стекло, светлые — хром, серые — графит. */
function ballSprite(color: string): HTMLImageElement | null {
  const sprites = getSprites();
  if (!sprites) return null;
  const hex = color.trim().toLowerCase();
  const match = /^#([0-9a-f]{6})/.exec(hex);
  if (!match) return null;
  const n = parseInt(match[1], 16);
  const r = (n >> 16) & 255,
    g = (n >> 8) & 255,
    b = n & 255;
  if (r > 200 && g < 170 && b > 150) return sprites.ballTheory;
  if (b > r + 40 && b > g + 30) return sprites.ballGlass;
  if (r > 190 && g > 190 && b > 190) return sprites.ballChrome;
  if (r > 100 && r < 170 && Math.abs(r - g) < 20 && b - r < 30) return sprites.ballGraphite;
  return null;
}

const waiting = new WeakSet<HTMLCanvasElement>();

export function renderScene(canvas: HTMLCanvasElement, scene: Scene, camera: Camera, compact = false) {
  const w = canvas.clientWidth,
    h = canvas.clientHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx || !w || !h) return;
  // Детали ещё грузятся — перерисуем сцену, когда они будут готовы.
  if (!getSprites() && !waiting.has(canvas)) {
    waiting.add(canvas);
    loadSprites()
      .then(() => renderScene(canvas, scene, camera, compact))
      .catch(() => undefined);
  }
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const scale = Math.min(w / 3.35, h / (compact ? 2.22 : 2.48));
  const c = Math.cos(camera.yaw),
    s = Math.sin(camera.yaw);
  const a = Math.cos(camera.pitch),
    b = Math.sin(camera.pitch);
  const project = ([x, y, z]: Point3) => {
    const depth = s * x + c * y;
    return {
      x: w / 2 + (c * x - s * y) * scale,
      y: h * 0.53 + (depth * b - (z - 0.48) * a) * scale,
      depth: depth * a + z * b,
    };
  };
  const stroke = (points: Point3[], color: string) => {
    ctx.beginPath();
    points.forEach((point, i) => {
      const p = project(point);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.7;
    ctx.stroke();
  };
  for (let i = -5; i <= 5; i++) {
    const k = i / 5;
    const color = i % 5 === 0 ? '#4a4a55' : '#2a2a31';
    stroke(
      [
        [k, -1, 0],
        [k, 1, 0],
      ],
      color,
    );
    stroke(
      [
        [-1, k, 0],
        [1, k, 0],
      ],
      color,
    );
  }
  const objects = scene.marks.map((mark) => {
    const points = mark.points.map(project);
    const depth = points.reduce((sum, p) => sum + p.depth, 0) / points.length;
    return { mark, points, depth };
  });
  objects.sort((left, right) => (left.mark.layer ?? 0) - (right.mark.layer ?? 0) || left.depth - right.depth);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  for (const { mark, points } of objects) {
    const p = points[0];
    if (!p) continue;
    ctx.fillStyle = mark.fill ?? mark.color;
    if (mark.text) {
      ctx.font = (compact ? '10px' : '12px') + ' Consolas, monospace';
      ctx.fillText(mark.text, p.x + 4, p.y - 4);
    } else if (mark.radius) {
      const r = Math.max(0.85, mark.radius * scale);
      const sprite = r >= 2.5 ? ballSprite(mark.color) : null;
      if (sprite) {
        ctx.drawImage(sprite, p.x - r * 1.15, p.y - r * 1.15, r * 2.3, r * 2.3);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, 2 * Math.PI);
        ctx.fill();
      }
    } else {
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
      if (mark.fill) {
        ctx.closePath();
        ctx.fill();
        // Стеклянный блик: светлее сверху грани, к низу сходит на нет.
        if (points.length >= 3 && !mark.matte) {
          let top = Infinity,
            bottom = -Infinity;
          for (const point of points) {
            top = Math.min(top, point.y);
            bottom = Math.max(bottom, point.y);
          }
          if (bottom - top > 2) {
            const glare = ctx.createLinearGradient(0, top, 0, bottom);
            glare.addColorStop(0, 'rgba(255, 255, 255, 0.16)');
            glare.addColorStop(0.45, 'rgba(255, 255, 255, 0.03)');
            glare.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = glare;
            ctx.fill();
          }
        }
      }
      if (mark.glow) {
        // Ореол: та же линия шире и прозрачнее.
        ctx.save();
        ctx.globalAlpha = 0.18;
        ctx.lineWidth = (mark.width ?? 1) * 4.5;
        ctx.strokeStyle = mark.color;
        ctx.stroke();
        ctx.restore();
      }
      ctx.lineWidth = mark.width ?? 1;
      ctx.strokeStyle = mark.color;
      ctx.stroke();
    }
  }
}
