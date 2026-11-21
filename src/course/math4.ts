/**
 * Математика курса 4 «Оценивание и Монте-Карло»: оценка доли, площадь точками,
 * точность оценки и метод индикаторов. Чистые функции без интерфейса.
 */
import { formatStatistic } from '../lib/format';
import { createRng } from '../lib/random';
import type { QuizQuestion } from './math';
import { diceThrows } from './math3';

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

/* ---------- 4.1 Оценка доли ---------- */

export const SHARE_GRID = 20;
export const SHARE_CELLS = SHARE_GRID * SHARE_GRID;

/** Скрытый рисунок 20 × 20 — сердце: (x² + y² − 1)³ ≤ x²y³. 1 — клетка рисунка. */
export const SHARE_MASK: Uint8Array = (() => {
  const mask = new Uint8Array(SHARE_CELLS);
  for (let row = 0; row < SHARE_GRID; row += 1) {
    for (let col = 0; col < SHARE_GRID; col += 1) {
      const x = ((col + 0.5) / SHARE_GRID - 0.5) * 3.3;
      const y = (0.5 - (row + 0.5) / SHARE_GRID) * 3.3 + 0.2;
      mask[row * SHARE_GRID + col] = (x * x + y * y - 1) ** 3 - x * x * y ** 3 <= 0 ? 1 : 0;
    }
  }
  return mask;
})();

export const SHARE_TRUE = SHARE_MASK.reduce((s, v) => s + v, 0) / SHARE_CELLS;

/** Номера первых count случайных клеток (с возвращением: клетку можно вытянуть снова). */
export function shareDraws(seed: number, count: number): number[] {
  const random = createRng(seed);
  return Array.from({ length: count }, () => Math.min(SHARE_CELLS - 1, Math.floor(random() * SHARE_CELLS)));
}

/** Оценка доли и её стандартная ошибка по k попаданиям из n. */
export function shareEstimate(k: number, n: number): { p: number; se: number } {
  if (n <= 0) return { p: 0, se: 0 };
  const p = k / n;
  return { p, se: Math.sqrt((p * (1 - p)) / n) };
}

export function shareQuestion(n: number, k: number): QuizQuestion {
  const useState = n >= 20 && k > 0 && k < n;
  const nn = useState ? n : 50;
  const kk = useState ? k : 18;
  const estimate = (SHARE_CELLS * kk) / nn;
  const correct = nn % 3;
  const cells = (value: number) => `≈ ${f(value)} клеток`;
  return {
    text: `Поле из ${SHARE_CELLS} клеток. Наугад открыли ${nn} клеток, ${kk} из них оказались частью рисунка. Сколько клеток занимает весь рисунок?`,
    options: arrange(cells(estimate), [cells(kk), cells((SHARE_CELLS * (nn - kk)) / nn), cells((nn * kk) / SHARE_CELLS), cells(estimate / 2)], correct),
    correct,
    explanation: `Доля рисунка в выборке p̂ = ${kk} / ${nn} = ${f3(kk / nn)}. Выборка случайная, поэтому эта доля оценивает долю рисунка на всём поле: ${SHARE_CELLS} · ${f3(kk / nn)} ≈ ${f(estimate)} клеток.`,
  };
}

/* ---------- 4.2 Площадь точками ---------- */

/** count случайных точек в квадрате [0; 1]²: x, y подряд. Первые k точек не зависят от count. */
export function squarePoints(seed: number, count: number): Float64Array {
  const random = createRng(seed);
  const points = new Float64Array(count * 2);
  for (let i = 0; i < count * 2; i += 1) points[i] = random();
  return points;
}

/** Точка внутри четверти круга радиуса 1 с центром в углу (0; 0). */
export const insideQuarter = (x: number, y: number): boolean => x * x + y * y <= 1;

export function countInside(points: Float64Array, count: number): number {
  let inside = 0;
  for (let i = 0; i < count; i += 1) if (insideQuarter(points[2 * i], points[2 * i + 1])) inside += 1;
  return inside;
}

export function areaQuestion(n: number, k: number): QuizQuestion {
  const useState = n >= 100;
  const nn = useState ? n : 1000;
  const kk = useState ? k : 780;
  const estimate = (4 * kk) / nn;
  const correct = Math.round(nn / 100) % 3;
  return {
    text: `Квадрат со стороной 2 (площадь 4). В него бросили ${int(nn)} случайных точек, ${int(kk)} попали в фигуру. Чему примерно равна площадь фигуры?`,
    options: arrange(f3(estimate), [f3(kk / nn), f3((4 * (nn - kk)) / nn), f3(estimate / 2), f3(estimate * 2)], correct),
    correct,
    explanation: `Доля точек в фигуре ${int(kk)} / ${int(nn)} = ${f3(kk / nn)} оценивает долю площади. Площадь фигуры ≈ 4 · ${f3(kk / nn)} = ${f3(estimate)}.`,
  };
}

/* ---------- 4.3 Точность ~1/√n ---------- */

export const PRECISION_SIZES = [16, 64, 256, 1024, 4096] as const;
export const PRECISION_REPEATS = 200;
const QUARTER = Math.PI / 4;

/** Теоретическое σ оценки π = 4·(доля точек в четверти круга) по n точкам. */
export const piSigma = (n: number): number => 4 * Math.sqrt((QUARTER * (1 - QUARTER)) / n);

/** repeats независимых оценок π по n точкам каждая. */
export function piEstimates(seed: number, n: number, repeats: number = PRECISION_REPEATS): number[] {
  const random = createRng(seed);
  return Array.from({ length: repeats }, () => {
    let inside = 0;
    for (let i = 0; i < n; i += 1) {
      const x = random();
      const y = random();
      if (x * x + y * y <= 1) inside += 1;
    }
    return (4 * inside) / n;
  });
}

/** Гистограмма значений в bins равных интервалах [from; to]; значения за краями — в крайние столбики. */
export function histogram(values: readonly number[], from: number, to: number, bins: number): number[] {
  const counts = Array<number>(bins).fill(0);
  const width = (to - from) / bins;
  for (const value of values) counts[Math.min(bins - 1, Math.max(0, Math.floor((value - from) / width)))] += 1;
  return counts;
}

export function precisionQuestion(n: number): QuizQuestion {
  const k = n >= 1024 ? 3 : 2;
  const correct = Math.round(Math.log2(n)) % 3;
  return {
    text: `По n = ${int(n)} точкам оценка π имеет σ ≈ ${f3(piSigma(n))}. Сколько точек нужно, чтобы σ стала в ${k} раза меньше?`,
    options: arrange(int(n * k * k), [int(n * k), int(n * k * k * k * k), int(n + k)], correct),
    correct,
    explanation: `σ оценки пропорциональна 1/√n. Чтобы уменьшить её в ${k} раза, нужно в ${k}² = ${k * k} раза больше точек: ${int(n)} · ${k * k} = ${int(n * k * k)}.`,
  };
}

/* ---------- 4.4 Метод индикаторов ---------- */

/** Вероятность события «сумма двух кубиков ≥ s» — число исходов из 36. */
export function atLeastOutcomes(s: number): number {
  let outcomes = 0;
  for (let a = 1; a <= 6; a += 1) for (let b = 1; b <= 6; b += 1) if (a + b >= s) outcomes += 1;
  return outcomes;
}

/** Броски пары кубиков и индикаторы события «сумма ≥ s». */
export function indicatorThrows(seed: number, count: number, s: number): { dice: number[][]; indicators: number[] } {
  const dice = diceThrows(seed, count, 2);
  return { dice, indicators: dice.map(([a, b]) => (a + b >= s ? 1 : 0)) };
}

export function indicatorQuestion(s: number): QuizQuestion {
  const outcomes = atLeastOutcomes(s);
  const p = outcomes / 36;
  const pair = (e: number, d: number) => `E(I) = ${f3(e)}, D(I) = ${f3(d)}`;
  const correct = s % 3;
  return {
    text: `Индикатор I равен 1, если сумма двух кубиков не меньше ${s}, иначе 0. P(A) = ${outcomes}/36. Чему равны E(I) и D(I)?`,
    options: arrange(pair(p, p * (1 - p)), [pair(p, p), pair(1 - p, p * (1 - p)), pair(p * (1 - p), p), pair(0.5, 0.25)], correct),
    correct,
    explanation: `I принимает значение 1 с вероятностью p = ${outcomes}/36 ≈ ${f3(p)} и 0 с вероятностью 1 − p. E(I) = 1 · p = ${f3(p)}. E(I²) = p, поэтому D(I) = p − p² = p(1 − p) ≈ ${f3(p * (1 - p))}.`,
  };
}

/* ---------- Итог курса 4 ---------- */

export const SUMMARY_QUESTIONS_4: readonly QuizQuestion[] = [
  {
    text: 'Из 1000 опрошенных 380 за проект. Каков примерно 95-процентный интервал для доли сторонников?',
    options: ['от 0,35 до 0,41', 'от 0,37 до 0,39', 'от 0,28 до 0,48'],
    correct: 0,
    explanation: 'p̂ = 0,38, σ̂ = √(0,38 · 0,62 / 1000) ≈ 0,015. Интервал p̂ ± 2σ̂ ≈ от 0,35 до 0,41.',
  },
  {
    text: 'В квадрат площадью 9 бросили 2000 точек, в фигуру попали 500. Чему равна оценка площади фигуры?',
    options: ['0,25', '2,25', '6,75'],
    correct: 1,
    explanation: 'Доля точек 500 / 2000 = 0,25, площадь ≈ 9 · 0,25 = 2,25. 6,75 — площадь вне фигуры.',
  },
  {
    text: 'Оценка по 10 000 точкам имеет погрешность около 0,016. Сколько точек нужно для погрешности около 0,004?',
    options: ['40 000', '160 000', '1 000 000'],
    correct: 1,
    explanation: 'Погрешность ∝ 1/√n: уменьшить её в 4 раза — в 16 раз больше точек, 10 000 · 16 = 160 000.',
  },
  {
    text: 'Индикатор события с P(A) = 0,2 усреднили по 400 опытам. Чему равно стандартное отклонение среднего?',
    options: ['0,02', '0,16', '0,0004'],
    correct: 0,
    explanation: 'D(I) = 0,2 · 0,8 = 0,16. Дисперсия среднего 0,16 / 400 = 0,0004, σ = √0,0004 = 0,02.',
  },
];
