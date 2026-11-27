/** Курсы учебного режима: тексты уроков, формулы, картинки, виджеты и вопросы. */
import courseDescriptive from './art/course-descriptive.webp';
import courseDistributions from './art/course-distributions.webp';
import courseLimits from './art/course-limits.webp';
import courseMontecarlo from './art/course-montecarlo.webp';
import lessonCenter from './art/lesson-center.webp';
import lessonOutliers from './art/lesson-outliers.webp';
import lessonSample from './art/lesson-sample.webp';
import lessonSpread from './art/lesson-spread.webp';
import lessonBernoulli from './art/lesson-bernoulli.webp';
import lessonMoments from './art/lesson-moments.webp';
import lessonNormal from './art/lesson-normal.webp';
import lessonWalk from './art/lesson-walk.webp';
import lessonChaos from './art/lesson-chaos.webp';
import lessonClt from './art/lesson-clt.webp';
import lessonLln from './art/lesson-lln.webp';
import lessonNoise from './art/lesson-noise.webp';
import lessonArea from './art/lesson-area.webp';
import lessonIndicator from './art/lesson-indicator.webp';
import lessonPrecision from './art/lesson-precision.webp';
import lessonShare from './art/lesson-share.webp';
import { SPREAD_QUESTION, SUMMARY_QUESTIONS, centerQuestion, frequencyQuestion, outlierQuestion } from './math';
import { SUMMARY_QUESTIONS_2, momentsQuestion, normalQuestion, pathsQuestion, walkQuestion } from './math2';
import { SUMMARY_QUESTIONS_3, chaosQuestion, cltQuestion, llnQuestion, noiseQuestion } from './math3';
import { PRECISION_SIZES, SUMMARY_QUESTIONS_4, areaQuestion, countInside, indicatorQuestion, precisionQuestion, shareDraws, SHARE_MASK, shareQuestion, squarePoints } from './math4';
import type { CourseDef, LessonDef } from './types';
import { lecture11, lecture12, lecture13, lecture14, reading11, reading12, reading13, reading14 } from './lectures/course1';
import { lecture21, lecture22, lecture23, lecture24, reading21, reading22, reading23, reading24 } from './lectures/course2';
import { lecture31, lecture32, lecture33, lecture34, reading31, reading32, reading33, reading34 } from './lectures/course3';
import { lecture41, lecture42, lecture43, lecture44, reading41, reading42, reading43, reading44 } from './lectures/course4';
import { AreaWidget } from './widgets/AreaWidget';
import { AveragingWidget } from './widgets/AveragingWidget';
import { IndicatorWidget } from './widgets/IndicatorWidget';
import { PrecisionWidget } from './widgets/PrecisionWidget';
import { ShareWidget } from './widgets/ShareWidget';
import { BalanceWidget } from './widgets/BalanceWidget';
import { ChaosWidget } from './widgets/ChaosWidget';
import { CltWidget } from './widgets/CltWidget';
import { LlnWidget } from './widgets/LlnWidget';
import { MomentsWidget } from './widgets/MomentsWidget';
import { NormalWidget } from './widgets/NormalWidget';
import { PathsWidget } from './widgets/PathsWidget';
import { WalkWidget } from './widgets/WalkWidget';
import { FrequencyWidget } from './widgets/FrequencyWidget';
import { OutlierWidget } from './widgets/OutlierWidget';
import { SpreadWidget } from './widgets/SpreadWidget';
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
  restoreAveraging,
  restoreChaos,
  restoreClt,
  restoreLln,
  balanceInitial,
  frequencyInitial,
  momentsInitial,
  normalInitial,
  pathsInitial,
  restoreMoments,
  restoreNormal,
  restorePaths,
  restoreWalk,
  walkInitial,
  outlierInitial,
  restoreBalance,
  restoreFrequency,
  restoreOutlier,
  restoreSpread,
  spreadInitial,
} from './widgets/state';

export type { CourseDef, LessonDef, WidgetProps } from './types';

/** Стирает тип состояния урока, чтобы уроки разных видов лежали в одном массиве. */
export const defineLesson = <S,>(lesson: LessonDef<S>): LessonDef => lesson as unknown as LessonDef;

/** x с чертой — среднее выборки. */
export const xbar = <span className="c-bar">x</span>;
export const sub = (base: string, index: string) => (
  <>
    {base}
    <sub>{index}</sub>
  </>
);

const sample = defineLesson({
  id: 'sample',
  number: '1.1',
  title: 'Выборка и частоты',
  accent: 'частоты',
  lead: 'Сотня шариков — это сотня чисел. Разбираемся, как превратить их в таблицу частот и гистограмму.',
  idea: (
    <>
      <p>
        <b>Выборка</b> — набор наблюдений {sub('x', '1')}, {sub('x', '2')}, …, {sub('x', 'N')}. Число наблюдений N называют{' '}
        <b>объёмом выборки</b>. На доске Гальтона каждое наблюдение — номер ячейки, в которую упал шарик.
      </p>
      <p>
        <b>Абсолютная частота</b> {sub('n', 'k')} показывает, сколько раз встретилось значение k. <b>Относительная частота</b>{' '}
        {sub('w', 'k')} = {sub('n', 'k')} / N — какую долю выборки оно занимает. Абсолютные частоты в сумме дают N, относительные — единицу.
      </p>
      <p>
        <b>Гистограмма</b> — столбики частот. Чем больше шариков, тем выше столбики абсолютных частот, а гистограмма относительных
        частот перестаёт прыгать и приближается к теоретическим вероятностям.
      </p>
    </>
  ),
  formula: (
    <>
      {sub('w', 'k')} = {sub('n', 'k')} / N<span className="c-formula-gap" />Σ {sub('w', 'k')} = 1
    </>
  ),
  art: lessonSample,
  experiment: { hash: '#galton', label: 'Доска Гальтона' },
  hint: 'Бросьте 10, потом ещё 100 шариков. Переключитесь на «Долю» и включите теорию: синие столбцы подтянутся к малиновым точкам.',
  initial: frequencyInitial,
  restore: restoreFrequency,
  Widget: FrequencyWidget,
  question: (state) => frequencyQuestion(state.seed, state.thrown, state.bin),
  lecture: lecture11,
  reading: reading11,
});

const center = defineLesson({
  id: 'center',
  number: '1.2',
  title: 'Среднее и медиана',
  accent: 'медиана',
  lead: 'Среднее — точка, в которой выборка уравновешивается. Медиана — середина упорядоченного ряда.',
  idea: (
    <>
      <p>
        <b>Среднее арифметическое</b> {xbar} = ({sub('x', '1')} + … + {sub('x', 'N')}) / N. У него есть физический смысл: разложите
        одинаковые грузики по шкале, и доска уравновесится ровно в точке {xbar}. Отклонения слева и справа от среднего в сумме дают ноль.
      </p>
      <p>
        <b>Медиана</b> — значение в середине упорядоченного ряда. При нечётном N это центральный элемент, при чётном — полусумма двух
        центральных. Медиана делит выборку пополам по количеству, а среднее — по «весу».
      </p>
    </>
  ),
  formula: (
    <>
      {xbar} = (1/N) Σ {sub('x', 'i')}
      <span className="c-formula-gap" />Σ ({sub('x', 'i')} − {xbar}) = 0
    </>
  ),
  art: lessonCenter,
  experiment: { hash: '#mean', label: 'Как одна точка меняет среднее' },
  hint: 'Двигайте опору, пока доска не выровняется. Потом перетащите любой шарик и снова найдите равновесие.',
  initial: balanceInitial,
  restore: restoreBalance,
  Widget: BalanceWidget,
  question: (state) => centerQuestion(state.values),
  lecture: lecture12,
  reading: reading12,
});

const spread = defineLesson({
  id: 'spread',
  number: '1.3',
  title: 'Разброс',
  accent: 'Разброс',
  lead: 'Две выборки с одинаковым средним могут выглядеть совсем по-разному. Разброс измеряют размахом, дисперсией и σ.',
  idea: (
    <>
      <p>
        <b>Размах</b> R = max − min — самая простая мера, но она зависит только от двух крайних значений.
      </p>
      <p>
        <b>Дисперсия</b> D — средний квадрат отклонения от среднего: возьмите каждое отклонение {sub('x', 'i')} − {xbar}, возведите в
        квадрат и усредните. На картинке квадрат буквальный — со стороной |{sub('x', 'i')} − {xbar}|, а D — средняя площадь этих квадратов.
      </p>
      <p>
        <b>Стандартное отклонение</b> σ = √D возвращает разброс в исходные единицы. Растяните выборку в k раз — σ вырастет в k раз, а D —
        в k² раз.
      </p>
      <p className="c-aside">
        В экспериментах сайта используется исправленная дисперсия s² = N / (N − 1) · D: по небольшой выборке она точнее оценивает разброс
        всей совокупности.
      </p>
    </>
  ),
  formula: (
    <>
      D = (1/N) Σ ({sub('x', 'i')} − {xbar})²<span className="c-formula-gap" />σ = √D
    </>
  ),
  art: lessonSpread,
  experiment: { hash: '#galton', label: 'Доска Гальтона' },
  hint: 'Двигайте ползунок растяжения и сравнивайте, во сколько раз меняются σ и D.',
  initial: spreadInitial,
  restore: restoreSpread,
  Widget: SpreadWidget,
  question: () => SPREAD_QUESTION,
  lecture: lecture13,
  reading: reading13,
});

const outliers = defineLesson({
  id: 'outliers',
  number: '1.4',
  title: 'Выбросы и устойчивость',
  accent: 'Выбросы',
  lead: 'Одно ошибочное значение может сильно сдвинуть среднее. Медиана при этом стоит на месте.',
  idea: (
    <>
      <p>
        <b>Выброс</b> — наблюдение, которое сильно отличается от остальных: опечатка в данных, сбой прибора или просто редкий случай.
      </p>
      <p>
        Если одно значение увеличить на Δ, сумма вырастет на Δ, а среднее — на Δ / N. Медиана зависит только от порядка: пока значение не
        перескочило через середину ряда, она не меняется.
      </p>
      <p>
        Поэтому для данных с выбросами — зарплат, цен квартир, времени ответа сервера — медиана честнее описывает «типичное» значение.
        Чем больше N, тем слабее один выброс сдвигает среднее.
      </p>
    </>
  ),
  formula: <>Δ{xbar} = Δ / N</>,
  art: lessonOutliers,
  experiment: { hash: '#mean', label: 'Как одна точка меняет среднее' },
  hint: 'Утащите самое большое значение далеко вправо, затем увеличьте N и посмотрите, как уменьшается сдвиг среднего.',
  initial: outlierInitial,
  restore: restoreOutlier,
  Widget: OutlierWidget,
  question: (state) => outlierQuestion(state.n),
  lecture: lecture14,
  reading: reading14,
});

/* ---------- Курс 2 «Распределения» ---------- */

const pct = (p: number) => p / 100;

const paths = defineLesson({
  id: 'paths',
  number: '2.1',
  title: 'Бернулли и биномиальное',
  accent: 'биномиальное',
  lead: 'Шарик на каждом уровне выбирает: вправо или влево. Считаем пути и получаем формулу вероятности каждой ячейки.',
  idea: (
    <>
      <p>
        <b>Испытание Бернулли</b> — опыт с двумя исходами: «успех» с вероятностью p и «неудача» с вероятностью 1 − p. На доске Гальтона
        успех — поворот вправо на очередном штырьке.
      </p>
      <p>
        Шарик проходит m уровней — это m независимых испытаний. Номер ячейки X равен числу поворотов вправо. В ячейку k ведут{' '}
        <b>C(m, k)</b> разных путей: столько способов выбрать k уровней из m, на которых шарик свернёт вправо.
      </p>
      <p>
        Каждый такой путь имеет вероятность p<sup>k</sup>(1 − p)<sup>m − k</sup>. Складываем вероятности всех путей в ячейку — получаем{' '}
        <b>биномиальное распределение</b> B(m, p).
      </p>
    </>
  ),
  formula: (
    <>
      P(X = k) = C(m, k) · p<sup>k</sup> · (1 − p)<sup>m − k</sup>
    </>
  ),
  art: lessonBernoulli,
  experiment: { hash: '#galton', label: 'Доска Гальтона' },
  hint: 'Бросьте несколько шариков и посмотрите на их пути. Затем выберите столбик k: рядом посчитаются число путей и вероятность. Сдвиньте p — колокол съедет.',
  initial: pathsInitial,
  restore: restorePaths,
  Widget: PathsWidget,
  question: (state) => pathsQuestion(state.m, state.k),
  lecture: lecture21,
  reading: reading21,
});

const moments = defineLesson({
  id: 'moments',
  number: '2.2',
  title: 'Матожидание и дисперсия',
  accent: 'дисперсия',
  lead: 'У биномиального распределения простые формулы для центра и разброса. Проверяем их сотнями шариков.',
  idea: (
    <>
      <p>
        <b>Математическое ожидание</b> E(X) — среднее значение X «в долгую». Для биномиального распределения E(X) = mp: из m поворотов в
        среднем mp — вправо.
      </p>
      <p>
        <b>Дисперсия</b> D(X) — средний квадрат отклонения от E(X). Для биномиального D(X) = mp(1 − p). Она наибольшая при p = 0,5 и
        равна нулю при p = 0 или 1: тогда все шарики падают в одну ячейку.
      </p>
      <p>Среднее выборки {xbar} и её дисперсия — оценки E и D по опыту. Чем больше шариков, тем ближе они к формулам.</p>
    </>
  ),
  formula: (
    <>
      E(X) = mp<span className="c-formula-gap" />D(X) = mp(1 − p)
    </>
  ),
  art: lessonMoments,
  experiment: { hash: '#galton', label: 'Доска Гальтона' },
  hint: 'Бросьте 1000 шариков и сравните синие числа выборки с малиновыми из формул. Измените m или p — выборка начнётся заново.',
  initial: momentsInitial,
  restore: restoreMoments,
  Widget: MomentsWidget,
  question: (state) => momentsQuestion(state.m, pct(state.p)),
  lecture: lecture22,
  reading: reading22,
});

const walk = defineLesson({
  id: 'walk',
  number: '2.3',
  title: 'Случайное блуждание',
  accent: 'блуждание',
  lead: 'Каждый шаг — монетка: +1 или −1. Разброс положения растёт, но медленнее, чем число шагов.',
  idea: (
    <>
      <p>
        Частица стартует в нуле. На каждом шаге она сдвигается на +1 с вероятностью p или на −1 с вероятностью 1 − p. Положение после k
        шагов S<sub>k</sub> = 2X − k, где X — число шагов вправо, X ~ B(k, p).
      </p>
      <p>
        Отсюда E(S<sub>k</sub>) = k(2p − 1): при p = 0,5 частица в среднем стоит на месте. D(S<sub>k</sub>) = 4kp(1 − p), а стандартное
        отклонение растёт как <b>√k</b>: чтобы разброс удвоился, шагов нужно вчетверо больше.
      </p>
      <p>Блуждание — та же доска Гальтона, только номер ячейки пересчитан в положение: шаг вправо — это +1, шаг влево — это −1.</p>
    </>
  ),
  formula: (
    <>
      E(S<sub>k</sub>) = k(2p − 1)
      <span className="c-formula-gap" />σ(S<sub>k</sub>) = √(4kp(1 − p))
    </>
  ),
  art: lessonWalk,
  experiment: { hash: '#walk', label: 'Случайное блуждание' },
  hint: 'Увеличивайте k и смотрите на малиновый коридор E ± 2σ: он расширяется всё медленнее. Сдвиньте p от 50 % — пути поползут в сторону.',
  initial: walkInitial,
  restore: restoreWalk,
  Widget: WalkWidget,
  question: (state) => walkQuestion(state.k, pct(state.p)),
  lecture: lecture23,
  reading: reading23,
});

const normal = defineLesson({
  id: 'normal',
  number: '2.4',
  title: 'Переход к нормальному',
  accent: 'нормальному',
  lead: 'Чем больше уровней у доски, тем сильнее гистограмма похожа на гладкий колокол Гаусса.',
  idea: (
    <>
      <p>
        <b>Теорема Муавра — Лапласа:</b> при большом m биномиальное распределение B(m, p) почти совпадает с нормальным N(μ, σ²), где μ =
        mp и σ² = mp(1 − p).
      </p>
      <p>
        У нормального распределения удобное правило: около 68 % значений лежат в пределах μ ± σ, около 95 % — в μ ± 2σ, около 99,7 % — в
        μ ± 3σ. Зная только mp и mp(1 − p), можно сказать, куда попадёт почти любой шарик.
      </p>
      <p className="c-aside">
        При p, близком к 0 или 1, колокол перекашивается и приближение хуже. Обычно им пользуются, когда mp(1 − p) больше 9.
      </p>
    </>
  ),
  formula: (
    <>
      P(X = k) ≈ e<sup>−(k − μ)² / 2σ²</sup> / (σ√2π)
    </>
  ),
  art: lessonNormal,
  experiment: { hash: '#galton', label: 'Доска Гальтона' },
  hint: 'Увеличьте m от 4 до 100 и следите за наибольшим расхождением. Поставьте p = 10 % — колокол перекосится.',
  initial: normalInitial,
  restore: restoreNormal,
  Widget: NormalWidget,
  question: (state) => normalQuestion(state.m, pct(state.p)),
  lecture: lecture24,
  reading: reading24,
});

/* ---------- Курс 3 «Предельные теоремы» ---------- */

const lln = defineLesson({
  id: 'frequency',
  number: '3.1',
  title: 'Частота и вероятность',
  accent: 'вероятность',
  lead: 'Один бросок монеты непредсказуем, тысяча — почти нет. Смотрим, как частота успеха ложится на вероятность.',
  idea: (
    <>
      <p>
        Событие A наступает в каждом опыте с вероятностью p. Сделаем n независимых опытов: n<sub>A</sub> из них — успехи.{' '}
        <b>Относительная частота</b> w = n<sub>A</sub> / n сама случайна: у разных серий она разная.
      </p>
      <p>
        <b>Закон больших чисел</b> (теорема Бернулли): с ростом n частота w сходится к p. Насколько близко — говорит стандартное
        отклонение частоты σ<sub>w</sub> = √(p(1 − p)/n): примерно в 95 % серий |w − p| ≤ 2σ<sub>w</sub>.
      </p>
      <p>
        Обратите внимание на корень: чтобы погрешность уменьшилась вдвое, опытов нужно вчетверо больше. Именно поэтому на графике раструб
        сначала сужается быстро, а потом всё медленнее.
      </p>
    </>
  ),
  formula: (
    <>
      w = n<sub>A</sub> / n → p<span className="c-formula-gap" />σ<sub>w</sub> = √(p(1 − p) / n)
    </>
  ),
  art: lessonLln,
  experiment: { hash: '#triangle', label: 'Треугольник Серпинского' },
  hint: 'Нажмите +10 несколько раз: частота скачет. Потом +1000 — линия прижмётся к p и не выйдет из раструба. Поменяйте p и повторите.',
  initial: llnInitial,
  restore: restoreLln,
  Widget: LlnWidget,
  question: (state) => llnQuestion(state.p / 100),
  lecture: lecture31,
  reading: reading31,
});

const averaging = defineLesson({
  id: 'averaging',
  number: '3.2',
  title: 'Усреднение шума',
  accent: 'шума',
  lead: 'Каждый кадр испорчен шумом, но среднее многих кадров проявляет картинку. Шум падает как σ/√n.',
  idea: (
    <>
      <p>
        Каждый пиксель кадра — истинная яркость плюс случайный шум со средним 0 и стандартным отклонением σ. Шумы разных кадров
        независимы.
      </p>
      <p>
        Среднее n кадров: истинная яркость не меняется, а шумы частично гасят друг друга. Дисперсия среднего n независимых величин в n раз
        меньше, поэтому шум среднего равен <b>σ/√n</b>.
      </p>
      <p>Это тот же закон больших чисел, только для яркости пикселя, и та же цена точности: вдвое тише — вчетверо больше кадров.</p>
    </>
  ),
  formula: (
    <>
      D({xbar}) = σ² / n<span className="c-formula-gap" />σ({xbar}) = σ / √n
    </>
  ),
  art: lessonNoise,
  experiment: { hash: '#noise', label: 'От шума к изображению' },
  hint: 'Сдвиньте n с 1 до 4, потом до 16 и 64: каждый раз шум уменьшается вдвое. Сделайте шум сильнее — кривая поднимется, но форма останется.',
  initial: averagingInitial,
  restore: restoreAveraging,
  Widget: AveragingWidget,
  question: (state) => noiseQuestion(state.amplitude),
  lecture: lecture32,
  reading: reading32,
});

const clt = defineLesson({
  id: 'clt',
  number: '3.3',
  title: 'Центральная предельная теорема',
  accent: 'предельная',
  lead: 'Один кубик даёт ровные столбики. Сумма нескольких кубиков — уже колокол Гаусса.',
  idea: (
    <>
      <p>
        Возьмём сумму S<sub>n</sub> = X<sub>1</sub> + … + X<sub>n</sub> независимых одинаково распределённых слагаемых со средним μ и
        дисперсией σ². Тогда E(S<sub>n</sub>) = nμ и D(S<sub>n</sub>) = nσ².
      </p>
      <p>
        <b>Центральная предельная теорема:</b> при большом n распределение S<sub>n</sub> близко к нормальному N(nμ, nσ²) — каким бы ни
        было распределение одного слагаемого. У кубика оно равномерное (μ = 3,5, σ² = 35/12), а сумма уже 3–4 кубиков похожа на колокол.
      </p>
      <p className="c-aside">Доска Гальтона из курса 2 — частный случай: там слагаемые — повороты вправо (0 или 1).</p>
    </>
  ),
  formula: (
    <>
      S<sub>n</sub> ≈ N(nμ, nσ²)<span className="c-formula-gap" />кубик: μ = 3,5, σ² = 35/12
    </>
  ),
  art: lessonClt,
  experiment: { hash: '#galton', label: 'Доска Гальтона' },
  hint: 'Бросьте 1000 раз один кубик — столбики ровные. Затем поставьте n = 2, 3, 6, 12 и бросайте снова: гистограмма всё точнее ложится на кривую.',
  initial: cltInitial,
  restore: restoreClt,
  Widget: CltWidget,
  question: (state) => cltQuestion(state.dice),
  lecture: lecture33,
  reading: reading33,
});

const chaos = defineLesson({
  id: 'chaos',
  number: '3.4',
  title: 'Порядок из хаоса',
  accent: 'хаоса',
  lead: 'Каждая точка ставится наугад, а картинка всегда получается одна и та же — треугольник Серпинского.',
  idea: (
    <>
      <p>
        <b>Игра хаоса.</b> Есть три вершины A, B, C. Берём текущую точку P, выбираем вершину V наугад (каждую с вероятностью 1/3) и ставим
        новую точку в середину отрезка PV. Повторяем тысячи раз.
      </p>
      <p>
        Новая точка всегда лежит в угловом треугольнике выбранной вершины, а с учётом предыдущего шага — в одном из 9 треугольников второго
        уровня. Поэтому доля точек в нём — это частота пары последних вершин, и по закону больших чисел она стремится к 1/9.
      </p>
      <p>
        Случайны отдельные шаги, но не итог: частоты устойчивы, и из них складывается фрактал. Это и есть порядок из хаоса, который
        объединяет весь курс.
      </p>
    </>
  ),
  formula: (
    <>
      P<sub>k+1</sub> = (P<sub>k</sub> + V) / 2<span className="c-formula-gap" />доля уровня L → (1/3)<sup>L</sup>
    </>
  ),
  art: lessonChaos,
  experiment: { hash: '#triangle', label: 'Треугольник Серпинского' },
  hint: 'После +100 видно только облако. Добавьте +1000 и +10 000 — проступят дыры. Следите за таблицей: все 9 долей сходятся к 0,11.',
  initial: chaosInitial,
  restore: restoreChaos,
  Widget: ChaosWidget,
  question: (state) => chaosQuestion(state.steps),
  lecture: lecture34,
  reading: reading34,
});

/* ---------- Курс 4 «Оценивание и Монте-Карло» ---------- */

const share = defineLesson({
  id: 'share',
  number: '4.1',
  title: 'Оценка доли',
  accent: 'доли',
  lead: 'Не нужно открывать всё поле, чтобы узнать, сколько места занимает рисунок. Хватит случайной выборки клеток.',
  idea: (
    <>
      <p>
        В генеральной совокупности из N объектов доля p обладает признаком (здесь — клетки рисунка). Выберем наугад n объектов, k из них с
        признаком. <b>Выборочная доля</b> p̂ = k / n — оценка неизвестной p.
      </p>
      <p>
        Оценка <b>несмещённая</b>: в среднем по всем возможным выборкам E(p̂) = p. Её стандартная ошибка σ̂ = √(p̂(1 − p̂)/n), и примерно в 95
        % выборок интервал p̂ ± 2σ̂ накрывает истинную долю — это <b>доверительный интервал</b>.
      </p>
      <p>Так работают опросы: по тысяче ответов оценивают мнение миллионов. Важно лишь, чтобы выборка была случайной.</p>
    </>
  ),
  formula: (
    <>
      p̂ = k / n<span className="c-formula-gap" />p̂ ± 2√(p̂(1 − p̂) / n)
    </>
  ),
  lecture: lecture41,
  reading: reading41,
  art: lessonShare,
  experiment: { hash: '#picture', label: 'Скрытая картинка' },
  hint: 'Откройте 10 клеток и посмотрите на интервал — он широкий. Добавьте ещё 50 и 100. Потом включите «Показать весь рисунок» и проверьте, попала ли истинная доля в интервал.',
  initial: shareInitial,
  restore: restoreShare,
  Widget: ShareWidget,
  question: (state) => {
    const k = shareDraws(state.seed, state.opened).filter((cell) => SHARE_MASK[cell]).length;
    return shareQuestion(state.opened, k);
  },
});

const area = defineLesson({
  id: 'area',
  number: '4.2',
  title: 'Площадь точками',
  accent: 'точками',
  lead: 'Бросаем случайные точки в квадрат и считаем, сколько попало в фигуру. Так можно найти площадь — и даже число π.',
  idea: (
    <>
      <p>
        Фигура F лежит внутри квадрата площади S. Точка, брошенная в квадрат равномерно, попадает в F с вероятностью S<sub>F</sub> / S.
        Бросим N точек, k из них в фигуре: доля k / N оценивает эту вероятность.
      </p>
      <p>
        Отсюда <b>метод Монте-Карло</b> для площади: S<sub>F</sub> ≈ S · k / N. Он не требует формулы фигуры — нужно только уметь проверить,
        лежит ли точка внутри.
      </p>
      <p>
        Пример: четверть круга радиуса 1 в квадрате 1 × 1 имеет площадь π/4. Значит, 4k / N — оценка числа π.
      </p>
    </>
  ),
  formula: (
    <>
      S<sub>F</sub> ≈ S · k / N<span className="c-formula-gap" />π ≈ 4k / N
    </>
  ),
  art: lessonArea,
  experiment: { hash: '#silhouette', label: 'Нарисуй силуэт точками' },
  hint: 'Бросьте 10 точек, потом 100, 1000 и 10 000. Следите за оценкой π: третий знак после запятой устанавливается очень медленно.',
  initial: areaInitial,
  restore: restoreArea,
  Widget: AreaWidget,
  question: (state) => areaQuestion(state.thrown, countInside(squarePoints(state.seed, state.thrown), state.thrown)),
  lecture: lecture42,
  reading: reading42,
});

const precision = defineLesson({
  id: 'precision',
  number: '4.3',
  title: 'Точность ~ 1/√n',
  accent: '1/√n',
  lead: 'Одна оценка — случайное число. Повторим её 200 раз и посмотрим, как разброс оценок зависит от числа точек.',
  idea: (
    <>
      <p>
        Оценка Монте-Карло — среднее n независимых индикаторов «точка внутри», умноженное на площадь. Её дисперсия равна S² · p(1 − p)/n,
        а стандартное отклонение <b>σ = S√(p(1 − p)/n)</b>.
      </p>
      <p>
        Точность растёт как √n: чтобы получить ещё один верный знак после запятой (в 10 раз точнее), точек нужно в 100 раз больше. Это
        главная цена метода Монте-Карло.
      </p>
      <p className="c-aside">Зато скорость 1/√n не зависит от размерности: в задачах со многими переменными Монте-Карло часто быстрее сеток.</p>
    </>
  ),
  formula: (
    <>
      σ = S · √(p(1 − p) / n)<span className="c-formula-gap" />n × 4 ⇒ σ / 2
    </>
  ),
  art: lessonPrecision,
  experiment: { hash: '#silhouette', label: 'Нарисуй силуэт точками' },
  hint: 'Двигайте ползунок вправо: каждый шаг — вчетверо больше точек. Колокол той же формы, но подписи оси сжимаются к π, а σ уменьшается вдвое.',
  initial: precisionInitial,
  restore: restorePrecision,
  Widget: PrecisionWidget,
  question: (state) => precisionQuestion(PRECISION_SIZES[state.size]),
  lecture: lecture43,
  reading: reading43,
});

const indicator = defineLesson({
  id: 'indicator',
  number: '4.4',
  title: 'Метод индикаторов',
  accent: 'индикаторов',
  lead: 'Любую вероятность можно оценить средним из нулей и единиц. Это то же самое, что частота, только записанное как случайная величина.',
  idea: (
    <>
      <p>
        <b>Индикатор</b> события A — случайная величина I<sub>A</sub>, равная 1, если A произошло, и 0, если нет. Её среднее E(I<sub>A</sub>)
        = P(A), а дисперсия D(I<sub>A</sub>) = P(A)(1 − P(A)).
      </p>
      <p>
        Поэтому вероятность — это матожидание, и её оценивает выборочное среднее индикаторов. Всё, что мы знаем о средних, работает и
        здесь: закон больших чисел, σ/√N и ЦПТ.
      </p>
      <p>
        Доля клеток рисунка, площадь фигуры, частота успеха — всё это средние индикаторов. Метод индикаторов объединяет весь курс.
      </p>
    </>
  ),
  formula: (
    <>
      E(I<sub>A</sub>) = P(A)<span className="c-formula-gap" />D(I<sub>A</sub>) = P(A)(1 − P(A))
    </>
  ),
  art: lessonIndicator,
  experiment: { hash: '#picture', label: 'Скрытая картинка' },
  hint: 'Бросьте кубики по одному, посмотрите на 1 и 0. Потом +1000: среднее индикаторов совпадёт с точной вероятностью из 36 исходов. Поменяйте s.',
  initial: indicatorInitial,
  restore: restoreIndicator,
  Widget: IndicatorWidget,
  question: (state) => indicatorQuestion(state.s),
  lecture: lecture44,
  reading: reading44,
});

export const COURSES: CourseDef[] = [
  {
    id: 'descriptive',
    number: 1,
    title: 'Описательная статистика',
    summary: 'Как несколькими числами описать выборку: частоты, центр, разброс и выбросы.',
    topics: 'Выборка и частоты · Среднее и медиана · Разброс · Выбросы',
    art: courseDescriptive,
    lessons: [sample, center, spread, outliers],
    ready: true,
    cheatsheet: [
      { label: 'Относительная частота', formula: sample.formula },
      { label: 'Среднее', formula: center.formula },
      { label: 'Дисперсия и σ', formula: spread.formula },
      { label: 'Сдвиг среднего от одного значения', formula: outliers.formula },
    ],
    summaryQuestions: SUMMARY_QUESTIONS,
    experiments: [
      { hash: '#galton', label: 'Доска Гальтона' },
      { hash: '#mean', label: 'Как одна точка меняет среднее' },
    ],
  },
  {
    id: 'distributions',
    number: 2,
    title: 'Распределения',
    summary: 'Откуда берутся законы распределения и как их узнать по гистограмме.',
    topics: 'Бернулли и биномиальное · E и D · Случайное блуждание · Нормальное приближение',
    art: courseDistributions,
    lessons: [paths, moments, walk, normal],
    ready: true,
    cheatsheet: [
      { label: 'Биномиальное распределение', formula: paths.formula },
      { label: 'Матожидание и дисперсия', formula: moments.formula },
      { label: 'Случайное блуждание', formula: walk.formula },
      { label: 'Правило двух сигм', formula: <>P(μ − 2σ ≤ X ≤ μ + 2σ) ≈ 0,95</> },
    ],
    summaryQuestions: SUMMARY_QUESTIONS_2,
    experiments: [
      { hash: '#galton', label: 'Доска Гальтона' },
      { hash: '#walk', label: 'Случайное блуждание' },
    ],
  },
  {
    id: 'limits',
    number: 3,
    title: 'Предельные теоремы',
    summary: 'Почему частота стремится к вероятности, а сумма случайностей — к колоколу Гаусса.',
    topics: 'Частота и вероятность · Усреднение шума · ЦПТ · Порядок из хаоса',
    art: courseLimits,
    lessons: [lln, averaging, clt, chaos],
    ready: true,
    cheatsheet: [
      { label: 'Частота и её разброс', formula: lln.formula },
      { label: 'Шум среднего n кадров', formula: averaging.formula },
      { label: 'Центральная предельная теорема', formula: clt.formula },
      { label: 'Игра хаоса', formula: chaos.formula },
    ],
    summaryQuestions: SUMMARY_QUESTIONS_3,
    experiments: [
      { hash: '#triangle', label: 'Треугольник Серпинского' },
      { hash: '#noise', label: 'От шума к изображению' },
      { hash: '#galton', label: 'Доска Гальтона' },
    ],
  },
  {
    id: 'montecarlo',
    number: 4,
    title: 'Оценивание и Монте-Карло',
    summary: 'Как оценить долю, площадь и вероятность случайными точками и насколько можно доверять оценке.',
    topics: 'Оценка доли · Площадь точками · Точность 1/√n · Метод индикаторов',
    art: courseMontecarlo,
    lessons: [share, area, precision, indicator],
    ready: true,
    cheatsheet: [
      { label: 'Оценка доли и интервал', formula: share.formula },
      { label: 'Площадь методом Монте-Карло', formula: area.formula },
      { label: 'Точность оценки', formula: precision.formula },
      { label: 'Индикатор события', formula: indicator.formula },
    ],
    summaryQuestions: SUMMARY_QUESTIONS_4,
    experiments: [
      { hash: '#picture', label: 'Скрытая картинка' },
      { hash: '#silhouette', label: 'Нарисуй силуэт точками' },
    ],
  },
];
