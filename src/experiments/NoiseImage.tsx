import { SpatialView } from '../components/SpatialPlot';
import { noiseScene } from '../lib/experimentScenes';
import frameWide from '../course/sprites/frame-wide.webp';
import { useEffect, useRef, useState } from 'react';
import { LineChart, RangeField, RunControls, Segmented } from '../components/Charts';
import { Readouts } from '../components/Readouts';
import { useFrameLoop } from '../hooks/useFrameLoop';
import { runningMeans, thin } from '../lib/chart';
import { formatInteger, formatStatistic } from '../lib/format';
import { NOISE_SIZE, NoiseSeries, geometricGray, lighthouseGray, noiseSigma, toGray } from '../lib/noiseImage';
import { newSeed } from '../lib/random';

type SourceKind = 'lighthouse' | 'geometry' | 'upload';
const MAX_FRAMES = 5000;

/** Загруженное изображение: обрезка до квадрата по центру, уменьшение до NOISE_SIZE, перевод в яркость. */
function loadImage(file: File): Promise<Float32Array> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = NOISE_SIZE;
      canvas.height = NOISE_SIZE;
      const context = canvas.getContext('2d');
      if (!context) return reject(new Error('Холст недоступен'));
      const side = Math.min(image.width, image.height);
      context.drawImage(image, (image.width - side) / 2, (image.height - side) / 2, side, side, 0, 0, NOISE_SIZE, NOISE_SIZE);
      URL.revokeObjectURL(url);
      resolve(toGray(context.getImageData(0, 0, NOISE_SIZE, NOISE_SIZE).data, NOISE_SIZE * NOISE_SIZE));
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Не удалось прочитать изображение'));
    };
    image.src = url;
  });
}

/** Картинка 96×96 с выделенным пикселем. Нажатие пересчитывается по фактическому размеру. */
function GrayImage({
  rgba,
  title,
  selected,
  onSelect,
  testId,
}: {
  rgba: Uint8ClampedArray;
  title: string;
  selected: number;
  onSelect: (pixel: number) => void;
  testId: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const context = canvasRef.current?.getContext('2d');
    if (!context) return;
    const image = context.createImageData(NOISE_SIZE, NOISE_SIZE);
    image.data.set(rgba);
    context.putImageData(image, 0, 0);
  }, [rgba]);
  const x = selected % NOISE_SIZE;
  const y = Math.floor(selected / NOISE_SIZE);
  return (
    <figure className="noise-item">
      <div
        className="noise-image"
        data-testid={testId}
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const px = Math.min(NOISE_SIZE - 1, Math.max(0, Math.floor(((event.clientX - rect.left) / rect.width) * NOISE_SIZE)));
          const py = Math.min(NOISE_SIZE - 1, Math.max(0, Math.floor(((event.clientY - rect.top) / rect.height) * NOISE_SIZE)));
          onSelect(py * NOISE_SIZE + px);
        }}
      >
        <canvas ref={canvasRef} width={NOISE_SIZE} height={NOISE_SIZE} role="img" aria-label={title} />
        <svg viewBox={`0 0 ${NOISE_SIZE} ${NOISE_SIZE}`} aria-hidden="true">
          <rect className="noise-pick" x={x - 0.5} y={y - 0.5} width="2" height="2" />
          <rect className="noise-pick-outer" x={x - 2} y={y - 2} width="5" height="5" />
        </svg>
        <img className="noise-frame" src={frameWide} alt="" />
      </div>
      <figcaption>{title}</figcaption>
    </figure>
  );
}

export function NoiseImage({ active }: { active: boolean }) {
  const [kind, setKind] = useState<SourceKind>('lighthouse');
  const [uploaded, setUploaded] = useState<Float32Array | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [amplitude, setAmplitude] = useState(100);
  const [seed, setSeed] = useState(newSeed);
  const [showSource, setShowSource] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [selected, setSelected] = useState(NOISE_SIZE * 40 + 48);
  const [, setVersion] = useState(0);
  const seriesRef = useRef<NoiseSeries | null>(null);

  const source = kind === 'upload' && uploaded ? uploaded : kind === 'geometry' ? geometricGray() : lighthouseGray();

  /** Новая серия: после смены изображения, уровня шума или seed. Сразу виден первый кадр. */
  const restart = (nextSource: Float32Array, nextAmplitude: number, nextSeed: number) => {
    const series = new NoiseSeries(nextSource, NOISE_SIZE, nextAmplitude, nextSeed);
    series.addFrame();
    seriesRef.current = series;
    setPlaying(false);
    setVersion((value) => value + 1);
  };
  if (seriesRef.current === null) {
    const series = new NoiseSeries(source, NOISE_SIZE, amplitude, seed);
    series.addFrame();
    seriesRef.current = series;
  }
  const series = seriesRef.current;

  const add = (count: number) => {
    series.addFrames(Math.min(count, MAX_FRAMES - series.frames));
    setVersion((value) => value + 1);
  };

  useFrameLoop(active && playing, () => {
    if (series.frames >= MAX_FRAMES) {
      setPlaying(false);
      return;
    }
    add(series.frames < 100 ? 1 : series.frames < 1000 ? 5 : 20);
  });

  const sigma = noiseSigma(amplitude);
  const n = series.frames;
  const frameRgba = series.toRgba((pixel) => series.current[pixel]);
  const meanRgba = series.toRgba((pixel) => series.mean(pixel));
  const sourceRgba = series.toRgba((pixel) => series.source[pixel]);
  const truth = series.source[selected];
  const history = series.pixelHistory(selected);
  const historyMeans = runningMeans(history);
  const dots = thin(
    history.map((value, index) => [index + 1, value] as const),
    400,
  );
  const meanLine = thin(
    historyMeans.map((value, index) => [index + 1, value] as const),
    400,
  );
  const rmsePoints = thin(
    series.rmse.map((value, index) => [index + 1, value] as const),
    500,
  );
  const theoryPoints = thin(
    series.rmse.map((_, index) => [index + 1, sigma / Math.sqrt(index + 1)] as const),
    200,
  );
  const px = selected % NOISE_SIZE;
  const py = Math.floor(selected / NOISE_SIZE);
  const currentRmse = series.rmse[series.rmse.length - 1] ?? 0;

  return (
    <section className="experiment experiment--noise" id="panel-noise" hidden={!active}>
      <div className="experiment-head">
        <h2>От шума к изображению</h2>
        <p className="action-line">Нажми «+10» несколько раз и сравни последний кадр со средним по всем кадрам.</p>
      </div>

      <div className="viz-column">
        <div className="viz-group">
          <SpatialView title="Рельеф яркости" label="Рельефы кадра и среднего изображения" active={active}
            caption="Чем ярче пиксель, тем выше поверхность. Шкала яркости общая, от 0 до 255. Выбрать пиксель можно в 2D."
            build={() => noiseScene(series, true, showSource, selected)}>
          <div className="noise-row" style={{ gridTemplateColumns: `repeat(${showSource ? 3 : 2}, minmax(0, 1fr))` }}>
            <GrayImage rgba={frameRgba} title={`Последний кадр № ${formatInteger(n)}`} selected={selected} onSelect={setSelected} testId="noise-frame" />
            <GrayImage rgba={meanRgba} title={`Среднее по ${formatInteger(n)} кадрам`} selected={selected} onSelect={setSelected} testId="noise-mean" />
            {showSource ? <GrayImage rgba={sourceRgba} title="Исходник" selected={selected} onSelect={setSelected} testId="noise-source" /> : null}
          </div>
          <p className="hint">Нажмите на любую картинку, чтобы выбрать пиксель: метка появится на обеих.</p>
          </SpatialView>
        </div>
        <div className="viz-secondary noise-pixel">
          <p className="pixel-row" data-testid="noise-pixel-info">
            <strong>
              Выбранный пиксель ({px + 1}; {py + 1})
            </strong>{' '}
            · измерение {formatStatistic(history[history.length - 1] ?? truth)} · среднее {formatStatistic(series.mean(selected))} · истинная
            яркость {formatStatistic(truth)}
          </p>
        <LineChart
          series={[
            { points: dots, className: 'series-mist', label: 'Измерения пикселя', kind: 'dots' },
            { points: meanLine, className: 'series-amber', label: 'Накопленное среднее' },
            { points: [[1, truth], [Math.max(2, n), truth]], className: 'series-cyan', label: 'Истинная яркость', kind: 'dashed' },
          ]}
          xDomain={[1, Math.max(2, n)]}
          yDomain={[Math.min(0, truth - amplitude), Math.max(255, truth + amplitude)]}
          xLabel="Номер кадра"
          yLabel="Яркость выбранного пикселя, 0–255"
          formatX={formatInteger}
          formatY={formatInteger}
          ariaLabel="Измерения выбранного пикселя, накопленное среднее и истинная яркость"
        />
        </div>
      </div>

      <div className="side-column">
        <div className="actions actions--four">
          <button className="btn" type="button" onClick={() => add(1)} disabled={n >= MAX_FRAMES}>
            +1
          </button>
          <button className="btn" type="button" onClick={() => add(10)} disabled={n >= MAX_FRAMES}>
            +10
          </button>
          <button className="btn" type="button" onClick={() => add(100)} disabled={n >= MAX_FRAMES}>
            +100
          </button>
          <button className={playing ? 'btn btn--primary' : 'btn'} type="button" onClick={() => setPlaying(!playing)} disabled={n >= MAX_FRAMES}>
            {playing ? 'Пауза' : 'Автозапуск'}
          </button>
        </div>
        <button className="btn btn--quiet" type="button" onClick={() => restart(source, amplitude, seed)}>
          Сбросить
        </button>
        <Readouts
          items={[
            { label: 'Кадров n', value: formatInteger(n), tone: 'amber', testId: 'noise-frames' },
            { label: 'Ошибка среднего', value: formatStatistic(currentRmse), tone: 'cyan', testId: 'noise-rmse' },
          ]}
        />
        <p className="balance">
          Ошибка отдельного кадра: <span data-testid="noise-frame-rmse">{formatStatistic(series.frameRmse)}</span>, теория σ = a/√3 ={' '}
          {formatStatistic(sigma)}.
        </p>

        <Segmented
          legend="Изображение"
          options={[
            { value: 'lighthouse', label: 'Маяк' },
            { value: 'geometry', label: 'Геометрия' },
            { value: 'upload', label: 'Своё' },
          ]}
          value={kind}
          onChange={(value) => {
            setKind(value);
            if (value !== 'upload') restart(value === 'geometry' ? geometricGray() : lighthouseGray(), amplitude, seed);
            else if (uploaded) restart(uploaded, amplitude, seed);
          }}
        />
        {kind === 'upload' ? (
          <div className="field">
            <label htmlFor="noise-file">Изображение с компьютера или телефона</label>
            <input
              id="noise-file"
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                loadImage(file)
                  .then((gray) => {
                    setUploaded(gray);
                    setUploadError(null);
                    restart(gray, amplitude, seed);
                  })
                  .catch((error: Error) => setUploadError(error.message));
              }}
            />
            <p className={uploadError ? 'hint hint--error' : 'hint'}>
              {uploadError ?? 'Файл обрабатывается в браузере и никуда не отправляется. Он обрезается до квадрата и уменьшается до 96×96.'}
            </p>
          </div>
        ) : null}
        <label className="check">
          <input type="checkbox" checked={showSource} onChange={(event) => setShowSource(event.target.checked)} />
          <span>Показать исходник</span>
        </label>
        <RangeField
          id="noise-amplitude"
          label="Уровень шума a"
          value={amplitude}
          min={0}
          max={200}
          step={5}
          onChange={(value) => {
            setAmplitude(value);
            restart(source, value, seed);
          }}
          display={`±${formatInteger(amplitude)}`}
        />
        <RunControls
          seed={seed}
          onRepeat={() => restart(source, amplitude, seed)}
          onNew={() => {
            const next = newSeed();
            setSeed(next);
            restart(source, amplitude, next);
          }}
        />
      </div>

      <div className="notes">
          <LineChart
          series={[
            { points: rmsePoints, className: 'series-amber', label: 'Фактическая СКО среднего по всему изображению' },
            { points: theoryPoints, className: 'series-cyan', label: 'Теория σ/√n', kind: 'dashed' },
          ]}
          xDomain={[1, Math.max(2, n)]}
          yDomain={[0, Math.max(1, sigma)]}
          xLabel="Число кадров n"
          yLabel="Среднеквадратическая ошибка, единиц яркости"
          formatX={formatInteger}
          formatY={formatInteger}
          ariaLabel="Среднеквадратическая ошибка восстановления в зависимости от числа кадров"
        />
        <details className="more">
          <summary>Почему среднее очищает рисунок</summary>
          <div className="more-body" data-testid="noise-explanation">
            <p>
              Шум одного измерения равномерный на [−{amplitude}; {amplitude}]: его дисперсия σ<sup>2</sup> = a<sup>2</sup>/3 ={' '}
              {formatStatistic(sigma * sigma)}, стандартное отклонение σ = {formatStatistic(sigma)}.
            </p>
            <p>
              Шум среднего по n независимым кадрам имеет дисперсию σ<sup>2</sup>/n = {formatStatistic((sigma * sigma) / Math.max(1, n))} и
              стандартное отклонение σ/√n = {formatStatistic(sigma / Math.sqrt(Math.max(1, n)))}. Дисперсия падает в n раз, а
              стандартное отклонение — только в √n раз: чтобы уменьшить ошибку вдвое, нужно вчетверо больше кадров.
            </p>
            <p>
              Среднее и ошибка считаются по точным значениям, до ограничения яркости диапазоном 0–255. Ограничение применяется
              только при выводе картинки. Отдельный кадр при этом остаётся таким же шумным, как первый.
            </p>
            <p>
              Шкала яркости 0–255: 0 — чёрный, 255 — белый. Для цветного изображения яркость пикселя считается как
              Y = 0,299 R + 0,587 G + 0,114 B.
            </p>
          </div>
        </details>
      </div>
    </section>
  );
}
