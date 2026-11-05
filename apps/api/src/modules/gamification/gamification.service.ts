import { Injectable, Logger } from '@nestjs/common';
import { Achievement, AttemptMode, Quest, QuestPeriod, QuestType } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { dayKey, daysBetweenKeys, weekKey } from '../../common/utils';
import { NotificationsService } from '../notifications/notifications.service';

/** Events other modules report. XP is computed here from SPEC §2 rules — do NOT call awardXp in addition. */
export type GamificationEvent =
  | { type: 'QUIZ_SUBMITTED'; percent: number; mode: AttemptMode; quizId?: string; attemptId?: string }
  | { type: 'ARTICLE_COMPLETED'; articleId?: string }
  | { type: 'COURSE_COMPLETED'; courseId?: string }
  | { type: 'CARDS_REVIEWED'; count?: number }
  | { type: 'ACTIVITY' };

export interface GamificationResult {
  xpGained: number;
  levelUp: boolean;
  level: number;
  xp: number;
  streak: number;
  newAchievements: Achievement[];
  completedQuests: Quest[];
}

export interface AwardResult {
  xp: number;
  level: number;
  levelUp: boolean;
}

/** Achievement rule shapes stored in Achievement.rule (Json). */
export type AchievementRule =
  | { type: 'quizzes'; count: number }
  | { type: 'passed'; count: number }
  | { type: 'perfect'; count: number }
  | { type: 'practice'; count: number }
  | { type: 'streak'; days: number }
  | { type: 'xp'; amount: number }
  | { type: 'level'; level: number }
  | { type: 'articles'; count: number }
  | { type: 'courses'; count: number }
  | { type: 'cards'; count: number };

export const levelForXp = (xp: number): number => Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1;
/** Total XP needed to reach `level`. */
export const xpForLevel = (level: number): number => 100 * Math.max(0, level - 1) ** 2;

export function levelInfo(xp: number) {
  const level = levelForXp(xp);
  const floor = xpForLevel(level);
  const nextLevelXp = xpForLevel(level + 1);
  const levelProgress = nextLevelXp > floor ? (xp - floor) / (nextLevelXp - floor) : 0;
  return { level, nextLevelXp, levelProgress: Math.min(1, Math.max(0, levelProgress)) };
}

export function periodKeyFor(period: QuestPeriod, d: Date = new Date()): string {
  if (period === 'DAILY') return dayKey(d);
  if (period === 'WEEKLY') return weekKey(d);
  return 'once';
}

@Injectable()
export class GamificationService {
  private readonly logger = new Logger(GamificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Streak as displayed: 0 if the last activity was before yesterday (Baku time). */
  effectiveStreak(user: { streak: number; lastActiveAt: Date | null }): number {
    if (!user.lastActiveAt) return 0;
    const gap = daysBetweenKeys(dayKey(user.lastActiveAt), dayKey());
    return gap <= 1 ? user.streak : 0;
  }

  /**
   * Low-level: add XP (creates XpEvent, updates user.xp/level, advances EARN_XP quests,
   * notifies on level up). Prefer `onEvent` for learning activity.
   */
  async awardXp(userId: string, amount: number, reason: string): Promise<AwardResult> {
    const amt = Math.round(amount);
    const before = await this.prisma.user.findUnique({ where: { id: userId }, select: { xp: true, level: true } });
    if (!before) return { xp: 0, level: 1, levelUp: false };
    if (amt === 0) return { xp: before.xp, level: before.level, levelUp: false };

    const xp = Math.max(0, before.xp + amt);
    const level = levelForXp(xp);
    await this.prisma.$transaction([
      this.prisma.xpEvent.create({ data: { userId, amount: amt, reason } }),
      this.prisma.user.update({ where: { id: userId }, data: { xp, level } }),
    ]);
    const levelUp = level > before.level;
    if (levelUp) {
      await this.notifications.notify(userId, {
        type: 'LEVEL_UP',
        title: `Təbriklər! ${level}-ci səviyyəyə yüksəldiniz`,
        body: `Ümumi XP: ${xp}. Zirvəyə doğru irəliləyirsiniz!`,
        link: '/profile',
      });
    }
    if (amt > 0 && !reason.startsWith('quest:')) {
      await this.advanceQuests(userId, 'EARN_XP', amt);
    }
    return { xp, level, levelUp };
  }

  /** Main entry point: updates streak, awards XP per SPEC rules, advances quests, unlocks achievements. */
  async onEvent(userId: string, event: GamificationEvent): Promise<GamificationResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { xp: true, level: true, streak: true, lastActiveAt: true },
    });
    if (!user) {
      return { xpGained: 0, levelUp: false, level: 1, xp: 0, streak: 0, newAchievements: [], completedQuests: [] };
    }
    const startLevel = user.level;
    const startXp = user.xp;

    // 1) streak
    const today = dayKey();
    let streak = user.streak;
    if (!user.lastActiveAt) streak = 1;
    else {
      const gap = daysBetweenKeys(dayKey(user.lastActiveAt), today);
      if (gap === 1) streak = user.streak + 1;
      else if (gap > 1 || streak < 1) streak = 1;
    }
    await this.prisma.user.update({ where: { id: userId }, data: { streak, lastActiveAt: new Date() } });

    // 2) XP from event
    const completedQuests: Quest[] = [];
    const grants: { amount: number; reason: string }[] = [];
    switch (event.type) {
      case 'QUIZ_SUBMITTED': {
        const pct = Math.max(0, Math.min(100, event.percent));
        if (event.mode === 'PRACTICE') grants.push({ amount: 3, reason: 'practice' });
        else grants.push({ amount: Math.round(pct / 10) + 5, reason: 'quiz' });
        if (pct >= 100) grants.push({ amount: 20, reason: 'perfect' });
        completedQuests.push(...(await this.advanceQuests(userId, 'COMPLETE_QUIZZES', 1)));
        if (pct >= 100) completedQuests.push(...(await this.advanceQuests(userId, 'PERFECT_SCORE', 1)));
        break;
      }
      case 'ARTICLE_COMPLETED':
        grants.push({ amount: 10, reason: 'article' });
        completedQuests.push(...(await this.advanceQuests(userId, 'READ_ARTICLES', 1)));
        break;
      case 'COURSE_COMPLETED':
        grants.push({ amount: 50, reason: 'course' });
        break;
      case 'CARDS_REVIEWED': {
        const n = Math.max(1, Math.round(event.count ?? 1));
        grants.push({ amount: n, reason: 'cards' });
        completedQuests.push(...(await this.advanceQuests(userId, 'STUDY_CARDS', n)));
        break;
      }
      case 'ACTIVITY':
        break;
    }
    for (const g of grants) {
      await this.awardXpNoQuest(userId, g.amount, g.reason);
    }
    const eventXp = grants.reduce((s, g) => s + g.amount, 0);
    if (eventXp > 0) completedQuests.push(...(await this.advanceQuests(userId, 'EARN_XP', eventXp)));

    // 3) achievements (may award more XP)
    const newAchievements = await this.checkAchievements(userId);

    const after = await this.prisma.user.findUnique({ where: { id: userId }, select: { xp: true, level: true, streak: true } });
    const level = after?.level ?? startLevel;
    const xp = after?.xp ?? startXp;
    const levelUp = level > startLevel;
    if (levelUp) {
      await this.notifications.notify(userId, {
        type: 'LEVEL_UP',
        title: `Təbriklər! ${level}-ci səviyyəyə yüksəldiniz`,
        body: `Ümumi XP: ${xp}. Zirvəyə doğru irəliləyirsiniz!`,
        link: '/profile',
      });
    }
    return {
      xpGained: xp - startXp,
      levelUp,
      level,
      xp,
      streak: after?.streak ?? streak,
      newAchievements,
      completedQuests,
    };
  }

  /** XP grant without quest side effects / notifications (used inside onEvent). */
  private async awardXpNoQuest(userId: string, amount: number, reason: string): Promise<void> {
    if (!amount) return;
    const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { xp: true } });
    if (!u) return;
    const xp = Math.max(0, u.xp + Math.round(amount));
    await this.prisma.$transaction([
      this.prisma.xpEvent.create({ data: { userId, amount: Math.round(amount), reason } }),
      this.prisma.user.update({ where: { id: userId }, data: { xp, level: levelForXp(xp) } }),
    ]);
  }

  /** Increment progress of active quests of `type` for the current period. Returns newly completed quests. */
  async advanceQuests(userId: string, type: QuestType, inc: number): Promise<Quest[]> {
    if (inc <= 0) return [];
    const quests = await this.prisma.quest.findMany({ where: { active: true, type } });
    const completed: Quest[] = [];
    for (const q of quests) {
      const periodKey = periodKeyFor(q.period);
      const existing = await this.prisma.userQuest.findUnique({
        where: { userId_questId_periodKey: { userId, questId: q.id, periodKey } },
      });
      if (existing?.completedAt) continue;
      const progress = Math.min(q.target, (existing?.progress ?? 0) + inc);
      const done = progress >= q.target;
      await this.prisma.userQuest.upsert({
        where: { userId_questId_periodKey: { userId, questId: q.id, periodKey } },
        create: { userId, questId: q.id, periodKey, progress, completedAt: done ? new Date() : null },
        update: { progress, completedAt: done ? new Date() : null },
      });
      if (done) {
        completed.push(q);
        await this.notifications.notify(userId, {
          type: 'QUEST',
          title: `Tapşırıq tamamlandı: ${q.title}`,
          body: `${q.xpReward} XP mükafatını götürməyi unutmayın!`,
          link: '/dashboard',
        });
      }
    }
    return completed;
  }

  /** Evaluate all not-yet-unlocked achievements; unlock + reward the satisfied ones. */
  async checkAchievements(userId: string): Promise<Achievement[]> {
    const unlocked: Achievement[] = [];
    // two passes: XP rewards from the first pass can satisfy xp/level rules
    for (let pass = 0; pass < 2; pass++) {
      const candidates = await this.prisma.achievement.findMany({
        where: { users: { none: { userId } } },
      });
      if (candidates.length === 0) break;
      const stats = new StatsCache(this.prisma, userId);
      let any = false;
      for (const a of candidates) {
        let ok = false;
        try {
          ok = await this.ruleSatisfied(a.rule as unknown as AchievementRule, stats);
        } catch (e) {
          this.logger.warn(`Bad achievement rule ${a.code}: ${(e as Error).message}`);
        }
        if (!ok) continue;
        try {
          await this.prisma.userAchievement.create({ data: { userId, achievementId: a.id } });
        } catch {
          continue; // race: already unlocked
        }
        any = true;
        unlocked.push(a);
        if (a.xpReward > 0) await this.awardXpNoQuest(userId, a.xpReward, `achievement:${a.code}`);
        await this.notifications.notify(userId, {
          type: 'ACHIEVEMENT',
          title: `Yeni nailiyyət: ${a.title}`,
          body: a.description,
          link: '/profile',
        });
      }
      if (!any) break;
    }
    return unlocked;
  }

  private async ruleSatisfied(rule: AchievementRule | null | undefined, s: StatsCache): Promise<boolean> {
    if (!rule || typeof rule !== 'object' || !('type' in rule)) return false;
    switch (rule.type) {
      case 'quizzes':
        return (await s.quizzes()) >= rule.count;
      case 'passed':
        return (await s.passed()) >= rule.count;
      case 'perfect':
        return (await s.perfect()) >= rule.count;
      case 'practice':
        return (await s.practice()) >= rule.count;
      case 'streak':
        return (await s.user()).streak >= rule.days;
      case 'xp':
        return (await s.user()).xp >= rule.amount;
      case 'level':
        return (await s.user()).level >= rule.level;
      case 'articles':
        return (await s.articles()) >= rule.count;
      case 'courses':
        return (await s.courses()) >= rule.count;
      case 'cards':
        return (await s.cards()) >= rule.count;
      default:
        return false;
    }
  }
}

/** Lazily computed per-user counters for achievement evaluation. */
class StatsCache {
  private cache = new Map<string, Promise<unknown>>();
  constructor(
    private readonly prisma: PrismaService,
    private readonly userId: string,
  ) {}

  private memo<T>(key: string, fn: () => Promise<T>): Promise<T> {
    if (!this.cache.has(key)) this.cache.set(key, fn());
    return this.cache.get(key) as Promise<T>;
  }

  private finished = { in: ['SUBMITTED', 'GRADED', 'PENDING_REVIEW'] as ('SUBMITTED' | 'GRADED' | 'PENDING_REVIEW')[] };

  user() {
    return this.memo('user', async () => {
      const u = await this.prisma.user.findUnique({ where: { id: this.userId }, select: { xp: true, level: true, streak: true } });
      return u ?? { xp: 0, level: 1, streak: 0 };
    });
  }
  quizzes() {
    return this.memo('quizzes', () => this.prisma.attempt.count({ where: { userId: this.userId, status: this.finished } }));
  }
  passed() {
    return this.memo('passed', () => this.prisma.attempt.count({ where: { userId: this.userId, status: this.finished, passed: true } }));
  }
  perfect() {
    return this.memo('perfect', () =>
      this.prisma.attempt.count({ where: { userId: this.userId, status: this.finished, percent: { gte: 100 } } }),
    );
  }
  practice() {
    return this.memo('practice', () =>
      this.prisma.attempt.count({ where: { userId: this.userId, status: this.finished, mode: 'PRACTICE' } }),
    );
  }
  articles() {
    return this.memo('articles', () =>
      this.prisma.articleProgress.count({ where: { userId: this.userId, completedAt: { not: null } } }),
    );
  }
  courses() {
    return this.memo('courses', () => this.prisma.courseCompletion.count({ where: { userId: this.userId } }));
  }
  cards() {
    return this.memo('cards', () => this.prisma.flashcardReview.count({ where: { userId: this.userId } }));
  }
}
