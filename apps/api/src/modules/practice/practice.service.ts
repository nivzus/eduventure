import { BadRequestException, Injectable } from '@nestjs/common';
import { Quiz } from '@prisma/client';
import { AccessService } from '../../common/access/access.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthUser } from '../../common/types';
import { shuffle } from '../../common/utils';
import { AttemptsService } from '../attempts/attempts.service';
import { QuestionResult } from '../quizzes/question-engine';
import { FINISHED_STATUSES, SMART_PRACTICE_TAG } from '../quizzes/quizzes.service';

export interface WeakTopic {
  tag: string;
  /** 0-1 */
  accuracy: number;
  total: number;
  correct: number;
}

@Injectable()
export class PracticeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
    private readonly attempts: AttemptsService,
  ) {}

  /** Per-question outcomes of finished attempts (latest first), with topic tags resolved. */
  private async outcomes(userIds: string[], since?: Date) {
    const attempts = await this.prisma.attempt.findMany({
      where: {
        userId: { in: userIds },
        status: { in: [...FINISHED_STATUSES] },
        ...(since ? { submittedAt: { gte: since } } : {}),
      },
      select: { result: true, submittedAt: true, quiz: { select: { tags: true, category: true } } },
      orderBy: { submittedAt: 'desc' },
      take: 1000,
    });
    const qids = new Set<string>();
    for (const a of attempts) for (const id of Object.keys((a.result ?? {}) as object)) qids.add(id);
    const questions = await this.prisma.question.findMany({
      where: { id: { in: [...qids] } },
      select: { id: true, tags: true, quiz: { select: { tags: true, category: true } } },
    });
    const topicOf = new Map<string, string[]>();
    for (const q of questions) {
      const qt = q.tags.filter((t) => t !== SMART_PRACTICE_TAG);
      const zt = q.quiz.tags.filter((t) => t !== SMART_PRACTICE_TAG);
      topicOf.set(q.id, qt.length ? qt : zt.length ? zt : q.quiz.category ? [q.quiz.category] : []);
    }
    const out: { questionId: string; correct: boolean; tags: string[] }[] = [];
    for (const a of attempts) {
      for (const [qid, r] of Object.entries((a.result ?? {}) as unknown as Record<string, QuestionResult>)) {
        if (!r || r.correct === null || r.correct === undefined) continue;
        out.push({ questionId: qid, correct: !!r.correct, tags: topicOf.get(qid) ?? [] });
      }
    }
    return out;
  }

  /** Topics sorted from weakest to strongest (ties: more data first). */
  async weakTopics(userIds: string | string[], opts: { minTotal?: number; limit?: number; since?: Date } = {}): Promise<WeakTopic[]> {
    const ids = Array.isArray(userIds) ? userIds : [userIds];
    if (ids.length === 0) return [];
    const agg = new Map<string, { correct: number; total: number }>();
    for (const o of await this.outcomes(ids, opts.since)) {
      for (const tag of o.tags) {
        const a = agg.get(tag) ?? { correct: 0, total: 0 };
        a.total++;
        if (o.correct) a.correct++;
        agg.set(tag, a);
      }
    }
    const minTotal = opts.minTotal ?? 1;
    return [...agg.entries()]
      .filter(([, a]) => a.total >= minTotal)
      .map(([tag, a]) => ({ tag, accuracy: Math.round((a.correct / a.total) * 1000) / 1000, total: a.total, correct: a.correct }))
      .sort((x, y) => x.accuracy - y.accuracy || y.total - x.total)
      .slice(0, opts.limit ?? 20);
  }

  /** Hidden per-user quiz that hosts smart-practice attempts. */
  private async smartQuiz(user: AuthUser): Promise<Quiz> {
    const existing = await this.prisma.quiz.findFirst({ where: { authorId: user.id, tags: { has: SMART_PRACTICE_TAG } } });
    if (existing) return existing;
    return this.prisma.quiz.create({
      data: {
        title: 'Ağıllı məşq',
        description: 'Səhv etdiyiniz və zəif mövzulardakı suallardan avtomatik yığılmış məşq dəsti.',
        category: 'Məşq',
        tags: [SMART_PRACTICE_TAG],
        status: 'ARCHIVED',
        visibility: 'PRIVATE',
        shuffleOptions: true,
        showAnswers: true,
        passPercent: 60,
        authorId: user.id,
      },
    });
  }

  /** Build a practice attempt from previously missed questions (optionally restricted to tags). */
  async smart(user: AuthUser, tags: string[] | undefined, count = 10) {
    const want = Math.min(Math.max(count, 1), 30);
    const tagSet = new Set((tags ?? []).map((t) => t.trim()).filter(Boolean));
    const matchesTags = (qt: string[]) => tagSet.size === 0 || qt.some((t) => tagSet.has(t));

    // 1) questions the user got wrong most recently (and has not since answered correctly)
    const outcomes = await this.outcomes([user.id]);
    const latest = new Map<string, { correct: boolean; tags: string[] }>();
    for (const o of outcomes) if (!latest.has(o.questionId)) latest.set(o.questionId, o);
    const missed = [...latest.entries()].filter(([, o]) => !o.correct && matchesTags(o.tags)).map(([id]) => id);

    const existing = await this.prisma.question.findMany({
      where: { id: { in: missed }, type: { not: 'OPEN' } },
      select: { id: true },
    });
    let picked = shuffle(existing.map((q) => q.id)).slice(0, want);

    // 2) top up from visible quizzes on the requested / weakest topics
    if (picked.length < want) {
      let topicTags = [...tagSet];
      if (topicTags.length === 0) topicTags = (await this.weakTopics(user.id, { limit: 5 })).map((t) => t.tag);
      const visible = await this.access.listWhere(user, 'QUIZ');
      const pool = await this.prisma.question.findMany({
        where: {
          id: { notIn: picked },
          type: { not: 'OPEN' },
          quiz: {
            AND: [
              visible,
              { status: 'PUBLISHED' },
              { visibility: { not: 'PASSCODE' } },
              { NOT: { tags: { has: SMART_PRACTICE_TAG } } },
              ...(topicTags.length
                ? [{ OR: [{ tags: { hasSome: topicTags } }, { category: { in: topicTags } }] }]
                : []),
            ],
          },
        },
        select: { id: true, tags: true },
        take: 300,
      });
      const seen = new Set(latest.keys());
      const fresh = pool.filter((q) => !seen.has(q.id));
      const rest = pool.filter((q) => seen.has(q.id) && !picked.includes(q.id));
      picked = [...picked, ...shuffle(fresh).map((q) => q.id), ...shuffle(rest).map((q) => q.id)].slice(0, want);
    }

    if (picked.length === 0) {
      throw new BadRequestException('Məşq üçün sual tapılmadı — əvvəlcə bir neçə test həll edin.');
    }

    const quiz = await this.smartQuiz(user);
    const title = tagSet.size ? `Ağıllı məşq: ${[...tagSet].join(', ')}` : 'Ağıllı məşq (səhvləriniz)';
    const attempt = await this.attempts.createAttempt(user.id, quiz.id, 'PRACTICE', picked);
    const payload = await this.attempts.startPayload(attempt, quiz, user);
    return { ...payload, quiz: { ...payload.quiz, title } };
  }
}
