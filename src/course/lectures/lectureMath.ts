/** Простая математика для мини-опытов в лекциях. Всё по выборке как есть, без поправки N − 1. */

export const mean = (xs: readonly number[]): number => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);

export function median(xs: readonly number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Абсолютные частоты значений from..to. */
export function counts(xs: readonly number[], from: number, to: number): number[] {
  const out = Array.from({ length: to - from + 1 }, () => 0);
  for (const x of xs) if (x >= from && x <= to) out[x - from] += 1;
  return out;
}

/** Дисперсия D = (1/N) Σ (xᵢ − x̄)². */
export function variance(xs: readonly number[]): number {
  if (!xs.length) return 0;
  const m = mean(xs);
  return xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length;
}

/** Квартили как медианы нижней и верхней половин (центральный элемент при нечётном N не входит ни в одну). */
export function quartiles(xs: readonly number[]): { q1: number; q3: number } {
  const s = [...xs].sort((a, b) => a - b);
  const half = Math.floor(s.length / 2);
  return { q1: median(s.slice(0, half)), q3: median(s.slice(s.length - half)) };
}

/** Границы правила 1,5·IQR: всё, что за ними, считается выбросом. */
export function iqrFences(xs: readonly number[]): { low: number; high: number; iqr: number } {
  const { q1, q3 } = quartiles(xs);
  const iqr = q3 - q1;
  return { low: q1 - 1.5 * iqr, high: q3 + 1.5 * iqr, iqr };
}

/** Число сочетаний C(m, k). */
export function choose(m: number, k: number): number {
  if (k < 0 || k > m) return 0;
  let r = 1;
  for (let i = 1; i <= k; i += 1) r = (r * (m - k + i)) / i;
  return Math.round(r);
}

/** Биномиальные вероятности P(X = k), k = 0..m. */
export const binomial = (m: number, p: number): number[] =>
  Array.from({ length: m + 1 }, (_, k) => choose(m, k) * p ** k * (1 - p) ** (m - k));

export const normalPdf = (x: number, mu: number, sigma: number): number =>
  Math.exp(-((x - mu) ** 2) / (2 * sigma * sigma)) / (sigma * Math.sqrt(2 * Math.PI));

/** Распределение суммы n независимых копий величины с вероятностями base (значения 1..base.length). Индекс i — сумма n + i. */
export function sumDistribution(base: readonly number[], n: number): number[] {
  let dist = [...base];
  for (let t = 1; t < n; t += 1) {
    const next = Array.from({ length: dist.length + base.length - 1 }, () => 0);
    dist.forEach((a, i) => base.forEach((b, j) => (next[i + j] += a * b)));
    dist = next;
  }
  return dist;
}

/** Среднее и дисперсия дискретной величины со значениями from, from + 1, … */
export function moments(probs: readonly number[], from = 0): { mean: number; variance: number } {
  const m = probs.reduce((s, q, i) => s + q * (from + i), 0);
  const v = probs.reduce((s, q, i) => s + q * (from + i - m) ** 2, 0);
  return { mean: m, variance: v };
}