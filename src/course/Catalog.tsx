import heroPoster from './art/hero.webp';
import heroVideo from './art/hero.webm';
import { Art } from './Art';
import { COURSES } from './courses';
import { readRecord } from './progress';
import { lessonHash } from './routing';
import type { StorageLike } from '../lib/study';
import type { CourseDef } from './types';

const STEPS = [
  { title: 'Идея и формула', text: 'Определение простыми словами и одна главная формула.' },
  { title: 'Опыт в уроке', text: 'Меняете параметр — график и числа отвечают сразу.' },
  { title: 'Вопрос по графику', text: 'Ответ проверяется сразу, с разбором.' },
  { title: 'Полный эксперимент', text: 'Кнопка открывает большой эксперимент сайта.' },
];

/** Заголовок с выделенным словом: «Матстат, который <em>видно</em>». */
export function Accent({ text, accent }: { text: string; accent: string }) {
  const at = text.toLowerCase().indexOf(accent.toLowerCase());
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <em>{text.slice(at, at + accent.length)}</em>
      {text.slice(at + accent.length)}
    </>
  );
}

export const doneLessons = (course: CourseDef, storage: StorageLike | null): number =>
  course.lessons.filter((lesson) => readRecord(storage, `${course.id}/${lesson.id}`).done).length;

export function Catalog({ storage }: { storage: StorageLike | null }) {
  const open = COURSES.filter((course) => course.ready);
  // Шапка ведёт к первому открытому курсу, который ещё не пройден целиком.
  const first = open.find((course) => doneLessons(course, storage) < course.lessons.length) ?? open[0];
  const done = doneLessons(first, storage);
  const next = first.lessons.find((lesson) => !readRecord(storage, `${first.id}/${lesson.id}`).done) ?? first.lessons[0];
  const total = first.lessons.length;
  const n = first.number;

  return (
    <div className="c-page">
      <section className="c-hero c-grid-bg">
        <div className="c-hero-copy">
          <p className="c-eyebrow">Учебный режим · 4 курса</p>
          <h1 className="c-title c-title--xl">
            Матстат,
            <br />
            который <em>видно</em>
          </h1>
          <p className="c-lead">
            Курсы по математической статистике для студентов. Каждое понятие — живой опыт: бросаете шарики, двигаете точки и смотрите, как
            случайность складывается в закон.
          </p>
          <div className="c-actions">
            <a className="c-btn" href={lessonHash(first, next)}>
              {done === 0 ? `Начать курс ${n}` : done === total ? `Повторить курс ${n}` : `Продолжить курс ${n}`}
            </a>
            <a className="c-btn c-btn--ghost" href="#">
              Все эксперименты
            </a>
          </div>
          <div className="c-hero-progress" aria-label={`Пройдено ${done} из ${total} уроков курса ${n}`}>
            <div className="c-hero-progress-head">
              <span className="c-hero-progress-course">
                Курс {n} · {first.title}
              </span>
              <span className="c-hero-progress-count" aria-hidden="true">
                {done}
                <span> / {total}</span>
              </span>
            </div>
            <div className="c-hero-progress-segs" aria-hidden="true">
              {first.lessons.map((lesson) => {
                const passed = readRecord(storage, `${first.id}/${lesson.id}`).done;
                const current = !passed && done < total && lesson === next;
                return <i key={lesson.id} className={passed ? 'is-done' : current ? 'is-next' : undefined} />;
              })}
            </div>
            <p className="c-hero-progress-next">
              {done === total ? 'Курс пройден — можно повторить' : `Дальше: урок ${next.number} «${next.title}»`}
            </p>
          </div>
        </div>
        <Art size="hero" src={heroPoster} video={heroVideo} alt="Стеклянный кубик, хромовый колокол Гаусса и шарики" />
      </section>

      <section className="c-section" aria-labelledby="courses-title">
        <h2 className="c-title c-title--lg c-center" id="courses-title">
          Четыре курса. <em>Шестнадцать опытов</em>
        </h2>
        <p className="c-lead c-center">
          От выборки до метода Монте-Карло. В каждом уроке — свой опыт по мотивам экспериментов сайта и вопрос, на который отвечаешь по
          графику.{' '}
          {open.length === COURSES.length ? 'Открыты все курсы.' : `Открыто курсов: ${open.length} из ${COURSES.length}, остальные готовятся.`}
        </p>
        <div className="c-bento">
          {COURSES.map((course) => {
            const passed = doneLessons(course, storage);
            const body = (
              <>
                <span className="c-num">
                  Курс {course.number}
                  {course.ready ? (passed === course.lessons.length ? ' · пройден' : passed > 0 ? ' · продолжить' : '') : ''}
                </span>
                <h3 className="c-title c-title--md">{course.title}</h3>
                <p>{course.ready ? course.summary : course.topics}</p>
                <div className="c-course-art">
                  <img src={course.art} alt="" decoding="async" />
                </div>
                {course.ready ? (
                  <>
                    <div className="c-meta">
                      <span>{course.lessons.length} урока + итог</span>
                      <span>
                        {passed} из {course.lessons.length}
                      </span>
                    </div>
                    <span className="c-bar-track" aria-hidden="true">
                      <i style={{ width: `${(passed / course.lessons.length) * 100}%` }} />
                    </span>
                  </>
                ) : (
                  <span className="c-badge">Скоро</span>
                )}
              </>
            );
            if (!course.ready) {
              return (
                <article key={course.id} className="c-course c-course--soon" aria-label={`Курс ${course.number}: ${course.title}, скоро`}>
                  {body}
                </article>
              );
            }
            const nextLesson = course.lessons.find((lesson) => !readRecord(storage, `${course.id}/${lesson.id}`).done) ?? course.lessons[0];
            return (
              <a
                key={course.id}
                className={'c-course ' + (course.id === first.id ? 'c-course--ready' : 'c-course--open')}
                href={lessonHash(course, nextLesson)}
              >
                {body}
              </a>
            );
          })}
        </div>
      </section>

      <section className="c-section" aria-labelledby="steps-title">
        <h2 className="c-title c-title--lg c-center" id="steps-title">
          Как устроен <em>урок</em>
        </h2>
        <p className="c-lead c-center">Четыре шага, 10–15 минут. Прогресс сохраняется в этом браузере.</p>
        <ol className="c-steps">
          {STEPS.map((step, index) => (
            <li key={step.title} className="c-step">
              <span className="c-step-track" aria-hidden="true">
                Шаг {index + 1}
                <i />
                {index === STEPS.length - 1 ? (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M3 1h1.5v14H3zM5.5 2h8l-2 3.5 2 3.5h-8z" />
                  </svg>
                ) : (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                    <path d="M2 1l9 5-9 5z" />
                  </svg>
                )}
              </span>
              <h3 className="c-title c-title--sm">{step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="c-research">
        <div>
          <h2 className="c-title c-title--md">Исследование с преподавателем</h2>
          <p>Вход по коду участника, группы А и Б, тесты до и после занятия.</p>
        </div>
        <a className="c-btn c-btn--ghost" href="#study/research">
          Открыть исследование
        </a>
      </section>
    </div>
  );
}
