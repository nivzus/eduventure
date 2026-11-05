import { Injectable, NotFoundException } from '@nestjs/common';
import { BankQuestion, Prisma } from '@prisma/client';
import { AccessService } from '../../common/access/access.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthUser } from '../../common/types';
import { parseQuestionsCsv } from '../quizzes/csv-import';
import { QuestionInputDto } from '../quizzes/dto/quiz.dto';
import { NormalizedQuestion, normalizeQuestion } from '../quizzes/question-engine';
import { QuizzesService } from '../quizzes/quizzes.service';
import { BankListQueryDto, UpdateBankQuestionDto } from './dto/bank.dto';

@Injectable()
export class BankService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
    private readonly quizzes: QuizzesService,
  ) {}

  private data(q: NormalizedQuestion, difficulty?: number) {
    return {
      type: q.type,
      text: q.text,
      imageUrl: q.imageUrl,
      options: q.options as Prisma.InputJsonValue,
      correct: q.correct === null ? Prisma.DbNull : (q.correct as Prisma.InputJsonValue),
      explanation: q.explanation,
      points: q.points,
      tags: q.tags,
      ...(difficulty !== undefined ? { difficulty: Math.min(3, Math.max(1, Math.round(difficulty))) } : {}),
    };
  }

  list(user: AuthUser, query: BankListQueryDto) {
    const where: Prisma.BankQuestionWhereInput = {};
    if (query.q?.trim()) {
      const q = query.q.trim();
      where.OR = [{ text: { contains: q, mode: 'insensitive' } }, { explanation: { contains: q, mode: 'insensitive' } }];
    }
    if (query.tag) where.tags = { has: query.tag };
    if (query.type) where.type = query.type;
    if (query.difficulty) where.difficulty = query.difficulty;
    if (query.mine === '1' || query.mine === 'true') where.authorId = user.id;
    return this.prisma.bankQuestion.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: { author: { select: { id: true, name: true } } },
      take: 1000,
    });
  }

  async tags(): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<{ tag: string }[]>`
      SELECT DISTINCT unnest("tags") AS tag FROM "BankQuestion" ORDER BY tag`;
    return rows.map((r) => r.tag).filter(Boolean);
  }

  private async findOrThrow(id: string): Promise<BankQuestion> {
    const q = await this.prisma.bankQuestion.findUnique({ where: { id } });
    if (!q) throw new NotFoundException('Sual tapılmadı');
    return q;
  }

  create(user: AuthUser, dto: QuestionInputDto) {
    const q = normalizeQuestion(dto);
    return this.prisma.bankQuestion.create({
      data: { ...this.data(q, dto.difficulty ?? 1), authorId: user.id },
    });
  }

  async bulkCreate(user: AuthUser, items: QuestionInputDto[]) {
    const normalized = items.map((dto, i) => ({ q: normalizeQuestion(dto, `Sual ${i + 1}`), d: dto.difficulty ?? 1 }));
    const created = await this.prisma.$transaction(
      normalized.map(({ q, d }) => this.prisma.bankQuestion.create({ data: { ...this.data(q, d), authorId: user.id } })),
    );
    return created;
  }

  async update(id: string, user: AuthUser, dto: UpdateBankQuestionDto) {
    const existing = await this.findOrThrow(id);
    this.access.assertCanEdit(user, existing);
    const merged = normalizeQuestion({
      type: dto.type ?? existing.type,
      text: dto.text ?? existing.text,
      imageUrl: dto.imageUrl !== undefined ? dto.imageUrl : existing.imageUrl,
      options: dto.options ?? existing.options,
      correct: dto.correct !== undefined ? dto.correct : existing.correct,
      explanation: dto.explanation !== undefined ? dto.explanation : existing.explanation,
      points: dto.points ?? existing.points,
      tags: dto.tags ?? existing.tags,
    });
    return this.prisma.bankQuestion.update({ where: { id }, data: this.data(merged, dto.difficulty ?? existing.difficulty) });
  }

  async remove(id: string, user: AuthUser) {
    const existing = await this.findOrThrow(id);
    this.access.assertCanEdit(user, existing);
    await this.prisma.bankQuestion.delete({ where: { id } });
    return { ok: true };
  }

  async importCsv(user: AuthUser, file: Express.Multer.File | undefined) {
    const { questions, errors } = parseQuestionsCsv(file?.buffer);
    const created = questions.length
      ? await this.prisma.$transaction(
          questions.map((q) => this.prisma.bankQuestion.create({ data: { ...this.data(q, q.difficulty), authorId: user.id } })),
        )
      : [];
    return { imported: created.length, errors, questions: created };
  }

  async toQuiz(user: AuthUser, questionIds: string[], quizId: string) {
    const rows = await this.prisma.bankQuestion.findMany({ where: { id: { in: questionIds } } });
    const byId = new Map(rows.map((r) => [r.id, r]));
    const ordered = questionIds.map((id) => byId.get(id)).filter((r): r is BankQuestion => !!r);
    if (ordered.length === 0) throw new NotFoundException('Seçilmiş suallar tapılmadı');
    const normalized = ordered.map((r, i) =>
      normalizeQuestion(
        {
          type: r.type,
          text: r.text,
          imageUrl: r.imageUrl,
          options: r.options,
          correct: r.correct,
          explanation: r.explanation,
          points: r.points,
          tags: r.tags,
        },
        `Sual ${i + 1}`,
      ),
    );
    const added = await this.quizzes.appendQuestions(quizId, user, normalized);
    return { added, quizId };
  }
}
