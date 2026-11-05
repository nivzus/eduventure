import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ContentStatus, ContentType, Visibility } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../types';

/** Minimal shape every visibility-controlled content row has. */
export interface AccessibleContent {
  id: string;
  authorId: string;
  status?: ContentStatus;
  visibility: Visibility;
  passcode?: string | null;
}

export interface ViewCheckOptions {
  /** Passcode supplied with this request (e.g. start attempt body). */
  passcode?: string;
  /** Allow non-PUBLISHED content for non-authors (default false). */
  allowUnpublished?: boolean;
}

export type AccessDecision = 'ALLOWED' | 'LOCKED' | 'FORBIDDEN';

/**
 * Visibility rules (SPEC §2/§3):
 *  - author and ADMIN: always allowed (incl. drafts)
 *  - others only see PUBLISHED content
 *  - PUBLIC: everyone (anonymous too)
 *  - PRIVATE: author/ADMIN only
 *  - GROUPS: members of a group linked through ContentAccess, plus that group's teacher
 *  - PASSCODE: listed for everyone but "LOCKED" until unlocked (ContentUnlock row or matching passcode)
 *  - TEACHER: may view any PUBLISHED non-PRIVATE content (needed for assigning/reviewing)
 */
@Injectable()
export class AccessService {
  constructor(private readonly prisma: PrismaService) {}

  isOwner(user: AuthUser | undefined | null, content: { authorId: string }): boolean {
    return !!user && (user.role === 'ADMIN' || user.id === content.authorId);
  }

  /** Throws 403 unless the user is the author or ADMIN. */
  assertCanEdit(user: AuthUser | undefined | null, content: { authorId: string }): void {
    if (!this.isOwner(user, content)) throw new ForbiddenException('Bu məzmunu redaktə etmək icazəniz yoxdur');
  }

  /** Group ids the user belongs to (as member) or teaches. */
  async userGroupIds(userId: string): Promise<string[]> {
    const [memberOf, teaches] = await Promise.all([
      this.prisma.groupMember.findMany({ where: { userId }, select: { groupId: true } }),
      this.prisma.group.findMany({ where: { teacherId: userId }, select: { id: true } }),
    ]);
    return [...new Set([...memberOf.map((m) => m.groupId), ...teaches.map((g) => g.id)])];
  }

  /** Content ids of `type` shared (visibility=GROUPS) with any of the user's groups. */
  async groupSharedIds(userId: string, type: ContentType): Promise<string[]> {
    const groupIds = await this.userGroupIds(userId);
    if (groupIds.length === 0) return [];
    const rows = await this.prisma.contentAccess.findMany({
      where: { contentType: type, groupId: { in: groupIds } },
      select: { contentId: true },
    });
    return [...new Set(rows.map((r) => r.contentId))];
  }

  async isUnlocked(userId: string, type: ContentType, contentId: string): Promise<boolean> {
    const row = await this.prisma.contentUnlock.findUnique({
      where: { userId_contentType_contentId: { userId, contentType: type, contentId } },
    });
    return !!row;
  }

  async unlock(userId: string, type: ContentType, contentId: string): Promise<void> {
    await this.prisma.contentUnlock.upsert({
      where: { userId_contentType_contentId: { userId, contentType: type, contentId } },
      create: { userId, contentType: type, contentId },
      update: {},
    });
  }

  /**
   * Decide whether `user` may view `content`. PASSCODE content returns LOCKED
   * until unlocked; a correct `opts.passcode` unlocks it (and persists the unlock).
   */
  async decide(
    user: AuthUser | undefined | null,
    type: ContentType,
    content: AccessibleContent,
    opts: ViewCheckOptions = {},
  ): Promise<AccessDecision> {
    if (this.isOwner(user, content)) return 'ALLOWED';
    if (content.status && content.status !== 'PUBLISHED' && !opts.allowUnpublished) return 'FORBIDDEN';

    switch (content.visibility) {
      case 'PUBLIC':
        return 'ALLOWED';
      case 'PRIVATE':
        return 'FORBIDDEN';
      case 'GROUPS': {
        if (!user) return 'FORBIDDEN';
        if (user.role === 'TEACHER') return 'ALLOWED';
        const ids = await this.groupSharedIds(user.id, type);
        return ids.includes(content.id) ? 'ALLOWED' : 'FORBIDDEN';
      }
      case 'PASSCODE': {
        if (!user) return 'LOCKED';
        if (user.role === 'TEACHER') return 'ALLOWED';
        if (await this.isUnlocked(user.id, type, content.id)) return 'ALLOWED';
        if (opts.passcode !== undefined && content.passcode && opts.passcode.trim() === content.passcode.trim()) {
          await this.unlock(user.id, type, content.id);
          return 'ALLOWED';
        }
        return 'LOCKED';
      }
      default:
        return 'FORBIDDEN';
    }
  }

  async canView(
    user: AuthUser | undefined | null,
    type: ContentType,
    content: AccessibleContent,
    opts?: ViewCheckOptions,
  ): Promise<boolean> {
    return (await this.decide(user, type, content, opts)) === 'ALLOWED';
  }

  /** Throws 404 (hidden) / 403 with `{locked:true}` message for PASSCODE content. */
  async assertCanView(
    user: AuthUser | undefined | null,
    type: ContentType,
    content: AccessibleContent | null | undefined,
    opts?: ViewCheckOptions,
  ): Promise<void> {
    if (!content) throw new NotFoundException('Tapılmadı');
    const decision = await this.decide(user, type, content, opts);
    if (decision === 'ALLOWED') return;
    if (decision === 'LOCKED') {
      throw new ForbiddenException({ statusCode: 403, message: 'Bu məzmun şifrə ilə qorunur', locked: true });
    }
    throw new NotFoundException('Tapılmadı və ya giriş icazəniz yoxdur');
  }

  /**
   * Prisma `where` fragment for LISTING content of `type` visible to `user`.
   * PASSCODE items are listed (the client shows a lock); PRIVATE/foreign GROUPS items are hidden.
   * Usage: `prisma.article.findMany({ where: { AND: [await access.listWhere(user, 'ARTICLE'), myFilters] } })`
   */
  async listWhere(
    user: AuthUser | undefined | null,
    type: ContentType,
  ): Promise<VisibilityWhere> {
    if (user?.role === 'ADMIN') return {};
    const published = { status: ContentStatus.PUBLISHED };
    if (!user) return { ...published, visibility: { in: [Visibility.PUBLIC, Visibility.PASSCODE] } };
    if (user.role === 'TEACHER') {
      return { OR: [{ authorId: user.id }, { ...published, visibility: { not: Visibility.PRIVATE } }] };
    }
    const shared = await this.groupSharedIds(user.id, type);
    return {
      OR: [
        { authorId: user.id },
        { ...published, visibility: { in: [Visibility.PUBLIC, Visibility.PASSCODE] } },
        ...(shared.length ? [{ ...published, visibility: Visibility.GROUPS, id: { in: shared } }] : []),
      ],
    };
  }
}

/**
 * Structural where-fragment assignable to Quiz/Article/Course/LearningPath/FlashcardDeck WhereInput.
 * e.g. `prisma.course.findMany({ where: { AND: [await access.listWhere(user, 'COURSE'), { category }] } })`
 */
export interface VisibilityWhere {
  status?: ContentStatus;
  visibility?: Visibility | { in: Visibility[] } | { not: Visibility };
  authorId?: string;
  id?: { in: string[] };
  OR?: VisibilityWhere[];
}
