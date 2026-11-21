import { Scene, ink, type Point3 } from './spatial';
import { pathProgress, positionAt } from './randomWalk';
import { ART_SIZE, buildLighthousePixels } from './lighthouseArt';
import { CANVAS_WIDTH, CANVAS_HEIGHT, VERTICES } from './chaosGame';
import { DENSITY_STOPS, ORDER_STOPS, gradient, type ColorMode, type DensityMap } from './densityMap';
import { clampByte, type NoiseSeries } from './noiseImage';
import type { Mask, Throws } from './silhouette';
import { describe } from './drawDistribution';

const unit = (i: number, limit: number) => (2 * i) / limit - 1;
const art = buildLighthousePixels();

export function gaussianScene() {
  const scene = new Scene();
  // Independent standard normals, plotted over −3…3 standard deviations on both axes.
  const z = (x: number, y: number) => 1.55 * Math.exp(-4.5 * (x * x + y * y));
  const n = 44;
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      const x = unit(i, n),
        y = unit(j, n),
        bx = unit(i + 1, n),
        by = unit(j + 1, n);
      const t = z((x + bx) / 2, (y + by) / 2) / 1.55;
      // Глубокий синий у подножия → светло-синий у вершины, в палитре учебного режима.
      const color = 'rgb(' + [34 + 96 * t, 40 + 104 * t, 110 + 145 * t].map(Math.round).join(',') + ')';
      scene.face(
        [
          [x, y, z(x, y)],
          [bx, y, z(bx, y)],
          [bx, by, z(bx, by)],
          [x, by, z(x, by)],
        ],
        '#18181d',
        color,
      );
    }
  scene.line(
    [
      [-1.13, 1.06, 0],
      [1.13, 1.06, 0],
    ],
    ink.faint,
  );
  scene.line(
    [
      [1.06, -1.13, 0],
      [1.06, 1.13, 0],
    ],
    ink.faint,
  );
  scene.label([1.16, 1.08, 0], 'x');
  scene.label([1.08, -1.15, 0], 'y');
  scene.label([-0.03, -0.03, 1.62], 'ρ', ink.lime);
  for (const k of [-3, 0, 3]) scene.label([k / 3, 1.1, 0], String(k), '#9a9aa6');
  return scene;
}

export function galtonScene(
  counts: readonly number[],
  lastPath: readonly boolean[] | null,
  balls: readonly { x: number; y: number }[] = [],
  selected: number | null = null,
) {
  const scene = new Scene();
  const levels = counts.length - 1;
  const board = (x: number, progress: number): Point3 => [x, -0.74 + 1.39 * progress, 1.08 * (1 - progress) + 0.08];
  scene.face([board(-0.12, 0), board(0.12, 0), board(1, 1), board(-1, 1)], '#26262c', '#7a7a86', -1);
  scene.line([board(-0.12, 0), board(-1, 1)], '#8c8c98', 1.3);
  scene.line([board(0.12, 0), board(1, 1)], '#8c8c98', 1.3);
  for (let row = 0; row < levels; row++)
    for (let i = 0; i <= row; i++) {
      const p = board((2 * i - row) / (levels + 1), (row + 1) / (levels + 2));
      const radius = Math.min(0.026, 0.26 / levels);
      scene.dot(p, ink.faint, radius * 1.25);
      scene.dot([p[0], p[1], p[2] + 0.015], ink.white, radius);
    }
  if (lastPath?.length === levels) {
    let rights = 0;
    const trace = [board(0, 0)];
    for (let k = 0; k <= levels; k++) {
      trace.push(board((2 * rights - k) / (levels + 1), (k + 1) / (levels + 2)));
      if (lastPath[k]) rights++;
    }
    scene.line(trace, ink.lime, 2.2);
    scene.dot(trace[trace.length - 1], ink.lime, 0.035);
  }
  for (const ball of balls) {
    const p = board(ball.x, ball.y);
    p[2] += 0.04;
    scene.dot(p, ink.lime, 0.041);
  }
  const max = Math.max(1, ...counts);
  counts.forEach((count, i) => {
    const x = (2 * i - levels) / (levels + 1);
    scene.column(
      x,
      0.83,
      0.035 + (0.57 * count) / max,
      0.84 / (levels + 1),
      0.1,
      i === selected ? ['#ffffff', '#c4c4cf', '#868692'] : [ink.lime, '#4a5cff', '#2f3aa8'],
    );
    if (i === 0 || i === levels) scene.label([x, 1.02, 0], String(i));
  });
  return scene;
}

export function walkScene(
  tables: Int16Array[],
  steps: number,
  yMax: number,
  clock: number,
  stagger: number,
  replay: { index: number; clock: number } | null,
  reference?: { p: number; completed: number; selected: number | null; sums: Float64Array },
) {
  const scene = new Scene();
  const stride = Math.ceil(tables.length / 44);
  const indices = new Set(Array.from({ length: Math.ceil(tables.length / stride) }, (_, i) => i * stride));
  const focus = replay?.index ?? 0;
  indices.add(focus);
  const height = (v: number) => 0.65 + (0.61 * Math.max(-yMax, Math.min(yMax, v))) / yMax;

  // Теория на задней стенке: малиновая лента E ± 2σ и линия E — коридор, в котором окажется большинство путей.
  if (reference) {
    const wall = -0.96;
    const p = reference.p;
    const mean = (k: number) => k * (2 * p - 1);
    const sd = (k: number) => Math.sqrt(4 * k * p * (1 - p));
    for (let k = 0; k < steps; k++) {
      const a = unit(k, steps),
        b = unit(k + 1, steps);
      scene.face(
        [
          [a, wall, height(mean(k) - 2 * sd(k))],
          [b, wall, height(mean(k + 1) - 2 * sd(k + 1))],
          [b, wall, height(mean(k + 1) + 2 * sd(k + 1))],
          [a, wall, height(mean(k) + 2 * sd(k))],
        ],
        '#ff4fc81f',
        '#ff4fc800',
        -1,
      );
    }
    const along = (f: (k: number) => number): Point3[] =>
      Array.from({ length: steps + 1 }, (_, k) => [unit(k, steps), wall, height(f(k))] as Point3);
    scene.glowLine(along((k) => mean(k) + 2 * sd(k)), '#ff4fc8', 1.4);
    scene.glowLine(along((k) => mean(k) - 2 * sd(k)), '#ff4fc8', 1.4);
    scene.glowLine(along(mean), '#ff8fd8', 2);
    if (tables.length > 1 && reference.completed === tables.length)
      scene.glowLine(
        Array.from(reference.sums, (sum, k) => [unit(k, steps), wall + 0.02, height(sum / tables.length)] as Point3),
        ink.white,
        1.8,
      );
  }

  // Пути: главный — яркий светящийся, совпавшие с выбранным концом — белые, остальные — полупрозрачные синие.
  for (const i of indices) {
    const time = replay?.index === i ? replay.clock : pathProgress(clock, i, stagger, steps);
    const y = tables.length === 1 ? 0 : unit(i, tables.length - 1) * 0.85;
    const point = (k: number): Point3 => [unit(k, steps), y, height(positionAt(tables[i], k))];
    const coords = Array.from({ length: Math.floor(time) + 1 }, (_, k) => point(k));
    coords.push(point(time));
    const matched = reference && i < reference.completed && tables[i][steps] === reference.selected;
    if (i === focus) {
      // Тень главного пути на полу — видно, где он в глубине сцены.
      scene.marks.push({ points: coords.map(([x, yy]) => [x, yy, 0] as Point3), color: '#00000066', width: 3, layer: -1 });
      scene.glowLine(coords, '#9aa6ff', 2.6);
    } else if (matched) scene.glowLine(coords, '#ececf2', 1.4);
    else scene.line(coords, '#6b7bff8c', 1.1);
    if (time > 0 || i === focus) {
      const head = point(time);
      if (i === focus) scene.shadow(head, 0.035);
      scene.dot(head, i === focus ? '#8290ff' : '#6b7bff', i === focus ? 0.042 : 0.024);
    }
  }

  // Где закончили пути: стеклянные столбики за последним шагом, длина — сколько путей пришло в это положение.
  if (reference && reference.completed > 0) {
    const counts = new Map<number, number>();
    for (let i = 0; i < reference.completed; i++) counts.set(tables[i][steps], (counts.get(tables[i][steps]) ?? 0) + 1);
    const most = Math.max(...counts.values());
    const half = Math.min(0.03, 0.61 / yMax) * 0.9;
    for (const [position, count] of counts) {
      const z = height(position);
      const length = 0.32 * (count / most);
      const selected = position === reference.selected;
      scene.box(1.03, 1.03 + length, -0.07, 0.07, z - half, z + half, selected ? ['#ffb3e6', '#ff4fc8', '#c23a9a'] : ['#9aa4ff', '#4a5cff', '#3443c4']);
    }
  }

  scene.line(
    [
      [-1, -0.9, 0.04],
      [-1, -0.9, 1.26],
    ],
    ink.faint,
  );
  scene.line(
    [
      [-1, -0.9, 0.65],
      [1, -0.9, 0.65],
    ],
    '#76767f',
  );
  scene.label([-1, -0.9, 0.04], String(-yMax));
  scene.label([-1, -0.9, 1.26], '+' + yMax);
  scene.label([-1, -0.9, 0.65], '0');
  scene.label([1, 1, 0], String(steps));
  return scene;
}

export function pictureScene(hits: readonly number[], size: number, selected: number | null, heat?: readonly string[]) {
  const scene = new Scene(),
    max = Math.max(1, ...hits);
  hits.forEach((value, i) => {
    const col = i % size,
      row = Math.floor(i / size);
    const px = 4 * (Math.floor(((row + 0.5) * ART_SIZE) / size) * ART_SIZE + Math.floor(((col + 0.5) * ART_SIZE) / size));
    const rgb = Array.from(art.slice(px, px + 3));
    const shade = (ratio: number) => 'rgb(' + rgb.map((v) => Math.round(v * ratio)).join(',') + ')';
    const colors = value ? [shade(1), shade(0.68), shade(0.48)] : ['#34343c', '#27272e', '#1f1f25'];
    if (heat) colors[0] = heat[Math.min(value, heat.length - 1)];
    if (i === selected) colors[0] = ink.lime;
    const x = unit(col + 0.5, size),
      y = unit(row + 0.5, size),
      half = 0.94 / size;
    if (value) scene.column(x, y, (value / max) * 0.86, half, half, colors);
    else
      scene.face(
        [
          [x - half, y - half, 0],
          [x + half, y - half, 0],
          [x + half, y + half, 0],
          [x - half, y + half, 0],
        ],
        colors[0],
        colors[0],
        -1,
      );
  });
  return scene;
}

export function triangleScene(map: DensityMap, mode: ColorMode = 'density', sharedMax = 0) {
  const scene = new Scene(),
    bins = map.relief,
    size = map.reliefSize;
  const max = Math.max(1, sharedMax, ...bins);
  const frame: Point3[] = VERTICES.map((p) => [unit(p.x, CANVAS_WIDTH), unit(p.y, CANVAS_HEIGHT), 0.005]);
  // Светящийся контур на полу и вершины — шары тех же цветов, что и точки «после выбора вершины».
  scene.glowLine([...frame, frame[0]], '#c9c9d4', 1.4);
  const vertexColors = [ink.lime, ink.cyan, '#ececf2'];
  frame.forEach((p, i) => {
    scene.shadow(p, 0.05);
    scene.dot([p[0], p[1], 0.06], vertexColors[i], 0.055);
    scene.label([p[0], p[1], 0.16], 'ABC'[i], vertexColors[i]);
  });
  bins.forEach((count, i) => {
    if (!count) return;
    const z = Math.log1p(count) / Math.log1p(max),
      col = i % size,
      row = Math.floor(i / size);
    const top =
      mode === 'vertex'
        ? [ink.lime, ink.cyan, '#ff8fa3'][map.reliefVertex[i]]
        : 'rgb(' +
          gradient(mode === 'order' ? ORDER_STOPS : DENSITY_STOPS, mode === 'order' ? map.reliefStep[i] / map.steps : z)
            .map(Math.round)
            .join(',') +
          ')';
    scene.column(unit(col + 0.5, size), unit(row + 0.5, size), z * 0.85, 0.82 / size, 0.82 / size, [
      top,
      '#4a52a0',
      '#2f3570',
    ]);
  });
  return scene;
}

export function noiseScene(series: NoiseSeries, compare = false, showSource = false, selected?: number) {
  const scene = new Scene(),
    n = 32;
  const surfaces = compare ? ['Кадр', 'Среднее'] : ['Среднее'];
  if (showSource) surfaces.push('Исходник');
  const scale = 1 / surfaces.length;
  surfaces.forEach((title, index) => {
    const center = unit(index + 0.5, surfaces.length);
    const atPixel = (x: number, y: number): Point3 => {
      const pixel = y * series.size + x;
      const value =
        title === 'Кадр' ? series.current[pixel] : title === 'Исходник' ? series.source[pixel] : series.mean(pixel);
      return [
        center + unit(x, series.size - 1) * scale * 0.93,
        unit(y, series.size - 1) * scale,
        (clampByte(value) / 255) * scale * 1.25,
      ];
    };
    const at = (i: number, j: number) =>
      atPixel(Math.round((i * (series.size - 1)) / n), Math.round((j * (series.size - 1)) / n));
    // Закрашенная поверхность: цвет по яркости — тёмно-синий → синий → малиновый → почти белый.
    const top = scale * 1.25;
    for (let j = 0; j < n; j++)
      for (let i = 0; i < n; i++) {
        const quad = [at(i, j), at(i + 1, j), at(i + 1, j + 1), at(i, j + 1)];
        const height = quad.reduce((sum, p) => sum + p[2], 0) / 4 / top;
        const rgb = gradient(DENSITY_STOPS, height).map(Math.round);
        scene.surface(quad, 'rgb(' + rgb.join(',') + ')');
      }
    // Редкая светлая сетка поверх — форма рельефа читается и при повороте.
    for (let j = 0; j <= n; j += 4)
      scene.line(
        Array.from({ length: n + 1 }, (_, i) => at(i, j)),
        index === 0 && compare ? '#c9c9d455' : '#ffffff33',
        0.6,
      );
    if (compare) scene.label([center, scale + 0.15, 0], title);
    if (selected !== undefined) {
      const p = atPixel(selected % series.size, Math.floor(selected / series.size));
      scene.glowLine([[p[0], p[1], 0], p], '#ff4fc8', 1.6);
      scene.dot([p[0], p[1], p[2] + 0.03], '#ff4fc8', 0.032);
    }
  });
  return scene;
}

export function meanScene(samples: readonly (readonly number[])[], domain: readonly [number, number]) {
  const scene = new Scene();
  const x = (v: number) => unit(v - domain[0], domain[1] - domain[0]);
  const rows = samples.map((values) => {
    const frequencies = new Map<number, number>();
    for (const v of values) frequencies.set(v, (frequencies.get(v) ?? 0) + 1);
    return frequencies;
  });
  const max = Math.max(1, ...rows.flatMap((row) => Array.from(row.values())));
  // Шарики одинакового значения ставятся стопкой; радиус такой, чтобы самая высокая стопка помещалась в сцену.
  const r = Math.min(0.045, 0.72 / (2 * max));
  const beamTop = 0.14;

  samples.forEach((values, row) => {
    const y = samples.length === 1 ? 0 : unit(row, samples.length - 1) * 0.63;
    const summary = describe(values);

    // Хромовая доска качелей.
    scene.box(-1.02, 1.02, y - 0.07, y + 0.07, 0.1, beamTop, ['#e4e4ee', '#a9a9b6', '#74747f']);

    // Опора — малиновая призма ровно под средним: доска уравновешена именно там.
    if (summary.mean !== null) {
      const m = x(summary.mean);
      const front = y - 0.07,
        back = y + 0.07;
      scene.face([[m - 0.1, front, 0], [m + 0.1, front, 0], [m, front, 0.1]], '#ff4fc8', '#ff8fd8');
      scene.face([[m - 0.1, back, 0], [m + 0.1, back, 0], [m, back, 0.1]], '#c23a9a', '#c23a9a');
      scene.face([[m - 0.1, front, 0], [m, front, 0.1], [m, back, 0.1], [m - 0.1, back, 0]], '#e04fb6', '#e04fb6');
      scene.face([[m + 0.1, front, 0], [m, front, 0.1], [m, back, 0.1], [m + 0.1, back, 0]], '#ff8fd8', '#ff8fd8');
      scene.shadow([m, y, 0], 0.09);
    }

    // Шарики-наблюдения стопками на доске.
    for (const [v, count] of rows[row]) {
      scene.shadow([x(v), y, 0], r * 1.3);
      for (let j = 0; j < count; j++) scene.dot([x(v), y, beamTop + r + j * 2 * r], row ? '#ececf2' : '#8290ff', r);
    }

    // Лучи среднего (малиновый) и медианы (хромовый) с подписями.
    for (const [value, tag, offset, color] of [
      [summary.mean, 'x̄', -0.13, '#ff4fc8'],
      [summary.median, 'Me', 0.13, '#ececf2'],
    ] as const) {
      if (value === null) continue;
      scene.glowLine(
        [
          [x(value), y + offset, beamTop],
          [x(value), y + offset, 0.86],
        ],
        color,
        1.6,
      );
      scene.label([x(value), y + offset, 0.86], tag + ' ' + Number(value.toFixed(1)).toLocaleString('ru'), color);
    }
  });
  return scene;
}

export function silhouetteScene(mask: Mask, sample: Throws | null, hide: boolean) {
  const scene = new Scene(),
    n = 40,
    side = Math.sqrt(mask.length);
  if (!hide)
    for (let j = 0; j < n; j++)
      for (let i = 0; i < n; i++) {
        if (!mask[Math.floor(((j + 0.5) * side) / n) * side + Math.floor(((i + 0.5) * side) / n)]) continue;
        const x = unit(i, n),
          y = unit(j, n),
          w = 2 / n;
        scene.face(
          [
            [x, y, 0.4],
            [x + w, y, 0.4],
            [x + w, y + w, 0.4],
            [x, y + w, 0.4],
          ],
          '#3443c4cc',
          '#6b7bff',
        );
      }
  if (sample) {
    const stride = Math.max(1, Math.ceil(sample.total / 1600));
    for (let i = 0; i < sample.total; i += stride) {
      const hit = sample.inside[i];
      scene.dot([unit(sample.xs[i], 1), unit(sample.ys[i], 1), hit ? 0.42 : 0.01], hit ? '#8290ff' : '#6a6a78', hit ? 0.016 : 0.013);
    }
  }
  return scene;
}
