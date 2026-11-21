import { describe, expect, it } from 'vitest';
import {
  DIE_MEAN,
  DIE_VARIANCE,
  SUMMARY_QUESTIONS_3,
  chaosPicture,
  chaosQuestion,
  chaosQuestionN,
  cltQuestion,
  coinTosses,
  diceSumDistribution,
  diceThrows,
  frequencySigma,
  llnQuestion,
  noiseFactor,
  noiseQuestion,
  noiseRun,
  noiseSigma,
  runningFrequency,
} from './math3';
import type { QuizQuestion } from './math';

const valid = (question: QuizQuestion) => {
  expect(question.options).toHaveLength(3);
  expect(new Set(question.options).size).toBe(3);
  expect(question.correct).toBeGreaterThanOrEqual(0);
  expect(question.correct).toBeLessThan(3);
  expect(question.options.join(' ')).not.toMatch(/NaN|Infinity/);
};

describe('3.1 частота и вероятность', () => {
  it('броски воспроизводимы и не зависят от их числа', () => {
    expect(coinTosses(5, 50, 0.5)).toEqual(coinTosses(5, 200, 0.5).slice(0, 50));
  });

  it('частота стремится к p', () => {
    for (const p of [0.1, 0.5, 0.9]) {
      const frequency = runningFrequency(coinTosses(17, 5000, p));
      expect(Math.abs(frequency[4999] - p)).toBeLessThan(4 * frequencySigma(p, 5000));
    }
  });

  it('частота считается по каждому броску', () => {
    expect(runningFrequency([true, false, true, true])).toEqual([1, 0.5, 2 / 3, 0.75]);
  });

  it('σ частоты: √(p(1 − p)/n)', () => {
    expect(frequencySigma(0.5, 100)).toBeCloseTo(0.05);
    expect(frequencySigma(0.5, 0)).toBe(0);
  });

  it('вопрос корректен при любом p', () => {
    for (let p = 10; p <= 90; p += 10) {
      const question = llnQuestion(p / 100);
      valid(question);
      expect(question.options[question.correct]).toContain(p === 50 ? '0,45' : '');
    }
  });
});

describe('3.2 усреднение шума', () => {
  it('ошибка среднего падает примерно как σ/√n', () => {
    const amplitude = 120;
    const series = noiseRun(21, amplitude, 64);
    const sigma = noiseSigma(amplitude);
    expect(series.rmse[0]).toBeCloseTo(sigma, -0.5);
    expect(series.rmse[15] / (sigma / 4)).toBeGreaterThan(0.9);
    expect(series.rmse[15] / (sigma / 4)).toBeLessThan(1.1);
    expect(series.rmse[63] / (sigma / 8)).toBeGreaterThan(0.9);
    expect(series.rmse[63] / (sigma / 8)).toBeLessThan(1.1);
  });

  it('вопрос: k² кадров, варианты различны', () => {
    for (let a = 40; a <= 160; a += 20) {
      const question = noiseQuestion(a);
      valid(question);
      const k = noiseFactor(a);
      expect(question.options[question.correct]).toBe(String(k * k));
    }
  });
});

describe('3.3 центральная предельная теорема', () => {
  it('распределение суммы кубиков нормировано и симметрично', () => {
    for (const dice of [1, 2, 5, 12]) {
      const distribution = diceSumDistribution(dice);
      expect(distribution).toHaveLength(5 * dice + 1);
      expect(distribution.reduce((s, v) => s + v, 0)).toBeCloseTo(1, 12);
      expect(distribution[0]).toBeCloseTo(distribution[distribution.length - 1], 15);
      const mean = distribution.reduce((s, v, i) => s + v * (i + dice), 0);
      const variance = distribution.reduce((s, v, i) => s + v * (i + dice - mean) ** 2, 0);
      expect(mean).toBeCloseTo(DIE_MEAN * dice, 10);
      expect(variance).toBeCloseTo(DIE_VARIANCE * dice, 10);
    }
    expect(diceSumDistribution(2)[5]).toBeCloseTo(6 / 36, 15);
  });

  it('броски воспроизводимы, значения 1…6', () => {
    const throws = diceThrows(6, 300, 4);
    expect(throws.slice(0, 100)).toEqual(diceThrows(6, 100, 4));
    expect(throws.flat().every((v) => v >= 1 && v <= 6 && Number.isInteger(v))).toBe(true);
  });

  it('вопрос корректен при любом числе кубиков', () => {
    for (let dice = 1; dice <= 12; dice += 1) valid(cltQuestion(dice));
  });
});

describe('3.4 игра хаоса', () => {
  it('доли 9 треугольников второго уровня близки к 1/9', () => {
    const picture = chaosPicture(1904, 30000);
    const total = picture.cells.flat().reduce((s, v) => s + v, 0);
    expect(total).toBe(29999);
    for (const count of picture.cells.flat()) expect(Math.abs(count / total - 1 / 9)).toBeLessThan(0.01);
    expect(picture.counts.reduce((s, v) => s + v, 0)).toBe(30000);
  });

  it('точка лежит в угловом треугольнике последней вершины', () => {
    const picture = chaosPicture(7, 200);
    // Вершина A сверху: точки её треугольника выше середины высоты.
    const { points } = picture;
    for (let i = 0; i < 200; i += 1) {
      expect(points[2 * i + 1]).toBeGreaterThanOrEqual(36 - 1e-6);
      expect(points[2 * i + 1]).toBeLessThanOrEqual(504 + 1e-6);
    }
  });

  it('вопрос: N/9, для малых N берётся 9000', () => {
    expect(chaosQuestionN(100)).toBe(9000);
    expect(chaosQuestionN(12345)).toBe(12300);
    for (const steps of [0, 900, 5000, 30000]) {
      const question = chaosQuestion(steps);
      valid(question);
      expect(question.options[question.correct]).toBe(`около ${new Intl.NumberFormat('ru-RU').format(Math.round(chaosQuestionN(steps) / 9))}`);
    }
  });
});

describe('итог курса 3', () => {
  it('4 вопроса по 3 варианта', () => {
    expect(SUMMARY_QUESTIONS_3).toHaveLength(4);
    SUMMARY_QUESTIONS_3.forEach(valid);
  });
});
