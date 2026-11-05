import type {
  Article,
  ArticleProgressInfo,
  Course,
  CourseItem,
  Deck,
  ItemSummary,
  LearningPath,
  PathCourse,
  QuizLite,
} from '../types';

/** Article reading progress (0-100) from whichever shape the API sent. */
export function progressOf(a: Pick<Article, 'myProgress' | 'progress'> | null | undefined): number {
  if (!a) return 0;
  const raw: ArticleProgressInfo | number | null | undefined = a.myProgress ?? a.progress;
  if (raw == null) return 0;
  if (typeof raw === 'number') return clamp(raw <= 1 && raw > 0 && !Number.isInteger(raw) ? raw * 100 : raw);
  return clamp(raw.progress ?? 0);
}

export function isArticleDone(a: Pick<Article, 'myProgress' | 'progress' | 'completedAt'> | null | undefined): boolean {
  if (!a) return false;
  if (a.completedAt) return true;
  const raw = a.myProgress ?? a.progress;
  if (raw && typeof raw === 'object' && raw.completedAt) return true;
  return progressOf(a) >= 100;
}

export function relatedQuizzesOf(a: Article | null | undefined): QuizLite[] {
  if (!a?.relatedQuizzes) return [];
  return a.relatedQuizzes.map((q) => ('quiz' in q && q.quiz ? q.quiz : (q as QuizLite))).filter(Boolean);
}

export function questionCountOf(q: QuizLite): number | undefined {
  return q.questionCount ?? q._count?.questions;
}

/** Course progress 0..1 */
export function courseProgress(c: Course): number {
  if (c.items && c.items.length) {
    const done = c.items.filter((i) => i.done).length;
    return done / c.items.length;
  }
  const p = c.progress ?? 0;
  return p > 1 ? p / 100 : p;
}

export function courseItemCount(c: Course): number {
  return c.items?.length ?? c.itemCount ?? c._count?.items ?? 0;
}

export function isCourseCompleted(c: Course): boolean {
  return Boolean(c.completed || c.completedAt);
}

export function itemSummary(item: CourseItem): ItemSummary | null {
  return item.article ?? item.quiz ?? item.deck ?? null;
}

export function itemHref(item: CourseItem): string {
  const s = itemSummary(item);
  if (item.type === 'ARTICLE') return `/articles/${s?.slug ?? item.articleId ?? s?.id}`;
  if (item.type === 'QUIZ') return `/quizzes/${item.quizId ?? s?.id}`;
  return `/decks/${item.deckId ?? s?.id}`;
}

export function pathCourses(p: LearningPath): PathCourse[] {
  if (p.courses?.length) return p.courses;
  if (p.items?.length)
    return [...p.items]
      .sort((a, b) => a.order - b.order)
      .map((i) => i.course)
      .filter((c): c is PathCourse => Boolean(c));
  return [];
}

export function pathCourseCount(p: LearningPath): number {
  return p.courses?.length ?? p.items?.length ?? p.courseCount ?? p._count?.items ?? 0;
}

/** Path progress 0..1 (average of course progress). */
export function pathProgress(p: LearningPath): number {
  const cs = pathCourses(p);
  if (cs.length) return cs.reduce((s, c) => s + (isCourseCompleted(c) ? 1 : courseProgress(c)), 0) / cs.length;
  const v = p.progress ?? 0;
  return v > 1 ? v / 100 : v;
}

export function deckCardCount(d: Deck): number {
  return d.cards?.length ?? d.cardCount ?? d._count?.cards ?? 0;
}

export function clamp(v: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, v));
}
