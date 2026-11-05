import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Group, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthUser, isAdmin, isStaff } from '../../common/types';
import { uniqStrings } from '../content/content.utils';
import { NotificationsService } from '../notifications/notifications.service';
import { AssignmentsService } from '../assignments/assignments.service';
import { AddMembersDto, CreateGroupDto, UpdateGroupDto } from './dto/group.dto';

const TEACHER = { select: { id: true, name: true, avatarUrl: true } } as const;

@Injectable()
export class GroupsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly assignments: AssignmentsService,
  ) {}

  /** STUDENT: groups I belong to · TEACHER/ADMIN: all groups. */
  async list(user: AuthUser) {
    const where: Prisma.GroupWhereInput = isStaff(user)
      ? {}
      : { OR: [{ members: { some: { userId: user.id } } }, { teacherId: user.id }] };
    const rows = await this.prisma.group.findMany({
      where,
      include: {
        teacher: TEACHER,
        _count: { select: { members: true, assignments: true } },
        members: { where: { userId: user.id }, select: { userId: true } },
      },
      orderBy: { name: 'asc' },
    });
    return rows.map(({ _count, members, ...g }) => ({
      ...g,
      memberCount: _count.members,
      assignmentCount: _count.assignments,
      isMember: members.length > 0,
      isTeacher: g.teacherId === user.id,
    }));
  }

  private async getOrThrow(id: string): Promise<Group> {
    const g = await this.prisma.group.findUnique({ where: { id } });
    if (!g) throw new NotFoundException('Qrup tapılmadı');
    return g;
  }

  private canManage(user: AuthUser, group: Group): boolean {
    return isAdmin(user) || group.teacherId === user.id;
  }

  private assertCanManage(user: AuthUser, group: Group): void {
    if (!this.canManage(user, group)) throw new ForbiddenException('Bu qrupu idarə etmək icazəniz yoxdur');
  }

  async detail(user: AuthUser, id: string) {
    const group = await this.getOrThrow(id);
    const membership = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: id, userId: user.id } },
    });
    if (!isStaff(user) && !membership && group.teacherId !== user.id) {
      throw new NotFoundException('Qrup tapılmadı');
    }
    const staffView = isStaff(user);
    const [teacher, members, assignments] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: group.teacherId }, ...TEACHER }),
      this.prisma.groupMember.findMany({
        where: { groupId: id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
              role: true,
              xp: true,
              level: true,
              streak: true,
              lastActiveAt: true,
              ...(staffView ? { email: true } : {}),
            },
          },
        },
        orderBy: { user: { name: 'asc' } },
      }),
      this.assignments.forGroup(user, id, staffView),
    ]);
    return {
      ...group,
      teacher,
      members,
      memberCount: members.length,
      assignments,
      isMember: !!membership,
      isTeacher: group.teacherId === user.id,
      canManage: this.canManage(user, group),
    };
  }

  private async validUserIds(ids: string[] | undefined): Promise<string[]> {
    const unique = uniqStrings(ids);
    if (!unique.length) return [];
    const found = await this.prisma.user.findMany({ where: { id: { in: unique } }, select: { id: true } });
    if (found.length !== unique.length) throw new BadRequestException('İstifadəçilərdən bəziləri tapılmadı');
    return unique;
  }

  private async validTeacher(user: AuthUser, teacherId: string | undefined): Promise<string | undefined> {
    if (!teacherId || teacherId === user.id) return teacherId;
    if (!isAdmin(user)) throw new ForbiddenException('Qrup müəllimini yalnız admin dəyişə bilər');
    const t = await this.prisma.user.findUnique({ where: { id: teacherId }, select: { role: true } });
    if (!t) throw new BadRequestException('Müəllim tapılmadı');
    if (t.role === Role.STUDENT) throw new BadRequestException('Seçilmiş istifadəçi müəllim deyil');
    return teacherId;
  }

  async create(user: AuthUser, dto: CreateGroupDto) {
    const teacherId = (await this.validTeacher(user, dto.teacherId)) ?? user.id;
    const userIds = await this.validUserIds(dto.userIds);
    const group = await this.prisma.group.create({
      data: {
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        color: dto.color?.trim() || null,
        teacherId,
        members: userIds.length ? { create: userIds.map((userId) => ({ userId })) } : undefined,
      },
    });
    await this.notifyAdded(group, userIds.filter((u) => u !== user.id));
    return this.detail(user, group.id);
  }

  async update(user: AuthUser, id: string, dto: UpdateGroupDto) {
    const group = await this.getOrThrow(id);
    this.assertCanManage(user, group);
    const teacherId = dto.teacherId !== undefined ? await this.validTeacher(user, dto.teacherId) : undefined;
    await this.prisma.group.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
        ...(dto.color !== undefined ? { color: dto.color?.trim() || null } : {}),
        ...(teacherId ? { teacherId } : {}),
      },
    });
    return this.detail(user, id);
  }

  async remove(user: AuthUser, id: string) {
    const group = await this.getOrThrow(id);
    this.assertCanManage(user, group);
    await this.prisma.group.delete({ where: { id } });
    return { ok: true, id };
  }

  async addMembers(user: AuthUser, id: string, dto: AddMembersDto) {
    const group = await this.getOrThrow(id);
    this.assertCanManage(user, group);
    const userIds = await this.validUserIds(dto.userIds);
    const existing = await this.prisma.groupMember.findMany({
      where: { groupId: id, userId: { in: userIds } },
      select: { userId: true },
    });
    const already = new Set(existing.map((e) => e.userId));
    const fresh = userIds.filter((u) => !already.has(u));
    if (fresh.length) {
      await this.prisma.groupMember.createMany({
        data: fresh.map((userId) => ({ groupId: id, userId })),
        skipDuplicates: true,
      });
      await this.notifyAdded(group, fresh.filter((u) => u !== user.id));
    }
    return this.detail(user, id);
  }

  /** Teacher/ADMIN removes a member; a member may also remove (leave) themselves. */
  async removeMember(user: AuthUser, id: string, userId: string) {
    const group = await this.getOrThrow(id);
    if (userId !== user.id) this.assertCanManage(user, group);
    const res = await this.prisma.groupMember.deleteMany({ where: { groupId: id, userId } });
    if (!res.count) throw new NotFoundException('Üzv tapılmadı');
    return { ok: true, groupId: id, userId };
  }

  private async notifyAdded(group: Group, userIds: string[]) {
    if (!userIds.length) return;
    await this.notifications.notify(userIds, {
      type: 'GROUP',
      title: `“${group.name}” qrupuna əlavə olundunuz`,
      body: group.description ?? 'Qrup tapşırıqlarını və müzakirələrini izləyin.',
      link: `/groups/${group.id}`,
    });
  }
}
