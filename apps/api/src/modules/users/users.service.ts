import { BadRequestException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import type { Response } from 'express';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthUser, isStaff } from '../../common/types';
import { dayKey, publicUser, round } from '../../common/utils';
import { AuthService } from '../auth/auth.service';
import { GamificationQueryService } from '../gamification/gamification-query.service';
import { GamificationService, levelInfo } from '../gamification/gamification.service';
import { PracticeService } from '../practice/practice.service';
import { FINISHED_STATUSES } from '../quizzes/quizzes.service';
import { ChangePasswordDto, UpdateMeDto, UsersQueryDto } from './dto/users.dto';

const USER_LIST_SELECT = {
  id: true,
  email: true,
  name: true,
  avatarUrl: true,
  bio: true,
  role: true,
  xp: true,
  level: true,
  streak: true,
  lastActiveAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly gamification: GamificationService,
    private readonly gq: GamificationQueryService,
    private readonly practice: PracticeService,
  ) {}

  async updateMe(userId: string, dto: UpdateMeDto) {
    const data: Prisma.UserUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.bio !== undefined) data.bio = dto.bio?.trim() || null;
    if (dto.avatarUrl !== undefined) data.avatarUrl = dto.avatarUrl?.trim() || null;
    const user = await this.prisma.user.update({ where: { id: userId }, data });
    return publicUser(user);
  }

  async changePassword(userId: string, dto: ChangePasswordDto, res: Response) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    if (!(await bcrypt.compare(dto.current, user.passwordHash))) throw new BadRequestException('Cari şifrə yanlışdır');
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await bcrypt.hash(dto.next, 10), tokenVersion: { increment: 1 } },
    });
    await this.auth.issueTokens(updated, res); // other sessions are logged out, this one continues
    return { ok: true };
  }

  /** Daily activity counts (XP events) for the last `days` days, zero-filled, oldest first. */
  async activity(userIds: string[], days: number) {
    const since = new Date(Date.now() - days * 86400000);
    const rows = userIds.length
      ? await this.prisma.$queryRaw<{ d: string; c: bigint }[]>`
          SELECT to_char(("createdAt" + interval '4 hours')::date, 'YYYY-MM-DD') AS d, count(*)::bigint AS c
          FROM "XpEvent" WHERE "userId" IN (${Prisma.join(userIds)}) AND "createdAt" >= ${since}
          GROUP BY d`
      : [];
    const map = new Map(rows.map((r) => [r.d, Number(r.c)]));
    const out: { date: string; count: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const key = dayKey(new Date(Date.now() - i * 86400000));
      out.push({ date: key, count: map.get(key) ?? 0 });
    }
    return out;
  }

  /** Common learning counters for a user. */
  async counters(userId: string) {
    const finished = { userId, status: { in: [...FINISHED_STATUSES] } };
    const [quizzesTaken, avg, passed, perfect, articlesRead, coursesCompleted, timeAgg] = await Promise.all([
      this.prisma.attempt.count({ where: finished }),
      this.prisma.attempt.aggregate({ where: { userId, status: { in: ['SUBMITTED', 'GRADED'] } }, _avg: { percent: true } }),
      this.prisma.attempt.count({ where: { ...finished, passed: true } }),
      this.prisma.attempt.count({ where: { ...finished, percent: { gte: 100 } } }),
      this.prisma.articleProgress.count({ where: { userId, completedAt: { not: null } } }),
      this.prisma.courseCompletion.count({ where: { userId } }),
      this.prisma.attempt.aggregate({ where: finished, _sum: { timeSpentSec: true } }),
    ]);
    return {
      quizzesTaken,
      avgPercent: round(avg._avg.percent ?? 0, 1),
      passed,
      perfect,
      articlesRead,
      coursesCompleted,
      totalTimeSec: timeAgg._sum.timeSpentSec ?? 0,
    };
  }

  async summary(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    const [counters, rank, cardsDue, recentAttempts, weakTopics, activity, achievementsCount] = await Promise.all([
      this.counters(userId),
      this.gq.rankOf(userId),
      this.prisma.flashcardReview.count({ where: { userId, dueAt: { lte: new Date() } } }),
      this.prisma.attempt.findMany({
        where: { userId, status: { in: [...FINISHED_STATUSES] } },
        orderBy: { submittedAt: 'desc' },
        take: 6,
        include: { quiz: { select: { id: true, title: true, category: true, coverColor: true } } },
      }),
      this.practice.weakTopics(userId, { limit: 6 }),
      this.activity([userId], 120),
      this.prisma.userAchievement.count({ where: { userId } }),
    ]);
    const li = levelInfo(user.xp);
    return {
      xp: user.xp,
      level: li.level,
      levelProgress: round(li.levelProgress, 3),
      nextLevelXp: li.nextLevelXp,
      streak: this.gamification.effectiveStreak(user),
      rank,
      ...counters,
      cardsDue,
      achievementsCount,
      recentAttempts,
      weakTopics,
      activity,
    };
  }

  list(query: UsersQueryDto) {
    const where: Prisma.UserWhereInput = {};
    if (query.role) where.role = query.role;
    if (query.q?.trim()) {
      const q = query.q.trim();
      where.OR = [{ name: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }];
    }
    return this.prisma.user
      .findMany({
        where,
        orderBy: [{ role: 'desc' }, { name: 'asc' }],
        select: {
          ...USER_LIST_SELECT,
          _count: { select: { attempts: { where: { status: { in: [...FINISHED_STATUSES] } } }, memberships: true } },
        },
        take: 1000,
      })
      .then((rows) =>
        rows.map(({ _count, ...u }) => ({ ...u, attemptsCount: _count.attempts, groupsCount: _count.memberships })),
      );
  }

  async profile(id: string, viewer: AuthUser) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: USER_LIST_SELECT });
    if (!user) throw new NotFoundException('İstifadəçi tapılmadı');
    const [achievements, counters, rank] = await Promise.all([
      this.prisma.userAchievement.findMany({ where: { userId: id }, include: { achievement: true }, orderBy: { unlockedAt: 'desc' } }),
      this.counters(id),
      this.gq.rankOf(id),
    ]);
    const showPrivate = viewer.id === id || isStaff(viewer);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { email, ...rest } = user;
    return {
      ...rest,
      ...(showPrivate ? { email } : {}),
      streak: this.gamification.effectiveStreak(user),
      achievements: achievements.map((ua) => ({ ...ua.achievement, unlockedAt: ua.unlockedAt })),
      stats: { ...counters, rank, ...levelInfo(user.xp) },
    };
  }

  async setRole(id: string, role: Role, actor: AuthUser) {
    if (id === actor.id && role !== 'ADMIN') throw new ForbiddenException('Öz admin rolunuzu silə bilməzsiniz');
    const exists = await this.prisma.user.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('İstifadəçi tapılmadı');
    return this.prisma.user.update({ where: { id }, data: { role }, select: USER_LIST_SELECT });
  }

  async remove(id: string, actor: AuthUser) {
    if (id === actor.id) throw new ForbiddenException('Öz hesabınızı silə bilməzsiniz');
    const exists = await this.prisma.user.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('İstifadəçi tapılmadı');
    await this.prisma.user.delete({ where: { id } });
    return { ok: true };
  }
}
