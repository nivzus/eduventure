import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Assignment, ContentType, Prisma, Visibility } from '@prisma/client';
import { AccessService } from '../../common/access/access.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthUser, isAdmin } from '../../common/types';
import { ContentService, ContentSummary } from '../content/content.service';
import { CONTENT_TYPE_LABEL, contentLink, uniqStrings } from '../content/content.utils';
import { ProgressService } from '../content/progress.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AssignmentQueryDto, CreateAssignmentDto } from './dto/assignment.dto';

const INCLUDE = {
  group: { select: { id: true, name: true, color: true } },
  user: { select: { id: true, name: true, avatarUrl: true } },
  assignedBy: { select: { id: true, name: true, avatarUrl: true } },
} satisfies Prisma.AssignmentInclude;

type AssignmentRow = Prisma.AssignmentGetPayload<{ include: typeof INCLUDE }>;

function formatDate(d: Date): string {
  // dd.mm.yyyy in Baku time (UTC+4)
  const s = new Date(d.getTime() + 4 * 3600 * 1000).toISOString();
  return `${s.slice(8, 10)}.${s.slice(5, 7)}.${s.slice(0, 4)}`;
}

@Injectable()
export class AssignmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
    private readonly content: ContentService,
    private readonly progress: ProgressService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Adds `content` summary and `done`/`overdue` for `viewerId`; with `withStats`, also
   * `stats: {done,total}` across the assignees (group members or the single user).
   * Assignments whose content was deleted are dropped.
   */
  async decorate(viewerId: string, rows: AssignmentRow[], opts: { withStats?: boolean } = {}) {
    const refs = rows.map((r) => ({ contentType: r.contentType, contentId: r.contentId }));
    const [summaries, myDone] = await Promise.all([
      this.content.summariesFor(refs),
      this.progress.contentDone(viewerId, refs),
    ]);

    let stats: Map<string, { done: number; total: number }> | undefined;
    if (opts.withStats && rows.length) {
      const groupIds = uniqStrings(rows.map((r) => r.groupId));
      const members = groupIds.length
        ? await this.prisma.groupMember.findMany({ where: { groupId: { in: groupIds } }, select: { groupId: true, userId: true } })
        : [];
      const assignees = new Map<string, string[]>(); // assignmentId → userIds
      for (const r of rows) {
        assignees.set(r.id, r.groupId ? members.filter((m) => m.groupId === r.groupId).map((m) => m.userId) : r.userId ? [r.userId] : []);
      }
      // per user → refs they must complete
      const perUser = new Map<string, { contentType: ContentType; contentId: string }[]>();
      for (const r of rows) {
        for (const u of assignees.get(r.id) ?? []) {
          perUser.set(u, [...(perUser.get(u) ?? []), { contentType: r.contentType, contentId: r.contentId }]);
        }
      }
      const doneByUser = new Map<string, Set<string>>();
      await Promise.all(
        [...perUser.entries()].map(async ([u, rs]) => doneByUser.set(u, await this.progress.contentDone(u, rs))),
      );
      stats = new Map();
      for (const r of rows) {
        const us = assignees.get(r.id) ?? [];
        const key = `${r.contentType}:${r.contentId}`;
        stats.set(r.id, { total: us.length, done: us.filter((u) => doneByUser.get(u)?.has(key)).length });
      }
    }

    const now = new Date();
    return rows
      .map((r) => {
        const key = `${r.contentType}:${r.contentId}`;
        const content: ContentSummary | undefined = summaries.get(key);
        if (!content) return null;
        const done = myDone.has(key);
        return {
          ...r,
          content,
          link: content.link,
          done,
          overdue: !!r.dueAt && r.dueAt < now && !done,
          ...(stats ? { stats: stats.get(r.id) ?? { done: 0, total: 0 } } : {}),
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }

  private order(): Prisma.AssignmentOrderByWithRelationInput[] {
    return [{ dueAt: { sort: 'asc', nulls: 'last' } }, { createdAt: 'desc' }];
  }

  async mine(user: AuthUser) {
    const memberOf = await this.prisma.groupMember.findMany({ where: { userId: user.id }, select: { groupId: true } });
    const rows = await this.prisma.assignment.findMany({
      where: { OR: [{ userId: user.id }, { groupId: { in: memberOf.map((m) => m.groupId) } }] },
      include: INCLUDE,
      orderBy: this.order(),
    });
    // The same content may be assigned both directly and via a group — keep the earliest due one.
    const seen = new Set<string>();
    const unique = rows.filter((r) => {
      const k = `${r.contentType}:${r.contentId}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    return this.decorate(user.id, unique);
  }

  async list(user: AuthUser, q: AssignmentQueryDto) {
    const where: Prisma.AssignmentWhereInput = {};
    if (q.groupId) where.groupId = q.groupId;
    if (!isAdmin(user)) {
      where.OR = [{ assignedById: user.id }, { group: { teacherId: user.id } }];
    }
    const rows = await this.prisma.assignment.findMany({ where, include: INCLUDE, orderBy: this.order() });
    return this.decorate(user.id, rows, { withStats: true });
  }

  async forGroup(viewer: AuthUser, groupId: string, withStats: boolean) {
    const rows = await this.prisma.assignment.findMany({ where: { groupId }, include: INCLUDE, orderBy: this.order() });
    return this.decorate(viewer.id, rows, { withStats });
  }

  async create(user: AuthUser, dto: CreateAssignmentDto) {
    const meta = await this.content.meta(dto.contentType, dto.contentId);
    if (!meta || !(await this.access.canView(user, dto.contentType, meta))) {
      throw new NotFoundException('Məzmun tapılmadı');
    }
    // Assignees must be able to open it.
    if (meta.status !== 'PUBLISHED') throw new BadRequestException('Yalnız dərc edilmiş məzmun tapşırıq kimi verilə bilər');
    if (meta.visibility === Visibility.PRIVATE) {
      throw new BadRequestException('Şəxsi (PRIVATE) məzmun tələbələrə görünmür — əvvəlcə görünürlüyü dəyişin');
    }
    const groupIds = uniqStrings(dto.groupIds);
    const userIds = uniqStrings(dto.userIds);
    if (!groupIds.length && !userIds.length) throw new BadRequestException('Ən azı bir qrup və ya istifadəçi seçin');

    const [groups, users] = await Promise.all([
      groupIds.length
        ? this.prisma.group.findMany({
            where: { id: { in: groupIds } },
            select: { id: true, name: true, teacherId: true, members: { select: { userId: true } } },
          })
        : Promise.resolve([]),
      userIds.length ? this.prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true } }) : Promise.resolve([]),
    ]);
    if (groups.length !== groupIds.length) throw new BadRequestException('Qruplardan bəziləri tapılmadı');
    if (users.length !== userIds.length) throw new BadRequestException('İstifadəçilərdən bəziləri tapılmadı');
    if (!isAdmin(user) && groups.some((g) => g.teacherId !== user.id)) {
      throw new ForbiddenException('Yalnız öz qruplarınıza tapşırıq verə bilərsiniz');
    }

    const dueAt = dto.dueAt ?? null;
    const base = { contentType: dto.contentType, contentId: dto.contentId, title: meta.title, dueAt, assignedById: user.id };
    const created = await this.prisma.$transaction([
      ...groupIds.map((groupId) => this.prisma.assignment.create({ data: { ...base, groupId }, include: INCLUDE })),
      ...userIds.map((userId) => this.prisma.assignment.create({ data: { ...base, userId }, include: INCLUDE })),
    ]);

    // GROUPS-visible content: make sure the assigned groups can actually open it.
    if (meta.visibility === Visibility.GROUPS && groupIds.length) {
      await this.prisma.contentAccess.createMany({
        data: groupIds.map((groupId) => ({ contentType: dto.contentType, contentId: dto.contentId, groupId })),
        skipDuplicates: true,
      });
    }

    const recipients = uniqStrings([...groups.flatMap((g) => g.members.map((m) => m.userId)), ...userIds]).filter(
      (id) => id !== user.id,
    );
    await this.notifications.notify(recipients, {
      type: 'ASSIGNMENT',
      title: `Yeni tapşırıq: ${meta.title}`,
      body: `${CONTENT_TYPE_LABEL[dto.contentType]} · ${user.name} tərəfindən${dueAt ? ` · Son tarix: ${formatDate(dueAt)}` : ''}`,
      link: contentLink(dto.contentType, meta),
    });

    return this.decorate(user.id, created as AssignmentRow[], { withStats: true });
  }

  async remove(user: AuthUser, id: string) {
    const a: (Assignment & { group: { teacherId: string } | null }) | null = await this.prisma.assignment.findUnique({
      where: { id },
      include: { group: { select: { teacherId: true } } },
    });
    if (!a) throw new NotFoundException('Tapşırıq tapılmadı');
    if (!isAdmin(user) && a.assignedById !== user.id && a.group?.teacherId !== user.id) {
      throw new ForbiddenException('Bu tapşırığı silmək icazəniz yoxdur');
    }
    await this.prisma.assignment.delete({ where: { id } });
    return { ok: true, id };
  }
}
