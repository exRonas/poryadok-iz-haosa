import { describe, expect, it } from 'vitest';
import type { QuizQuestion } from './math';
import {
  SHARE_CELLS,
  SHARE_MASK,
  SHARE_TRUE,
  SUMMARY_QUESTIONS_4,
  areaQuestion,
  atLeastOutcomes,
  countInside,
  histogram,
  indicatorQuestion,
  indicatorThrows,
  piEstimates,
  piSigma,
  precisionQuestion,
  shareDraws,
  shareEstimate,
  shareQuestion,
  squarePoints,
} from './math4';

const valid = (question: QuizQuestion) => {
  expect(question.options).toHaveLength(3);
  expect(new Set(question.options).size).toBe(3);
  expect(question.correct).toBeGreaterThanOrEqual(0);
  expect(question.correct).toBeLessThan(3);
  expect(question.options.join(' ')).not.toMatch(/NaN|Infinity/);
};

describe('4.1 оценка доли', () => {
  it('рисунок занимает заметную, но не всю часть поля', () => {
    expect(SHARE_MASK).toHaveLength(SHARE_CELLS);
    expect(SHARE_TRUE).toBeGreaterThan(0.25);
    expect(SHARE_TRUE).toBeLessThan(0.6);
  });

  it('оценка по 400 клеткам близка к истинной доле', () => {
    const draws = shareDraws(77, 400);
    expect(draws.slice(0, 50)).toEqual(shareDraws(77, 50));
    const k = draws.filter((cell) => SHARE_MASK[cell]).length;
    const { p, se } = shareEstimate(k, 400);
    expect(Math.abs(p - SHARE_TRUE)).toBeLessThan(3 * se);
    expect(shareEstimate(0, 0)).toEqual({ p: 0, se: 0 });
  });

  it('вопрос корректен и при малой выборке', () => {
    for (const [n, k] of [[0, 0], [5, 2], [20, 0], [100, 43], [400, 170], [37, 36]]) valid(shareQuestion(n, k));
    expect(shareQuestion(100, 25).options[shareQuestion(100, 25).correct]).toBe('≈ 100 клеток');
  });
});

describe('4.2 площадь точками', () => {
  it('доля точек в четверти круга → π/4', () => {
    const points = squarePoints(1777, 20000);
    expect(Array.from(squarePoints(1777, 10))).toEqual(Array.from(points.slice(0, 20)));
    const k = countInside(points, 20000);
    expect(Math.abs((4 * k) / 20000 - Math.PI)).toBeLessThan(3 * piSigma(20000));
  });

  it('вопрос корректен', () => {
    for (const [n, k] of [[0, 0], [100, 80], [5000, 3921], [20000, 15700]]) valid(areaQuestion(n, k));
  });
});

describe('4.3 точность', () => {
  it('разброс оценок близок к теории и падает как 1/√n', () => {
    for (const n of [64, 1024]) {
      const estimates = piEstimates(31, n);
      const mean = estimates.reduce((s, v) => s + v, 0) / estimates.length;
      const sd = Math.sqrt(estimates.reduce((s, v) => s + (v - mean) ** 2, 0) / estimates.length);
      expect(sd / piSigma(n)).toBeGreaterThan(0.8);
      expect(sd / piSigma(n)).toBeLessThan(1.2);
    }
    expect(piSigma(64) / piSigma(1024)).toBeCloseTo(4, 10);
  });

  it('гистограмма считает все значения, края — в крайние столбики', () => {
    expect(histogram([-5, 0.1, 0.5, 0.9, 7], 0, 1, 2)).toEqual([2, 3]);
  });

  it('вопрос корректен', () => {
    for (const n of [16, 64, 256, 1024, 4096]) valid(precisionQuestion(n));
  });
});

describe('4.4 индикаторы', () => {
  it('исходы суммы двух кубиков', () => {
    expect(atLeastOutcomes(2)).toBe(36);
    expect(atLeastOutcomes(10)).toBe(6);
    expect(atLeastOutcomes(12)).toBe(1);
  });

  it('среднее индикаторов → P(A)', () => {
    const { indicators, dice } = indicatorThrows(36, 5000, 10);
    expect(dice[0]).toHaveLength(2);
    const mean = indicators.reduce((s, v) => s + v, 0) / 5000;
    const p = 6 / 36;
    expect(Math.abs(mean - p)).toBeLessThan(3 * Math.sqrt((p * (1 - p)) / 5000));
  });

  it('вопрос корректен при любом s', () => {
    for (let s = 3; s <= 12; s += 1) valid(indicatorQuestion(s));
  });
});

describe('итог курса 4', () => {
  it('4 вопроса по 3 варианта', () => {
    expect(SUMMARY_QUESTIONS_4).toHaveLength(4);
    SUMMARY_QUESTIONS_4.forEach(valid);
  });
});
