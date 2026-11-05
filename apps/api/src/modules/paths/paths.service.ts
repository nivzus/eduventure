import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ContentType, Prisma, Visibility } from '@prisma/client';
import { AccessService, ListWhere } from '../../common/access/access.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthUser } from '../../common/types';
import { ContentService } from '../content/content.service';
import { uniqStrings } from '../content/content.utils';
import { ProgressService } from '../content/progress.service';
import { CreatePathDto, PathQueryDto, UpdatePathDto } from './dto/path.dto';

const T = ContentType.PATH;
const AUTHOR = { select: { id: true, name: true, avatarUrl: true } } as const;

@Injectable()
export class PathsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
    private readonly content: ContentService,
    private readonly progress: ProgressService,
  ) {}

  async list(user: AuthUser, q: PathQueryDto) {
    const visible = (await this.access.listWhere(user, T)) as ListWhere;
    const filters: Prisma.LearningPathWhereInput[] = [visible];
    if (q.q?.trim()) {
      const s = q.q.trim();
      filters.push({
        OR: [{ title: { contains: s, mode: 'insensitive' } }, { description: { contains: s, mode: 'insensitive' } }],
      });
    }
    if (q.status) filters.push({ status: q.status });
    if (q.mine === '1' || q.mine === 'true') filters.push({ authorId: user.id });

    const rows = await this.prisma.learningPath.findMany({
      where: { AND: filters },
      include: {
        author: AUTHOR,
        items: {
          orderBy: { order: 'asc' },
          select: { courseId: true, course: { select: { id: true, title: true, status: true, authorId: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    const [progress, locked] = await Promise.all([
      this.progress.pathProgress(
        user.id,
        rows.map((r) => r.id),
      ),
      this.content.lockedIds(user, T, rows),
    ]);
    return rows.map(({ items, ...r }) => {
      const p = progress.get(r.id);
      return {
        ...this.content.hidePasscode(user, r),
        courseIds: items.map((i) => i.courseId),
        // titles of courses the viewer may see (drafts of other authors are left out)
        courses: items
          .filter((i) => i.course.status === 'PUBLISHED' || this.access.isOwner(user, i.course) || user.role === 'ADMIN')
          .map((i) => ({ id: i.course.id, title: i.course.title })),
        courseCount: items.length,
        completedCourses: p?.completedCourses ?? 0,
        progress: p?.progress ?? 0,
        locked: locked.has(r.id),
      };
    });
  }

  private async getOrThrow(id: string) {
    const p = await this.prisma.learningPath.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Tədris yolu tapılmadı');
    return p;
  }

  async detail(user: AuthUser, id: string, passcode?: string) {
    const path = await this.getOrThrow(id);
    await this.access.assertCanView(user, T, path, { passcode });

    const courseVisible = (await this.access.listWhere(user, ContentType.COURSE)) as ListWhere;
    const [author, items, bookmark, groupIds] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: path.authorId }, ...AUTHOR }),
      this.prisma.pathItem.findMany({ where: { pathId: id }, orderBy: { order: 'asc' } }),
      this.prisma.bookmark.findUnique({
        where: { userId_contentType_contentId: { userId: user.id, contentType: T, contentId: id } },
      }),
      this.access.isOwner(user, path) ? this.content.groupIdsOf(T, id) : Promise.resolve([] as string[]),
    ]);
    const courseIds = items.map((i) => i.courseId);
    const courses = await this.prisma.course.findMany({
      where: { AND: [courseVisible, { id: { in: courseIds } }] },
      include: { author: { select: { id: true, name: true } }, _count: { select: { items: true } } },
    });
    const [cp, locked] = await Promise.all([
      this.progress.courseProgress(user.id, courseIds),
      this.content.lockedIds(user, ContentType.COURSE, courses),
    ]);
    const byId = new Map(courses.map((c) => [c.id, c]));

    const outCourses = items
      .filter((i) => byId.has(i.courseId))
      .map((i) => {
        const { _count, ...c } = byId.get(i.courseId)!;
        const p = cp.get(i.courseId);
        return {
          ...this.content.hidePasscode(user, c),
          order: i.order,
          pathItemId: i.id,
          itemCount: _count.items,
          doneCount: p?.done ?? 0,
          progress: p?.progress ?? 0,
          completed: p?.completed ?? false,
          completedAt: p?.completedAt ?? null,
          locked: locked.has(c.id),
        };
      });
    const completedCourses = outCourses.filter((c) => c.completed).length;
    const nextCourse = outCourses.find((c) => !c.completed) ?? null;

    return {
      ...this.content.hidePasscode(user, path),
      author,
      courseIds,
      courses: outCourses,
      courseCount: outCourses.length,
      completedCourses,
      progress: outCourses.length ? outCourses.reduce((s, c) => s + c.progress, 0) / outCourses.length : 0,
      completed: outCourses.length > 0 && completedCourses === outCourses.length,
      nextCourseId: nextCourse?.id ?? null,
      bookmarked: !!bookmark,
      groupIds,
      locked: false,
    };
  }

  private async validCourseIds(ids: string[] | undefined): Promise<string[] | undefined> {
    if (ids === undefined) return undefined;
    const unique = uniqStrings(ids);
    if (!unique.length) return [];
    const found = await this.prisma.course.count({ where: { id: { in: unique } } });
    if (found !== unique.length) throw new BadRequestException('Kurslardan bəziləri tapılmadı');
    return unique;
  }

  async create(user: AuthUser, dto: CreatePathDto) {
    const visibility = dto.visibility ?? Visibility.PUBLIC;
    await this.content.validateVisibilityInput(visibility, dto.passcode, dto.groupIds);
    const courseIds = (await this.validCourseIds(dto.courseIds)) ?? [];
    const created = await this.prisma.learningPath.create({
      data: {
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        coverUrl: dto.coverUrl || null,
        status: dto.status,
        visibility,
        passcode: dto.passcode?.trim() || null,
        authorId: user.id,
        items: courseIds.length ? { create: courseIds.map((courseId, order) => ({ courseId, order })) } : undefined,
      },
    });
    await this.content.syncGroupAccess(T, created.id, visibility, dto.groupIds);
    return this.detail(user, created.id);
  }

  async update(user: AuthUser, id: string, dto: UpdatePathDto) {
    const existing = await this.getOrThrow(id);
    this.access.assertCanEdit(user, existing);
    const visibility = dto.visibility ?? existing.visibility;
    const passcode = dto.passcode === undefined ? existing.passcode : dto.passcode?.trim() || null;
    await this.content.validateVisibilityInput(visibility, passcode, dto.groupIds);
    const courseIds = await this.validCourseIds(dto.courseIds);

    const data: Prisma.LearningPathUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.description !== undefined) data.description = dto.description?.trim() || null;
    if (dto.coverUrl !== undefined) data.coverUrl = dto.coverUrl || null;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.visibility !== undefined) data.visibility = dto.visibility;
    if (dto.passcode !== undefined) data.passcode = passcode;

    await this.prisma.$transaction(async (tx) => {
      await tx.learningPath.update({ where: { id }, data });
      if (courseIds !== undefined) {
        await tx.pathItem.deleteMany({ where: { pathId: id } });
        if (courseIds.length) {
          await tx.pathItem.createMany({ data: courseIds.map((courseId, order) => ({ pathId: id, courseId, order })) });
        }
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
    await this.prisma.learningPath.delete({ where: { id } });
    await this.content.cleanupAfterDelete(T, id);
    return { ok: true, id };
  }
}
