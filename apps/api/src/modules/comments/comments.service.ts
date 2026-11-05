import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CommentTarget, ContentType, Prisma } from '@prisma/client';
import { AccessService } from '../../common/access/access.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthUser, isStaff } from '../../common/types';
import { NotificationsService } from '../notifications/notifications.service';
import { CommentQueryDto, CreateCommentDto } from './dto/comment.dto';

const USER = { select: { id: true, name: true, avatarUrl: true, role: true, level: true } } as const;
type CommentRow = Prisma.CommentGetPayload<{ include: { user: typeof USER } }>;
export type ThreadedComment = CommentRow & { replies: ThreadedComment[] };

interface TargetInfo {
  /** Frontend link to the commented page. */
  link: string;
  /** Short label used in notifications. */
  label: string;
  /** For GROUP targets: everyone who should hear about a new top-level post. */
  audience?: string[];
  /** For ATTEMPT targets: the attempt owner. */
  ownerId?: string;
}

function snippet(s: string, max = 140): string {
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Checks the user may read/write comments on the target and returns link info (404/403 otherwise). */
  private async target(user: AuthUser, type: CommentTarget, id: string): Promise<TargetInfo> {
    switch (type) {
      case CommentTarget.ARTICLE: {
        const a = await this.prisma.article.findFirst({ where: { OR: [{ id }, { slug: id }] } });
        await this.access.assertCanView(user, ContentType.ARTICLE, a);
        return { link: `/articles/${a!.slug}#comments`, label: `“${a!.title}” məqaləsi` };
      }
      case CommentTarget.COURSE: {
        const c = await this.prisma.course.findUnique({ where: { id } });
        await this.access.assertCanView(user, ContentType.COURSE, c);
        return { link: `/courses/${c!.id}#comments`, label: `“${c!.title}” kursu` };
      }
      case CommentTarget.GROUP: {
        const g = await this.prisma.group.findUnique({
          where: { id },
          include: { members: { select: { userId: true } } },
        });
        if (!g) throw new NotFoundException('Qrup tapılmadı');
        const audience = [g.teacherId, ...g.members.map((m) => m.userId)];
        if (!isStaff(user) && !audience.includes(user.id)) throw new NotFoundException('Qrup tapılmadı');
        return { link: `/groups/${g.id}#comments`, label: `“${g.name}” qrupunda`, audience };
      }
      case CommentTarget.ATTEMPT: {
        const at = await this.prisma.attempt.findUnique({
          where: { id },
          select: { id: true, userId: true, quiz: { select: { title: true, authorId: true } } },
        });
        if (!at) throw new NotFoundException('Cəhd tapılmadı');
        if (at.userId !== user.id && !isStaff(user) && at.quiz.authorId !== user.id) {
          throw new NotFoundException('Cəhd tapılmadı');
        }
        return {
          link: `/attempts/${at.id}/review`,
          label: `“${at.quiz.title}” testindəki nəticəniz haqqında`,
          ownerId: at.userId,
        };
      }
    }
  }

  /** Canonical target id (articles may be addressed by slug). */
  private async canonicalId(type: CommentTarget, id: string): Promise<string> {
    if (type !== CommentTarget.ARTICLE) return id;
    const a = await this.prisma.article.findFirst({ where: { OR: [{ id }, { slug: id }] }, select: { id: true } });
    return a?.id ?? id;
  }

  async list(user: AuthUser, q: CommentQueryDto): Promise<ThreadedComment[]> {
    await this.target(user, q.targetType, q.targetId);
    const targetId = await this.canonicalId(q.targetType, q.targetId);
    const rows = await this.prisma.comment.findMany({
      where: { targetType: q.targetType, targetId },
      include: { user: USER },
      orderBy: { createdAt: 'asc' },
    });
    return this.thread(rows);
  }

  private thread(rows: CommentRow[]): ThreadedComment[] {
    const byId = new Map<string, ThreadedComment>(rows.map((r) => [r.id, { ...r, replies: [] }]));
    const roots: ThreadedComment[] = [];
    for (const c of byId.values()) {
      const parent = c.parentId ? byId.get(c.parentId) : undefined;
      if (parent) parent.replies.push(c);
      else roots.push(c);
    }
    return roots;
  }

  async create(user: AuthUser, dto: CreateCommentDto): Promise<ThreadedComment> {
    const info = await this.target(user, dto.targetType, dto.targetId);
    const targetId = await this.canonicalId(dto.targetType, dto.targetId);
    const body = dto.body.trim();
    if (!body) throw new BadRequestException('Şərh boş ola bilməz');

    let parent: { id: string; userId: string } | null = null;
    if (dto.parentId) {
      parent = await this.prisma.comment.findFirst({
        where: { id: dto.parentId, targetType: dto.targetType, targetId },
        select: { id: true, userId: true },
      });
      if (!parent) throw new BadRequestException('Cavab verilən şərh tapılmadı');
    }

    const created = await this.prisma.comment.create({
      data: { userId: user.id, targetType: dto.targetType, targetId, parentId: parent?.id ?? null, body },
      include: { user: USER },
    });

    if (parent && parent.userId !== user.id) {
      await this.notifications.notify(parent.userId, {
        type: 'COMMENT',
        title: `${user.name} şərhinizə cavab verdi`,
        body: snippet(body),
        link: info.link,
      });
    } else if (!parent && dto.targetType === CommentTarget.GROUP && info.audience) {
      await this.notifications.notify(
        info.audience.filter((id) => id !== user.id),
        { type: 'COMMENT', title: `${user.name} ${info.label} yeni mesaj yazdı`, body: snippet(body), link: info.link },
      );
    } else if (!parent && dto.targetType === CommentTarget.ATTEMPT && info.ownerId && info.ownerId !== user.id) {
      await this.notifications.notify(info.ownerId, {
        type: 'COMMENT',
        title: `${user.name} ${info.label} şərh yazdı`,
        body: snippet(body),
        link: info.link,
      });
    }
    return { ...created, replies: [] };
  }

  /** Author, TEACHER or ADMIN may delete (replies are removed by cascade). */
  async remove(user: AuthUser, id: string) {
    const c = await this.prisma.comment.findUnique({ where: { id }, select: { id: true, userId: true } });
    if (!c) throw new NotFoundException('Şərh tapılmadı');
    if (c.userId !== user.id && !isStaff(user)) throw new ForbiddenException('Bu şərhi silmək icazəniz yoxdur');
    await this.prisma.comment.delete({ where: { id } });
    return { ok: true, id };
  }
}
