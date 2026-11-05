import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateAchievementDto, CreateQuestDto, UpdateAchievementDto, UpdateQuestDto } from './dto/gamification.dto';
import { GamificationService, periodKeyFor } from './gamification.service';

export interface LeaderboardRow {
  rank: number;
  user: { id: string; name: string; avatarUrl: string | null; level: number };
  xp: number;
}

const RULE_TYPES = ['quizzes', 'passed', 'perfect', 'practice', 'streak', 'xp', 'level', 'articles', 'courses', 'cards'];

@Injectable()
export class GamificationQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gamification: GamificationService,
  ) {}

  // ───────────────────────────── leaderboard ─────────────────────────────

  async leaderboard(period: 'week' | 'month' | 'all' = 'week', groupId?: string, limit = 50): Promise<LeaderboardRow[]> {
    let memberIds: string[] | undefined;
    if (groupId) {
      const members = await this.prisma.groupMember.findMany({ where: { groupId }, select: { userId: true } });
      memberIds = members.map((m) => m.userId);
      if (memberIds.length === 0) return [];
    }
    const take = Math.min(Math.max(limit, 1), 200);

    if (period === 'all') {
      const users = await this.prisma.user.findMany({
        where: { xp: { gt: 0 }, ...(memberIds ? { id: { in: memberIds } } : {}) },
        orderBy: [{ xp: 'desc' }, { createdAt: 'asc' }],
        take,
        select: { id: true, name: true, avatarUrl: true, level: true, xp: true },
      });
      return users.map(({ xp, ...user }, i) => ({ rank: i + 1, user, xp }));
    }

    const days = period === 'month' ? 30 : 7;
    const since = new Date(Date.now() - days * 86400000);
    const sums = await this.prisma.xpEvent.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: since }, ...(memberIds ? { userId: { in: memberIds } } : {}) },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      take,
    });
    const users = await this.prisma.user.findMany({
      where: { id: { in: sums.map((s) => s.userId) } },
      select: { id: true, name: true, avatarUrl: true, level: true },
    });
    const byId = new Map(users.map((u) => [u.id, u]));
    return sums
      .filter((s) => (s._sum.amount ?? 0) > 0 && byId.has(s.userId))
      .map((s, i) => ({ rank: i + 1, user: byId.get(s.userId)!, xp: s._sum.amount ?? 0 }));
  }

  /** Global all-time rank of a user (1-based). */
  async rankOf(userId: string): Promise<number> {
    const me = await this.prisma.user.findUnique({ where: { id: userId }, select: { xp: true } });
    if (!me) return 0;
    return (await this.prisma.user.count({ where: { xp: { gt: me.xp } } })) + 1;
  }

  // ───────────────────────────── achievements ─────────────────────────────

  async achievementsFor(userId: string) {
    const [all, mine] = await Promise.all([
      this.prisma.achievement.findMany({ orderBy: [{ xpReward: 'asc' }, { createdAt: 'asc' }] }),
      this.prisma.userAchievement.findMany({ where: { userId } }),
    ]);
    const unlocked = new Map(mine.map((m) => [m.achievementId, m.unlockedAt]));
    return all.map((a) => ({ ...a, unlocked: unlocked.has(a.id), unlockedAt: unlocked.get(a.id) ?? null }));
  }

  // ───────────────────────────── quests ─────────────────────────────

  async questsFor(userId: string) {
    const quests = await this.prisma.quest.findMany({ where: { active: true }, orderBy: [{ period: 'asc' }, { createdAt: 'asc' }] });
    const keys = quests.map((q) => ({ questId: q.id, periodKey: periodKeyFor(q.period) }));
    const progress = await this.prisma.userQuest.findMany({ where: { userId, OR: keys.length ? keys : [{ id: '__none__' }] } });
    const byQuest = new Map(progress.map((p) => [`${p.questId}:${p.periodKey}`, p]));
    return quests.map((q) => {
      const periodKey = periodKeyFor(q.period);
      const p = byQuest.get(`${q.id}:${periodKey}`);
      return {
        ...q,
        periodKey,
        progress: p?.progress ?? 0,
        completed: !!p?.completedAt,
        completedAt: p?.completedAt ?? null,
        claimed: !!p?.claimedAt,
        claimedAt: p?.claimedAt ?? null,
      };
    });
  }

  async claim(userId: string, questId: string) {
    const quest = await this.prisma.quest.findUnique({ where: { id: questId } });
    if (!quest || !quest.active) throw new NotFoundException('Tapşırıq tapılmadı');
    const periodKey = periodKeyFor(quest.period);
    const uq = await this.prisma.userQuest.findUnique({ where: { userId_questId_periodKey: { userId, questId, periodKey } } });
    if (!uq?.completedAt) throw new BadRequestException('Tapşırıq hələ tamamlanmayıb');
    if (uq.claimedAt) throw new ConflictException('Mükafat artıq götürülüb');
    const res = await this.prisma.userQuest.updateMany({
      where: { id: uq.id, claimedAt: null },
      data: { claimedAt: new Date() },
    });
    if (res.count === 0) throw new ConflictException('Mükafat artıq götürülüb');
    const award = await this.gamification.awardXp(userId, quest.xpReward, `quest:${quest.id}`);
    const newAchievements = await this.gamification.checkAchievements(userId);
    return { questId, xpGained: quest.xpReward, levelUp: award.levelUp, level: award.level, xp: award.xp, newAchievements };
  }

  // ───────────────────────────── admin CRUD ─────────────────────────────

  adminQuests() {
    return this.prisma.quest.findMany({
      orderBy: [{ active: 'desc' }, { period: 'asc' }, { createdAt: 'asc' }],
      include: { _count: { select: { progress: { where: { completedAt: { not: null } } } } } },
    });
  }

  createQuest(dto: CreateQuestDto) {
    return this.prisma.quest.create({ data: { ...dto, active: dto.active ?? true } });
  }

  async updateQuest(id: string, dto: UpdateQuestDto) {
    await this.ensureQuest(id);
    return this.prisma.quest.update({ where: { id }, data: dto });
  }

  async deleteQuest(id: string) {
    await this.ensureQuest(id);
    await this.prisma.quest.delete({ where: { id } });
    return { ok: true };
  }

  private async ensureQuest(id: string) {
    const q = await this.prisma.quest.findUnique({ where: { id } });
    if (!q) throw new NotFoundException('Tapşırıq tapılmadı');
    return q;
  }

  adminAchievements() {
    return this.prisma.achievement.findMany({
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { users: true } } },
    });
  }

  private validateRule(rule: unknown): Prisma.InputJsonValue {
    if (rule === undefined || rule === null) return {};
    if (typeof rule !== 'object' || Array.isArray(rule)) throw new BadRequestException('rule obyekt olmalıdır');
    const r = rule as Record<string, unknown>;
    if (r.type !== undefined && !RULE_TYPES.includes(String(r.type))) {
      throw new BadRequestException(`rule.type bunlardan biri olmalıdır: ${RULE_TYPES.join(', ')}`);
    }
    return r as Prisma.InputJsonValue;
  }

  async createAchievement(dto: CreateAchievementDto) {
    const exists = await this.prisma.achievement.findUnique({ where: { code: dto.code } });
    if (exists) throw new ConflictException('Bu kodla nailiyyət artıq var');
    return this.prisma.achievement.create({
      data: {
        code: dto.code,
        title: dto.title,
        description: dto.description,
        icon: dto.icon ?? 'Award',
        xpReward: dto.xpReward ?? 0,
        rule: this.validateRule(dto.rule),
      },
    });
  }

  async updateAchievement(id: string, dto: UpdateAchievementDto) {
    const a = await this.prisma.achievement.findUnique({ where: { id } });
    if (!a) throw new NotFoundException('Nailiyyət tapılmadı');
    const { rule, ...rest } = dto;
    return this.prisma.achievement.update({
      where: { id },
      data: { ...rest, ...(rule !== undefined ? { rule: this.validateRule(rule) } : {}) },
    });
  }

  async deleteAchievement(id: string) {
    const a = await this.prisma.achievement.findUnique({ where: { id } });
    if (!a) throw new NotFoundException('Nailiyyət tapılmadı');
    await this.prisma.achievement.delete({ where: { id } });
    return { ok: true };
  }
}
