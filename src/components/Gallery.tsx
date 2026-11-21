import { useMemo, useState } from 'react';
import { SpatialPlot } from './SpatialPlot';
import {
  galtonScene,
  gaussianScene,
  meanScene,
  noiseScene,
  pictureScene,
  silhouetteScene,
  triangleScene,
  walkScene,
} from '../lib/experimentScenes';
import { ChaosRun } from '../lib/chaosGame';
import { DensityMap } from '../lib/densityMap';
import { createRng } from '../lib/random';
import { generateWalks, positionTable } from '../lib/randomWalk';
import { NoiseSeries, geometricGray } from '../lib/noiseImage';
import { starMask, Throws } from '../lib/silhouette';

export interface GalleryItem {
  id: string;
  title: string;
  hint: string;
}

const specs: Record<string, { topic: string; formula: string }> = {
  galton: { topic: 'Вероятность', formula: 'X ∼ Bin(n, p)' },
  walk: { topic: 'Вероятность', formula: 'Sₖ = Σ ξᵢ' },
  picture: { topic: 'Вероятность', formula: '1 − (1 − 1/m)ⁿ' },
  triangle: { topic: 'Геометрия', formula: 'P′ = P + t(V − P)' },
  noise: { topic: 'Статистика', formula: 'σ / √n' },
  mean: { topic: 'Статистика', formula: 'x̄ = Σ xᵢ / n' },
  silhouette: { topic: 'Геометрия', formula: 'Â = k / n' },
};

function preview(id: string) {
  const rng = createRng(46);
  switch (id) {
    case 'galton':
      return galtonScene([1, 8, 28, 56, 70, 56, 28, 8, 1], [true, false, true, true, false, true, false, false]);
    case 'walk': {
      const paths = generateWalks(18, 45, 0.53, rng).paths.map(positionTable);
      return walkScene(paths, 45, 19, 45, 0, null);
    }
    case 'picture':
      return pictureScene(
        Array.from({ length: 144 }, () => (rng() < 0.35 ? 0 : 1 + Math.floor(rng() * 4))),
        12,
        null,
      );
    case 'triangle': {
      const map = new DensityMap(600, 540, 1),
        run = new ChaosRun([2, 2, 3], rng);
      for (let i = 0; i < 8000; i++) {
        const vertex = run.step();
        map.add(run.x, run.y, vertex);
      }
      return triangleScene(map);
    }
    case 'noise': {
      const series = new NoiseSeries(geometricGray(), 96, 100, 32);
      series.addFrames(8);
      return noiseScene(series);
    }
    case 'mean':
      return meanScene([[10, 11, 12, 13, 44]], [0, 50]);
    default: {
      const mask = starMask(),
        sample = new Throws(mask, rng);
      sample.add(700);
      return silhouetteScene(mask, sample, false);
    }
  }
}

function Preview({ id }: { id: string }) {
  const scene = useMemo(() => preview(id), [id]);
  return <SpatialPlot compact label={specs[id].topic} build={() => scene} />;
}

export function Gallery({
  items,
  onOpen,
  onStudy,
}: {
  items: readonly GalleryItem[];
  onOpen: (id: string) => void;
  onStudy: () => void;
}) {
  const [topic, setTopic] = useState('Все');
  const surface = useMemo(gaussianScene, []);
  const visible = items.filter((item) => topic === 'Все' || specs[item.id].topic === topic);
  return (
    <section className="atlas" data-testid="gallery">
      <div className="atlas-hero">
        <div className="hero-copy">
          <p className="discipline">
            <i /> Лаборатория визуальной математики
          </p>
          <h1>
            Порядок
            <br />
            <em>из хаоса</em>
          </h1>
          <p className="hero-summary">Семь интерактивных опытов о том, как из случайных событий рождаются закономерности.</p>
        </div>
        <figure className="hero-figure">
          <div className="figure-top">
            <span>ρ(x, y)</span>
            <span>σₓ = σᵧ = 1</span>
          </div>
          <SpatialPlot interactive build={() => surface} label="Плотность двумерного нормального распределения" />
          <figcaption>
            <span>Нормальное распределение</span>
            <span title="Поворот мышью или стрелками">⟲ Вращайте график</span>
          </figcaption>
        </figure>
      </div>
      <section className="catalog" id="catalog" aria-labelledby="catalog-heading">
        <div className="catalog-head">
          <h2 id="catalog-heading">
            Эксперименты <small>{String(visible.length).padStart(2, '0')}</small>
          </h2>
          <div className="topics" aria-label="Фильтр по теме">
            {['Все', 'Вероятность', 'Геометрия', 'Статистика'].map((t) => (
              <button key={t} type="button" aria-pressed={topic === t} onClick={() => setTopic(t)}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <ul className="atlas-grid">
          {visible.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={'atlas-card card-' + item.id}
                onClick={() => onOpen(item.id)}
                data-testid={'card-' + item.id}
              >
                <span className="card-plate">
                  <span className="card-formula">{specs[item.id].formula}</span>
                  <Preview id={item.id} />
                </span>
                <span className="card-body">
                  <span className="card-topic">{specs[item.id].topic}</span>
                  <span className="card-title">{item.title}</span>
                  <span className="card-copy">{item.hint}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
      <footer className="atlas-footer">
        <span>Порядок из хаоса</span>
        <button type="button" onClick={onStudy}>
          Перейти в учебный режим ↗
        </button>
      </footer>
    </section>
  );
}
