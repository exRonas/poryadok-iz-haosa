/**
 * Математика курса 3 «Предельные теоремы»: частота и вероятность, усреднение шума,
 * сумма кубиков (ЦПТ) и игра хаоса. Чистые функции без интерфейса.
 */
import { ChaosRun, EQUAL_WEIGHTS, VERTICES } from '../lib/chaosGame';
import { formatStatistic } from '../lib/format';
import { NoiseSeries, geometricGray, noiseSigma } from '../lib/noiseImage';
import { createRng } from '../lib/random';
import type { QuizQuestion } from './math';

const f = formatStatistic;
const f3 = (value: number) => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 3 }).format(value);
const int = (value: number) => new Intl.NumberFormat('ru-RU').format(value);

/** Ставит верный вариант на место correct среди двух первых различных неверных. */
function arrange(right: string, candidates: readonly string[], correct: number): string[] {
  const wrong: string[] = [];
  for (const candidate of candidates) {
    if (candidate !== right && !wrong.includes(candidate)) wrong.push(candidate);
    if (wrong.length === 2) break;
  }
  const options = [...wrong];
  options.splice(correct, 0, right);
  return options;
}

/* ---------- 3.1 Частота и вероятность ---------- */

/** Первые count бросков монеты с вероятностью успеха p; первые k бросков не зависят от count. */
export function coinTosses(seed: number, count: number, p: number): boolean[] {
  const random = createRng(seed);
  return Array.from({ length: count }, () => random() < p);
}

/** Частота успеха после каждого броска: [i] — после i + 1 бросков. */
export function runningFrequency(tosses: readonly boolean[]): number[] {
  let hits = 0;
  return tosses.map((hit, index) => {
    if (hit) hits += 1;
    return hits / (index + 1);
  });
}

/** Стандартное отклонение частоты после n опытов: √(p(1 − p)/n). */
export const frequencySigma = (p: number, n: number): number => (n > 0 ? Math.sqrt((p * (1 - p)) / n) : 0);

export const LLN_QUESTION_N = 400;

export function llnQuestion(p: number): QuizQuestion {
  const n = LLN_QUESTION_N;
  const sigma = frequencySigma(p, n);
  const span = (k: number) => `от ${f3(p - k * sigma)} до ${f3(p + k * sigma)}`;
  const correct = Math.round(p * 10) % 3;
  return {
    text: `Вероятность успеха p = ${f(p)}, сделано n = ${n} опытов. В каком промежутке примерно с вероятностью 95 % окажется частота успеха?`,
    options: arrange(span(2), [span(1), span(3)], correct),
    correct,
    explanation: `σ частоты = √(p(1 − p)/n) = √(${f(p)} · ${f(1 - p)} / ${n}) ≈ ${f3(sigma)}. Около 95 % серий дают частоту в пределах p ± 2σ: ${span(2)}. В p ± σ попадает около 68 % серий, в p ± 3σ — почти все.`,
  };
}

/* ---------- 3.2 Усреднение шума ---------- */

export const NOISE_LESSON_SIZE = 48;

/** Картинка урока: тот же геометрический рисунок, что в эксперименте, в размере 48 × 48. */
export const noiseLessonSource = (): Float32Array => geometricGray(NOISE_LESSON_SIZE);

/** Серия из frames шумных кадров с амплитудой amplitude (шум равномерный, σ = a/√3). */
export function noiseRun(seed: number, amplitude: number, frames: number): NoiseSeries {
  const series = new NoiseSeries(noiseLessonSource(), NOISE_LESSON_SIZE, amplitude, seed);
  series.addFrames(frames);
  return series;
}

export { noiseSigma };

/** Во сколько раз уменьшить шум в вопросе: 2, 3 или 4 — зависит от амплитуды, чтобы вопрос менялся. */
export const noiseFactor = (amplitude: number): number => (Math.round(amplitude / 20) % 3) + 2;

export function noiseQuestion(amplitude: number): QuizQuestion {
  const sigma = noiseSigma(amplitude);
  const k = noiseFactor(amplitude);
  const correct = k % 3;
  return {
    text: `Шум одного кадра σ ≈ ${f(sigma)}. Сколько независимых кадров нужно усреднить, чтобы шум стал в ${k} раза меньше, около ${f(sigma / k)}?`,
    options: arrange(String(k * k), [String(k), String(2 * k), String(k * k * k)], correct),
    correct,
    explanation: `Шум среднего n кадров равен σ/√n. Чтобы он стал в ${k} раза меньше, нужно √n = ${k}, то есть n = ${k}² = ${k * k}. Удвоить точность — вчетверо больше кадров.`,
  };
}

/* ---------- 3.3 Центральная предельная теорема ---------- */

export const DIE_MEAN = 3.5;
export const DIE_VARIANCE = 35 / 12;

/** Бросок кубика: 1…6. */
const rollDie = (random: () => number): number => Math.min(6, Math.floor(random() * 6) + 1);

/** throws бросков по dice кубиков: [i] — значения кубиков в i-м броске. Первые k бросков не зависят от throws. */
export function diceThrows(seed: number, throws: number, dice: number): number[][] {
  const random = createRng(seed);
  return Array.from({ length: throws }, () => Array.from({ length: dice }, () => rollDie(random)));
}

/** Точное распределение суммы dice кубиков: [s − dice] — P(S = s), s = dice…6·dice. */
export function diceSumDistribution(dice: number): number[] {
  let distribution = [1];
  for (let i = 0; i < dice; i += 1) {
    const next = Array<number>(distribution.length + 5).fill(0);
    distribution.forEach((probability, s) => {
      for (let face = 0; face < 6; face += 1) next[s + face] += probability / 6;
    });
    distribution = next;
  }
  return distribution;
}

export function cltQuestion(dice: number): QuizQuestion {
  const e = DIE_MEAN * dice;
  const d = DIE_VARIANCE * dice;
  const correct = dice % 3;
  const pair = (a: number, b: number) => `E = ${f(a)}, D ≈ ${f(b)}`;
  return {
    text: `Бросают n = ${dice} ${dice === 1 ? 'кубик' : dice < 5 ? 'кубика' : 'кубиков'}. Чему равны матожидание и дисперсия суммы очков?`,
    options: arrange(pair(e, d), [pair(e, DIE_VARIANCE), pair(DIE_MEAN, d), pair(e, Math.sqrt(d)), pair(e, d * dice), pair(e, e)], correct),
    correct,
    explanation: `У одного кубика E = 3,5 и D = 35/12 ≈ 2,92. Для суммы независимых слагаемых и матожидания, и дисперсии складываются: E = 3,5 · ${dice} = ${f(e)}, D = 35/12 · ${dice} ≈ ${f(d)}.`,
  };
}

/* ---------- 3.4 Порядок из хаоса ---------- */

export interface ChaosPicture {
  /** Координаты точек холста 600 × 540 (x, y подряд). */
  points: Float32Array;
  /** Выборы вершин A, B, C. */
  counts: [number, number, number];
  /** Число точек в каждом из 9 треугольников второго уровня: [последняя вершина][предпоследняя]. */
  cells: number[][];
  /** Последняя точка. */
  last: { x: number; y: number };
}

/**
 * Игра хаоса с равными вероятностями вершин. Первые две точки в учёт треугольников не идут:
 * точка попадает в треугольник второго уровня «последняя вершина, внутри — предпоследняя» только со второго шага.
 */
export function chaosPicture(seed: number, steps: number): ChaosPicture {
  const run = new ChaosRun(EQUAL_WEIGHTS, createRng(seed));
  const points = new Float32Array(steps * 2);
  const cells = [0, 1, 2].map(() => [0, 0, 0]);
  let previous: number | null = null;
  for (let i = 0; i < steps; i += 1) {
    const vertex = run.step();
    points[2 * i] = run.x;
    points[2 * i + 1] = run.y;
    if (previous !== null) cells[vertex][previous] += 1;
    previous = vertex;
  }
  return { points, counts: [...run.counts], cells, last: { x: run.x, y: run.y } };
}

export { VERTICES };

/** N для вопроса: текущее число точек, если их хотя бы 900, иначе 9000. Округлено до сотен. */
export const chaosQuestionN = (steps: number): number => (steps >= 900 ? Math.round(steps / 100) * 100 : 9000);

export function chaosQuestion(steps: number): QuizQuestion {
  const n = chaosQuestionN(steps);
  const correct = (n / 100) % 3;
  const about = (value: number) => `около ${int(Math.round(value))}`;
  return {
    text: `В игре хаоса поставлено N = ${int(n)} точек. Сколько примерно из них попадёт в один из 9 треугольников второго уровня?`,
    options: arrange(about(n / 9), [about(n / 16), about(n / 3), about(n / 4)], correct),
    correct,
    explanation: `Точка лежит в треугольнике второго уровня, если две последние выбранные вершины — нужная пара. Вероятность пары (1/3) · (1/3) = 1/9, по закону больших чисел частота близка к ней: ${int(n)} / 9 ≈ ${int(Math.round(n / 9))}. Площадь такого треугольника — 1/16 большого, но точки не попадают в пустые «дыры», поэтому доля больше площади.`,
  };
}

/* ---------- Итог курса 3 ---------- */

export const SUMMARY_QUESTIONS_3: readonly QuizQuestion[] = [
  {
    text: 'Монету (p = 0,5) бросили 10 000 раз. Чему примерно равно стандартное отклонение частоты орлов?',
    options: ['0,05', '0,005', '50'],
    correct: 1,
    explanation: 'σ = √(p(1 − p)/n) = √(0,25 / 10 000) = 0,5 / 100 = 0,005. Частота почти наверняка между 0,49 и 0,51 (p ± 2σ). 50 — это σ числа орлов, а не частоты.',
  },
  {
    text: 'Шум кадра σ = 30. Сколько кадров нужно усреднить, чтобы шум стал 10?',
    options: ['3', '9', '30'],
    correct: 1,
    explanation: 'Шум среднего σ/√n = 30/√n = 10, отсюда √n = 3 и n = 9.',
  },
  {
    text: 'Бросают 12 кубиков. Чему равно стандартное отклонение суммы очков?',
    options: ['35', '≈ 2,92', '≈ 5,92'],
    correct: 2,
    explanation: 'D = 12 · 35/12 = 35, σ = √35 ≈ 5,92. 2,92 — дисперсия одного кубика, 35 — дисперсия суммы, а не σ.',
  },
  {
    text: 'В игре хаоса 27 000 точек. Сколько примерно их в одном из 27 треугольников третьего уровня?',
    options: ['около 1 000', 'около 422', 'около 9 000'],
    correct: 0,
    explanation: 'Треугольник третьего уровня задают три последние вершины: вероятность (1/3)³ = 1/27, значит около 27 000 / 27 = 1 000 точек. 422 ≈ 27 000 / 64 — доля площади, она меньше из-за пустых дыр.',
  },
];
