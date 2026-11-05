import { Injectable, NotFoundException } from '@nestjs/common';
import { AttemptStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { dayKey, round } from '../../common/utils';
import { PracticeService } from '../practice/practice.service';
import type { QuestionResult } from '../quizzes/question-engine';
import { FINISHED_STATUSES, SMART_PRACTICE_TAG } from '../quizzes/quizzes.service';

const DAY = 86400000;
const FINISHED = [...FINISHED_STATUSES] as AttemptStatus[];
/** Attempts whose percent is final (PENDING_REVIEW percent is provisional → excluded from averages). */
const SCORED: AttemptStatus[] = ['SUBMITTED', 'GRADED'];
const userSelect = { id: true, name: true, avatarUrl: true } as const;

type Results = Record<string, QuestionResult>;
interface AttemptRow {
  id: string;
  quizId: string;
  userId: string;
  status: AttemptStatus;
  percent: number;
  passed: boolean;
  timeSpentSec: number;
  submittedAt: Date | null;
  createdAt: Date;
}

const avg = (xs: number[]) => (xs.length ? round(xs.reduce((s, x) => s + x, 0) / xs.length, 1) : 0);
const at = (a: { submittedAt: Date | null; createdAt: Date }) => a.submittedAt ?? a.createdAt;
const isScored = (a: { status: AttemptStatus }) => SCORED.includes(a.status);

/** Zero-filled `{date,count}` series (Baku days), oldest first. */
function byDay(dates: Date[], days: number) {
  const counts = new Map<string, number>();
  for (const d of dates) counts.set(dayKey(d), (counts.get(dayKey(d)) ?? 0) + 1);
  const out: { date: string; count: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const key = dayKey(new Date(Date.now() - i * DAY));
    out.push({ date: key, count: counts.get(key) ?? 0 });
  }
  return out;
}

/** Aggregate a list of attempts: count + average of scored percents + pass rate (0-1). */
function aggregate(list: AttemptRow[]) {
  const scored = list.filter(isScored);
  return {
    attempts: list.length,
    avgPercent: avg(scored.map((a) => a.percent)),
    passRate: scored.length ? round(scored.filter((a) => a.passed).length / scored.length, 3) : 0,
  };
}

/** Per-quiz averages for a set of attempts, most-attempted first. */
function perQuiz(list: AttemptRow[], titles: Map<string, string>) {
  const groups = new Map<string, AttemptRow[]>();
  for (const a of list) groups.set(a.quizId, [...(groups.get(a.quizId) ?? []), a]);
  return [...groups.entries()]
    .map(([quizId, rows]) => {
      const sorted = [...rows].sort((x, y) => at(x).getTime() - at(y).getTime());
      const scored = sorted.filter(isScored);
      return {
        quiz: { id: quizId, title: titles.get(quizId) ?? '—' },
        ...aggregate(rows),
        students: new Set(rows.map((r) => r.userId)).size,
        best: scored.length ? Math.max(...scored.map((a) => a.percent)) : 0,
        last: sorted[sorted.length - 1].percent,
        lastAt: at(sorted[sorted.length - 1]),
      };
    })
    .sort((x, y) => y.attempts - x.attempts || y.lastAt.getTime() - x.lastAt.getTime());
}

@Injectable()
export class StatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly practice: PracticeService,
  ) {}

  private attemptRows(where: Prisma.AttemptWhereInput): Promise<AttemptRow[]> {
    return this.prisma.attempt.findMany({
      where: { status: { in: FINISHED }, ...where },
      select: {
        id: true,
        quizId: true,
        userId: true,
        status: true,
        percent: true,
        passed: true,
        timeSpentSec: true,
        submittedAt: true,
        createdAt: true,
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  private async quizTitles(ids: string[]) {
    const quizzes = await this.prisma.quiz.findMany({ where: { id: { in: [...new Set(ids)] } }, select: { id: true, title: true } });
    return new Map(quizzes.map((q) => [q.id, q.title]));
  }

  private recent(where: Prisma.AttemptWhereInput, take = 10) {
    return this.prisma.attempt.findMany({
      where: { status: { in: FINISHED }, ...where },
      orderBy: { submittedAt: 'desc' },
      take,
      select: {
        id: true,
        mode: true,
        status: true,
        score: true,
        maxScore: true,
        percent: true,
        passed: true,
        timeSpentSec: true,
        submittedAt: true,
        user: { select: userSelect },
        quiz: { select: { id: true, title: true } },
      },
    });
  }

  // ───────────────────────────── overview ─────────────────────────────

  async overview() {
    const since30 = new Date(Date.now() - 30 * DAY);
    const notSmart: Prisma.QuizWhereInput = { NOT: { tags: { has: SMART_PRACTICE_TAG } } };
    const [users, activeUsers7d, quizzes, attempts, avgAgg, last30, top, recentAttempts] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { lastActiveAt: { gte: new Date(Date.now() - 7 * DAY) } } }),
      this.prisma.quiz.count({ where: notSmart }),
      this.prisma.attempt.count({ where: { status: { in: FINISHED } } }),
      this.prisma.attempt.aggregate({ where: { status: { in: SCORED } }, _avg: { percent: true } }),
      this.prisma.attempt.findMany({
        where: { status: { in: FINISHED }, submittedAt: { gte: since30 } },
        select: { submittedAt: true },
      }),
      this.prisma.attempt.groupBy({
        by: ['quizId'],
        where: { status: { in: FINISHED }, quiz: notSmart },
        _count: { _all: true },
        orderBy: { _count: { quizId: 'desc' } },
        take: 5,
      }),
      this.recent({}),
    ]);

    const topIds = top.map((t) => t.quizId);
    const [titles, topAvg] = await Promise.all([
      this.quizTitles(topIds),
      this.prisma.attempt.groupBy({
        by: ['quizId'],
        where: { quizId: { in: topIds }, status: { in: SCORED } },
        _avg: { percent: true },
      }),
    ]);
    const avgMap = new Map(topAvg.map((t) => [t.quizId, t._avg.percent ?? 0]));

    return {
      users,
      activeUsers7d,
      quizzes,
      attempts,
      avgPercent: round(avgAgg._avg.percent ?? 0, 1),
      attemptsByDay: byDay(
        last30.map((a) => a.submittedAt!),
        30,
      ),
      topQuizzes: top.map((t) => ({
        id: t.quizId,
        title: titles.get(t.quizId) ?? '—',
        attempts: t._count._all,
        avgPercent: round(avgMap.get(t.quizId) ?? 0, 1),
      })),
      recentAttempts,
    };
  }

  // ───────────────────────────── quiz ─────────────────────────────

  async quiz(id: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        passPercent: true,
        questions: { orderBy: { order: 'asc' }, select: { id: true, text: true, type: true, points: true, tags: true } },
      },
    });
    if (!quiz) throw new NotFoundException('Test tapılmadı');

    const rows = await this.prisma.attempt.findMany({
      where: { quizId: id, status: { in: FINISHED } },
      select: {
        id: true,
        userId: true,
        status: true,
        percent: true,
        passed: true,
        timeSpentSec: true,
        submittedAt: true,
        createdAt: true,
        result: true,
        user: { select: userSelect },
      },
      orderBy: { submittedAt: 'asc' },
    });
    const scored = rows.filter(isScored);

    // distribution of scored percents in 10 buckets (100 lands in 90-100)
    const distribution = Array.from({ length: 10 }, (_, i) => ({ bucket: `${i * 10}-${i * 10 + 10}`, count: 0 }));
    for (const a of scored) distribution[Math.min(9, Math.max(0, Math.floor(a.percent / 10)))].count++;

    // discrimination: upper 27% vs lower 27% (by attempt percent) mean score ratio on the item
    const ranked = [...scored].sort((x, y) => y.percent - x.percent);
    const k = ranked.length >= 4 ? Math.max(1, Math.round(ranked.length * 0.27)) : 0;
    const upper = ranked.slice(0, k);
    const lower = k ? ranked.slice(-k) : [];
    const ratio = (a: (typeof rows)[number], qid: string) => {
      const r = (a.result as unknown as Results | null)?.[qid];
      return r && r.max > 0 ? r.points / r.max : 0;
    };

    const questions = quiz.questions.map((q) => {
      const entries = scored
        .map((a) => (a.result as unknown as Results | null)?.[q.id])
        .filter((r): r is QuestionResult => !!r && r.correct !== null);
      const discrimination = k
        ? round(
            upper.reduce((s, a) => s + ratio(a, q.id), 0) / k - lower.reduce((s, a) => s + ratio(a, q.id), 0) / k,
            2,
          )
        : null;
      return {
        id: q.id,
        text: q.text,
        type: q.type,
        tags: q.tags,
        answered: entries.length,
        correctRate: entries.length ? round(entries.filter((r) => r.correct).length / entries.length, 3) : 0,
        avgPoints: entries.length ? round(entries.reduce((s, r) => s + r.points, 0) / entries.length, 2) : 0,
        maxPoints: q.points,
        discrimination,
      };
    });

    // per student
    const perUser = new Map<string, typeof rows>();
    for (const a of rows) perUser.set(a.userId, [...(perUser.get(a.userId) ?? []), a]);
    const byUser = [...perUser.values()]
      .map((list) => {
        const s = list.filter(isScored);
        const last = list[list.length - 1];
        return {
          user: { id: last.user.id, name: last.user.name, avatarUrl: last.user.avatarUrl },
          attempts: list.length,
          best: s.length ? Math.max(...s.map((a) => a.percent)) : 0,
          last: last.percent,
          lastStatus: last.status,
          lastAt: at(last),
          avgTimeSec: Math.round(avg(list.map((a) => a.timeSpentSec))),
        };
      })
      .sort((x, y) => y.best - x.best || x.user.name.localeCompare(y.user.name));

    return {
      quiz: { id: quiz.id, title: quiz.title, passPercent: quiz.passPercent },
      attempts: rows.length,
      pendingReview: rows.filter((a) => a.status === 'PENDING_REVIEW').length,
      avgPercent: avg(scored.map((a) => a.percent)),
      passRate: scored.length ? round(scored.filter((a) => a.passed).length / scored.length, 3) : 0,
      avgTimeSec: Math.round(avg(rows.map((a) => a.timeSpentSec))),
      distribution,
      questions,
      byUser,
    };
  }

  // ───────────────────────────── student ─────────────────────────────

  async student(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        role: true,
        xp: true,
        level: true,
        streak: true,
        lastActiveAt: true,
        createdAt: true,
        memberships: { select: { group: { select: { id: true, name: true, color: true } } } },
      },
    });
    if (!user) throw new NotFoundException('İstifadəçi tapılmadı');
    const { memberships, ...profile } = user;

    const rows = await this.attemptRows({ userId: id });
    const since30 = Date.now() - 30 * DAY;
    const [titles, recentAttempts, weakTopics, counters] = await Promise.all([
      this.quizTitles(rows.map((r) => r.quizId)),
      this.recent({ userId: id }),
      this.practice.weakTopics(id, { limit: 8 }),
      Promise.all([
        this.prisma.articleProgress.count({ where: { userId: id, completedAt: { not: null } } }),
        this.prisma.courseCompletion.count({ where: { userId: id } }),
        this.prisma.userAchievement.count({ where: { userId: id } }),
      ]),
    ]);
    const scored = rows.filter(isScored);

    return {
      user: profile,
      groups: memberships.map((m) => m.group),
      ...aggregate(rows),
      bestPercent: scored.length ? Math.max(...scored.map((a) => a.percent)) : 0,
      totalTimeSec: rows.reduce((s, a) => s + a.timeSpentSec, 0),
      articlesRead: counters[0],
      coursesCompleted: counters[1],
      achievements: counters[2],
      attemptsByDay: byDay(
        rows.map(at).filter((d) => d.getTime() >= since30),
        30,
      ),
      quizzes: perQuiz(rows, titles),
      weakTopics,
      recentAttempts,
    };
  }

  // ───────────────────────────── group ─────────────────────────────

  async group(id: string) {
    const group = await this.prisma.group.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        color: true,
        teacher: { select: { id: true, name: true } },
        members: {
          select: {
            joinedAt: true,
            user: { select: { ...userSelect, email: true, xp: true, level: true, streak: true, lastActiveAt: true } },
          },
        },
      },
    });
    if (!group) throw new NotFoundException('Qrup tapılmadı');
    const { members: rawMembers, ...info } = group;
    const memberIds = rawMembers.map((m) => m.user.id);

    const rows = memberIds.length ? await this.attemptRows({ userId: { in: memberIds } }) : [];
    const since30 = Date.now() - 30 * DAY;
    const [titles, weakTopics, recentAttempts] = await Promise.all([
      this.quizTitles(rows.map((r) => r.quizId)),
      this.practice.weakTopics(memberIds, { limit: 8, minTotal: 2 }),
      memberIds.length ? this.recent({ userId: { in: memberIds } }) : Promise.resolve([]),
    ]);

    const byMember = new Map<string, AttemptRow[]>();
    for (const a of rows) byMember.set(a.userId, [...(byMember.get(a.userId) ?? []), a]);

    const members = rawMembers
      .map(({ user: u, joinedAt }) => {
        const list = byMember.get(u.id) ?? [];
        return {
          user: { id: u.id, name: u.name, avatarUrl: u.avatarUrl, email: u.email, level: u.level },
          xp: u.xp,
          level: u.level,
          streak: u.streak,
          lastActiveAt: u.lastActiveAt,
          joinedAt,
          ...aggregate(list),
          lastAttemptAt: list.length ? at(list[0]) : null,
        };
      })
      .sort((x, y) => y.xp - x.xp);

    return {
      group: { ...info, memberCount: members.length },
      ...aggregate(rows),
      members,
      attemptsByDay: byDay(
        rows.map(at).filter((d) => d.getTime() >= since30),
        30,
      ),
      quizzes: perQuiz(rows, titles),
      weakTopics,
      recentAttempts,
    };
  }
}
