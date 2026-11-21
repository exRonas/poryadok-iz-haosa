import { describe, expect, it } from 'vitest';
import { SPREAD_BASE, outlierRow } from '../math';
import {
  areaInitial,
  indicatorInitial,
  precisionInitial,
  restoreArea,
  restoreIndicator,
  restorePrecision,
  restoreShare,
  shareInitial,
  averagingInitial,
  chaosInitial,
  cltInitial,
  llnInitial,
  pathsInitial,
  restoreAveraging,
  restoreChaos,
  restoreClt,
  restoreLln,
  restoreOutlier,
  restorePaths,
  restoreSpread,
  restoreSummary,
  summaryInitial,
} from './state';

describe('restoreSummary', () => {
  it('корректное состояние восстанавливается как есть', () => {
    const state = { answers: [0, null, 2, 1], checked: [true, false, true, false] };
    expect(restoreSummary(JSON.parse(JSON.stringify(state)))).toEqual(state);
  });
  it('отметка проверки без ответа сбрасывается', () => {
    expect(restoreSummary({ answers: [null, null, null, null], checked: [true, false, false, false] }).checked[0]).toBe(false);
  });
  it('мусор, чужая длина и недопустимые варианты — пустые ответы', () => {
    for (const raw of [null, 'x', [], { answers: [0, 1], checked: [true, true] }, { answers: [5, 0, 0, 0], checked: [false, false, false, false] }]) {
      expect(restoreSummary(raw)).toEqual(summaryInitial());
    }
  });
});

describe('restorePaths', () => {
  it('k больше m обрезается до m', () => {
    expect(restorePaths({ m: 4, p: 50, k: 9, seed: 7, thrown: 12 })).toEqual({ m: 4, p: 50, k: 4, seed: 7, thrown: 12 });
  });
  it('p не кратно 5 — начальное состояние', () => {
    expect(restorePaths({ m: 4, p: 52, k: 1, seed: 7, thrown: 0 })).toEqual(pathsInitial());
  });
  it('старое сохранение без thrown — шариков 0', () => {
    expect(restorePaths({ m: 4, p: 50, k: 1, seed: 7 }).thrown).toBe(0);
  });
});


describe('restoreSpread', () => {
  it('старое сохранение только с k — исходная выборка', () => {
    expect(restoreSpread({ k: 1.5 })).toEqual({ k: 1.5, base: [...SPREAD_BASE] });
  });
  it('своя выборка из 5 чисел сохраняется', () => {
    expect(restoreSpread({ k: 1, base: [1, 2, 3, 4, 5.5] })).toEqual({ k: 1, base: [1, 2, 3, 4, 5.5] });
  });
});

describe('restoreOutlier', () => {
  it('старое сохранение {n, shift} превращается в значения', () => {
    expect(restoreOutlier({ n: 10, shift: 50 })).toEqual({ n: 10, values: outlierRow(10, 50) });
  });
  it('значения не той длины — исходный ряд', () => {
    expect(restoreOutlier({ n: 6, values: [40, 50] })).toEqual({ n: 6, values: outlierRow(6, 0) });
  });
});

describe('состояния курса 3', () => {
  it('верные сохранения восстанавливаются', () => {
    expect(restoreLln({ p: 30, thrown: 1200, seed: 5 })).toEqual({ p: 30, thrown: 1200, seed: 5 });
    expect(restoreAveraging({ amplitude: 80, frames: 16, seed: 9 })).toEqual({ amplitude: 80, frames: 16, seed: 9 });
    expect(restoreClt({ dice: 12, thrown: 5000, seed: 3 })).toEqual({ dice: 12, thrown: 5000, seed: 3 });
    expect(restoreChaos({ steps: 30000, seed: 1 })).toEqual({ steps: 30000, seed: 1 });
  });
  it('мусор и значения вне диапазона — начальное состояние', () => {
    expect(restoreLln({ p: 35, thrown: 0, seed: 5 })).toEqual(llnInitial());
    expect(restoreLln({ p: 50, thrown: 5001, seed: 5 })).toEqual(llnInitial());
    expect(restoreAveraging({ amplitude: 50, frames: 1, seed: 1 })).toEqual(averagingInitial());
    expect(restoreAveraging({ amplitude: 80, frames: 0, seed: 1 })).toEqual(averagingInitial());
    expect(restoreClt({ dice: 13, thrown: 0, seed: 1 })).toEqual(cltInitial());
    expect(restoreChaos({ steps: -1, seed: 1 })).toEqual(chaosInitial());
    expect(restoreChaos(null)).toEqual(chaosInitial());
  });
});

describe('состояния курса 4', () => {
  it('верные сохранения восстанавливаются', () => {
    expect(restoreShare({ opened: 120, seed: 4, reveal: true })).toEqual({ opened: 120, seed: 4, reveal: true });
    expect(restoreArea({ thrown: 20000, seed: 4 })).toEqual({ thrown: 20000, seed: 4 });
    expect(restorePrecision({ size: 4, seed: 4 })).toEqual({ size: 4, seed: 4 });
    expect(restoreIndicator({ s: 3, thrown: 10, seed: 4 })).toEqual({ s: 3, thrown: 10, seed: 4 });
  });
  it('мусор — начальное состояние', () => {
    expect(restoreShare({ opened: 401, seed: 4, reveal: false })).toEqual(shareInitial());
    expect(restoreArea({ thrown: 1.5, seed: 4 })).toEqual(areaInitial());
    expect(restorePrecision({ size: 5, seed: 4 })).toEqual(precisionInitial());
    expect(restoreIndicator({ s: 2, thrown: 0, seed: 4 })).toEqual(indicatorInitial());
  });
});
