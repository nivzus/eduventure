/* Domain types mirroring docs/SPEC.md §2 (Prisma) + §3 response shapes.
   Dates arrive as ISO strings over JSON. */

export type ID = string;
export type ISODate = string;

/* ── Enums ───────────────────────────────────────────────────── */
export type Role = 'STUDENT' | 'TEACHER' | 'ADMIN';
export type ContentStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type Visibility = 'PUBLIC' | 'PRIVATE' | 'GROUPS' | 'PASSCODE';
export type QuestionType = 'SINGLE' | 'MULTIPLE' | 'TEXT' | 'TRUE_FALSE' | 'ORDERING' | 'FILL_BLANKS' | 'OPEN';
export type AttemptMode = 'EXAM' | 'PRACTICE';
export type AttemptStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'PENDING_REVIEW' | 'GRADED';
export type ContentType = 'QUIZ' | 'ARTICLE' | 'COURSE' | 'PATH' | 'DECK';
export type CommentTarget = 'ARTICLE' | 'ATTEMPT' | 'GROUP' | 'COURSE';
export type CourseItemType = 'ARTICLE' | 'QUIZ' | 'DECK';
export type QuestType = 'COMPLETE_QUIZZES' | 'READ_ARTICLES' | 'STUDY_CARDS' | 'PERFECT_SCORE' | 'EARN_XP';
export type QuestPeriod = 'DAILY' | 'WEEKLY' | 'ONCE';
export type AnnotationColor = 'signal' | 'ember' | 'aurora' | 'glacier';

export const ROLES: Role[] = ['STUDENT', 'TEACHER', 'ADMIN'];
export const QUESTION_TYPES: QuestionType[] = ['SINGLE', 'MULTIPLE', 'TEXT', 'TRUE_FALSE', 'ORDERING', 'FILL_BLANKS', 'OPEN'];

/* Azerbaijani labels for enums (UI copy) */
export const ROLE_LABEL: Record<Role, string> = { STUDENT: 'Tələbə', TEACHER: 'Müəllim', ADMIN: 'Admin' };
export const STATUS_LABEL: Record<ContentStatus, string> = { DRAFT: 'Qaralama', PUBLISHED: 'Dərc edilib', ARCHIVED: 'Arxiv' };
export const VISIBILITY_LABEL: Record<Visibility, string> = {
  PUBLIC: 'Hamı üçün',
  PRIVATE: 'Gizli',
  GROUPS: 'Qruplar',
  PASSCODE: 'Şifrə ilə',
};
export const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  SINGLE: 'Tək seçim',
  MULTIPLE: 'Çox seçim',
  TEXT: 'Mətn cavabı',
  TRUE_FALSE: 'Doğru / Yanlış',
  ORDERING: 'Sıralama',
  FILL_BLANKS: 'Boşluq doldurma',
  OPEN: 'Açıq sual',
};
export const ATTEMPT_STATUS_LABEL: Record<AttemptStatus, string> = {
  IN_PROGRESS: 'Davam edir',
  SUBMITTED: 'Təqdim edilib',
  PENDING_REVIEW: 'Yoxlanılır',
  GRADED: 'Qiymətləndirilib',
};
export const CONTENT_TYPE_LABEL: Record<ContentType, string> = {
  QUIZ: 'Test',
  ARTICLE: 'Məqalə',
  COURSE: 'Kurs',
  PATH: 'Öyrənmə yolu',
  DECK: 'Kart dəsti',
};

/* ── Base ────────────────────────────────────────────────────── */
export interface Timestamps {
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface UserRef {
  id: ID;
  name: string;
  avatarUrl?: string | null;
  level?: number;
  role?: Role;
}

/* ── Users ───────────────────────────────────────────────────── */
export interface User extends Timestamps {
  id: ID;
  email: string;
  name: string;
  avatarUrl?: string | null;
  bio?: string | null;
  role: Role;
  xp: number;
  level: number;
  streak: number;
  lastActiveAt?: ISODate | null;
}

/* ── Quizzes ─────────────────────────────────────────────────── */
export type CorrectSingle = { index: number };
export type CorrectMultiple = { indices: number[] };
export type CorrectText = { answers: string[] };
export type CorrectTrueFalse = { value: boolean };
export type CorrectFillBlanks = { blanks: string[][] };
export type CorrectAnswer = CorrectSingle | CorrectMultiple | CorrectText | CorrectTrueFalse | CorrectFillBlanks | null;

/** User answer shapes per QuestionType */
export type AnswerSingle = number;
export type AnswerMultiple = number[];
export type AnswerText = string;
export type AnswerTrueFalse = boolean;
export type AnswerOrdering = string[];
export type AnswerFillBlanks = string[];
export type AnswerOpen = string;
export type AnswerValue = number | number[] | string | boolean | string[] | null;
export type AnswersMap = Record<ID, AnswerValue>;

export interface Question {
  id: ID;
  quizId: ID;
  order: number;
  type: QuestionType;
  text: string;
  imageUrl?: string | null;
  /** string[]; for ORDERING = items in correct order (shuffled for students) */
  options: string[];
  /** absent for students before submit */
  correct?: CorrectAnswer;
  explanation?: string | null;
  points: number;
  tags: string[];
  createdAt?: ISODate;
  updatedAt?: ISODate;
}

/** Question as delivered to a student while taking a quiz */
export type SanitizedQuestion = Omit<Question, 'correct' | 'explanation'> & {
  correct?: undefined;
  explanation?: undefined;
  /** FILL_BLANKS: number of blanks in text (if provided by API) */
  blanksCount?: number;
};

/** Question draft used in editors (POST/PATCH quiz body) */
export type QuestionInput = Omit<Question, 'id' | 'quizId' | 'createdAt' | 'updatedAt'> & { id?: ID };

export interface BankQuestion extends Timestamps {
  id: ID;
  type: QuestionType;
  text: string;
  imageUrl?: string | null;
  options: string[];
  correct: CorrectAnswer;
  explanation?: string | null;
  points: number;
  tags: string[];
  authorId: ID;
  difficulty: 1 | 2 | 3 | number;
}

export interface Quiz extends Timestamps {
  id: ID;
  title: string;
  description?: string | null;
  category?: string | null;
  tags: string[];
  coverColor?: string | null;
  status: ContentStatus;
  visibility: Visibility;
  passcode?: string | null;
  timeLimitSec?: number | null;
  passPercent: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showAnswers: boolean;
  maxAttempts?: number | null;
  authorId: ID;
  questions?: Question[];
}

/** GET /quizzes item */
export type QuizListItem = Quiz & {
  questionCount: number;
  author: { id: ID; name: string };
  myBest?: number | null;
  attemptsCount: number;
};

/** GET /quizzes/:id */
export type QuizDetail = Quiz & {
  questions: (Question | SanitizedQuestion)[];
  author: { id: ID; name: string; avatarUrl?: string | null };
  questionCount?: number;
  attemptsCount?: number;
  myBest?: number | null;
  locked?: boolean;
};

/* ── Attempts ────────────────────────────────────────────────── */
export interface QuestionResult {
  correct: boolean | null;
  points: number;
  max: number;
}

export interface Attempt {
  id: ID;
  quizId: ID;
  userId: ID;
  mode: AttemptMode;
  status: AttemptStatus;
  answers: AnswersMap;
  questionOrder: ID[];
  result?: Record<ID, QuestionResult> | null;
  score: number;
  maxScore: number;
  percent: number;
  passed: boolean;
  timeSpentSec: number;
  feedback?: string | null;
  startedAt: ISODate;
  submittedAt?: ISODate | null;
  createdAt?: ISODate;
  updatedAt?: ISODate;
}

export type AttemptWithQuiz = Attempt & {
  quiz: { id: ID; title: string; passPercent?: number; showAnswers?: boolean; timeLimitSec?: number | null };
  user?: UserRef;
};

/** POST /quizzes/:id/attempts and POST /practice/smart */
export interface StartAttemptResponse {
  attempt: Attempt;
  quiz: { id: ID; title: string; timeLimitSec?: number | null; showAnswers: boolean; mode: AttemptMode };
  questions: SanitizedQuestion[];
}

/** GET /attempts/:id */
export type AttemptDetail = Attempt & {
  quiz: Quiz;
  questions: Question[];
  user?: UserRef;
};

/** POST /attempts/:id/check */
export interface CheckAnswerResponse {
  correct: boolean;
  correctAnswer: CorrectAnswer | AnswerValue;
  explanation?: string | null;
}

/** POST /attempts/:id/submit */
export type SubmitAttemptResponse = Attempt & {
  xpGained: number;
  newAchievements: Achievement[];
  levelUp: boolean;
};

export interface WeakTopic {
  tag: string;
  accuracy: number;
  total: number;
}

/* ── Articles ────────────────────────────────────────────────── */
export interface Article extends Timestamps {
  id: ID;
  title: string;
  slug: string;
  excerpt?: string | null;
  content: string;
  coverUrl?: string | null;
  category?: string | null;
  tags: string[];
  readingMinutes: number;
  status: ContentStatus;
  visibility: Visibility;
  passcode?: string | null;
  authorId: ID;
  author?: UserRef;
  relatedQuizzes?: Pick<Quiz, 'id' | 'title'>[];
  myProgress?: number | null;
  locked?: boolean;
}

export interface ArticleProgress {
  userId: ID;
  articleId: ID;
  progress: number;
  completedAt?: ISODate | null;
}

export interface Annotation extends Timestamps {
  id: ID;
  userId: ID;
  articleId: ID;
  quote: string;
  note?: string | null;
  color: AnnotationColor;
  startOffset: number;
  endOffset: number;
}

/* ── Courses / Paths ─────────────────────────────────────────── */
export interface CourseItem {
  id: ID;
  courseId: ID;
  order: number;
  type: CourseItemType;
  articleId?: ID | null;
  quizId?: ID | null;
  deckId?: ID | null;
  article?: Pick<Article, 'id' | 'title' | 'slug' | 'readingMinutes' | 'excerpt'> | null;
  quiz?: (Pick<Quiz, 'id' | 'title'> & { questionCount?: number }) | null;
  deck?: (Pick<FlashcardDeck, 'id' | 'title'> & { cardCount?: number }) | null;
  done?: boolean;
}

export interface Course extends Timestamps {
  id: ID;
  title: string;
  description?: string | null;
  coverUrl?: string | null;
  category?: string | null;
  level?: string | null;
  status: ContentStatus;
  visibility: Visibility;
  passcode?: string | null;
  authorId: ID;
  author?: UserRef;
  items?: CourseItem[];
  itemCount?: number;
  /** 0–1 */
  progress?: number;
  completedAt?: ISODate | null;
  locked?: boolean;
}

export interface CourseCompletion {
  userId: ID;
  courseId: ID;
  completedAt: ISODate;
}

export interface PathItem {
  id: ID;
  pathId: ID;
  order: number;
  courseId: ID;
  course?: Course;
}

export interface LearningPath extends Timestamps {
  id: ID;
  title: string;
  description?: string | null;
  coverUrl?: string | null;
  status: ContentStatus;
  visibility: Visibility;
  authorId: ID;
  author?: UserRef;
  items?: PathItem[];
  /** GET /paths/:id → courses with progress */
  courses?: (Course & { progress?: number })[];
  courseCount?: number;
  progress?: number;
}

/* ── Flashcards ──────────────────────────────────────────────── */
export interface Flashcard {
  id: ID;
  deckId: ID;
  order: number;
  front: string;
  back: string;
  example?: string | null;
  review?: FlashcardReview | null;
}

export interface FlashcardDeck extends Timestamps {
  id: ID;
  title: string;
  description?: string | null;
  category?: string | null;
  status: ContentStatus;
  visibility: Visibility;
  authorId: ID;
  author?: UserRef;
  cards?: Flashcard[];
  cardCount?: number;
  dueCount?: number;
}

export interface FlashcardReview {
  userId: ID;
  cardId: ID;
  ease: number;
  interval: number;
  repetitions: number;
  dueAt: ISODate;
  lastGrade?: number | null;
}

/** 0 again · 1 hard · 2 good · 3 easy */
export type ReviewGrade = 0 | 1 | 2 | 3;

/* ── Groups / Assignments ────────────────────────────────────── */
export interface GroupMember {
  groupId: ID;
  userId: ID;
  joinedAt: ISODate;
  user?: UserRef & { email?: string; xp?: number };
}

export interface Group extends Timestamps {
  id: ID;
  name: string;
  description?: string | null;
  color?: string | null;
  teacherId: ID;
  teacher?: UserRef;
  members?: GroupMember[];
  memberCount?: number;
  assignments?: Assignment[];
}

export interface ContentAccess {
  contentType: ContentType;
  contentId: ID;
  groupId: ID;
}

export interface ContentSummary {
  id: ID;
  title: string;
  slug?: string;
  type?: ContentType;
  description?: string | null;
}

export interface Assignment extends Timestamps {
  id: ID;
  contentType: ContentType;
  contentId: ID;
  title: string;
  groupId?: ID | null;
  userId?: ID | null;
  dueAt?: ISODate | null;
  assignedById: ID;
  assignedBy?: UserRef;
  group?: Pick<Group, 'id' | 'name' | 'color'> | null;
  /** GET /assignments/mine */
  done?: boolean;
  content?: ContentSummary | null;
}

/* ── Social ──────────────────────────────────────────────────── */
export interface Notification {
  id: ID;
  userId: ID;
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
  readAt?: ISODate | null;
  createdAt: ISODate;
}

export interface Comment extends Timestamps {
  id: ID;
  userId: ID;
  targetType: CommentTarget;
  targetId: ID;
  parentId?: ID | null;
  body: string;
  user?: UserRef;
  replies?: Comment[];
}

export interface Bookmark {
  userId: ID;
  contentType: ContentType;
  contentId: ID;
  createdAt?: ISODate;
  content?: ContentSummary | null;
}

/* ── Gamification ────────────────────────────────────────────── */
export interface Achievement {
  id: ID;
  code: string;
  title: string;
  description: string;
  /** lucide icon name, e.g. "Trophy" or "trophy" */
  icon: string;
  xpReward: number;
  rule?: unknown;
  unlockedAt?: ISODate | null;
}

export interface UserAchievement {
  userId: ID;
  achievementId: ID;
  unlockedAt: ISODate;
  achievement?: Achievement;
}

export interface Quest {
  id: ID;
  title: string;
  description?: string | null;
  type: QuestType;
  target: number;
  xpReward: number;
  period: QuestPeriod;
  active: boolean;
  /** GET /quests — my progress */
  progress?: number;
  completedAt?: ISODate | null;
  claimedAt?: ISODate | null;
  periodKey?: string;
}

export interface UserQuest {
  userId: ID;
  questId: ID;
  periodKey: string;
  progress: number;
  completedAt?: ISODate | null;
  claimedAt?: ISODate | null;
}

export interface XpEvent {
  id: ID;
  userId: ID;
  amount: number;
  reason: string;
  createdAt: ISODate;
}

export interface LeaderboardEntry {
  rank: number;
  user: { id: ID; name: string; avatarUrl?: string | null; level: number };
  xp: number;
}
export type LeaderboardPeriod = 'week' | 'month' | 'all';

/* ── Response shapes ─────────────────────────────────────────── */
export interface ActivityDay {
  date: string;
  count: number;
}

/** GET /me/summary */
export interface MeSummary {
  xp: number;
  level: number;
  /** 0–1 */
  levelProgress: number;
  nextLevelXp: number;
  streak: number;
  rank: number | null;
  quizzesTaken: number;
  avgPercent: number;
  articlesRead: number;
  coursesCompleted: number;
  cardsDue: number;
  recentAttempts: (Attempt & { quiz: { id: ID; title: string } })[];
  weakTopics: WeakTopic[];
  activity: ActivityDay[];
}

/** GET /users/:id */
export type PublicProfile = Omit<User, 'email'> & {
  email?: string;
  achievements: (Achievement & { unlockedAt?: ISODate | null })[];
  stats: {
    quizzesTaken?: number;
    avgPercent?: number;
    articlesRead?: number;
    coursesCompleted?: number;
    rank?: number | null;
    [k: string]: unknown;
  };
};

/** GET /search?q */
export interface SearchResults {
  quizzes: Pick<Quiz, 'id' | 'title' | 'description' | 'category'>[];
  articles: Pick<Article, 'id' | 'title' | 'slug' | 'excerpt' | 'category'>[];
  courses: Pick<Course, 'id' | 'title' | 'description' | 'category'>[];
  paths: Pick<LearningPath, 'id' | 'title' | 'description'>[];
  decks: Pick<FlashcardDeck, 'id' | 'title' | 'description' | 'category'>[];
}

/** GET /stats/overview */
export interface StatsOverview {
  users: number;
  activeUsers7d: number;
  quizzes: number;
  attempts: number;
  avgPercent: number;
  attemptsByDay: ActivityDay[];
  topQuizzes: (Pick<Quiz, 'id' | 'title'> & { attempts?: number; avgPercent?: number })[];
  recentAttempts: AttemptWithQuiz[];
}

/** GET /stats/quizzes/:id */
export interface QuizStats {
  quiz: Quiz;
  attempts: number;
  avgPercent: number;
  passRate: number;
  avgTimeSec: number;
  distribution: { bucket: string; count: number }[];
  questions: { id: ID; text: string; type: QuestionType; correctRate: number; avgPoints: number }[];
  byUser: { user: UserRef; attempts: number; best: number; avgPercent?: number; last?: ISODate }[];
}

/** POST /flashcards/:id/review */
export type ReviewResponse = FlashcardReview;

/** GET /decks/:id/study */
export type StudySession = { deck?: Pick<FlashcardDeck, 'id' | 'title'>; cards: Flashcard[] } | Flashcard[];

/** POST /bookmarks/toggle */
export interface BookmarkToggleResponse {
  bookmarked: boolean;
}

/** POST /uploads */
export interface UploadResponse {
  url: string;
}

/** GET /notifications/unread-count — API may return a number or {count} */
export type UnreadCountResponse = number | { count: number };

/** GET /content/permissions */
export interface ContentPermissionRow {
  contentType: ContentType;
  id: ID;
  title: string;
  visibility: Visibility;
  passcode?: string | null;
  groupIds?: ID[];
  groups?: Pick<Group, 'id' | 'name'>[];
  author?: UserRef;
  status?: ContentStatus;
}

/** Nest default error body */
export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  error?: string;
}
