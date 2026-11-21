import { SpatialView } from '../components/SpatialPlot';
import { pictureScene } from '../lib/experimentScenes';
import { useSprites } from '../course/sprites';
import { useEffect, useId, useRef, useState } from 'react';
import { LineChart, RunControls, Segmented } from '../components/Charts';
import { Readouts } from '../components/Readouts';
import { useFrameLoop } from '../hooks/useFrameLoop';
import { thin } from '../lib/chart';
import { formatInteger, formatOneDecimal, formatThreeDecimals, plural } from '../lib/format';
import {
  GRID_SIZES,
  applyAttempts,
  createPictureState,
  expectedOpened,
  expectedShare,
  missProbability,
  parseForecast,
  type PictureState,
} from '../lib/hiddenPicture';
import { ART_SIZE, buildLighthousePixels } from '../lib/lighthouseArt';
import { createRng, newSeed, randomIndex } from '../lib/random';
import { PictureSeries } from './PictureSeries';

const OVERLAY = 640;
const BATCHES = [1, 10, 100, 1000] as const;
/** Цвета карты попаданий: 0 — фон, 1 — светлый, дальше насыщеннее. */
const HEAT = ['#1c1c24', '#e6e8ff', '#9aa6ff', '#6b7bff', '#c45ad8', '#ff4fc8'];
const heatColor = (hits: number) => HEAT[Math.min(hits, HEAT.length - 1)];

const cellWord = (value: number) => plural(value, 'клетка', 'клетки', 'клеток');
const percent = (share: number) => `${formatInteger(Math.round(share * 100))} %`;

function LighthouseCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const context = canvasRef.current?.getContext('2d');
    if (!context) return;
    const image = context.createImageData(ART_SIZE, ART_SIZE);
    image.data.set(buildLighthousePixels());
    context.putImageData(image, 0, 0);
  }, []);
  return <canvas ref={canvasRef} className="picture-art" width={ART_SIZE} height={ART_SIZE} />;
}

/** Покрытие клеток или карта попаданий. Нажатие пересчитывается по фактическому размеру холста. */
function PictureOverlay({
  state,
  view,
  selected,
  onSelect,
}: {
  state: PictureState;
  view: 'picture' | 'heat';
  selected: number | null;
  onSelect: (cell: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sprites = useSprites();
  const { size, hits } = state;

  useEffect(() => {
    const context = canvasRef.current?.getContext('2d');
    if (!context) return;
    const styles = getComputedStyle(canvasRef.current as HTMLCanvasElement);
    const cover = styles.getPropertyValue('--harbor-raised').trim() || '#193662';
    const rule = styles.getPropertyValue('--rule').trim() || '#34507f';
    const lamp = styles.getPropertyValue('--lamp').trim() || '#ffc53d';
    const buoy = styles.getPropertyValue('--buoy').trim() || '#ff9c8a';
    const water = styles.getPropertyValue('--water').trim() || '#62dceb';
    const cell = OVERLAY / size;
    context.clearRect(0, 0, OVERLAY, OVERLAY);
    for (let index = 0; index < hits.length; index += 1) {
      const x = (index % size) * cell;
      const y = Math.floor(index / size) * cell;
      if (view === 'heat') {
        context.fillStyle = heatColor(hits[index]);
        context.fillRect(x, y, cell, cell);
      } else if (hits[index] === 0) {
        context.fillStyle = cover;
        context.fillRect(x, y, cell, cell);
        // Закрытая клетка — тёмная плитка-деталь из Blender.
        if (sprites) context.drawImage(sprites.tileClosed, x + cell * 0.04, y + cell * 0.04, cell * 0.92, cell * 0.92);
      } else if (sprites && size <= 20) {
        // Открытая клетка — окно в хромовой рамке, сквозь него видна картинка.
        context.drawImage(sprites.frameCell, x, y, cell, cell);
      }
    }
    // С плитками-деталями сетка не нужна: швы между ними и так видны.
    if (!sprites || view === 'heat') {
      context.strokeStyle = rule;
      context.globalAlpha = size >= 40 ? 0.35 : 0.8;
      context.lineWidth = 1;
      context.beginPath();
      for (let line = 0; line <= size; line += 1) {
        const at = Math.round(line * cell) + 0.5;
        context.moveTo(at, 0);
        context.lineTo(at, OVERLAY);
        context.moveTo(0, at);
        context.lineTo(OVERLAY, at);
      }
      context.stroke();
      context.globalAlpha = 1;
    }
    const outline = (index: number, color: string, width: number) => {
      context.strokeStyle = color;
      context.lineWidth = width;
      context.strokeRect((index % size) * cell + width / 2, Math.floor(index / size) * cell + width / 2, cell - width, cell - width);
    };
    if (state.lastCell !== null) outline(state.lastCell, state.lastWasRepeat ? buoy : lamp, Math.max(2, cell / 8));
    if (selected !== null) outline(selected, water, Math.max(3, cell / 6));
  }, [hits, size, view, selected, state.lastCell, state.lastWasRepeat, sprites]);

  return (
    <canvas
      ref={canvasRef}
      className={view === 'heat' ? 'picture-overlay picture-overlay--heat' : 'picture-overlay'}
      width={OVERLAY}
      height={OVERLAY}
      data-testid="picture-overlay"
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const column = Math.min(size - 1, Math.max(0, Math.floor(((event.clientX - rect.left) / rect.width) * size)));
        const row = Math.min(size - 1, Math.max(0, Math.floor(((event.clientY - rect.top) / rect.height) * size)));
        onSelect(row * size + column);
      }}
    />
  );
}

export function HiddenPicture({ active }: { active: boolean }) {
  const [size, setSize] = useState<number>(10);
  const [seed, setSeed] = useState(newSeed);
  const [state, setState] = useState<PictureState>(() => createPictureState(10));
  const [batchLeft, setBatchLeft] = useState(0);
  const [view, setView] = useState<'picture' | 'heat'>('picture');
  const [selected, setSelected] = useState<number | null>(null);
  const [forecastText, setForecastText] = useState('');
  const [lockedForecast, setLockedForecast] = useState<number | null>(null);
  const [showForecastError, setShowForecastError] = useState(false);

  const stateRef = useRef(state);
  const rngRef = useRef(createRng(seed));
  const batchRef = useRef({ left: 0, interval: 28, bank: 0 });
  const forecastInput = useRef<HTMLInputElement>(null);
  const forecastHintId = useId();

  const cells = size * size;
  const parsedForecast = parseForecast(forecastText, cells);
  const running = batchLeft > 0;
  const hasStarted = state.attempts > 0;
  const hitsTotal = state.hits.reduce((sum, value) => sum + value, 0);

  const commit = (next: PictureState) => {
    stateRef.current = next;
    setState(next);
  };

  const restart = (nextSize: number, nextSeed: number) => {
    batchRef.current = { left: 0, interval: 28, bank: 0 };
    setBatchLeft(0);
    rngRef.current = createRng(nextSeed);
    commit(createPictureState(nextSize));
    setSelected(null);
    setForecastText('');
    setLockedForecast(null);
    setShowForecastError(false);
  };

  const prepareRun = (): boolean => {
    if (stateRef.current.attempts > 0) return true;
    if (!parsedForecast.ok) {
      setShowForecastError(true);
      forecastInput.current?.focus();
      return false;
    }
    setLockedForecast(parsedForecast.value);
    return true;
  };

  const run = (amount: number) => {
    if (!prepareRun()) return;
    if (amount === 1) {
      commit(applyAttempts(stateRef.current, [randomIndex(cells, rngRef.current)]));
      return;
    }
    const interval = Math.min(28, 2500 / amount);
    batchRef.current = { left: amount, interval, bank: interval };
    setBatchLeft(amount);
  };

  useFrameLoop(active && running, (elapsed) => {
    const batch = batchRef.current;
    batch.bank += elapsed;
    const picked: number[] = [];
    while (batch.bank >= batch.interval && batch.left > 0) {
      picked.push(randomIndex(cells, rngRef.current));
      batch.left -= 1;
      batch.bank -= batch.interval;
    }
    commit(applyAttempts(stateRef.current, picked));
    setBatchLeft(batch.left);
  });

  const forecastError = !parsedForecast.ok && (showForecastError || forecastText.trim() !== '') ? parsedForecast.error : null;
  const xMax = Math.max(state.attempts, cells);
  const actualPoints = thin(
    state.history.map((opened, attempts) => [attempts, opened / cells] as const),
    600,
  );
  const theoryPoints = Array.from({ length: 101 }, (_, index) => {
    const k = (index / 100) * xMax;
    return [k, expectedShare(k, cells)] as const;
  });

  const selectedRow = selected === null ? 0 : Math.floor(selected / size) + 1;
  const selectedColumn = selected === null ? 0 : (selected % size) + 1;

  let status: string;
  if (state.lastCell === null) status = `Все ${formatInteger(cells)} ${cellWord(cells)} закрыты. Запустите первую попытку.`;
  else if (running) status = `Идут попытки: осталось ${formatInteger(batchLeft)}.`;
  else {
    const row = Math.floor(state.lastCell / size) + 1;
    const column = (state.lastCell % size) + 1;
    status = `Попытка ${formatInteger(state.attempts)}: строка ${row}, столбец ${column}. ${state.lastWasRepeat ? 'Клетка уже была открыта, это повтор.' : 'Открыта новая клетка.'}`;
  }

  return (
    <section className="experiment experiment--picture" id="panel-picture" hidden={!active}>
      <div className="experiment-head">
        <h2>Скрытая картинка</h2>
        <p className="action-line">Нажми «100 попыток» и посмотри, какая часть картинки откроется.</p>
      </div>

      <div className="viz-column">
        <div className="viz-pin">
          <div className="picture-toolbar">
            <Segmented
              legend="Сетка"
              options={GRID_SIZES.map((value) => ({ value, label: `${value}×${value}` }))}
              value={size}
              onChange={(value) => {
                setSize(value);
                restart(value, seed);
              }}
            />
            <Segmented
              legend="Вид"
              options={[
                { value: 'picture', label: 'Рисунок' },
                { value: 'heat', label: 'Карта попаданий' },
              ]}
              value={view}
              onChange={setView}
            />
          </div>
          <SpatialView title="Рельеф попаданий" label="Рельеф попаданий" active={active}
            caption="Цвет открывает рисунок, высота показывает число попаданий относительно максимума. Выбрать клетку можно в 2D."
            build={() => pictureScene(state.hits, size, selected, view === 'heat' ? HEAT : undefined)}>
          <div
            className="picture"
            role="img"
            aria-label={`${view === 'heat' ? 'Карта попаданий' : 'Пиксельный маяк'} под сеткой ${size} на ${size}. Открыто клеток: ${state.openedCount} из ${cells}.`}
          >
            {view === 'picture' ? <LighthouseCanvas /> : null}
            <PictureOverlay state={state} view={view} selected={selected} onSelect={setSelected} />
          </div>
          </SpatialView>
          {view === 'heat' ? (
            <div className="heat-legend" aria-label="Обозначения карты попаданий">
              {['0', '1', '2', '3', '4', '5+'].map((label, index) => (
                <span key={label}>
                  <i style={{ background: HEAT[index] }} />
                  {label}
                </span>
              ))}
              <span className="hint">попаданий в клетку</span>
            </div>
          ) : null}
          <p className="bin-info" data-testid="picture-cell-info" aria-live="polite">
            {selected === null
              ? 'В режиме 2D нажмите на клетку, чтобы узнать, сколько раз в неё попали.'
              : `Клетка: строка ${selectedRow}, столбец ${selectedColumn} — ${formatInteger(state.hits[selected])} ${plural(state.hits[selected], 'попадание', 'попадания', 'попаданий')}.`}
          </p>
          <p className="status" aria-live={running ? 'off' : 'polite'} data-testid="picture-status">
            {status}
          </p>
        </div>
      </div>

      <div className="side-column">
        <div className="actions actions--four">
          {BATCHES.map((amount) => (
            <button key={amount} className={amount === 100 ? 'btn btn--primary' : 'btn'} type="button" disabled={running} onClick={() => run(amount)}>
              {amount} {plural(amount, 'попытка', 'попытки', 'попыток')}
            </button>
          ))}
        </div>
        <button
          className="btn btn--quiet"
          type="button"
          onClick={() => {
            const next = newSeed();
            setSeed(next);
            restart(size, next);
          }}
        >
          Сбросить
        </button>
        <Readouts
          items={[
            { label: 'Попытки', value: formatInteger(state.attempts), testId: 'picture-attempts' },
            { label: 'Открыто клеток', value: formatInteger(state.openedCount), tone: 'amber', testId: 'picture-opened' },
            { label: 'Повторы', value: formatInteger(state.repeats), tone: 'coral', testId: 'picture-repeats' },
            { label: 'Открыто поля', value: percent(state.openedCount / cells), tone: 'cyan', testId: 'picture-percent' },
          ]}
        />
        <p className="balance" data-testid="picture-balance">
          Открыто {formatInteger(state.openedCount)} + повторов {formatInteger(state.repeats)} = попыток {formatInteger(state.attempts)}. Сумма карты попаданий:{' '}
          <span data-testid="picture-hits-total">{formatInteger(hitsTotal)}</span>.
        </p>

        <details className="more">
          <summary>Прогноз до первой попытки</summary>
        <div className="field">
          <label htmlFor="forecast">Сколько клеток откроется за {formatInteger(cells)} попыток?</label>
          <input
            ref={forecastInput}
            id="forecast"
            className="input"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder={`необязательно, от 0 до ${cells}`}
            value={hasStarted ? (lockedForecast?.toString() ?? '') : forecastText}
            disabled={hasStarted || running}
            aria-invalid={forecastError !== null}
            aria-describedby={forecastHintId}
            onChange={(event) => {
              setForecastText(event.target.value);
              setShowForecastError(false);
            }}
          />
          <p className={forecastError ? 'hint hint--error' : 'hint'} id={forecastHintId} role={forecastError ? 'alert' : undefined}>
            {forecastError ??
              (hasStarted
                ? lockedForecast === null
                  ? 'Прогноз вводится до первой попытки.'
                  : 'Прогноз принят и не меняется до сброса.'
                : 'Необязательное поле. Прогноз принимается до первой попытки.')}
          </p>
        </div>
        </details>

        {lockedForecast !== null && state.openedAtForecast !== null ? (
          <div className="verdict" data-testid="forecast-result">
            <p className="verdict-title">
              {lockedForecast === state.openedAtForecast
                ? 'Прогноз совпал с результатом'
                : `Прогноз отличается на ${Math.abs(lockedForecast - state.openedAtForecast)} ${cellWord(Math.abs(lockedForecast - state.openedAtForecast))}`}
            </p>
            <p>
              Прогноз: {lockedForecast}. На попытке {formatInteger(cells)} открыто: {state.openedAtForecast}. Ориентир: {formatOneDecimal(expectedOpened(cells, cells))}.
            </p>
          </div>
        ) : null}

        <RunControls seed={seed} onRepeat={() => restart(size, seed)} onNew={() => {
          const next = newSeed();
          setSeed(next);
          restart(size, next);
        }} />
        <details className="more">
          <summary>Почему открывается не вся картинка</summary>
          <div className="more-body" data-testid="picture-explanation">
            <p>
              Вероятность того, что конкретная клетка из M ни разу не выпадет за k попыток, равна (1 − 1/M)<sup>k</sup>.
            </p>
            <p>
              Сейчас M = {formatInteger(cells)}, k = {formatInteger(state.attempts)}: вероятность равна {formatThreeDecimals(missProbability(state.attempts, cells))}, а в
              среднем открылось бы {formatOneDecimal(expectedOpened(state.attempts, cells))} из {formatInteger(cells)} клеток.
            </p>
            <p>
              При k = M ожидается около 63&nbsp;% поля, например 63,4 клетки из 100 для поля 10×10. Остальные попытки уходят на
              повторы — их видно на карте попаданий.
            </p>
          </div>
        </details>
      </div>

      <div className="notes picture-notes">
        <LineChart
          series={[
            { points: actualPoints, className: 'series-amber', label: 'Фактическая доля открытого поля' },
            { points: theoryPoints, className: 'series-cyan', label: `Ожидание 1 − (1 − 1/M)^k, M = ${formatInteger(cells)}`, kind: 'dashed' },
          ]}
          xDomain={[0, xMax]}
          yDomain={[0, 1]}
          xLabel="Число попыток k"
          yLabel="Доля открытого поля"
          formatX={formatInteger}
          formatY={percent}
          ariaLabel="График заполнения поля: фактическая и ожидаемая доля открытых клеток"
        />
      </div>

      <PictureSeries key={size} active={active} size={size} />
    </section>
  );
}
