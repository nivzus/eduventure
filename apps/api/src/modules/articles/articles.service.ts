import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ContentType, Prisma, Visibility } from '@prisma/client';
import { AccessService, ListWhere } from '../../common/access/access.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthUser } from '../../common/types';
import { ContentService } from '../content/content.service';
import { readingMinutes, slugify, uniqStrings } from '../content/content.utils';
import { GamificationService } from '../gamification/gamification.service';
import {
  ArticleQueryDto,
  CreateAnnotationDto,
  CreateArticleDto,
  UpdateAnnotationDto,
  UpdateArticleDto,
} from './dto/article.dto';

const T = ContentType.ARTICLE;
const AUTHOR = { select: { id: true, name: true, avatarUrl: true } } as const;

/** List rows never carry the (possibly long) markdown body. */
const LIST_SELECT = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  coverUrl: true,
  category: true,
  tags: true,
  readingMinutes: true,
  status: true,
  visibility: true,
  passcode: true,
  authorId: true,
  createdAt: true,
  updatedAt: true,
  author: AUTHOR,
  _count: { select: { relatedQuizzes: true } },
} satisfies Prisma.ArticleSelect;

function plainExcerpt(markdown: string, max = 180): string {
  const text = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), max - 20)).trim()}…`;
}

@Injectable()
export class ArticlesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
    private readonly content: ContentService,
    private readonly gamification: GamificationService,
  ) {}

  // ───────────── reads ─────────────

  async list(user: AuthUser, q: ArticleQueryDto) {
    const visible = (await this.access.listWhere(user, T)) as ListWhere;
    const filters: Prisma.ArticleWhereInput[] = [visible];
    if (q.q?.trim()) {
      const s = q.q.trim();
      filters.push({
        OR: [
          { title: { contains: s, mode: 'insensitive' } },
          { excerpt: { contains: s, mode: 'insensitive' } },
          { content: { contains: s, mode: 'insensitive' } },
          { tags: { has: s } },
        ],
      });
    }
    if (q.category) filters.push({ category: { equals: q.category, mode: 'insensitive' } });
    if (q.tag) filters.push({ tags: { has: q.tag } });
    if (q.status) filters.push({ status: q.status });
    if (q.mine === '1' || q.mine === 'true') filters.push({ authorId: user.id });

    const rows = await this.prisma.article.findMany({
      where: { AND: filters },
      select: LIST_SELECT,
      orderBy: { createdAt: 'desc' },
    });
    const ids = rows.map((r) => r.id);
    const [progress, locked] = await Promise.all([
      this.prisma.articleProgress.findMany({
        where: { userId: user.id, articleId: { in: ids } },
        select: { articleId: true, progress: true, completedAt: true },
      }),
      this.content.lockedIds(user, T, rows),
    ]);
    const pMap = new Map(progress.map((p) => [p.articleId, p]));
    return rows.map(({ _count, ...r }) => ({
      ...this.content.hidePasscode(user, r),
      relatedQuizCount: _count.relatedQuizzes,
      myProgress: pMap.get(r.id)?.progress ?? 0,
      completedAt: pMap.get(r.id)?.completedAt ?? null,
      locked: locked.has(r.id),
    }));
  }

  async categories(user: AuthUser): Promise<string[]> {
    const visible = (await this.access.listWhere(user, T)) as ListWhere;
    const rows = await this.prisma.article.findMany({
      where: { AND: [visible, { category: { not: null } }] },
      select: { category: true },
      distinct: ['category'],
    });
    return rows
      .map((r) => r.category)
      .filter((c): c is string => !!c && !!c.trim())
      .sort((a, b) => a.localeCompare(b, 'az'));
  }

  /** Find by id or slug (404 if missing). */
  async resolve(slugOrId: string) {
    const a = await this.prisma.article.findFirst({
      where: { OR: [{ id: slugOrId }, { slug: slugOrId }] },
    });
    if (!a) throw new NotFoundException('Məqalə tapılmadı');
    return a;
  }

  /** Resolve + visibility check (used by progress/annotations). */
  async viewable(user: AuthUser, slugOrId: string, passcode?: string) {
    const a = await this.resolve(slugOrId);
    await this.access.assertCanView(user, T, a, { passcode });
    return a;
  }

  async detail(user: AuthUser, slugOrId: string, passcode?: string) {
    const article = await this.viewable(user, slugOrId, passcode);
    const quizVisible = (await this.access.listWhere(user, ContentType.QUIZ)) as ListWhere;
    const [author, links, relatedQuizzes, progress, bookmark, groupIds, annotationCount] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: article.authorId }, ...AUTHOR }),
      this.prisma.articleQuiz.findMany({ where: { articleId: article.id }, select: { quizId: true } }),
      this.prisma.quiz.findMany({
        where: { AND: [quizVisible, { articleLinks: { some: { articleId: article.id } } }] },
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          coverColor: true,
          timeLimitSec: true,
          status: true,
          visibility: true,
          _count: { select: { questions: true } },
        },
        orderBy: { title: 'asc' },
      }),
      this.prisma.articleProgress.findUnique({
        where: { userId_articleId: { userId: user.id, articleId: article.id } },
      }),
      this.prisma.bookmark.findUnique({
        where: { userId_contentType_contentId: { userId: user.id, contentType: T, contentId: article.id } },
      }),
      this.access.isOwner(user, article) ? this.content.groupIdsOf(T, article.id) : Promise.resolve([] as string[]),
      this.prisma.annotation.count({ where: { userId: user.id, articleId: article.id } }),
    ]);
    return {
      ...this.content.hidePasscode(user, article),
      author,
      relatedQuizIds: links.map((l) => l.quizId),
      relatedQuizzes: relatedQuizzes.map(({ _count, ...q }) => ({ ...q, questionCount: _count.questions })),
      groupIds,
      myProgress: progress?.progress ?? 0,
      completedAt: progress?.completedAt ?? null,
      bookmarked: !!bookmark,
      annotationCount,
      locked: false,
    };
  }

  // ───────────── writes ─────────────

  private async uniqueSlug(base: string, excludeId?: string): Promise<string> {
    const root = slugify(base);
    const taken = await this.prisma.article.findMany({
      where: { slug: { startsWith: root }, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { slug: true },
    });
    const set = new Set(taken.map((t) => t.slug));
    if (!set.has(root)) return root;
    for (let i = 2; i < 10_000; i++) {
      const candidate = `${root}-${i}`;
      if (!set.has(candidate)) return candidate;
    }
    return `${root}-${Date.now().toString(36)}`;
  }

  private async validQuizIds(ids: string[] | undefined): Promise<string[] | undefined> {
    if (ids === undefined) return undefined;
    const unique = uniqStrings(ids);
    if (!unique.length) return [];
    const found = await this.prisma.quiz.findMany({ where: { id: { in: unique } }, select: { id: true } });
    if (found.length !== unique.length) throw new BadRequestException('Əlaqəli testlərdən bəziləri tapılmadı');
    return unique;
  }

  async create(user: AuthUser, dto: CreateArticleDto) {
    const content = dto.content ?? '';
    const visibility = dto.visibility ?? Visibility.PUBLIC;
    await this.content.validateVisibilityInput(visibility, dto.passcode, dto.groupIds);
    const quizIds = await this.validQuizIds(dto.relatedQuizIds);
    const slug = await this.uniqueSlug(dto.slug?.trim() || dto.title);

    const created = await this.prisma.article.create({
      data: {
        title: dto.title.trim(),
        slug,
        excerpt: dto.excerpt?.trim() || plainExcerpt(content) || null,
        content,
        coverUrl: dto.coverUrl ?? null,
        category: dto.category?.trim() || null,
        tags: uniqStrings(dto.tags?.map((t) => t.trim())),
        readingMinutes: readingMinutes(content),
        status: dto.status,
        visibility,
        passcode: dto.passcode?.trim() || null,
        authorId: user.id,
        relatedQuizzes: quizIds?.length ? { create: quizIds.map((quizId) => ({ quizId })) } : undefined,
      },
    });
    await this.content.syncGroupAccess(T, created.id, visibility, dto.groupIds);
    return this.detail(user, created.id);
  }

  async update(user: AuthUser, id: string, dto: UpdateArticleDto) {
    const existing = await this.resolve(id);
    this.access.assertCanEdit(user, existing);
    const visibility = dto.visibility ?? existing.visibility;
    const passcode = dto.passcode === undefined ? existing.passcode : dto.passcode?.trim() || null;
    await this.content.validateVisibilityInput(visibility, passcode, dto.groupIds);
    const quizIds = await this.validQuizIds(dto.relatedQuizIds);

    const data: Prisma.ArticleUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.slug !== undefined && dto.slug.trim() && slugify(dto.slug) !== existing.slug) {
      data.slug = await this.uniqueSlug(dto.slug, existing.id);
    }
    if (dto.content !== undefined) {
      data.content = dto.content;
      data.readingMinutes = readingMinutes(dto.content);
    }
    if (dto.excerpt !== undefined) data.excerpt = dto.excerpt?.trim() || plainExcerpt(dto.content ?? existing.content) || null;
    if (dto.coverUrl !== undefined) data.coverUrl = dto.coverUrl || null;
    if (dto.category !== undefined) data.category = dto.category?.trim() || null;
    if (dto.tags !== undefined) data.tags = uniqStrings(dto.tags.map((t) => t.trim()));
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.visibility !== undefined) data.visibility = dto.visibility;
    if (dto.passcode !== undefined) data.passcode = passcode;

    await this.prisma.$transaction(async (tx) => {
      await tx.article.update({ where: { id: existing.id }, data });
      if (quizIds !== undefined) {
        await tx.articleQuiz.deleteMany({ where: { articleId: existing.id } });
        if (quizIds.length) {
          await tx.articleQuiz.createMany({ data: quizIds.map((quizId) => ({ articleId: existing.id, quizId })) });
        }
      }
      if (passcode !== existing.passcode || visibility !== Visibility.PASSCODE) {
        await tx.contentUnlock.deleteMany({ where: { contentType: T, contentId: existing.id } });
      }
    });
    if (dto.visibility !== undefined || dto.groupIds !== undefined) {
      await this.content.syncGroupAccess(T, existing.id, visibility, dto.groupIds);
    }
    return this.detail(user, existing.id);
  }

  async remove(user: AuthUser, id: string) {
    const existing = await this.resolve(id);
    this.access.assertCanEdit(user, existing);
    await this.prisma.article.delete({ where: { id: existing.id } });
    await this.content.cleanupAfterDelete(T, existing.id);
    return { ok: true, id: existing.id };
  }

  // ───────────── progress ─────────────

  async setProgress(user: AuthUser, slugOrId: string, value: number, passcode?: string) {
    const article = await this.viewable(user, slugOrId, passcode);
    const pct = Math.max(0, Math.min(100, Math.round(value)));
    const prev = await this.prisma.articleProgress.findUnique({
      where: { userId_articleId: { userId: user.id, articleId: article.id } },
    });
    const progress = Math.max(prev?.progress ?? 0, pct);
    const key = { userId_articleId: { userId: user.id, articleId: article.id } };
    await this.prisma.articleProgress.upsert({
      where: key,
      create: { userId: user.id, articleId: article.id, progress },
      update: { progress },
    });
    // Atomic "first completion" so concurrent requests can't double-award XP.
    const completesNow =
      progress >= 100 &&
      (
        await this.prisma.articleProgress.updateMany({
          where: { userId: user.id, articleId: article.id, completedAt: null },
          data: { completedAt: new Date() },
        })
      ).count === 1;
    const saved = (await this.prisma.articleProgress.findUnique({ where: key }))!;

    let reward = { xpGained: 0, levelUp: false, newAchievements: [] as unknown[] };
    if (completesNow) {
      const r = await this.gamification.onEvent(user.id, { type: 'ARTICLE_COMPLETED', articleId: article.id });
      reward = { xpGained: r.xpGained, levelUp: r.levelUp, newAchievements: r.newAchievements };
    }
    return {
      articleId: article.id,
      progress: saved.progress,
      completedAt: saved.completedAt,
      completed: !!saved.completedAt,
      ...reward,
    };
  }

  // ───────────── annotations ─────────────

  async annotations(user: AuthUser, slugOrId: string, passcode?: string) {
    const article = await this.viewable(user, slugOrId, passcode);
    return this.prisma.annotation.findMany({
      where: { userId: user.id, articleId: article.id },
      orderBy: [{ startOffset: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async createAnnotation(user: AuthUser, slugOrId: string, dto: CreateAnnotationDto, passcode?: string) {
    const article = await this.viewable(user, slugOrId, passcode);
    if (dto.endOffset < dto.startOffset) throw new BadRequestException('endOffset startOffset-dən kiçik ola bilməz');
    return this.prisma.annotation.create({
      data: {
        userId: user.id,
        articleId: article.id,
        quote: dto.quote,
        note: dto.note?.trim() || null,
        color: dto.color ?? 'signal',
        startOffset: dto.startOffset,
        endOffset: dto.endOffset,
      },
    });
  }

  private async ownAnnotation(user: AuthUser, id: string) {
    const a = await this.prisma.annotation.findUnique({ where: { id } });
    if (!a) throw new NotFoundException('Qeyd tapılmadı');
    if (a.userId !== user.id) throw new ForbiddenException('Bu qeyd sizə məxsus deyil');
    return a;
  }

  async updateAnnotation(user: AuthUser, id: string, dto: UpdateAnnotationDto) {
    const a = await this.ownAnnotation(user, id);
    const start = dto.startOffset ?? a.startOffset;
    const end = dto.endOffset ?? a.endOffset;
    if (end < start) throw new BadRequestException('endOffset startOffset-dən kiçik ola bilməz');
    return this.prisma.annotation.update({
      where: { id },
      data: {
        ...(dto.note !== undefined ? { note: dto.note?.trim() || null } : {}),
        ...(dto.color !== undefined ? { color: dto.color } : {}),
        ...(dto.quote !== undefined ? { quote: dto.quote } : {}),
        startOffset: start,
        endOffset: end,
      },
    });
  }

  async deleteAnnotation(user: AuthUser, id: string) {
    await this.ownAnnotation(user, id);
    await this.prisma.annotation.delete({ where: { id } });
    return { ok: true, id };
  }
}
