import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ContentType, CourseItemType, Prisma, Visibility } from '@prisma/client';
import { AccessService, ListWhere } from '../../common/access/access.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthUser } from '../../common/types';
import { ContentService } from '../content/content.service';
import { uniqStrings } from '../content/content.utils';
import { ProgressService } from '../content/progress.service';
import { GamificationService } from '../gamification/gamification.service';
import { CourseItemInputDto, CourseQueryDto, CreateCourseDto, UpdateCourseDto } from './dto/course.dto';

const T = ContentType.COURSE;
const AUTHOR = { select: { id: true, name: true, avatarUrl: true } } as const;

@Injectable()
export class CoursesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
    private readonly content: ContentService,
    private readonly progress: ProgressService,
    private readonly gamification: GamificationService,
  ) {}

  async list(user: AuthUser, q: CourseQueryDto) {
    const visible = (await this.access.listWhere(user, T)) as ListWhere;
    const filters: Prisma.CourseWhereInput[] = [visible];
    if (q.q?.trim()) {
      const s = q.q.trim();
      filters.push({
        OR: [
          { title: { contains: s, mode: 'insensitive' } },
          { description: { contains: s, mode: 'insensitive' } },
          { category: { contains: s, mode: 'insensitive' } },
        ],
      });
    }
    if (q.category) filters.push({ category: { equals: q.category, mode: 'insensitive' } });
    if (q.level) filters.push({ level: { equals: q.level, mode: 'insensitive' } });
    if (q.status) filters.push({ status: q.status });
    if (q.mine === '1' || q.mine === 'true') filters.push({ authorId: user.id });

    const rows = await this.prisma.course.findMany({
      where: { AND: filters },
      include: { author: AUTHOR, items: { select: { type: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const [progress, locked] = await Promise.all([
      this.progress.courseProgress(
        user.id,
        rows.map((r) => r.id),
      ),
      this.content.lockedIds(user, T, rows),
    ]);
    return rows.map(({ items, ...r }) => {
      const p = progress.get(r.id);
      return {
        ...this.content.hidePasscode(user, r),
        itemCount: items.length,
        itemCounts: {
          ARTICLE: items.filter((i) => i.type === CourseItemType.ARTICLE).length,
          QUIZ: items.filter((i) => i.type === CourseItemType.QUIZ).length,
          DECK: items.filter((i) => i.type === CourseItemType.DECK).length,
        },
        progress: p?.progress ?? 0,
        doneCount: p?.done ?? 0,
        completed: p?.completed ?? false,
        completedAt: p?.completedAt ?? null,
        locked: locked.has(r.id),
      };
    });
  }

  private async getOrThrow(id: string) {
    const c = await this.prisma.course.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Kurs tapılmadı');
    return c;
  }

  async detail(user: AuthUser, id: string, passcode?: string) {
    const course = await this.getOrThrow(id);
    await this.access.assertCanView(user, T, course, { passcode });

    const [author, items, bookmark, groupIds, paths] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: course.authorId }, ...AUTHOR }),
      this.prisma.courseItem.findMany({
        where: { courseId: course.id },
        orderBy: { order: 'asc' },
        include: {
          article: {
            select: {
              id: true, title: true, slug: true, excerpt: true, coverUrl: true, readingMinutes: true,
              status: true, visibility: true,
            },
          },
          quiz: {
            select: {
              id: true, title: true, description: true, coverColor: true, timeLimitSec: true, passPercent: true,
              status: true, visibility: true, _count: { select: { questions: true } },
            },
          },
          deck: {
            select: {
              id: true, title: true, description: true, status: true, visibility: true,
              _count: { select: { cards: true } },
            },
          },
        },
      }),
      this.prisma.bookmark.findUnique({
        where: { userId_contentType_contentId: { userId: user.id, contentType: T, contentId: course.id } },
      }),
      this.access.isOwner(user, course) ? this.content.groupIdsOf(T, course.id) : Promise.resolve([] as string[]),
      this.prisma.learningPath.findMany({
        where: { AND: [(await this.access.listWhere(user, ContentType.PATH)) as ListWhere, { items: { some: { courseId: course.id } } }] },
        select: { id: true, title: true },
      }),
    ]);

    const sets = await this.progress.doneSets(user.id, {
      articleIds: items.map((i) => i.articleId).filter((x): x is string => !!x),
      quizIds: items.map((i) => i.quizId).filter((x): x is string => !!x),
      deckIds: items.map((i) => i.deckId).filter((x): x is string => !!x),
    });
    const completion = await this.prisma.courseCompletion.findUnique({
      where: { userId_courseId: { userId: user.id, courseId: course.id } },
    });

    const outItems = items.map((i) => ({
      id: i.id,
      order: i.order,
      type: i.type,
      articleId: i.articleId,
      quizId: i.quizId,
      deckId: i.deckId,
      title: i.article?.title ?? i.quiz?.title ?? i.deck?.title ?? '',
      article: i.article ?? null,
      quiz: i.quiz ? (({ _count, ...q }) => ({ ...q, questionCount: _count.questions }))(i.quiz) : null,
      deck: i.deck ? (({ _count, ...d }) => ({ ...d, cardCount: _count.cards }))(i.deck) : null,
      done: this.progress.isItemDone(i, sets),
    }));
    const doneCount = outItems.filter((i) => i.done).length;

    return {
      ...this.content.hidePasscode(user, course),
      author,
      items: outItems,
      itemCount: outItems.length,
      doneCount,
      progress: completion ? 1 : outItems.length ? doneCount / outItems.length : 0,
      completed: !!completion,
      completedAt: completion?.completedAt ?? null,
      canComplete: !completion && outItems.length > 0 && doneCount === outItems.length,
      bookmarked: !!bookmark,
      groupIds,
      paths,
      locked: false,
    };
  }

  // ───────────── writes ─────────────

  /** Validates item refs and returns create rows (order = array index). */
  private async buildItems(items: CourseItemInputDto[]) {
    const rows = items.map((it, order) => {
      const ref =
        it.type === CourseItemType.ARTICLE ? it.articleId : it.type === CourseItemType.QUIZ ? it.quizId : it.deckId;
      if (!ref) throw new BadRequestException(`Element #${order + 1}: ${it.type} üçün id göstərilməyib`);
      return {
        order,
        type: it.type,
        articleId: it.type === CourseItemType.ARTICLE ? ref : null,
        quizId: it.type === CourseItemType.QUIZ ? ref : null,
        deckId: it.type === CourseItemType.DECK ? ref : null,
      };
    });
    const articleIds = uniqStrings(rows.map((r) => r.articleId));
    const quizIds = uniqStrings(rows.map((r) => r.quizId));
    const deckIds = uniqStrings(rows.map((r) => r.deckId));
    const [a, q, d] = await Promise.all([
      articleIds.length ? this.prisma.article.count({ where: { id: { in: articleIds } } }) : 0,
      quizIds.length ? this.prisma.quiz.count({ where: { id: { in: quizIds } } }) : 0,
      deckIds.length ? this.prisma.flashcardDeck.count({ where: { id: { in: deckIds } } }) : 0,
    ]);
    if (a !== articleIds.length || q !== quizIds.length || d !== deckIds.length) {
      throw new BadRequestException('Kurs elementlərindən bəziləri tapılmadı');
    }
    return rows;
  }

  async create(user: AuthUser, dto: CreateCourseDto) {
    const visibility = dto.visibility ?? Visibility.PUBLIC;
    await this.content.validateVisibilityInput(visibility, dto.passcode, dto.groupIds);
    const items = await this.buildItems(dto.items ?? []);
    const created = await this.prisma.course.create({
      data: {
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        coverUrl: dto.coverUrl || null,
        category: dto.category?.trim() || null,
        level: dto.level?.trim() || null,
        status: dto.status,
        visibility,
        passcode: dto.passcode?.trim() || null,
        authorId: user.id,
        items: items.length ? { create: items } : undefined,
      },
    });
    await this.content.syncGroupAccess(T, created.id, visibility, dto.groupIds);
    return this.detail(user, created.id);
  }

  async update(user: AuthUser, id: string, dto: UpdateCourseDto) {
    const existing = await this.getOrThrow(id);
    this.access.assertCanEdit(user, existing);
    const visibility = dto.visibility ?? existing.visibility;
    const passcode = dto.passcode === undefined ? existing.passcode : dto.passcode?.trim() || null;
    await this.content.validateVisibilityInput(visibility, passcode, dto.groupIds);
    const items = dto.items !== undefined ? await this.buildItems(dto.items) : undefined;

    const data: Prisma.CourseUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.description !== undefined) data.description = dto.description?.trim() || null;
    if (dto.coverUrl !== undefined) data.coverUrl = dto.coverUrl || null;
    if (dto.category !== undefined) data.category = dto.category?.trim() || null;
    if (dto.level !== undefined) data.level = dto.level?.trim() || null;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.visibility !== undefined) data.visibility = dto.visibility;
    if (dto.passcode !== undefined) data.passcode = passcode;

    await this.prisma.$transaction(async (tx) => {
      await tx.course.update({ where: { id }, data });
      if (items !== undefined) {
        await tx.courseItem.deleteMany({ where: { courseId: id } });
        if (items.length) await tx.courseItem.createMany({ data: items.map((i) => ({ ...i, courseId: id })) });
      }
      if (passcode !== existing.passcode || visibility !== Visibility.PASSCODE) {
        await tx.contentUnlock.deleteMany({ where: { contentType: T, contentId: id } });
      }
    });
    if (dto.visibility !== undefined || dto.groupIds !== undefined) {
      await this.content.syncGroupAccess(T, id, visibility, dto.groupIds);
    }
    return this.detail(user, id);
  }

  async remove(user: AuthUser, id: string) {
    const existing = await this.getOrThrow(id);
    this.access.assertCanEdit(user, existing);
    await this.prisma.course.delete({ where: { id } });
    await this.content.cleanupAfterDelete(T, id);
    return { ok: true, id };
  }

  // ───────────── completion ─────────────

  async complete(user: AuthUser, id: string, passcode?: string) {
    const course = await this.getOrThrow(id);
    await this.access.assertCanView(user, T, course, { passcode });

    const existing = await this.prisma.courseCompletion.findUnique({
      where: { userId_courseId: { userId: user.id, courseId: id } },
    });
    if (existing) {
      return {
        courseId: id,
        completed: true,
        completedAt: existing.completedAt,
        alreadyCompleted: true,
        xpGained: 0,
        levelUp: false,
        newAchievements: [],
        next: await this.nextInPath(user, id),
      };
    }

    const progress = (await this.progress.courseProgress(user.id, [id])).get(id);
    if (!progress || progress.total === 0) throw new BadRequestException('Bu kursda hələ heç bir mərhələ yoxdur');
    if (progress.done < progress.total) {
      throw new BadRequestException(
        `Kursu bitirmək üçün bütün mərhələləri tamamlayın (${progress.done}/${progress.total})`,
      );
    }

    let completion;
    try {
      completion = await this.prisma.courseCompletion.create({ data: { userId: user.id, courseId: id } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        const again = await this.prisma.courseCompletion.findUnique({
          where: { userId_courseId: { userId: user.id, courseId: id } },
        });
        return {
          courseId: id,
          completed: true,
          completedAt: again?.completedAt ?? new Date(),
          alreadyCompleted: true,
          xpGained: 0,
          levelUp: false,
          newAchievements: [],
          next: await this.nextInPath(user, id),
        };
      }
      throw e;
    }
    const reward = await this.gamification.onEvent(user.id, { type: 'COURSE_COMPLETED', courseId: id });
    return {
      courseId: id,
      completed: true,
      completedAt: completion.completedAt,
      alreadyCompleted: false,
      xpGained: reward.xpGained,
      levelUp: reward.levelUp,
      newAchievements: reward.newAchievements,
      next: await this.nextInPath(user, id),
    };
  }

  /** Recommendation (legacy behaviour): next visible course in a path that contains this one. */
  private async nextInPath(user: AuthUser, courseId: string) {
    const pathVisible = (await this.access.listWhere(user, ContentType.PATH)) as ListWhere;
    const courseVisible = (await this.access.listWhere(user, T)) as ListWhere;
    const paths = await this.prisma.learningPath.findMany({
      where: { AND: [pathVisible, { items: { some: { courseId } } }] },
      select: {
        id: true,
        title: true,
        items: { orderBy: { order: 'asc' }, select: { courseId: true, course: { select: { id: true, title: true } } } },
      },
    });
    for (const p of paths) {
      const idx = p.items.findIndex((i) => i.courseId === courseId);
      for (const next of p.items.slice(idx + 1)) {
        const visible = await this.prisma.course.count({ where: { AND: [courseVisible, { id: next.courseId }] } });
        if (visible) return { pathId: p.id, pathTitle: p.title, courseId: next.course.id, courseTitle: next.course.title };
      }
    }
    return null;
  }
}
