import type { ContentType, QuestPeriod, QuestType, Role, Visibility } from '@/lib/types';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  role: Role;
  xp: number;
  level: number;
  streak?: number;
  lastActiveAt?: string | null;
  createdAt?: string;
}

export interface AdminAttempt {
  id: string;
  quizId: string;
  userId: string;
  mode: 'EXAM' | 'PRACTICE';
  status: 'IN_PROGRESS' | 'SUBMITTED' | 'PENDING_REVIEW' | 'GRADED';
  score: number;
  maxScore: number;
  percent: number;
  passed: boolean;
  timeSpentSec: number;
  startedAt?: string;
  submittedAt?: string | null;
  createdAt?: string;
  result?: Record<string, { correct: boolean | null; points: number; max: number }> | null;
  quiz?: { id: string; title: string; passPercent?: number };
  user?: { id: string; name: string; avatarUrl?: string | null };
}

export interface StatsOverviewData {
  users: number;
  activeUsers7d: number;
  quizzes: number;
  attempts: number;
  avgPercent: number;
  attemptsByDay: { date: string; count: number }[];
  topQuizzes: { id: string; title: string; attempts?: number; attemptsCount?: number; count?: number; avgPercent?: number }[];
  recentAttempts: AdminAttempt[];
  /** optional extras some backends add */
  pendingReview?: number;
}

export interface QuizStatsData {
  quiz: { id: string; title: string; passPercent?: number; category?: string | null; description?: string | null };
  attempts: number;
  avgPercent: number;
  passRate: number;
  avgTimeSec: number;
  distribution: { bucket: string | number; count: number }[];
  questions: { id: string; text: string; type: string; correctRate: number; avgPoints: number; maxPoints?: number; points?: number; avgTimeSec?: number }[];
  byUser: {
    user?: { id: string; name: string; avatarUrl?: string | null };
    userId?: string;
    name?: string;
    attempts: number;
    best?: number;
    bestPercent?: number;
    avgPercent?: number;
    last?: string;
    lastAt?: string;
  }[];
}

export interface GroupStatsData {
  group?: { id: string; name: string };
  members?: number;
  memberCount?: number;
  attempts?: number;
  avgPercent?: number;
  passRate?: number;
  assignments?: number;
  completionRate?: number;
  byUser?: QuizStatsData['byUser'];
  members_?: unknown;
  [k: string]: unknown;
}

export interface PermissionRow {
  type: ContentType;
  id: string;
  title: string;
  status?: string;
  visibility: Visibility;
  passcode?: string | null;
  author?: { id: string; name: string };
  updatedAt?: string;
  link?: string;
  groupIds: string[];
  groups: { id: string; name: string; color?: string | null }[];
}

export interface AdminQuest {
  id: string;
  title: string;
  description?: string | null;
  type: QuestType;
  target: number;
  xpReward: number;
  period: QuestPeriod;
  active: boolean;
  createdAt?: string;
}

export interface AdminAchievement {
  id: string;
  code: string;
  title: string;
  description: string;
  icon: string;
  xpReward: number;
  rule?: unknown;
  createdAt?: string;
  _count?: { users?: number };
  unlockedCount?: number;
}

export interface PickableContent {
  id: string;
  title: string;
  type: ContentType;
  status?: string;
  slug?: string;
}
