import { useState } from 'react';
import type { StorageLike } from '../lib/study';
import { Art } from './Art';
import { Accent } from './Catalog';
import { Quiz } from './Quiz';
import { type LessonRecord, readRecord, writeRecord } from './progress';
import { answerResetNeeded, lessonHash, summaryHash } from './routing';
import type { CourseDef, LectureSection, LessonDef } from './types';

const STEPS = [
  { id: 'lesson-idea', label: 'Лекция' },
  { id: 'lesson-lab', label: 'Опыт' },
  { id: 'lesson-check', label: 'Вопрос' },
  { id: 'lesson-next', label: 'Дальше' },
];

/** Лекция: разделы по порядку, у каждого — текст, мини-опыт, пример и типичная ошибка. */
function Lecture({ sections }: { sections: LectureSection[] }) {
  return (
    <div className="c-lecture">
      <nav className="c-lecture-toc" aria-label="Разделы лекции">
        <ol>
          {sections.map((section, i) => (
            <li key={i}>
              <a href={`#lecture-${i + 1}`} onClick={(event) => { event.preventDefault(); scrollTo(`lecture-${i + 1}`); }}>
                {section.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>
      {sections.map((section, i) => (
        <section key={i} id={`lecture-${i + 1}`} className="c-lecture-part" aria-labelledby={`lecture-${i + 1}-title`}>
          <h3 className="c-lecture-title" id={`lecture-${i + 1}-title`}>
            <span className="c-lecture-num">{i + 1}</span>
            {section.title}
          </h3>
          <div className="c-prose">{section.body}</div>
          {section.demo ? (
            <div className="c-demo">
              <p className="c-lecture-label">Попробуйте</p>
              {section.demo}
            </div>
          ) : null}
          {section.example ? (
            <div className="c-example">
              <p className="c-lecture-label">Пример</p>
              <div className="c-prose">{section.example}</div>
            </div>
          ) : null}
          {section.pitfall ? (
            <div className="c-pitfall">
              <p className="c-lecture-label">Частая ошибка</p>
              <div className="c-prose">{section.pitfall}</div>
            </div>
          ) : null}
        </section>
      ))}
    </div>
  );
}

const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

export function Syllabus({ course, current, storage }: { course: CourseDef; current: string; storage: StorageLike | null }) {
  return (
    <nav className="c-syllabus" aria-label={`Содержание курса «${course.title}»`}>
      <p className="c-eyebrow">Курс {course.number}</p>
      <p className="c-syllabus-title">{course.title}</p>
      <ol>
        {course.lessons.map((item) => {
          const done = readRecord(storage, `${course.id}/${item.id}`).done;
          return (
            <li key={item.id}>
              <a href={lessonHash(course, item)} aria-current={item.id === current ? 'page' : undefined}>
                <span className={'c-syllabus-mark' + (done ? ' c-syllabus-mark--done' : '')} aria-hidden="true">
                  {done ? '✓' : item.number}
                </span>
                <span>
                  {item.title}
                  {done ? <span className="visually-hidden"> — пройден</span> : null}
                </span>
              </a>
            </li>
          );
        })}
        <li>
          <a href={summaryHash(course)} aria-current={current === 'summary' ? 'page' : undefined}>
            <span className="c-syllabus-mark" aria-hidden="true">
              ★
            </span>
            <span>Итог курса</span>
          </a>
        </li>
      </ol>
    </nav>
  );
}

export function Lesson({
  course,
  lesson,
  storage,
  onSaved,
}: {
  course: CourseDef;
  lesson: LessonDef;
  storage: StorageLike | null;
  onSaved: (ok: boolean) => void;
}) {
  const key = `${course.id}/${lesson.id}`;
  const [record, setRecord] = useState<LessonRecord>(() => {
    const saved = readRecord(storage, key);
    return { ...saved, state: lesson.restore(saved.state) };
  });
  const question = lesson.question(record.state);
  const index = course.lessons.indexOf(lesson);
  const next = course.lessons[index + 1];

  const update = (changes: Partial<LessonRecord>) => {
    const nextRecord = { ...record, ...changes };
    setRecord(nextRecord);
    onSaved(writeRecord(storage, key, nextRecord));
  };

  const changeState = (state: unknown) => {
    const reset = answerResetNeeded(question, lesson.question(state));
    update(reset ? { state, option: null, checked: false } : { state });
  };

  const Widget = lesson.Widget;

  return (
    <div className="c-page c-lesson">
      <p className="c-crumbs">
        <a href="#study">← Все курсы</a>
        <span aria-hidden="true">/</span>
        <span>
          Курс {course.number} · {course.title}
        </span>
      </p>

      <header className="c-lesson-hero c-grid-bg">
        <div className="c-lesson-hero-copy">
          <p className="c-eyebrow">
            Урок {lesson.number} · {index + 1} из {course.lessons.length}
            {record.done ? ' · пройден' : ''}
          </p>
          <h1 className="c-title c-title--xl">
            <Accent text={lesson.title} accent={lesson.accent} />
          </h1>
          <p className="c-lead">{lesson.lead}</p>
          <ol className="c-lesson-steps">
            {STEPS.map((step, stepIndex) => (
              <li key={step.id}>
                <button type="button" onClick={() => scrollTo(step.id)}>
                  <span className="c-lesson-step-num">Шаг {stepIndex + 1}</span>
                  <span>{step.label}</span>
                  {stepIndex === 2 && record.done ? <span className="c-ok-mark"> ✓</span> : null}
                </button>
              </li>
            ))}
          </ol>
        </div>
        <Art size="lesson" src={lesson.art} alt="" />
      </header>

      <div className="c-lesson-layout">
        <Syllabus course={course} current={lesson.id} storage={storage} />

        <div className="c-lesson-main">
          <section id="lesson-idea" className="c-block" aria-labelledby="lesson-idea-title">
            <p className="c-num">Шаг 1</p>
            <h2 className="c-title c-title--md" id="lesson-idea-title">
              Лекция
            </h2>
            {lesson.lecture ? <Lecture sections={lesson.lecture} /> : <div className="c-prose">{lesson.idea}</div>}
            <div className="c-formula-box">
              <p className="c-lecture-label">Главная формула урока</p>
              <div className="c-formula" role="math" aria-label="Главная формула урока">
                {lesson.formula}
              </div>
              {lesson.legend ? (
                <dl className="c-legend">
                  {lesson.legend.map((item, i) => (
                    <div key={i}>
                      <dt>{item.sign}</dt>
                      <dd>{item.meaning}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </div>
            {lesson.reading ? (
              <div className="c-reading">
                <p className="c-lecture-label">Материалы по теме</p>
                <ul>
                  {lesson.reading.map((item) => (
                    <li key={item.title}>
                      <span className="c-reading-kind">{item.kind}</span>
                      <span>
                        {item.href ? (
                          <a href={item.href} target="_blank" rel="noreferrer">
                            {item.title}
                          </a>
                        ) : (
                          <b>{item.title}</b>
                        )}
                        <span className="c-reading-source"> — {item.source}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>

          <section id="lesson-lab" className="c-block" aria-labelledby="lesson-lab-title">
            <p className="c-num">Шаг 2</p>
            <h2 className="c-title c-title--md" id="lesson-lab-title">
              Опыт
            </h2>
            <p className="c-hint">{lesson.hint}</p>
            <Widget state={record.state} onChange={changeState} />
          </section>

          <section id="lesson-check" className="c-block" aria-labelledby="lesson-check-title">
            <p className="c-num">Шаг 3</p>
            <h2 className="c-title c-title--md" id="lesson-check-title">
              Проверь себя
            </h2>
            <Quiz
              question={question}
              option={record.option}
              checked={record.checked}
              onPick={(option) => update({ option, checked: false })}
              onCheck={() => update({ checked: true, done: record.done || record.option === question?.correct })}
              emptyHint="Сначала проведите опыт: вопрос строится по вашим данным."
            />
          </section>

          <section id="lesson-next" className="c-block c-block--next" aria-labelledby="lesson-next-title">
            <p className="c-num">Шаг 4</p>
            <h2 className="c-title c-title--md" id="lesson-next-title">
              Дальше
            </h2>
            <p className="c-prose-muted">
              Тот же эффект в большом эксперименте: больше параметров, анимация и таблицы. После него — следующий урок.
            </p>
            <div className="c-actions">
              <a className="c-btn c-btn--ghost" href={lesson.experiment.hash}>
                Эксперимент «{lesson.experiment.label}»
              </a>
              <a className="c-btn" href={next ? lessonHash(course, next) : summaryHash(course)}>
                {next ? `Урок ${next.number}: ${next.title} →` : 'Итог курса →'}
              </a>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
