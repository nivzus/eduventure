import type {
  AdminAttempt,
  AdminUser,
  GroupStatsData,
  GroupStatsView,
  OverviewView,
  QuizStatsData,
  QuizStatsUserRow,
  QuizStatsView,
  StatsOverviewData,
} from '../types';
import { distributionFrom } from './analysis';

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() !== '' && Number.isFinite(+v) ? +v : null);
const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

/** Rates may arrive as 0–1 or 0–100; always return 0–1. */
export const toRatio = (v: unknown): number | null => {
  const n = num(v);
  if (n == null) return null;
  return n > 1 ? n / 100 : n;
};
/** Percents may arrive as 0–1 (rare) or 0–100; always return 0–100. */
export const toPercent = (v: unknown): number | null => {
  const n = num(v);
  if (n == null) return null;
  return n;
};

export const isScored = (a: AdminAttempt) => a.status === 'GRADED' || a.status === 'SUBMITTED';
const mean = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);
const when = (a: AdminAttempt) => a.submittedAt ?? a.createdAt ?? a.startedAt ?? null;

export function dayKey(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function attemptsByDay(attempts: AdminAttempt[], days = 14) {
  const counts = new Map<string, number>();
  attempts.filter(isScored).forEach((a) => {
    const t = when(a);
    if (!t) return;
    const k = dayKey(new Date(t));
    counts.set(k, (counts.get(k) ?? 0) + 1);
  });
  const out: { date: string; count: number }[] = [];
  const d = new Date();
  d.setDate(d.getDate() - (days - 1));
  for (let i = 0; i < days; i++) {
    const k = dayKey(d);
    out.push({ date: k, count: counts.get(k) ?? 0 });
    d.setDate(d.getDate() + 1);
  }
  return out;
}

/** Per-user aggregate rows from attempts. */
export function byUserFrom(attempts: AdminAttempt[]): QuizStatsUserRow[] {
  const m = new Map<string, AdminAttempt[]>();
  attempts.filter(isScored).forEach((a) => m.set(a.userId, [...(m.get(a.userId) ?? []), a]));
  return [...m.entries()]
    .map(([userId, list]) => {
      const ps = list.map((a) => a.percent ?? 0);
      const last = list.map(when).filter(Boolean).sort().pop() ?? null;
      return {
        userId,
        name: list[0].user?.name ?? 'İstifadəçi',
        avatarUrl: list[0].user?.avatarUrl ?? null,
        attempts: list.length,
        bestPercent: ps.length ? Math.max(...ps) : null,
        avgPercent: mean(ps),
        lastAt: last,
      };
    })
    .sort((a, b) => (b.bestPercent ?? 0) - (a.bestPercent ?? 0));
}

/* ─────────── overview ─────────── */

export function normalizeOverview(raw: Partial<StatsOverviewData> | null | undefined): OverviewView {
  const r = (raw ?? {}) as Obj;
  return {
    users: num(r.users ?? r.usersCount ?? r.totalUsers),
    activeUsers7d: num(r.activeUsers7d ?? r.activeUsers ?? r.active7d),
    quizzes: num(r.quizzes ?? r.quizzesCount),
    attempts: num(r.attempts ?? r.attemptsCount),
    avgPercent: toPercent(r.avgPercent ?? r.averagePercent),
    attemptsByDay: arr<Obj>(r.attemptsByDay)
      .map((d) => ({ date: String(d.date ?? d.day ?? ''), count: num(d.count ?? d.attempts) ?? 0 }))
      .filter((d) => d.date),
    topQuizzes: arr<Obj>(r.topQuizzes).map((q) => {
      const quiz = isObj(q.quiz) ? q.quiz : {};
      return {
        id: String(q.id ?? q.quizId ?? quiz.id ?? ''),
        title: String(q.title ?? quiz.title ?? 'Test'),
        attempts: num(q.attempts ?? q.attemptsCount ?? q.count ?? (isObj(q._count) ? q._count.attempts : null)) ?? 0,
        avgPercent: toPercent(q.avgPercent),
      };
    }),
    recentAttempts: arr<AdminAttempt>(r.recentAttempts),
    pendingReview: num(r.pendingReview) ?? undefined,
  };
}

export function overviewFrom(input: { users?: AdminUser[] | null; quizzes?: { id: string; title: string }[] | null; attempts: AdminAttempt[] }): OverviewView {
  const scored = input.attempts.filter(isScored);
  const weekAgo = Date.now() - 7 * 864e5;
  const byQuiz = new Map<string, AdminAttempt[]>();
  scored.forEach((a) => byQuiz.set(a.quizId, [...(byQuiz.get(a.quizId) ?? []), a]));
  const titles = new Map((input.quizzes ?? []).map((q) => [q.id, q.title]));
  const activeIds = new Set(scored.filter((a) => +new Date(when(a) ?? 0) >= weekAgo).map((a) => a.userId));
  input.users?.forEach((u) => u.lastActiveAt && +new Date(u.lastActiveAt) >= weekAgo && activeIds.add(u.id));
  return {
    users: input.users ? input.users.length : null,
    activeUsers7d: activeIds.size,
    quizzes: input.quizzes ? input.quizzes.length : byQuiz.size,
    attempts: scored.length,
    avgPercent: mean(scored.map((a) => a.percent ?? 0)),
    attemptsByDay: attemptsByDay(scored, 14),
    topQuizzes: [...byQuiz.entries()]
      .map(([id, list]) => ({ id, title: titles.get(id) ?? list[0].quiz?.title ?? 'Test', attempts: list.length, avgPercent: mean(list.map((a) => a.percent ?? 0)) }))
      .sort((a, b) => b.attempts - a.attempts)
      .slice(0, 6),
    recentAttempts: [...scored].sort((a, b) => +new Date(when(b) ?? 0) - +new Date(when(a) ?? 0)).slice(0, 8),
    pendingReview: input.attempts.filter((a) => a.status === 'PENDING_REVIEW').length,
    derived: true,
  };
}

/* ─────────── quiz stats ─────────── */

function bucketLabel(b: unknown, i: number, n: number): string {
  if (typeof b === 'string') return b.replace(/%/g, '').replace('-', '–');
  const v = num(b);
  if (v == null) return String(i);
  // index-style buckets (0..9) vs start-of-range (0,10,…,90)
  const step = n === 10 && v < 10 ? 10 : 100 / Math.max(1, n);
  const from = n === 10 && v < 10 ? v * 10 : v;
  return `${Math.round(from)}–${Math.round(Math.min(100, from + step))}`;
}

function normalizeUserRow(u: Obj): QuizStatsUserRow {
  const user = isObj(u.user) ? u.user : {};
  return {
    userId: String(u.userId ?? user.id ?? u.id ?? ''),
    name: String(user.name ?? u.name ?? 'İstifadəçi'),
    avatarUrl: (user.avatarUrl ?? u.avatarUrl ?? null) as string | null,
    attempts: num(u.attempts ?? u.attemptsCount ?? u.count) ?? 0,
    bestPercent: toPercent(u.bestPercent ?? u.best ?? u.maxPercent),
    avgPercent: toPercent(u.avgPercent ?? u.avg),
    lastAt: (u.lastAt ?? u.last ?? u.lastAttemptAt ?? u.submittedAt ?? null) as string | null,
  };
}

export function normalizeQuizStats(raw: QuizStatsData | Obj): QuizStatsView {
  const r = raw as Obj;
  const quiz = (isObj(r.quiz) ? r.quiz : {}) as Obj;
  const dist = arr<Obj>(r.distribution);
  return {
    quiz: { id: String(quiz.id ?? ''), title: String(quiz.title ?? 'Test'), passPercent: num(quiz.passPercent) ?? undefined, category: (quiz.category as string) ?? null },
    attempts: num(r.attempts ?? r.attemptsCount) ?? 0,
    avgPercent: toPercent(r.avgPercent),
    passRate: toRatio(r.passRate),
    avgTimeSec: num(r.avgTimeSec ?? r.avgTime),
    distribution: dist.map((d, i) => ({ label: bucketLabel(d.bucket ?? d.range ?? d.from, i, dist.length), count: num(d.count) ?? 0 })),
    questions: arr<Obj>(r.questions).map((q, i) => ({
      id: String(q.id ?? q.questionId ?? i),
      text: String(q.text ?? q.prompt ?? `Sual ${i + 1}`),
      type: String(q.type ?? ''),
      correctRate: toRatio(q.correctRate ?? q.rate),
      avgPoints: num(q.avgPoints),
      maxPoints: num(q.maxPoints ?? q.points) ?? undefined,
    })),
    byUser: arr<Obj>(r.byUser).map(normalizeUserRow),
  };
}

export function quizStatsFrom(
  quiz: { id: string; title: string; passPercent?: number; category?: string | null; questions?: { id: string; text: string; type: string; points?: number }[] },
  attempts: AdminAttempt[],
): QuizStatsView {
  const scored = attempts.filter(isScored);
  const ps = scored.map((a) => a.percent ?? 0);
  const t = scored.map((a) => a.timeSpentSec).filter((v) => v > 0);
  return {
    quiz: { id: quiz.id, title: quiz.title, passPercent: quiz.passPercent, category: quiz.category },
    attempts: scored.length,
    avgPercent: mean(ps),
    passRate: scored.length ? scored.filter((a) => a.passed).length / scored.length : null,
    avgTimeSec: mean(t),
    distribution: distributionFrom(scored).map((d) => ({ label: d.bucket.replace('-', '–'), count: d.count })),
    questions: (quiz.questions ?? []).map((q) => {
      const rs = scored.map((a) => a.result?.[q.id]).filter((x): x is NonNullable<typeof x> => !!x);
      const graded = rs.filter((x) => x.correct !== null && x.correct !== undefined);
      return {
        id: q.id,
        text: q.text,
        type: q.type,
        correctRate: graded.length ? graded.filter((x) => x.correct).length / graded.length : null,
        avgPoints: mean(rs.map((x) => x.points)),
        maxPoints: q.points,
      };
    }),
    byUser: byUserFrom(scored),
    derived: true,
  };
}

/* ─────────── group stats ─────────── */

export function normalizeGroupStats(raw: GroupStatsData | Obj): GroupStatsView {
  const r = raw as Obj;
  const rows = arr<Obj>(r.byUser ?? r.members ?? r.students).filter(isObj);
  return {
    members: num(r.memberCount ?? (typeof r.members === 'number' ? r.members : null)) ?? (Array.isArray(r.members) ? r.members.length : null),
    attempts: num(r.attempts ?? r.attemptsCount),
    avgPercent: toPercent(r.avgPercent),
    passRate: toRatio(r.passRate),
    completionRate: toRatio(r.completionRate ?? r.assignmentCompletion),
    byUser: rows.map(normalizeUserRow),
  };
}

export function groupStatsFrom(memberIds: string[], attempts: AdminAttempt[]): GroupStatsView {
  const ids = new Set(memberIds);
  const scored = attempts.filter((a) => isScored(a) && ids.has(a.userId));
  return {
    members: memberIds.length,
    attempts: scored.length,
    avgPercent: mean(scored.map((a) => a.percent ?? 0)),
    passRate: scored.length ? scored.filter((a) => a.passed).length / scored.length : null,
    completionRate: null,
    byUser: byUserFrom(scored),
    derived: true,
  };
}
