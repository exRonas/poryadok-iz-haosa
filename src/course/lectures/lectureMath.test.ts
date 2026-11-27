import { describe, expect, it } from 'vitest';
import { binomial, choose, counts, iqrFences, mean, median, moments, normalPdf, quartiles, sumDistribution, variance } from './lectureMath';

describe('математика лекций', () => {
  it('среднее и медиана', () => {
    expect(mean([1, 2, 3, 10])).toBe(4);
    expect(median([5, 1, 3])).toBe(3);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(mean([])).toBe(0);
  });

  it('частоты в сумме дают N', () => {
    const c = counts([0, 1, 1, 3, 3, 3], 0, 4);
    expect(c).toEqual([1, 2, 0, 3, 0]);
    expect(c.reduce((a, b) => a + b, 0)).toBe(6);
  });

  it('дисперсия без поправки', () => {
    expect(variance([2, 4, 4, 4, 5, 5, 7, 9])).toBe(4);
    expect(variance([3, 3, 3])).toBe(0);
  });

  it('квартили и правило 1,5·IQR', () => {
    expect(quartiles([1, 2, 3, 4, 5, 6, 7, 8])).toEqual({ q1: 2.5, q3: 6.5 });
    expect(quartiles([1, 2, 3, 4, 5, 6, 7])).toEqual({ q1: 2, q3: 6 });
    const f = iqrFences([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(f).toEqual({ low: -3.5, high: 12.5, iqr: 4 });
  });
});

describe('распределения в лекциях', () => {
  it('сочетания и биномиальное', () => {
    expect(choose(4, 2)).toBe(6);
    expect(choose(10, 0)).toBe(1);
    expect(choose(3, 5)).toBe(0);
    const b = binomial(4, 0.5);
    expect(b[2]).toBeCloseTo(6 / 16);
    expect(b.reduce((a, c) => a + c, 0)).toBeCloseTo(1);
    const mo = moments(binomial(10, 0.3));
    expect(mo.mean).toBeCloseTo(3);
    expect(mo.variance).toBeCloseTo(2.1);
  });

  it('сумма кубиков', () => {
    const die = Array.from({ length: 6 }, () => 1 / 6);
    const two = sumDistribution(die, 2);
    expect(two).toHaveLength(11);
    expect(two[5]).toBeCloseTo(6 / 36);
    const mo = moments(sumDistribution(die, 3), 3);
    expect(mo.mean).toBeCloseTo(10.5);
    expect(mo.variance).toBeCloseTo(35 / 4);
  });

  it('плотность нормального', () => {
    expect(normalPdf(0, 0, 1)).toBeCloseTo(0.3989, 4);
  });
});