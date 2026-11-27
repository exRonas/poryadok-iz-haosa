import type { ComponentType, ReactNode } from 'react';
import type { QuizQuestion } from './math';

export interface WidgetProps<S> {
  state: S;
  onChange: (next: S) => void;
}

export interface LessonDef<S = unknown> {
  id: string;
  /** «1.2» */
  number: string;
  title: string;
  /** Слово из заголовка, которое выделяется акцентным цветом. */
  accent: string;
  lead: string;
  idea: ReactNode;
  /** Развёрнутая лекция: если задана, показывается в шаге «Лекция» вместо краткой идеи. */
  lecture?: LectureSection[];
  formula: ReactNode;
  /** Расшифровка обозначений главной формулы. */
  legend?: { sign: ReactNode; meaning: ReactNode }[];
  /** Что посмотреть и почитать дальше. */
  reading?: Reading[];
  art: string;
  experiment: { hash: string; label: string };
  hint: string;
  initial: () => S;
  restore: (raw: unknown) => S;
  Widget: ComponentType<WidgetProps<S>>;
  question: (state: S) => QuizQuestion | null;
}

/** Раздел лекции: объяснение, мини-опыт, разобранный пример, типичная ошибка. */
export interface LectureSection {
  title: string;
  body: ReactNode;
  /** Небольшой интерактив внутри лекции; его состояние локально и не сохраняется. */
  demo?: ReactNode;
  example?: ReactNode;
  pitfall?: ReactNode;
}

export interface Reading {
  kind: 'Видео' | 'Курс' | 'Книга' | 'Интерактив';
  title: string;
  source: string;
  href?: string;
}

export type CourseId = 'descriptive' | 'distributions' | 'limits' | 'montecarlo';

export interface CourseDef {
  id: CourseId;
  number: number;
  title: string;
  summary: string;
  /** Список тем через «·» — для курсов, которые ещё готовятся. */
  topics: string;
  art: string;
  lessons: LessonDef[];
  ready: boolean;
  /** Шпаргалка формул для итога курса. */
  cheatsheet?: { label: string; formula: ReactNode }[];
  /** Итоговые вопросы курса (по одному на урок). */
  summaryQuestions: readonly QuizQuestion[];
  /** Эксперименты сайта, к которым ведёт итог курса. */
  experiments: { hash: string; label: string }[];
}
