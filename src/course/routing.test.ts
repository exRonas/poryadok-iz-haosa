import { describe, expect, it } from 'vitest';
import { COURSES } from './courses';
import { SPREAD_QUESTION, frequencyQuestion } from './math';
import { answerResetNeeded, parseRoute } from './routing';

describe('parseRoute', () => {
  it('каталог', () => expect(parseRoute('#study')).toEqual({ kind: 'catalog' }));

  it('урок курса 1', () => {
    const route = parseRoute('#study/descriptive/center');
    expect(route.kind).toBe('lesson');
    if (route.kind === 'lesson') {
      expect(route.course.id).toBe('descriptive');
      expect(route.lesson.id).toBe('center');
    }
  });

  it('итог курса', () => {
    const route = parseRoute('#study/descriptive/summary');
    expect(route.kind).toBe('summary');
  });

  it('исследование', () => expect(parseRoute('#study/research')).toEqual({ kind: 'research' }));

  it('старые и неизвестные адреса ведут в каталог', () => {
    for (const hash of ['#study/data/sample', '#study/descriptive/nope', '#study/limits/x', '#study/montecarlo/x', '#study/', '#study/descriptive', '#study/distributions/sample']) {
      expect(parseRoute(hash)).toEqual({ kind: 'catalog' });
    }
  });
});

describe('каталог', () => {
  it('4 курса, открыты первые два, в каждом 4 урока и 4 итоговых вопроса', () => {
    expect(COURSES.map((course) => course.id)).toEqual(['descriptive', 'distributions', 'limits', 'montecarlo']);
    expect(COURSES.map((course) => course.ready)).toEqual([true, true, true, true]);
    expect(COURSES[0].lessons.map((lesson) => lesson.id)).toEqual(['sample', 'center', 'spread', 'outliers']);
    expect(COURSES[1].lessons.map((lesson) => lesson.id)).toEqual(['paths', 'moments', 'walk', 'normal']);
    for (const course of COURSES.filter((item) => item.ready)) {
      expect(course.summaryQuestions).toHaveLength(4);
      expect(course.experiments.length).toBeGreaterThan(0);
    }
  });

  it('урок курса 2 открывается по адресу', () => {
    const route = parseRoute('#study/distributions/walk');
    expect(route.kind === 'lesson' && route.lesson.id === 'walk').toBe(true);
  });

  it('начальное состояние каждого урока восстанавливается из самого себя и из мусора', () => {
    for (const lesson of COURSES.flatMap((course) => course.lessons)) {
      const start = lesson.initial();
      expect(lesson.restore(JSON.parse(JSON.stringify(start)))).toEqual(start);
      expect(lesson.restore('мусор')).toEqual(start);
      expect(lesson.restore(null)).toEqual(start);
    }
  });
});

describe('answerResetNeeded', () => {
  it('тот же вопрос — ответ остаётся', () => expect(answerResetNeeded(SPREAD_QUESTION, SPREAD_QUESTION)).toBe(false));
  it('другие числа в вопросе — ответ сбрасывается', () => {
    expect(answerResetNeeded(frequencyQuestion(7, 100, 4), frequencyQuestion(7, 110, 4))).toBe(true);
  });
  it('вопрос появился или исчез — сбрасывается', () => {
    expect(answerResetNeeded(null, SPREAD_QUESTION)).toBe(true);
    expect(answerResetNeeded(SPREAD_QUESTION, null)).toBe(true);
    expect(answerResetNeeded(null, null)).toBe(false);
  });
});
