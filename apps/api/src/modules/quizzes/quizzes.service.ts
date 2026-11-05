import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Question, Quiz } from '@prisma/client';
import { AccessService } from '../../common/access/access.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthUser, isStaff } from '../../common/types';
import { parseQuestionsCsv } from './csv-import';
import { CreateQuizDto, QuestionInputDto, QuizListQueryDto, UpdateQuizDto } from './dto/quiz.dto';
import { NormalizedQuestion, normalizeQuestion, sanitizeQuestion, viewQuestion } from './question-engine';

/** Tag of the hidden per-user quiz that hosts smart-practice attempts (never listed). */
export const SMART_PRACTICE_TAG = '__smart_practice';
export const FINISHED_STATUSES = ['SUBMITTED', 'PENDING_REVIEW', 'GRADED'] as const;

type QuizWithAuthor = Quiz & { author: { id: string; name: string; avatarUrl: string | null } };

@Injectable()
export class QuizzesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
  ) {}

  /** Remove secrets for non-owners. */
  publicQuiz<T extends Quiz>(quiz: T, user?: AuthUser | null): Omit<T, 'passcode'> & { passcode?: string | null; hasPasscode: boolean } {
    const owner = this.access.isOwner(user, quiz);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passcode, ...rest } = quiz;
    return { ...rest, ...(owner ? { passcode } : {}), hasPasscode: !!passcode };
  }

  async list(user: AuthUser | undefined, query: QuizListQueryDto) {
    const visible = await this.access.listWhere(user, 'QUIZ');
    const filters: Prisma.QuizWhereInput[] = [visible, { NOT: { tags: { has: SMART_PRACTICE_TAG } } }];
    if (query.q?.trim()) {
      const q = query.q.trim();
      filters.push({
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
          { category: { contains: q, mode: 'insensitive' } },
        ],
      });
    }
    if (query.category) filters.push({ category: { equals: query.category, mode: 'insensitive' } });
    if (query.tag) filters.push({ tags: { has: query.tag } });
    if (query.status) filters.push({ status: query.status });
    if (query.mine === '1' || query.mine === 'true') {
      if (!user) return [];
      filters.push({ authorId: user.id });
    }

    const quizzes = await this.prisma.quiz.findMany({
      where: { AND: filters },
      orderBy: [{ updatedAt: 'desc' }],
      include: {
        author: { select: { id: true, name: true, avatarUrl: true } },
        _count: {
          select: {
            questions: true,
            attempts: { where: { status: { in: [...FINISHED_STATUSES] } } },
          },
        },
      },
    });
    const ids = quizzes.map((q) => q.id);
    const [best, unlocks] = user
      ? await Promise.all([
          this.prisma.attempt.groupBy({
            by: ['quizId'],
            where: { userId: user.id, quizId: { in: ids }, status: { in: [...FINISHED_STATUSES] } },
            _max: { percent: true },
            _count: { _all: true },
          }),
          this.prisma.contentUnlock.findMany({ where: { userId: user.id, contentType: 'QUIZ', contentId: { in: ids } } }),
        ])
      : [[], []];
    const bestMap = new Map(best.map((b) => [b.quizId, { best: b._max.percent, count: b._count._all }]));
    const unlocked = new Set(unlocks.map((u) => u.contentId));

    return quizzes.map(({ _count, ...q }) => {
      const mine = bestMap.get(q.id);
      const owner = this.access.isOwner(user, q);
      return {
        ...this.publicQuiz(q, user),
        questionCount: _count.questions,
        attemptsCount: _count.attempts,
        myBest: mine?.best ?? null,
        myAttempts: mine?.count ?? 0,
        locked: q.visibility === 'PASSCODE' && !owner && !isStaff(user) && !unlocked.has(q.id) && !mine,
      };
    });
  }

  async categories(user: AuthUser | undefined): Promise<string[]> {
    const visible = await this.access.listWhere(user, 'QUIZ');
    const rows = await this.prisma.quiz.findMany({
      where: { AND: [visible, { category: { not: null } }, { NOT: { tags: { has: SMART_PRACTICE_TAG } } }] },
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    });
    return rows.map((r) => r.category).filter((c): c is string => !!c && c.trim().length > 0);
  }

  async findOrThrow(id: string): Promise<QuizWithAuthor & { questions: Question[] }> {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id },
      include: { author: { select: { id: true, name: true, avatarUrl: true } }, questions: { orderBy: { order: 'asc' } } },
    });
    if (!quiz) throw new NotFoundException('Test tapılmadı');
    return quiz;
  }

  /** Quiz detail. Owners/staff get full questions; students get sanitized ones (or none while locked). */
  async get(id: string, user: AuthUser | undefined) {
    const quiz = await this.findOrThrow(id);
    const decision = await this.access.decide(user, 'QUIZ', quiz);
    if (decision === 'FORBIDDEN') throw new NotFoundException('Test tapılmadı və ya giriş icazəniz yoxdur');
    const canSeeAnswers = this.access.isOwner(user, quiz) || isStaff(user);

    let myAttempts = 0;
    let myBest: number | null = null;
    let inProgressAttemptId: string | null = null;
    if (user) {
      const [agg, inProgress] = await Promise.all([
        this.prisma.attempt.aggregate({
          where: { userId: user.id, quizId: id, status: { in: [...FINISHED_STATUSES] } },
          _max: { percent: true },
          _count: { _all: true },
        }),
        this.prisma.attempt.findFirst({
          where: { userId: user.id, quizId: id, status: 'IN_PROGRESS' },
          orderBy: { startedAt: 'desc' },
          select: { id: true },
        }),
      ]);
      myAttempts = agg._count._all;
      myBest = agg._max.percent;
      inProgressAttemptId = inProgress?.id ?? null;
    }
    const examAttempts = user
      ? await this.prisma.attempt.count({ where: { userId: user.id, quizId: id, mode: 'EXAM', status: { in: [...FINISHED_STATUSES] } } })
      : 0;

    const groupIds =
      canSeeAnswers && quiz.visibility === 'GROUPS'
        ? (await this.prisma.contentAccess.findMany({ where: { contentType: 'QUIZ', contentId: id }, select: { groupId: true } })).map((r) => r.groupId)
        : [];

    const locked = decision === 'LOCKED' && myAttempts === 0;
    const questions = locked
      ? []
      : quiz.questions.map((q) => {
          if (canSeeAnswers) return q;
          return sanitizeQuestion(viewQuestion(q, { seed: 'overview', shuffleOptions: false }));
        });

    return {
      ...this.publicQuiz(quiz, user),
      questions,
      questionCount: quiz.questions.length,
      totalPoints: quiz.questions.reduce((s, q) => s + q.points, 0),
      groupIds,
      locked,
      myAttempts,
      myBest,
      inProgressAttemptId,
      attemptsLeft: quiz.maxAttempts ? Math.max(0, quiz.maxAttempts - examAttempts) : null,
    };
  }

  private normalizeAll(questions: QuestionInputDto[]): (NormalizedQuestion & { id?: string })[] {
    return questions.map((q, i) => ({ ...normalizeQuestion(q, `Sual ${i + 1}`), id: q.id }));
  }

  private quizData(dto: CreateQuizDto | UpdateQuizDto) {
    const data: Prisma.QuizUncheckedUpdateInput = {};
    const keys = [
      'title',
      'description',
      'category',
      'coverColor',
      'status',
      'visibility',
      'passcode',
      'timeLimitSec',
      'passPercent',
      'shuffleQuestions',
      'shuffleOptions',
      'showAnswers',
      'maxAttempts',
    ] as const;
    for (const k of keys) {
      if (dto[k] !== undefined) (data as Record<string, unknown>)[k] = dto[k];
    }
    if (dto.tags !== undefined) data.tags = [...new Set(dto.tags.map((t) => t.trim()).filter(Boolean))];
    if (data.timeLimitSec === 0) data.timeLimitSec = null;
    if (data.maxAttempts === 0) data.maxAttempts = null;
    if (typeof data.passcode === 'string' && !data.passcode.trim()) data.passcode = null;
    return data;
  }

  async create(user: AuthUser, dto: CreateQuizDto) {
    const questions = this.normalizeAll(dto.questions ?? []);
    const data = this.quizData(dto) as Prisma.QuizUncheckedCreateInput;
    if (data.visibility === 'PASSCODE' && !data.passcode) throw new BadRequestException('PASSCODE görünürlüğü üçün şifrə tələb olunur');
    const quiz = await this.prisma.quiz.create({
      data: {
        ...data,
        title: dto.title,
        authorId: user.id,
        questions: {
          create: questions.map((q, i) => this.questionCreateData(q, i)),
        },
      },
    });
    return this.get(quiz.id, user);
  }

  private questionCreateData(q: NormalizedQuestion, order: number) {
    return {
      order,
      type: q.type,
      text: q.text,
      imageUrl: q.imageUrl,
      options: q.options as Prisma.InputJsonValue,
      correct: q.correct === null ? Prisma.DbNull : (q.correct as Prisma.InputJsonValue),
      explanation: q.explanation,
      points: q.points,
      tags: q.tags,
    };
  }

  async update(id: string, user: AuthUser, dto: UpdateQuizDto) {
    const quiz = await this.findOrThrow(id);
    this.access.assertCanEdit(user, quiz);
    const data = this.quizData(dto);
    const nextVisibility = (data.visibility as string | undefined) ?? quiz.visibility;
    const nextPasscode = data.passcode !== undefined ? data.passcode : quiz.passcode;
    if (nextVisibility === 'PASSCODE' && !nextPasscode) throw new BadRequestException('PASSCODE görünürlüğü üçün şifrə tələb olunur');

    await this.prisma.$transaction(async (tx) => {
      await tx.quiz.update({ where: { id }, data });
      if (dto.questions) {
        const incoming = this.normalizeAll(dto.questions);
        const existingIds = new Set(quiz.questions.map((q) => q.id));
        const keep = new Set(incoming.filter((q) => q.id && existingIds.has(q.id)).map((q) => q.id as string));
        await tx.question.deleteMany({ where: { quizId: id, id: { notIn: [...keep] } } });
        for (const [i, q] of incoming.entries()) {
          const data = this.questionCreateData(q, i);
          if (q.id && keep.has(q.id)) await tx.question.update({ where: { id: q.id }, data });
          else await tx.question.create({ data: { ...data, quizId: id } });
        }
      }
    });
    return this.get(id, user);
  }

  async remove(id: string, user: AuthUser) {
    const quiz = await this.findOrThrow(id);
    this.access.assertCanEdit(user, quiz);
    await this.prisma.quiz.delete({ where: { id } });
    return { ok: true };
  }

  async clone(id: string, user: AuthUser) {
    const quiz = await this.findOrThrow(id);
    if (!this.access.isOwner(user, quiz) && !isStaff(user)) throw new ForbiddenException('Klonlamaq üçün icazəniz yoxdur');
    const copy = await this.prisma.quiz.create({
      data: {
        title: `${quiz.title} (kopya)`,
        description: quiz.description,
        category: quiz.category,
        tags: quiz.tags,
        coverColor: quiz.coverColor,
        status: 'DRAFT',
        visibility: quiz.visibility === 'GROUPS' ? 'PRIVATE' : quiz.visibility,
        passcode: quiz.passcode,
        timeLimitSec: quiz.timeLimitSec,
        passPercent: quiz.passPercent,
        shuffleQuestions: quiz.shuffleQuestions,
        shuffleOptions: quiz.shuffleOptions,
        showAnswers: quiz.showAnswers,
        maxAttempts: quiz.maxAttempts,
        authorId: user.id,
        questions: {
          create: quiz.questions.map((q) => ({
            order: q.order,
            type: q.type,
            text: q.text,
            imageUrl: q.imageUrl,
            options: q.options as Prisma.InputJsonValue,
            correct: q.correct === null ? Prisma.DbNull : (q.correct as Prisma.InputJsonValue),
            explanation: q.explanation,
            points: q.points,
            tags: q.tags,
          })),
        },
      },
    });
    return this.get(copy.id, user);
  }

  /** Append CSV questions to a quiz. */
  async importCsv(id: string, user: AuthUser, file: Express.Multer.File | undefined) {
    const quiz = await this.findOrThrow(id);
    this.access.assertCanEdit(user, quiz);
    const { questions, errors } = parseQuestionsCsv(file?.buffer);
    const start = quiz.questions.length;
    if (questions.length) {
      await this.prisma.question.createMany({
        data: questions.map((q, i) => ({ ...this.questionCreateData(q, start + i), quizId: id })),
      });
    }
    return { imported: questions.length, errors, quiz: await this.get(id, user) };
  }

  /** Append already-normalized questions (used by bank → quiz). */
  async appendQuestions(quizId: string, user: AuthUser, questions: NormalizedQuestion[]) {
    const quiz = await this.findOrThrow(quizId);
    this.access.assertCanEdit(user, quiz);
    const start = quiz.questions.length;
    await this.prisma.question.createMany({
      data: questions.map((q, i) => ({ ...this.questionCreateData(q, start + i), quizId })),
    });
    return questions.length;
  }
}
