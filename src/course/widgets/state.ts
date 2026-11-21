/**
 * Состояния учебных виджетов курсов 1–4: начальные значения и восстановление из localStorage.
 * Всё, что не прошло проверку, заменяется начальным состоянием целиком.
 */
import { BOARD_BINS, SPREAD_BASE, outlierRow } from '../math';

const isInt = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
const isNum = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
const asObject = (raw: unknown): Record<string, unknown> | null =>
  typeof raw === 'object' && raw !== null && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null;

/* 1.1 */
export interface FrequencyState {
  seed: number;
  thrown: number;
  bin: number;
  mode: 'count' | 'share';
  theory: boolean;
}
export const MAX_THROWN = 1000;
export const frequencyInitial = (): FrequencyState => ({ seed: 2026, thrown: 0, bin: 4, mode: 'count', theory: false });
export function restoreFrequency(raw: unknown): FrequencyState {
  const o = asObject(raw);
  if (
    o &&
    isInt(o.seed, 1, 2 ** 32 - 1) &&
    isInt(o.thrown, 0, MAX_THROWN) &&
    isInt(o.bin, 0, BOARD_BINS - 1) &&
    (o.mode === 'count' || o.mode === 'share') &&
    typeof o.theory === 'boolean'
  ) {
    return { seed: o.seed, thrown: o.thrown, bin: o.bin, mode: o.mode, theory: o.theory };
  }
  return frequencyInitial();
}

/* 1.2 */
export interface BalanceState {
  values: number[];
  pivot: number;
}
export const BALANCE_MAX = 20;
export const balanceInitial = (): BalanceState => ({ values: [3, 5, 6, 11, 15], pivot: 12 });
export function restoreBalance(raw: unknown): BalanceState {
  const o = asObject(raw);
  if (
    o &&
    Array.isArray(o.values) &&
    o.values.length === 5 &&
    o.values.every((value) => isNum(value, 0, BALANCE_MAX)) &&
    isNum(o.pivot, 0, BALANCE_MAX)
  ) {
    // После физики шарики стоят не на целых делениях — храним с точностью 0,1.
    return { values: (o.values as number[]).map((v) => Math.round(v * 10) / 10), pivot: Math.round(o.pivot * 10) / 10 };
  }
  return balanceInitial();
}

/* 1.3 */
export interface SpreadState {
  k: number;
  /** Выборка до растяжения: 5 чисел; точки можно таскать, поэтому она хранится целиком. */
  base: number[];
}
export const SPREAD_DOMAIN: readonly [number, number] = [-4, 20];
export const spreadInitial = (): SpreadState => ({ k: 1, base: [...SPREAD_BASE] });
export function restoreSpread(raw: unknown): SpreadState {
  const o = asObject(raw);
  if (o && isNum(o.k, 0.5, 2) && Number.isInteger(o.k * 4)) {
    const base =
      Array.isArray(o.base) && o.base.length === 5 && o.base.every((v) => isNum(v, SPREAD_DOMAIN[0], SPREAD_DOMAIN[1]))
        ? (o.base as number[]).map((v) => Math.round(v * 10) / 10)
        : [...SPREAD_BASE];
    return { k: o.k, base };
  }
  return spreadInitial();
}

/* 1.4 */
export interface OutlierState {
  n: number;
  /** Значения выборки: любую точку можно утащить. */
  values: number[];
}
export const OUTLIER_DOMAIN: readonly [number, number] = [35, 165];
export const outlierInitial = (): OutlierState => ({ n: 10, values: outlierRow(10, 0) });
export function restoreOutlier(raw: unknown): OutlierState {
  const o = asObject(raw);
  if (!o || !isInt(o.n, 5, 30)) return outlierInitial();
  if (Array.isArray(o.values) && o.values.length === o.n && o.values.every((v) => isNum(v, OUTLIER_DOMAIN[0], OUTLIER_DOMAIN[1]))) {
    return { n: o.n, values: (o.values as number[]).map((v) => Math.round(v * 10) / 10) };
  }
  // Сохранения до перетаскивания были вида {n, shift}: сдвиг самого большого значения.
  if (isInt(o.shift, 0, 100)) return { n: o.n, values: outlierRow(o.n, o.shift) };
  return { n: o.n, values: outlierRow(o.n, 0) };
}

/* Итог курса: ответы на 4 итоговых вопроса */
export interface SummaryState {
  answers: (number | null)[];
  checked: boolean[];
}
const SUMMARY_COUNT = 4;
export const summaryInitial = (): SummaryState => ({
  answers: Array<number | null>(SUMMARY_COUNT).fill(null),
  checked: Array<boolean>(SUMMARY_COUNT).fill(false),
});
export function restoreSummary(raw: unknown): SummaryState {
  const o = asObject(raw);
  if (
    o &&
    Array.isArray(o.answers) &&
    Array.isArray(o.checked) &&
    o.answers.length === SUMMARY_COUNT &&
    o.checked.length === SUMMARY_COUNT &&
    o.answers.every((answer) => answer === null || isInt(answer, 0, 2)) &&
    o.checked.every((value) => typeof value === 'boolean')
  ) {
    const answers = o.answers as (number | null)[];
    return { answers: [...answers], checked: (o.checked as boolean[]).map((value, i) => value && answers[i] !== null) };
  }
  return summaryInitial();
}

/* 2.1 Пути шарика */
export interface PathsState {
  m: number;
  /** Вероятность поворота вправо в процентах, шаг 5. */
  p: number;
  k: number;
  seed: number;
  /** Сколько шариков брошено на этой доске (до 200). */
  thrown: number;
}
export const PATHS_MAX = 200;
export const pathsInitial = (): PathsState => ({ m: 8, p: 50, k: 3, seed: 7, thrown: 0 });
const isPercent = (value: unknown, min: number, max: number): value is number => isInt(value, min, max) && value % 5 === 0;
export function restorePaths(raw: unknown): PathsState {
  const o = asObject(raw);
  if (o && isInt(o.m, 1, 10) && isPercent(o.p, 0, 100) && isInt(o.k, 0, 10) && isInt(o.seed, 1, 2 ** 32 - 1)) {
    // Старые сохранения (до анимации) были без thrown — считаем, что шариков ещё не бросали.
    const thrown = isInt(o.thrown, 0, PATHS_MAX) ? o.thrown : 0;
    return { m: o.m, p: o.p, k: Math.min(o.k, o.m), seed: o.seed, thrown };
  }
  return pathsInitial();
}

/* 2.2 Матожидание и дисперсия */
export interface MomentsState {
  m: number;
  p: number;
  thrown: number;
  seed: number;
}
export const MOMENTS_MAX = 2000;
export const momentsInitial = (): MomentsState => ({ m: 8, p: 50, thrown: 0, seed: 11 });
export function restoreMoments(raw: unknown): MomentsState {
  const o = asObject(raw);
  if (o && isInt(o.m, 2, 16) && isPercent(o.p, 5, 95) && isInt(o.thrown, 0, MOMENTS_MAX) && isInt(o.seed, 1, 2 ** 32 - 1)) {
    return { m: o.m, p: o.p, thrown: o.thrown, seed: o.seed };
  }
  return momentsInitial();
}

/* 2.3 Случайное блуждание */
export interface WalkState {
  k: number;
  p: number;
  seed: number;
}
export const WALK_MAX = 64;
export const walkInitial = (): WalkState => ({ k: 16, p: 50, seed: 2024 });
export function restoreWalk(raw: unknown): WalkState {
  const o = asObject(raw);
  if (o && isInt(o.k, 4, WALK_MAX) && isPercent(o.p, 5, 95) && isInt(o.seed, 1, 2 ** 32 - 1)) return { k: o.k, p: o.p, seed: o.seed };
  return walkInitial();
}

/* 2.4 Переход к нормальному */
export interface NormalState {
  m: number;
  p: number;
}
export const normalInitial = (): NormalState => ({ m: 16, p: 50 });
export function restoreNormal(raw: unknown): NormalState {
  const o = asObject(raw);
  if (o && isInt(o.m, 4, 100) && isInt(o.p, 10, 90) && o.p % 10 === 0) return { m: o.m, p: o.p };
  return normalInitial();
}

/* 3.1 Частота и вероятность */
export interface LlnState {
  /** Вероятность успеха в процентах, шаг 10. */
  p: number;
  thrown: number;
  seed: number;
}
export const LLN_MAX = 5000;
export const llnInitial = (): LlnState => ({ p: 50, thrown: 0, seed: 314 });
export function restoreLln(raw: unknown): LlnState {
  const o = asObject(raw);
  if (o && isInt(o.p, 10, 90) && o.p % 10 === 0 && isInt(o.thrown, 0, LLN_MAX) && isInt(o.seed, 1, 2 ** 32 - 1)) {
    return { p: o.p, thrown: o.thrown, seed: o.seed };
  }
  return llnInitial();
}

/* 3.2 Усреднение шума */
export interface AveragingState {
  /** Амплитуда равномерного шума, 40–160 с шагом 20. */
  amplitude: number;
  frames: number;
  seed: number;
}
export const AVERAGING_MAX = 64;
export const averagingInitial = (): AveragingState => ({ amplitude: 120, frames: 1, seed: 21 });
export function restoreAveraging(raw: unknown): AveragingState {
  const o = asObject(raw);
  if (o && isInt(o.amplitude, 40, 160) && o.amplitude % 20 === 0 && isInt(o.frames, 1, AVERAGING_MAX) && isInt(o.seed, 1, 2 ** 32 - 1)) {
    return { amplitude: o.amplitude, frames: o.frames, seed: o.seed };
  }
  return averagingInitial();
}

/* 3.3 Центральная предельная теорема */
export interface CltState {
  dice: number;
  thrown: number;
  seed: number;
}
export const CLT_MAX = 5000;
export const cltInitial = (): CltState => ({ dice: 1, thrown: 0, seed: 6 });
export function restoreClt(raw: unknown): CltState {
  const o = asObject(raw);
  if (o && isInt(o.dice, 1, 12) && isInt(o.thrown, 0, CLT_MAX) && isInt(o.seed, 1, 2 ** 32 - 1)) {
    return { dice: o.dice, thrown: o.thrown, seed: o.seed };
  }
  return cltInitial();
}

/* 3.4 Порядок из хаоса */
export interface ChaosState {
  steps: number;
  seed: number;
}
export const CHAOS_MAX = 30000;
export const chaosInitial = (): ChaosState => ({ steps: 0, seed: 1904 });
export function restoreChaos(raw: unknown): ChaosState {
  const o = asObject(raw);
  if (o && isInt(o.steps, 0, CHAOS_MAX) && isInt(o.seed, 1, 2 ** 32 - 1)) return { steps: o.steps, seed: o.seed };
  return chaosInitial();
}

/* 4.1 Оценка доли */
export interface ShareState {
  opened: number;
  seed: number;
  reveal: boolean;
}
export const SHARE_MAX = 400;
export const shareInitial = (): ShareState => ({ opened: 0, seed: 77, reveal: false });
export function restoreShare(raw: unknown): ShareState {
  const o = asObject(raw);
  if (o && isInt(o.opened, 0, SHARE_MAX) && isInt(o.seed, 1, 2 ** 32 - 1) && typeof o.reveal === 'boolean') {
    return { opened: o.opened, seed: o.seed, reveal: o.reveal };
  }
  return shareInitial();
}

/* 4.2 Площадь точками */
export interface AreaState {
  thrown: number;
  seed: number;
}
export const AREA_MAX = 20000;
export const areaInitial = (): AreaState => ({ thrown: 0, seed: 1777 });
export function restoreArea(raw: unknown): AreaState {
  const o = asObject(raw);
  if (o && isInt(o.thrown, 0, AREA_MAX) && isInt(o.seed, 1, 2 ** 32 - 1)) return { thrown: o.thrown, seed: o.seed };
  return areaInitial();
}

/* 4.3 Точность */
export interface PrecisionState {
  /** Номер в PRECISION_SIZES: 16, 64, 256, 1024, 4096 точек. */
  size: number;
  seed: number;
}
export const precisionInitial = (): PrecisionState => ({ size: 1, seed: 31 });
export function restorePrecision(raw: unknown): PrecisionState {
  const o = asObject(raw);
  if (o && isInt(o.size, 0, 4) && isInt(o.seed, 1, 2 ** 32 - 1)) return { size: o.size, seed: o.seed };
  return precisionInitial();
}

/* 4.4 Метод индикаторов */
export interface IndicatorState {
  /** Событие «сумма двух кубиков ≥ s», s = 3…12. */
  s: number;
  thrown: number;
  seed: number;
}
export const INDICATOR_MAX = 5000;
export const indicatorInitial = (): IndicatorState => ({ s: 10, thrown: 0, seed: 36 });
export function restoreIndicator(raw: unknown): IndicatorState {
  const o = asObject(raw);
  if (o && isInt(o.s, 3, 12) && isInt(o.thrown, 0, INDICATOR_MAX) && isInt(o.seed, 1, 2 ** 32 - 1)) return { s: o.s, thrown: o.thrown, seed: o.seed };
  return indicatorInitial();
}
