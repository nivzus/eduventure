/**
 * Quiz feature types. Domain-shaped (mirrors SPEC §2/§3) but kept local so the
 * feature tolerates small API shape drifts; normalizers live in `lib/normalize.ts`.
 */

export type QuestionType =
  | 'SINGLE'
  | 'MULTIPLE'
  | 'TEXT'
  | 'TRUE_FALSE'
  | 'ORDERING'
  | 'FILL_BLANKS'
  | 'OPEN';

export type ContentStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type Visibility = 'PUBLIC' | 'PRIVATE' | 'GROUPS' | 'PASSCODE';
export type AttemptMode = 'EXAM' | 'PRACTICE';
export type AttemptStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'PENDING_REVIEW' | 'GRADED';

/** User answer shapes per SPEC §2. */
export type AnswerValue = number | number[] | string | boolean | string[] | null | undefined;
export type AnswerMap = Record<string, AnswerValue>;

/** Stored `correct` JSON shapes per SPEC §2. */
export type CorrectValue =
  | { index: number }
  | { indices: number[] }
  | { answers: string[] }
  | { value: boolean }
  | { blanks: string[][] }
  | null;

export interface AuthorRef {
  id: string;
  name: string;
  avatarUrl?: string | null;
}

export interface QuizBase {
  id: string;
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
  authorId: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuizListItem extends QuizBase {
  questionCount: number;
  author?: AuthorRef | null;
  myBest?: number | null;
  attemptsCount?: number;
}

export interface Question {
  id: string;
  quizId?: string;
  order?: number;
  type: QuestionType;
  text: string;
  imageUrl?: string | null;
  options: string[];
  /** Present for authors, and for students only after submit (showAnswers) / practice checks. */
  correct?: CorrectValue;
  explanation?: string | null;
  points: number;
  tags: string[];
}

export interface QuizDetail extends QuizBase {
  questions: Question[];
  author?: AuthorRef | null;
  questionCount?: number;
  myBest?: number | null;
  attemptsCount?: number;
}

export interface QuestionResult {
  correct: boolean | null;
  points: number;
  max: number;
}

export interface Attempt {
  id: string;
  quizId: string;
  userId: string;
  mode: AttemptMode;
  status: AttemptStatus;
  answers: AnswerMap;
  questionOrder: string[];
  result?: Record<string, QuestionResult> | null;
  score: number;
  maxScore: number;
  percent: number;
  passed: boolean;
  timeSpentSec: number;
  feedback?: string | null;
  startedAt: string;
  submittedAt?: string | null;
  quiz?: { id: string; title: string } & Partial<QuizBase>;
  user?: AuthorRef | null;
}

export interface AttemptQuizMeta {
  id: string;
  title: string;
  timeLimitSec?: number | null;
  showAnswers: boolean;
  mode: AttemptMode;
  passPercent?: number;
  category?: string | null;
  coverColor?: string | null;
}

/** Normalized bundle used by the player / result / review screens. */
export interface AttemptBundle {
  attempt: Attempt;
  quiz: AttemptQuizMeta;
  questions: Question[];
}

export interface Achievement {
  id: string;
  code: string;
  title: string;
  description: string;
  icon: string;
  xpReward: number;
}

export interface SubmitResult extends Attempt {
  xpGained?: number;
  newAchievements?: Achievement[];
  levelUp?: boolean;
}

export interface CheckResult {
  correct: boolean | null;
  correctAnswer: unknown;
  explanation?: string | null;
}

export interface WeakTopic {
  tag: string;
  accuracy: number;
  total: number;
}

export interface BankQuestion {
  id: string;
  type: QuestionType;
  text: string;
  imageUrl?: string | null;
  options: string[];
  correct: CorrectValue;
  explanation?: string | null;
  points: number;
  tags: string[];
  difficulty: number;
  authorId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type BankDraft = Omit<BankQuestion, 'id' | 'authorId' | 'createdAt' | 'updatedAt'> & { id?: string };

export interface CommentItem {
  id: string;
  userId: string;
  targetType: string;
  targetId: string;
  parentId?: string | null;
  body: string;
  createdAt: string;
  user?: AuthorRef & { role?: string };
  replies?: CommentItem[];
}

export interface BookmarkItem {
  id?: string;
  contentType: string;
  contentId: string;
  createdAt?: string;
}

export interface GroupLite {
  id: string;
  name: string;
  color?: string | null;
}

export interface QuizListParams {
  q?: string;
  category?: string;
  tag?: string;
  status?: ContentStatus;
  mine?: boolean;
}

export interface BankListParams {
  q?: string;
  tag?: string;
  type?: QuestionType | '';
}

/** Payload for create / update of a quiz from the studio editor. */
export interface QuizPayload {
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
  questions?: QuestionPayload[];
}

export interface QuestionPayload {
  id?: string;
  order: number;
  type: QuestionType;
  text: string;
  imageUrl?: string | null;
  options: string[];
  correct: CorrectValue;
  explanation?: string | null;
  points: number;
  tags: string[];
}
