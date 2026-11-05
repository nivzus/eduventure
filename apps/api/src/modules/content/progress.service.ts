import { Injectable } from '@nestjs/common';
import { AttemptStatus, ContentType, CourseItemType } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { uniqStrings } from './content.utils';

export interface DoneSets {
  articles: Set<string>;
  quizzes: Set<string>;
  decks: Set<string>;
}

export interface CourseProgress {
  total: number;
  done: number;
  /** 0..1 */
  progress: number;
  completed: boolean;
  completedAt: Date | null;
}

export interface ItemRef {
  type: CourseItemType;
  articleId: string | null;
  quizId: string | null;
  deckId: string | null;
}

/** Statuses that count as "the student finished the quiz". */
export const FINISHED_ATTEMPT: AttemptStatus[] = [
  AttemptStatus.SUBMITTED,
  AttemptStatus.PENDING_REVIEW,
  AttemptStatus.GRADED,
];

/**
 * Per-user learning progress shared by courses, paths and assignments:
 *  - article done  = ArticleProgress.completedAt set
 *  - quiz done     = at least one finished (non IN_PROGRESS) attempt
 *  - deck done     = every card of the deck has been reviewed at least once (empty deck counts as done)
 *  - course done   = CourseCompletion row (else progress = done items / total items)
 */
@Injectable()
export class ProgressService {
  constructor(private readonly prisma: PrismaService) {}

  async doneSets(
    userId: string,
    ids: { articleIds?: string[]; quizIds?: string[]; deckIds?: string[] },
  ): Promise<DoneSets> {
    const articleIds = uniqStrings(ids.articleIds);
    const quizIds = uniqStrings(ids.quizIds);
    const deckIds = uniqStrings(ids.deckIds);

    const [articles, attempts, decks] = await Promise.all([
      articleIds.length
        ? this.prisma.articleProgress.findMany({
            where: { userId, articleId: { in: articleIds }, completedAt: { not: null } },
            select: { articleId: true },
          })
        : Promise.resolve([]),
      quizIds.length
        ? this.prisma.attempt.findMany({
            where: { userId, quizId: { in: quizIds }, status: { in: FINISHED_ATTEMPT } },
            select: { quizId: true },
            distinct: ['quizId'],
          })
        : Promise.resolve([]),
      deckIds.length ? this.doneDecks(userId, deckIds) : Promise.resolve(new Set<string>()),
    ]);
    return {
      articles: new Set(articles.map((a) => a.articleId)),
      quizzes: new Set(attempts.map((a) => a.quizId)),
      decks,
    };
  }

  /** Decks (among ids) whose every card the user has reviewed at least once. */
  async doneDecks(userId: string, deckIds: string[]): Promise<Set<string>> {
    const ids = uniqStrings(deckIds);
    if (!ids.length) return new Set();
    const [cards, reviewed] = await Promise.all([
      this.prisma.flashcard.groupBy({ by: ['deckId'], where: { deckId: { in: ids } }, _count: { _all: true } }),
      this.prisma.flashcardReview.findMany({
        where: { userId, card: { deckId: { in: ids } } },
        select: { card: { select: { deckId: true } } },
      }),
    ]);
    const total = new Map(cards.map((c) => [c.deckId, c._count._all]));
    const seen = new Map<string, number>();
    for (const r of reviewed) seen.set(r.card.deckId, (seen.get(r.card.deckId) ?? 0) + 1);
    return new Set(ids.filter((id) => (seen.get(id) ?? 0) >= (total.get(id) ?? 0)));
  }

  isItemDone(item: ItemRef, sets: DoneSets): boolean {
    switch (item.type) {
      case CourseItemType.ARTICLE:
        return !!item.articleId && sets.articles.has(item.articleId);
      case CourseItemType.QUIZ:
        return !!item.quizId && sets.quizzes.has(item.quizId);
      case CourseItemType.DECK:
        return !!item.deckId && sets.decks.has(item.deckId);
    }
  }

  /** Progress for many courses at once. */
  async courseProgress(userId: string, courseIds: string[]): Promise<Map<string, CourseProgress>> {
    const ids = uniqStrings(courseIds);
    const out = new Map<string, CourseProgress>();
    if (!ids.length) return out;
    const [items, completions] = await Promise.all([
      this.prisma.courseItem.findMany({
        where: { courseId: { in: ids } },
        select: { courseId: true, type: true, articleId: true, quizId: true, deckId: true },
      }),
      this.prisma.courseCompletion.findMany({
        where: { userId, courseId: { in: ids } },
        select: { courseId: true, completedAt: true },
      }),
    ]);
    const sets = await this.doneSets(userId, {
      articleIds: items.map((i) => i.articleId).filter((x): x is string => !!x),
      quizIds: items.map((i) => i.quizId).filter((x): x is string => !!x),
      deckIds: items.map((i) => i.deckId).filter((x): x is string => !!x),
    });
    const completedAt = new Map(completions.map((c) => [c.courseId, c.completedAt]));
    for (const id of ids) {
      const own = items.filter((i) => i.courseId === id);
      const done = own.filter((i) => this.isItemDone(i, sets)).length;
      const finished = completedAt.get(id) ?? null;
      out.set(id, {
        total: own.length,
        done,
        progress: finished ? 1 : own.length ? done / own.length : 0,
        completed: !!finished,
        completedAt: finished,
      });
    }
    return out;
  }

  /** Path progress = mean of its courses' progress (0..1). */
  async pathProgress(
    userId: string,
    pathIds: string[],
  ): Promise<Map<string, { progress: number; courseCount: number; completedCourses: number }>> {
    const ids = uniqStrings(pathIds);
    const out = new Map<string, { progress: number; courseCount: number; completedCourses: number }>();
    if (!ids.length) return out;
    const items = await this.prisma.pathItem.findMany({
      where: { pathId: { in: ids } },
      select: { pathId: true, courseId: true },
    });
    const cp = await this.courseProgress(
      userId,
      items.map((i) => i.courseId),
    );
    for (const id of ids) {
      const courses = items.filter((i) => i.pathId === id).map((i) => cp.get(i.courseId));
      const valid = courses.filter((c): c is CourseProgress => !!c);
      out.set(id, {
        courseCount: valid.length,
        completedCourses: valid.filter((c) => c.completed).length,
        progress: valid.length ? valid.reduce((s, c) => s + c.progress, 0) / valid.length : 0,
      });
    }
    return out;
  }

  /** "Done" flags for arbitrary content refs (assignments). Key = `${type}:${id}`. */
  async contentDone(userId: string, refs: { contentType: ContentType; contentId: string }[]): Promise<Set<string>> {
    const by = (t: ContentType) => refs.filter((r) => r.contentType === t).map((r) => r.contentId);
    const courseIds = by(ContentType.COURSE);
    const pathIds = by(ContentType.PATH);
    const [sets, completions, paths] = await Promise.all([
      this.doneSets(userId, { articleIds: by(ContentType.ARTICLE), quizIds: by(ContentType.QUIZ), deckIds: by(ContentType.DECK) }),
      courseIds.length
        ? this.prisma.courseCompletion.findMany({ where: { userId, courseId: { in: courseIds } }, select: { courseId: true } })
        : Promise.resolve([]),
      this.pathProgress(userId, pathIds),
    ]);
    const completed = new Set(completions.map((c) => c.courseId));
    const out = new Set<string>();
    for (const r of refs) {
      const key = `${r.contentType}:${r.contentId}`;
      let done = false;
      switch (r.contentType) {
        case ContentType.ARTICLE:
          done = sets.articles.has(r.contentId);
          break;
        case ContentType.QUIZ:
          done = sets.quizzes.has(r.contentId);
          break;
        case ContentType.DECK:
          done = sets.decks.has(r.contentId);
          break;
        case ContentType.COURSE:
          done = completed.has(r.contentId);
          break;
        case ContentType.PATH: {
          const p = paths.get(r.contentId);
          done = !!p && p.courseCount > 0 && p.completedCourses === p.courseCount;
          break;
        }
      }
      if (done) out.add(key);
    }
    return out;
  }
}
