/**
 * Community feature types — mirror SPEC §2/§3 response shapes but stay local so
 * the feature tolerates small API drifts. Everything optional that the contract
 * does not strictly guarantee is typed optional and normalised in `lib/normalize.ts`.
 */

export type Role = 'STUDENT' | 'TEACHER' | 'ADMIN';
export type ContentType = 'QUIZ' | 'ARTICLE' | 'COURSE' | 'PATH' | 'DECK';
export type Visibility = 'PUBLIC' | 'PRIVATE' | 'GROUPS' | 'PASSCODE';
export type QuestType = 'COMPLETE_QUIZZES' | 'READ_ARTICLES' | 'STUDY_CARDS' | 'PERFECT_SCORE' | 'EARN_XP';
export type QuestPeriod = 'DAILY' | 'WEEKLY' | 'ONCE';
export type CommentTarget = 'ARTICLE' | 'ATTEMPT' | 'GROUP' | 'COURSE';
export type AttemptStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'PENDING_REVIEW' | 'GRADED';
export type LeaderboardPeriod = 'week' | 'month' | 'all';

export interface UserRef {
  id: string;
  name: string;
  avatarUrl?: string | null;
  level?: number;
  role?: Role;
  xp?: number;
}

export interface UserLite extends UserRef {
  email?: string;
  bio?: string | null;
  role: Role;
  xp: number;
  level: number;
  streak?: number;
  lastActiveAt?: string | null;
  createdAt?: string;
}

export interface WeakTopic {
  tag: string;
  accuracy: number; // 0-1 or 0-100 (normalised by `pct()`)
  total: number;
}

export interface ActivityDay {
  date: string; // YYYY-MM-DD
  count: number;
}

export interface SummaryAttempt {
  id: string;
  quizId: string;
  mode?: 'EXAM' | 'PRACTICE';
  status: AttemptStatus;
  score: number;
  maxScore: number;
  percent: number;
  passed: boolean;
  timeSpentSec?: number;
  submittedAt?: string | null;
  startedAt?: string;
  createdAt?: string;
  quiz: { id: string; title: string };
}

export interface MeSummary {
  xp: number;
  level: number;
  levelProgress: number;
  nextLevelXp: number;
  streak: number;
  rank: number | null;
  quizzesTaken: number;
  avgPercent: number;
  articlesRead: number;
  coursesCompleted: number;
  cardsDue: number;
  recentAttempts: SummaryAttempt[];
  weakTopics: WeakTopic[];
  activity: ActivityDay[];
  /** Optional extension — not in SPEC §3 but rendered when present. */
  xpHistory?: { date: string; amount: number; reason?: string }[];
}

export interface Achievement {
  id: string;
  code: string;
  title: string;
  description: string;
  icon: string;
  xpReward: number;
  rule?: unknown;
  unlockedAt?: string | null;
}

/** Normalised quest view used by the UI. */
export interface QuestView {
  id: string;
  title: string;
  description?: string | null;
  type: QuestType;
  target: number;
  xpReward: number;
  period: QuestPeriod;
  progress: number;
  completedAt: string | null;
  claimedAt: string | null;
}

export interface LeaderboardEntry {
  rank: number;
  user: { id: string; name: string; avatarUrl?: string | null; level: number };
  xp: number;
}

export interface ContentSummary {
  id: string;
  title?: string;
  slug?: string;
  type?: ContentType;
  coverColor?: string | null;
  coverUrl?: string | null;
}

export interface Assignment {
  id: string;
  contentType: ContentType;
  contentId: string;
  title: string;
  groupId?: string | null;
  userId?: string | null;
  dueAt?: string | null;
  assignedById?: string;
  createdAt?: string;
  done?: boolean;
  content?: ContentSummary | null;
  group?: { id: string; name: string; color?: string | null } | null;
  assignedBy?: UserRef | null;
}

export interface GroupMember {
  userId: string;
  joinedAt?: string;
  user: UserRef & { email?: string; xp?: number; level?: number };
}

export interface Group {
  id: string;
  name: string;
  description?: string | null;
  color?: string | null;
  teacherId: string;
  teacher?: UserRef | null;
  createdAt?: string;
  members?: GroupMember[];
  memberCount?: number;
  assignments?: Assignment[];
  _count?: { members?: number; assignments?: number };
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
  readAt?: string | null;
  createdAt: string;
}

export interface CommentNode {
  id: string;
  userId: string;
  targetType: CommentTarget;
  targetId: string;
  parentId?: string | null;
  body: string;
  createdAt: string;
  user: UserRef;
  replies?: CommentNode[];
  children?: CommentNode[];
}

export interface PublicProfile {
  user: UserLite;
  achievements: Achievement[];
  stats: {
    quizzesTaken?: number;
    avgPercent?: number;
    articlesRead?: number;
    coursesCompleted?: number;
    rank?: number | null;
    [k: string]: unknown;
  };
}

export interface CourseLite {
  id: string;
  title: string;
  description?: string | null;
  coverUrl?: string | null;
  category?: string | null;
  progress?: number; // 0-1
  updatedAt?: string;
}

export interface ArticleLite {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  coverUrl?: string | null;
  category?: string | null;
  readingMinutes?: number;
  myProgress?: number | { progress: number; completedAt?: string | null } | null;
  authorId?: string;
  author?: UserRef;
  status?: string;
  updatedAt?: string;
  createdAt?: string;
}

export interface QuizLite {
  id: string;
  title: string;
  category?: string | null;
  coverColor?: string | null;
  status?: string;
  questionCount?: number;
  attemptsCount?: number;
  authorId?: string;
  author?: UserRef;
  updatedAt?: string;
  createdAt?: string;
}

export interface ContentLite {
  id: string;
  title: string;
  status?: string;
  authorId?: string;
  updatedAt?: string;
  createdAt?: string;
}
