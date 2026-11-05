import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Attempt, AttemptMode, Prisma, Question, Quiz } from '@prisma/client';
import { AccessService } from '../../common/access/access.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthUser, isStaff } from '../../common/types';
import { shuffle } from '../../common/utils';
import { GamificationService } from '../gamification/gamification.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  correctAnswerOf,
  gradeQuestion,
  QuestionResult,
  revealQuestion,
  sanitizeQuestion,
  summarize,
  viewQuestion,
} from '../quizzes/question-engine';
import { FINISHED_STATUSES } from '../quizzes/quizzes.service';
import { AttemptListQueryDto, CheckAnswerDto, GradeAttemptDto, StartAttemptDto, SubmitAttemptDto } from './dto/attempt.dto';

type Answers = Record<string, unknown>;
type Results = Record<string, QuestionResult>;

const TIME_GRACE_SEC = 60;

@Injectable()
export class AttemptsService {
  private readonly logger = new Logger(AttemptsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
    private readonly gamification: GamificationService,
    private readonly notifications: NotificationsService,
  ) {}

  // ───────────────────────────── start ─────────────────────────────

  async start(quizId: string, user: AuthUser, dto: StartAttemptDto) {
    const mode: AttemptMode = dto.mode ?? 'EXAM';
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: { questions: { orderBy: { order: 'asc' }, select: { id: true } } },
    });
    if (!quiz) throw new NotFoundException('Test tapılmadı');

    const decision = await this.access.decide(user, 'QUIZ', quiz, { passcode: dto.passcode });
    if (decision === 'FORBIDDEN') throw new NotFoundException('Test tapılmadı və ya giriş icazəniz yoxdur');
    if (decision === 'LOCKED') {
      throw new ForbiddenException({
        statusCode: 403,
        message: dto.passcode ? 'Giriş kodu yanlışdır' : 'Bu test giriş kodu ilə qorunur',
        locked: true,
      });
    }
    if (quiz.questions.length === 0) throw new BadRequestException('Bu testdə hələ sual yoxdur');

    // resume an unfinished attempt of the same mode
    const existing = await this.prisma.attempt.findFirst({
      where: { quizId, userId: user.id, mode, status: 'IN_PROGRESS' },
      orderBy: { startedAt: 'desc' },
    });
    if (existing && !this.isExpired(existing, quiz)) {
      return this.startPayload(existing, quiz, user);
    }

    if (mode === 'EXAM' && quiz.maxAttempts && !this.access.isOwner(user, quiz)) {
      const used = await this.prisma.attempt.count({
        where: { quizId, userId: user.id, mode: 'EXAM', status: { in: [...FINISHED_STATUSES] } },
      });
      if (used >= quiz.maxAttempts) throw new ForbiddenException(`Cəhd limitiniz bitib (${quiz.maxAttempts})`);
    }

    const ids = quiz.questions.map((q) => q.id);
    const attempt = await this.createAttempt(user.id, quiz.id, mode, quiz.shuffleQuestions ? shuffle(ids) : ids);
    return this.startPayload(attempt, quiz, user);
  }

  /** Low-level creation (also used by smart practice with a custom question set). */
  createAttempt(userId: string, quizId: string, mode: AttemptMode, questionOrder: string[]) {
    return this.prisma.attempt.create({
      data: { userId, quizId, mode, status: 'IN_PROGRESS', answers: {}, questionOrder },
    });
  }

  private isExpired(attempt: Attempt, quiz: Pick<Quiz, 'timeLimitSec'>): boolean {
    if (!quiz.timeLimitSec) return false;
    return Date.now() > attempt.startedAt.getTime() + (quiz.timeLimitSec + TIME_GRACE_SEC) * 1000;
  }

  async startPayload(attempt: Attempt, quiz: Quiz, viewer: AuthUser) {
    const view = await this.buildView(attempt, quiz, viewer);
    const { questions, quiz: quizInfo, ...attemptData } = view;
    return { attempt: attemptData, quiz: quizInfo, questions };
  }

  // ───────────────────────────── view ─────────────────────────────

  private quizInfo(quiz: Quiz, attempt: Attempt) {
    return {
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      category: quiz.category,
      coverColor: quiz.coverColor,
      timeLimitSec: quiz.timeLimitSec,
      showAnswers: quiz.showAnswers,
      passPercent: quiz.passPercent,
      shuffleOptions: quiz.shuffleOptions,
      authorId: quiz.authorId,
      mode: attempt.mode,
    };
  }

  private async questionsOf(attempt: Attempt): Promise<Question[]> {
    const qs = await this.prisma.question.findMany({ where: { id: { in: attempt.questionOrder } } });
    const byId = new Map(qs.map((q) => [q.id, q]));
    return attempt.questionOrder.map((id) => byId.get(id)).filter((q): q is Question => !!q);
  }

  private views(attempt: Attempt, quiz: Quiz, questions: Question[]) {
    return questions.map((q) => viewQuestion(q, { seed: attempt.id, shuffleOptions: quiz.shuffleOptions }));
  }

  /** Attempt + quiz info + questions (correct/explanation only when allowed). */
  async buildView(attempt: Attempt, quiz: Quiz, viewer: AuthUser) {
    const questions = await this.questionsOf(attempt);
    const finished = attempt.status !== 'IN_PROGRESS';
    const privileged = isStaff(viewer) || viewer.id === quiz.authorId;
    const revealAll = privileged || (finished && (quiz.showAnswers || attempt.mode === 'PRACTICE'));
    const result = (attempt.result ?? {}) as unknown as Results;
    const views = this.views(attempt, quiz, questions).map((v) => {
      const reveal = revealAll || (attempt.mode === 'PRACTICE' && result[v.id] !== undefined);
      return reveal ? revealQuestion(v) : sanitizeQuestion(v);
    });
    const user =
      viewer.id === attempt.userId
        ? undefined
        : await this.prisma.user.findUnique({ where: { id: attempt.userId }, select: { id: true, name: true, avatarUrl: true } });
    return {
      ...attempt,
      expiresAt: quiz.timeLimitSec ? new Date(attempt.startedAt.getTime() + quiz.timeLimitSec * 1000) : null,
      quiz: this.quizInfo(quiz, attempt),
      questions: views,
      ...(user ? { user } : {}),
    };
  }

  private async load(attemptId: string) {
    const attempt = await this.prisma.attempt.findUnique({ where: { id: attemptId }, include: { quiz: true } });
    if (!attempt) throw new NotFoundException('Cəhd tapılmadı');
    return attempt;
  }

  private assertCanRead(attempt: Attempt & { quiz: Quiz }, user: AuthUser) {
    if (attempt.userId === user.id || isStaff(user) || attempt.quiz.authorId === user.id) return;
    throw new NotFoundException('Cəhd tapılmadı');
  }

  private assertOwnOpen(attempt: Attempt, user: AuthUser) {
    if (attempt.userId !== user.id) throw new ForbiddenException('Bu cəhd sizə aid deyil');
    if (attempt.status !== 'IN_PROGRESS') throw new BadRequestException('Bu cəhd artıq təhvil verilib');
  }

  async get(attemptId: string, user: AuthUser) {
    const { quiz, ...attempt } = await this.load(attemptId);
    this.assertCanRead({ ...attempt, quiz }, user);
    return this.buildView(attempt, quiz, user);
  }

  // ───────────────────────────── practice check / autosave ─────────────────────────────

  async check(attemptId: string, user: AuthUser, dto: CheckAnswerDto) {
    const { quiz, ...attempt } = await this.load(attemptId);
    this.assertOwnOpen(attempt, user);
    if (attempt.mode !== 'PRACTICE') throw new BadRequestException('Yoxlama yalnız məşq rejimində mümkündür');
    if (!attempt.questionOrder.includes(dto.questionId)) throw new NotFoundException('Sual bu cəhdə aid deyil');
    const q = await this.prisma.question.findUnique({ where: { id: dto.questionId } });
    if (!q) throw new NotFoundException('Sual tapılmadı');
    const view = viewQuestion(q, { seed: attempt.id, shuffleOptions: quiz.shuffleOptions });
    const res = gradeQuestion(view, dto.answer);
    const answers = { ...((attempt.answers ?? {}) as Answers), [q.id]: dto.answer as Prisma.JsonValue };
    const result = { ...((attempt.result ?? {}) as unknown as Results), [q.id]: res };
    await this.prisma.attempt.update({
      where: { id: attempt.id },
      data: { answers: answers as Prisma.InputJsonValue, result: result as unknown as Prisma.InputJsonValue },
    });
    return {
      questionId: q.id,
      correct: res.correct,
      points: res.points,
      max: res.max,
      correctAnswer: correctAnswerOf(view),
      explanation: view.explanation,
      question: revealQuestion(view),
    };
  }

  async autosave(attemptId: string, user: AuthUser, answers: Answers) {
    const attempt = await this.prisma.attempt.findUnique({ where: { id: attemptId } });
    if (!attempt) throw new NotFoundException('Cəhd tapılmadı');
    this.assertOwnOpen(attempt, user);
    const merged = { ...((attempt.answers ?? {}) as Answers), ...this.filterAnswers(answers, attempt.questionOrder) };
    const updated = await this.prisma.attempt.update({
      where: { id: attemptId },
      data: { answers: merged as Prisma.InputJsonValue },
      select: { id: true, updatedAt: true },
    });
    return { ok: true, savedAt: updated.updatedAt, answered: Object.keys(merged).length };
  }

  private filterAnswers(answers: Answers | undefined, allowed: string[]): Answers {
    const out: Answers = {};
    if (!answers || typeof answers !== 'object') return out;
    const set = new Set(allowed);
    for (const [k, v] of Object.entries(answers)) if (set.has(k)) out[k] = v;
    return out;
  }

  // ───────────────────────────── submit ─────────────────────────────

  async submit(attemptId: string, user: AuthUser, dto: SubmitAttemptDto) {
    const { quiz, ...attempt } = await this.load(attemptId);
    if (attempt.userId !== user.id) throw new ForbiddenException('Bu cəhd sizə aid deyil');
    if (attempt.status !== 'IN_PROGRESS') {
      // idempotent: a double submit (timer + click) returns the graded attempt
      return { ...(await this.buildView(attempt, quiz, user)), xpGained: 0, newAchievements: [], levelUp: false };
    }

    const questions = await this.questionsOf(attempt);
    const answers = { ...((attempt.answers ?? {}) as Answers), ...this.filterAnswers(dto.answers, attempt.questionOrder) };
    const results: Results = {};
    for (const v of this.views(attempt, quiz, questions)) results[v.id] = gradeQuestion(v, answers[v.id]);
    const sum = summarize(results, quiz.passPercent);

    const elapsed = Math.max(0, Math.round((Date.now() - attempt.startedAt.getTime()) / 1000));
    let timeSpentSec = dto.timeSpentSec ?? elapsed;
    timeSpentSec = Math.min(Math.max(0, timeSpentSec), elapsed + 5);
    if (quiz.timeLimitSec) timeSpentSec = Math.min(timeSpentSec, quiz.timeLimitSec);

    const status = sum.pending ? 'PENDING_REVIEW' : 'SUBMITTED';
    const updated = await this.prisma.attempt.update({
      where: { id: attempt.id },
      data: {
        answers: answers as Prisma.InputJsonValue,
        result: results as unknown as Prisma.InputJsonValue,
        score: sum.score,
        maxScore: sum.maxScore,
        percent: sum.percent,
        passed: sum.pending ? false : sum.passed,
        status,
        timeSpentSec,
        submittedAt: new Date(),
      },
    });

    let reward = { xpGained: 0, newAchievements: [] as unknown[], levelUp: false, level: 0, xp: 0, completedQuests: [] as unknown[] };
    try {
      reward = await this.gamification.onEvent(user.id, {
        type: 'QUIZ_SUBMITTED',
        percent: sum.percent,
        mode: attempt.mode,
        quizId: quiz.id,
        attemptId: attempt.id,
      });
    } catch (e) {
      this.logger.error(`gamification failed: ${(e as Error).message}`);
    }

    if (status === 'PENDING_REVIEW') {
      const admins = await this.prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
      await this.notifications.notify([quiz.authorId, ...admins.map((a) => a.id)].filter((id) => id !== user.id), {
        type: 'REVIEW_REQUEST',
        title: 'Yoxlama gözləyən cavab',
        body: `${user.name} "${quiz.title}" testini təhvil verdi — açıq suallar yoxlanılmalıdır.`,
        link: `/studio/review/${attempt.id}`,
      });
    }

    const view = await this.buildView(updated, quiz, user);
    return {
      ...view,
      xpGained: reward.xpGained,
      newAchievements: reward.newAchievements,
      levelUp: reward.levelUp,
      level: reward.level,
      xp: reward.xp,
      completedQuests: reward.completedQuests,
    };
  }

  // ───────────────────────────── lists ─────────────────────────────

  async list(user: AuthUser, q: AttemptListQueryDto) {
    const where: Prisma.AttemptWhereInput = {};
    if (!isStaff(user) || q.mine === '1' || q.mine === 'true') where.userId = user.id;
    else if (q.userId) where.userId = q.userId;
    if (q.quizId) where.quizId = q.quizId;
    if (q.mode) where.mode = q.mode;
    where.status = q.status ?? { in: [...FINISHED_STATUSES] };
    return this.prisma.attempt.findMany({
      where,
      orderBy: [{ submittedAt: { sort: 'desc', nulls: 'last' } }, { startedAt: 'desc' }],
      take: Math.min(q.limit ?? 200, 500),
      include: {
        quiz: { select: { id: true, title: true, category: true, coverColor: true, passPercent: true } },
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
    });
  }

  pendingReview() {
    return this.prisma.attempt.findMany({
      where: { status: 'PENDING_REVIEW' },
      orderBy: { submittedAt: 'asc' },
      include: {
        quiz: { select: { id: true, title: true, category: true, authorId: true } },
        user: { select: { id: true, name: true, avatarUrl: true, email: true } },
      },
    });
  }

  // ───────────────────────────── manual grading ─────────────────────────────

  async grade(attemptId: string, user: AuthUser, dto: GradeAttemptDto) {
    const { quiz, ...attempt } = await this.load(attemptId);
    if (!isStaff(user) && quiz.authorId !== user.id) throw new ForbiddenException('Qiymətləndirmə icazəniz yoxdur');
    if (attempt.status === 'IN_PROGRESS') throw new BadRequestException('Cəhd hələ təhvil verilməyib');

    const results = { ...((attempt.result ?? {}) as unknown as Results) };
    const questions = await this.questionsOf(attempt);
    for (const q of questions) {
      if (!results[q.id]) results[q.id] = { correct: false, points: 0, max: q.points };
    }
    for (const [qid, raw] of Object.entries(dto.points ?? {})) {
      const r = results[qid];
      if (!r) continue;
      const p = Math.max(0, Math.min(r.max, Number(raw) || 0));
      results[qid] = { correct: p >= r.max, points: Math.round(p * 100) / 100, max: r.max };
    }
    // ungraded open answers count as 0
    for (const [qid, r] of Object.entries(results)) if (r.correct === null) results[qid] = { ...r, correct: false, points: 0 };

    const sum = summarize(results, quiz.passPercent);
    const updated = await this.prisma.attempt.update({
      where: { id: attempt.id },
      data: {
        result: results as unknown as Prisma.InputJsonValue,
        score: sum.score,
        maxScore: sum.maxScore,
        percent: sum.percent,
        passed: sum.passed,
        status: 'GRADED',
        feedback: dto.feedback?.trim() || attempt.feedback,
      },
    });

    // top-up XP if the reviewed score is higher than the provisional one
    if (attempt.mode === 'EXAM') {
      let bonus = Math.round(sum.percent / 10) - Math.round(attempt.percent / 10);
      if (sum.percent >= 100 && attempt.percent < 100) bonus += 20;
      if (bonus > 0) {
        await this.gamification.awardXp(attempt.userId, bonus, 'review');
        await this.gamification.checkAchievements(attempt.userId);
      }
    }

    await this.notifications.notify(attempt.userId, {
      type: 'ATTEMPT_GRADED',
      title: `"${quiz.title}" testiniz yoxlanıldı`,
      body: `Nəticə: ${sum.score}/${sum.maxScore} (${Math.round(sum.percent)}%).${dto.feedback ? ` Müəllim rəyi: ${dto.feedback.slice(0, 140)}` : ''}`,
      link: `/attempts/${attempt.id}/result`,
    });
    return this.buildView(updated, quiz, user);
  }
}
