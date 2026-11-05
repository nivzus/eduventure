import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ContentStatus, ContentType, Visibility } from '@prisma/client';
import { AccessibleContent, AccessService } from '../../common/access/access.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthUser } from '../../common/types';
import { contentLink, uniqStrings } from './content.utils';
import { SetVisibilityDto } from './dto/content.dto';

export interface ContentMeta extends AccessibleContent {
  title: string;
  status: ContentStatus;
  passcode: string | null;
  slug?: string;
}

/** Compact, type-agnostic description of a piece of content (bookmarks, assignments, search…). */
export interface ContentSummary {
  id: string;
  type: ContentType;
  title: string;
  description: string | null;
  slug?: string;
  category?: string | null;
  coverUrl?: string | null;
  coverColor?: string | null;
  status: ContentStatus;
  visibility: Visibility;
  link: string;
  author?: { id: string; name: string };
  questionCount?: number;
  readingMinutes?: number;
  itemCount?: number;
  courseCount?: number;
  cardCount?: number;
}

const META_SELECT = { id: true, title: true, status: true, visibility: true, passcode: true, authorId: true } as const;
const AUTHOR_SELECT = { select: { id: true, name: true } } as const;

@Injectable()
export class ContentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
  ) {}

  /** Visibility-relevant fields of one content row (null when missing). */
  async meta(type: ContentType, id: string): Promise<ContentMeta | null> {
    switch (type) {
      case ContentType.QUIZ:
        return this.prisma.quiz.findUnique({ where: { id }, select: META_SELECT });
      case ContentType.ARTICLE:
        return this.prisma.article.findUnique({ where: { id }, select: { ...META_SELECT, slug: true } });
      case ContentType.COURSE:
        return this.prisma.course.findUnique({ where: { id }, select: META_SELECT });
      case ContentType.PATH:
        return this.prisma.learningPath.findUnique({ where: { id }, select: META_SELECT });
      case ContentType.DECK:
        return this.prisma.flashcardDeck.findUnique({ where: { id }, select: META_SELECT });
    }
  }

  async metaOrThrow(type: ContentType, id: string): Promise<ContentMeta> {
    const m = await this.meta(type, id);
    if (!m) throw new NotFoundException('Məzmun tapılmadı');
    return m;
  }

  /**
   * Ids (among `items`) that are PASSCODE-protected and not yet unlocked for `user`
   * — used to flag `locked: true` in list responses.
   */
  async lockedIds(
    user: AuthUser | null | undefined,
    type: ContentType,
    items: { id: string; authorId: string; visibility: Visibility }[],
  ): Promise<Set<string>> {
    const candidates = items.filter((i) => i.visibility === Visibility.PASSCODE && !this.access.isOwner(user, i));
    if (!candidates.length) return new Set();
    if (!user) return new Set(candidates.map((c) => c.id));
    if (user.role === 'TEACHER') return new Set();
    const unlocked = await this.prisma.contentUnlock.findMany({
      where: { userId: user.id, contentType: type, contentId: { in: candidates.map((c) => c.id) } },
      select: { contentId: true },
    });
    const ok = new Set(unlocked.map((u) => u.contentId));
    return new Set(candidates.filter((c) => !ok.has(c.id)).map((c) => c.id));
  }

  /** Summaries keyed by id. Missing (deleted) ids are simply absent. */
  async summaries(type: ContentType, ids: string[]): Promise<Map<string, ContentSummary>> {
    const unique = uniqStrings(ids);
    const out = new Map<string, ContentSummary>();
    if (!unique.length) return out;
    const where = { id: { in: unique } };

    switch (type) {
      case ContentType.QUIZ: {
        const rows = await this.prisma.quiz.findMany({
          where,
          include: { author: AUTHOR_SELECT, _count: { select: { questions: true } } },
        });
        for (const r of rows)
          out.set(r.id, {
            id: r.id, type, title: r.title, description: r.description, category: r.category, coverColor: r.coverColor,
            status: r.status, visibility: r.visibility, link: contentLink(type, r), author: r.author,
            questionCount: r._count.questions,
          });
        break;
      }
      case ContentType.ARTICLE: {
        const rows = await this.prisma.article.findMany({
          where,
          select: {
            id: true, title: true, slug: true, excerpt: true, category: true, coverUrl: true, status: true,
            visibility: true, readingMinutes: true, author: AUTHOR_SELECT,
          },
        });
        for (const r of rows)
          out.set(r.id, {
            id: r.id, type, title: r.title, description: r.excerpt, slug: r.slug, category: r.category, coverUrl: r.coverUrl,
            status: r.status, visibility: r.visibility, link: contentLink(type, r), author: r.author,
            readingMinutes: r.readingMinutes,
          });
        break;
      }
      case ContentType.COURSE: {
        const rows = await this.prisma.course.findMany({
          where,
          include: { author: AUTHOR_SELECT, _count: { select: { items: true } } },
        });
        for (const r of rows)
          out.set(r.id, {
            id: r.id, type, title: r.title, description: r.description, category: r.category, coverUrl: r.coverUrl,
            status: r.status, visibility: r.visibility, link: contentLink(type, r), author: r.author,
            itemCount: r._count.items,
          });
        break;
      }
      case ContentType.PATH: {
        const rows = await this.prisma.learningPath.findMany({
          where,
          include: { author: AUTHOR_SELECT, _count: { select: { items: true } } },
        });
        for (const r of rows)
          out.set(r.id, {
            id: r.id, type, title: r.title, description: r.description, coverUrl: r.coverUrl,
            status: r.status, visibility: r.visibility, link: contentLink(type, r), author: r.author,
            courseCount: r._count.items,
          });
        break;
      }
      case ContentType.DECK: {
        const rows = await this.prisma.flashcardDeck.findMany({
          where,
          include: { author: AUTHOR_SELECT, _count: { select: { cards: true } } },
        });
        for (const r of rows)
          out.set(r.id, {
            id: r.id, type, title: r.title, description: r.description, category: r.category,
            status: r.status, visibility: r.visibility, link: contentLink(type, r), author: r.author,
            cardCount: r._count.cards,
          });
        break;
      }
    }
    return out;
  }

  /** Summaries for a mixed list of (type, id) refs; key = `${type}:${id}`. */
  async summariesFor(refs: { contentType: ContentType; contentId: string }[]): Promise<Map<string, ContentSummary>> {
    const byType = new Map<ContentType, string[]>();
    for (const r of refs) byType.set(r.contentType, [...(byType.get(r.contentType) ?? []), r.contentId]);
    const out = new Map<string, ContentSummary>();
    await Promise.all(
      [...byType.entries()].map(async ([type, ids]) => {
        const m = await this.summaries(type, ids);
        for (const [id, s] of m) out.set(`${type}:${id}`, s);
      }),
    );
    return out;
  }

  // ───────────── helpers used by the content CRUD services ─────────────

  /** Validates visibility/passcode/groupIds coming from a create/update body. */
  async validateVisibilityInput(
    visibility: Visibility | undefined,
    passcode: string | null | undefined,
    groupIds: string[] | undefined,
    currentPasscode?: string | null,
  ): Promise<void> {
    if (visibility === Visibility.PASSCODE && !(passcode?.trim() || currentPasscode)) {
      throw new BadRequestException('Şifrəli giriş üçün şifrə daxil edin');
    }
    if (visibility === Visibility.GROUPS && groupIds !== undefined) {
      const ids = uniqStrings(groupIds);
      const found = ids.length ? await this.prisma.group.count({ where: { id: { in: ids } } }) : 0;
      if (found !== ids.length) throw new BadRequestException('Qruplardan bəziləri tapılmadı');
    }
  }

  /**
   * Keeps ContentAccess rows in sync after a create/update:
   * GROUPS + groupIds → replace; any other visibility → clear.
   */
  async syncGroupAccess(type: ContentType, id: string, visibility: Visibility, groupIds?: string[]): Promise<void> {
    if (visibility !== Visibility.GROUPS) {
      await this.prisma.contentAccess.deleteMany({ where: { contentType: type, contentId: id } });
      return;
    }
    if (groupIds === undefined) return;
    const ids = uniqStrings(groupIds);
    await this.prisma.$transaction([
      this.prisma.contentAccess.deleteMany({ where: { contentType: type, contentId: id } }),
      this.prisma.contentAccess.createMany({
        data: ids.map((groupId) => ({ contentType: type, contentId: id, groupId })),
        skipDuplicates: true,
      }),
    ]);
  }

  async groupIdsOf(type: ContentType, id: string): Promise<string[]> {
    const rows = await this.prisma.contentAccess.findMany({
      where: { contentType: type, contentId: id },
      select: { groupId: true },
    });
    return rows.map((r) => r.groupId);
  }

  /** Removes polymorphic rows (no FK) pointing at deleted content. */
  async cleanupAfterDelete(type: ContentType, id: string): Promise<void> {
    const commentTarget = type === ContentType.ARTICLE ? 'ARTICLE' : type === ContentType.COURSE ? 'COURSE' : null;
    await this.prisma.$transaction([
      this.prisma.bookmark.deleteMany({ where: { contentType: type, contentId: id } }),
      this.prisma.assignment.deleteMany({ where: { contentType: type, contentId: id } }),
      this.prisma.contentAccess.deleteMany({ where: { contentType: type, contentId: id } }),
      this.prisma.contentUnlock.deleteMany({ where: { contentType: type, contentId: id } }),
      ...(commentTarget
        ? [this.prisma.comment.deleteMany({ where: { targetType: commentTarget, targetId: id } })]
        : []),
    ]);
  }

  /** Strip the passcode unless the viewer may edit the content. */
  hidePasscode<T extends { passcode?: string | null; authorId: string }>(user: AuthUser | null | undefined, row: T): T {
    if (this.access.isOwner(user, row)) return row;
    return { ...row, passcode: null };
  }

  // ───────────── visibility / permissions / unlock ─────────────

  async setVisibility(user: AuthUser, type: ContentType, id: string, dto: SetVisibilityDto) {
    const meta = await this.metaOrThrow(type, id);
    this.access.assertCanEdit(user, meta);

    const passcode =
      dto.visibility === Visibility.PASSCODE ? (dto.passcode?.trim() || meta.passcode || '').trim() : meta.passcode;
    if (dto.visibility === Visibility.PASSCODE && !passcode) {
      throw new BadRequestException('Şifrəli giriş üçün şifrə daxil edin');
    }
    const groupIds = uniqStrings(dto.groupIds);
    if (dto.visibility === Visibility.GROUPS) {
      if (!groupIds.length) throw new BadRequestException('Ən azı bir qrup seçin');
      const found = await this.prisma.group.count({ where: { id: { in: groupIds } } });
      if (found !== groupIds.length) throw new BadRequestException('Qruplardan bəziləri tapılmadı');
    }

    const data = { visibility: dto.visibility, passcode: passcode || null };
    await this.prisma.$transaction(async (tx) => {
      switch (type) {
        case ContentType.QUIZ:
          await tx.quiz.update({ where: { id }, data });
          break;
        case ContentType.ARTICLE:
          await tx.article.update({ where: { id }, data });
          break;
        case ContentType.COURSE:
          await tx.course.update({ where: { id }, data });
          break;
        case ContentType.PATH:
          await tx.learningPath.update({ where: { id }, data });
          break;
        case ContentType.DECK:
          await tx.flashcardDeck.update({ where: { id }, data });
          break;
      }
      await tx.contentAccess.deleteMany({ where: { contentType: type, contentId: id } });
      if (dto.visibility === Visibility.GROUPS) {
        await tx.contentAccess.createMany({
          data: groupIds.map((groupId) => ({ contentType: type, contentId: id, groupId })),
          skipDuplicates: true,
        });
      }
      // A changed passcode invalidates earlier unlocks.
      if (dto.visibility !== Visibility.PASSCODE || (meta.passcode ?? '') !== (passcode ?? '')) {
        await tx.contentUnlock.deleteMany({ where: { contentType: type, contentId: id } });
      }
    });

    return this.permissionFor(type, id);
  }

  private async permissionFor(type: ContentType, id: string) {
    const meta = await this.metaOrThrow(type, id);
    const access = await this.prisma.contentAccess.findMany({
      where: { contentType: type, contentId: id },
      include: { group: { select: { id: true, name: true, color: true } } },
    });
    return {
      type,
      id,
      title: meta.title,
      status: meta.status,
      visibility: meta.visibility,
      passcode: meta.passcode,
      groupIds: access.map((a) => a.groupId),
      groups: access.map((a) => a.group),
    };
  }

  /** ADMIN overview of every piece of content with its visibility settings. */
  async permissions() {
    const sel = { ...META_SELECT, updatedAt: true, author: AUTHOR_SELECT } as const;
    const [quizzes, articles, courses, paths, decks, access] = await Promise.all([
      this.prisma.quiz.findMany({ select: sel, orderBy: { updatedAt: 'desc' } }),
      this.prisma.article.findMany({ select: { ...sel, slug: true }, orderBy: { updatedAt: 'desc' } }),
      this.prisma.course.findMany({ select: sel, orderBy: { updatedAt: 'desc' } }),
      this.prisma.learningPath.findMany({ select: sel, orderBy: { updatedAt: 'desc' } }),
      this.prisma.flashcardDeck.findMany({ select: sel, orderBy: { updatedAt: 'desc' } }),
      this.prisma.contentAccess.findMany({ include: { group: { select: { id: true, name: true, color: true } } } }),
    ]);
    const groupsOf = new Map<string, { id: string; name: string; color: string | null }[]>();
    for (const a of access) {
      const k = `${a.contentType}:${a.contentId}`;
      groupsOf.set(k, [...(groupsOf.get(k) ?? []), a.group]);
    }
    const rows: { type: ContentType; list: (ContentMeta & { updatedAt: Date; author: { id: string; name: string } })[] }[] = [
      { type: ContentType.QUIZ, list: quizzes },
      { type: ContentType.ARTICLE, list: articles },
      { type: ContentType.COURSE, list: courses },
      { type: ContentType.PATH, list: paths },
      { type: ContentType.DECK, list: decks },
    ];
    return rows.flatMap(({ type, list }) =>
      list.map((c) => {
        const groups = groupsOf.get(`${type}:${c.id}`) ?? [];
        return {
          type,
          id: c.id,
          title: c.title,
          status: c.status,
          visibility: c.visibility,
          passcode: c.passcode,
          author: c.author,
          updatedAt: c.updatedAt,
          link: contentLink(type, c),
          groupIds: groups.map((g) => g.id),
          groups,
        };
      }),
    );
  }

  async unlock(user: AuthUser, type: ContentType, id: string, passcode: string) {
    const meta = await this.metaOrThrow(type, id);
    if (meta.status !== ContentStatus.PUBLISHED && !this.access.isOwner(user, meta)) {
      throw new NotFoundException('Məzmun tapılmadı');
    }
    if (meta.visibility !== Visibility.PASSCODE) return { unlocked: true };
    if (this.access.isOwner(user, meta) || user.role === 'TEACHER') return { unlocked: true };
    if (!meta.passcode || (passcode ?? '').trim() !== meta.passcode.trim()) {
      throw new ForbiddenException('Yanlış giriş kodu');
    }
    await this.access.unlock(user.id, type, id);
    return { unlocked: true };
  }
}
