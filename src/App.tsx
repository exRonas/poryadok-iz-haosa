import { useEffect, useState } from 'react';
import { Gallery, type GalleryItem } from './components/Gallery';
import { GaltonBoard, type GaltonReplay } from './experiments/GaltonBoard';
import { HiddenPicture } from './experiments/HiddenPicture';
import { MeanShift } from './experiments/MeanShift';
import { NoiseImage } from './experiments/NoiseImage';
import { RandomWalk } from './experiments/RandomWalk';
import { SierpinskiTriangle } from './experiments/SierpinskiTriangle';
import { Silhouette } from './experiments/Silhouette';
import { CourseApp } from './course/CourseApp';
import { StudyLab } from './experiments/StudyLab';

const EXPERIMENTS: readonly GalleryItem[] = [
  { id: 'galton', title: 'Доска Гальтона', hint: 'Запусти шарики и посмотри, в каких ячейках они соберутся.' },
  { id: 'walk', title: 'Случайное блуждание', hint: 'Проследи один случайный путь, затем сравни его с сотней других.' },
  { id: 'picture', title: 'Скрытая картинка', hint: 'Открывай случайные клетки и узнай, сколько попыток уйдёт на рисунок.' },
  { id: 'triangle', title: 'Треугольник Серпинского', hint: 'Измени вероятность выбора вершины и посмотри, где узор станет плотнее.' },
  { id: 'noise', title: 'От шума к изображению', hint: 'Сложи несколько шумных кадров и прояви спрятанные детали.' },
  { id: 'mean', title: 'Как одна точка меняет среднее', hint: 'Перетащи точку и проследи за средним и медианой.' },
  { id: 'silhouette', title: 'Нарисуй силуэт точками', hint: 'Нарисуй фигуру и оцени её площадь случайными точками.' },
];

type View = 'gallery' | 'study' | (typeof EXPERIMENTS)[number]['id'];

const TITLE = 'Порядок из хаоса';

const viewFromHash = (): View => {
  const id = window.location.hash.slice(1);
  if (id === 'study' || id.startsWith('study/')) return id;
  return EXPERIMENTS.some((item) => item.id === id) ? id : 'gallery';
};

function Brand({ onClick }: { onClick: () => void }) {
  return <a className="atlas-brand" href="#" aria-label={TITLE + ' — главная'} onClick={event=>{event.preventDefault();onClick();}}>
    <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round">
        <path d="M2 25 15 4 30 25Z M6 25 15 9 26 25 M10 25 15 14 22 25 M14 25 15 19 18 25"/>
      </g>
    </svg><span>Матстат</span>
  </a>;
}

export function App() {
  const [view, setView] = useState<View>(viewFromHash);
  const [projector, setProjector] = useState(false);
  const [replay, setReplay] = useState<GaltonReplay | null>(null);

  // Кнопка «Назад» браузера возвращает к галерее; ручная смена адреса тоже работает.
  useEffect(() => {
    const sync = () => setView(viewFromHash());
    window.addEventListener('popstate', sync);
    window.addEventListener('hashchange', sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener('hashchange', sync);
    };
  }, []);

  const open = (next: View) => {
    if (next === view) return;
    window.history.pushState(null, '', next === 'gallery' ? window.location.pathname + window.location.search : `#${next}`);
    setView(next);
    window.scrollTo({ top: 0 });
  };

  const inSchool = view === 'study' || view.startsWith('study/');
  useEffect(() => { if (inSchool) window.scrollTo({ top: 0 }); }, [view, inSchool]);
  const current = EXPERIMENTS.find((item) => item.id === view);

  return (
    <div className={['app', projector && 'app--projector', projector && !current && 'app--projector-page', inSchool && (view === 'study/research' ? 'school-mode' : 'course-mode')].filter(Boolean).join(' ')}>
      <header className="topbar">
        <Brand onClick={() => { open('gallery'); window.scrollTo({top:0}); }} />
        <nav className="topnav" aria-label="Навигация">
          <button
            type="button"
            className="btn nav-button"
            aria-current={view === 'gallery' ? 'page' : undefined}
            onClick={() => { open('gallery'); requestAnimationFrame(() => document.getElementById('catalog')?.scrollIntoView()); }}
            data-testid="nav-gallery"
          >
            Эксперименты
          </button>
          <button
            type="button"
            className="btn nav-button nav-button--quiet"
            aria-current={inSchool ? 'page' : undefined}
            onClick={() => open('study')}
            data-testid="nav-study"
          >
            Учебный режим
          </button>
          <button className="btn btn--toggle projector-button" type="button" aria-pressed={projector} onClick={() => setProjector((value) => !value)}>
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" aria-hidden="true"><path d="M2 3h16M3 4h14v9H3zM10 13v3m-4 2 4-2 4 2"/></svg> Проектор
          </button>
        </nav>
      </header>

      {current ? (
        <p className="crumbs">
          <button type="button" className="link-button" onClick={() => open('gallery')}>
            ← Все эксперименты
          </button>
        </p>
      ) : null}

      <main>
        {view === 'gallery' ? <Gallery items={EXPERIMENTS} onOpen={(id) => open(id as View)} onStudy={() => open('study')} /> : null}
        <GaltonBoard active={view === 'galton'} replay={replay} />
        <RandomWalk
          active={view === 'walk'}
          onOpenGalton={(path) => {
            setReplay((previous) => ({ id: (previous?.id ?? 0) + 1, path }));
            open('galton');
          }}
        />
        <HiddenPicture active={view === 'picture'} />
        <SierpinskiTriangle active={view === 'triangle'} />
        <NoiseImage active={view === 'noise'} />
        <MeanShift active={view === 'mean'} />
        <Silhouette active={view === 'silhouette'} />
        {inSchool && view !== 'study/research' ? <CourseApp route={view} /> : null}
        {view === 'study/research' ? <StudyLab active /> : null}
      </main>
    </div>
  );
}
