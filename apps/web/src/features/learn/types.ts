/**
 * Response shapes for the learn feature (SPEC §2/§3). Kept local and tolerant (lots of optionals)
 * so UI keeps working while the API evolves; base enums mirror the Prisma schema.
 */

export type ContentType = 'QUIZ' | 'ARTICLE' | 'COURSE' | 'PATH' | 'DECK';
export type ContentStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type Visibility = 'PUBLIC' | 'PRIVATE' | 'GROUPS' | 'PASSCODE';
export type CourseItemType = 'ARTICLE' | 'QUIZ' | 'DECK';
export type HighlightColor = 'signal' | 'ember' | 'aurora' | 'glacier';
export type Grade = 0 | 1 | 2 | 3;

export interface AuthorLite {
  id: string;
  name: string;
  avatarUrl?: string | null;
}

interface ContentBase {
  id: string;
  title: string;
  status: ContentStatus;
  visibility: Visibility;
  passcode?: string | null;
  authorId: string;
  author?: AuthorLite | null;
  createdAt: string;
  updatedAt: string;
  /** API may flag gated content it refuses to fully return */
  locked?: boolean;
  bookmarked?: boolean;
  groupIds?: string[];
}

// ───────────── Articles ─────────────

export interface ArticleProgressInfo {
  progress: number;
  completedAt?: string | null;
}

export interface QuizLite {
  id: string;
  title: string;
  description?: string | null;
  category?: string | null;
  questionCount?: number;
  _count?: { questions?: number };
  timeLimitSec?: number | null;
  status?: ContentStatus;
}

export interface Article extends ContentBase {
  slug: string;
  excerpt?: string | null;
  content?: string;
  coverUrl?: string | null;
  category?: string | null;
  tags: string[];
  readingMinutes: number;
  /** list endpoint: number (0-100) or object; normalised via `progressOf()` */
  myProgress?: ArticleProgressInfo | number | null;
  progress?: ArticleProgressInfo | number | null;
  completedAt?: string | null;
  relatedQuizCount?: number;
  annotationCount?: number;
  relatedQuizzes?: (QuizLite | { quiz: QuizLite })[];
  relatedQuizIds?: string[];
}

export interface ArticleProgressResponse {
  articleId?: string;
  progress: number;
  completedAt?: string | null;
  completed?: boolean;
  xpGained?: number;
  levelUp?: boolean;
  newAchievements?: { id?: string; title?: string }[];
}

export interface Annotation {
  id: string;
  userId?: string;
  articleId: string;
  quote: string;
  note?: string | null;
  color: HighlightColor;
  startOffset: number;
  endOffset: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ArticleInput {
  title: string;
  slug?: string;
  excerpt?: string | null;
  content: string;
  coverUrl?: string | null;
  category?: string | null;
  tags: string[];
  status: ContentStatus;
  visibility: Visibility;
  passcode?: string | null;
  relatedQuizIds?: string[];
  quizIds?: string[];
  groupIds?: string[];
}

// ───────────── Courses ─────────────

export interface ItemSummary {
  id: string;
  title: string;
  slug?: string;
  excerpt?: string | null;
  description?: string | null;
  readingMinutes?: number;
  questionCount?: number;
  cardCount?: number;
  timeLimitSec?: number | null;
  passPercent?: number;
  category?: string | null;
  coverUrl?: string | null;
  status?: ContentStatus;
}

export interface CourseItem {
  id: string;
  courseId?: string;
  order: number;
  type: CourseItemType;
  title?: string;
  articleId?: string | null;
  quizId?: string | null;
  deckId?: string | null;
  article?: ItemSummary | null;
  quiz?: ItemSummary | null;
  deck?: ItemSummary | null;
  done?: boolean;
}

export interface Course extends ContentBase {
  description?: string | null;
  coverUrl?: string | null;
  category?: string | null;
  level?: string | null;
  items?: CourseItem[];
  itemCount?: number;
  itemCounts?: Partial<Record<CourseItemType, number>>;
  _count?: { items?: number };
  /** 0..1 */
  progress?: number;
  completed?: boolean;
  completedAt?: string | null;
  doneCount?: number;
  canComplete?: boolean;
  paths?: { id: string; title: string }[];
  order?: number;
}

export interface CourseCompleteResponse {
  courseId?: string;
  completed?: boolean;
  completedAt?: string;
  xpGained?: number;
  levelUp?: boolean;
  alreadyCompleted?: boolean;
  newAchievements?: { id?: string; title?: string }[];
  next?: { pathId: string; pathTitle: string; courseId: string; courseTitle: string } | null;
}

export interface CourseInput {
  title: string;
  description?: string | null;
  coverUrl?: string | null;
  category?: string | null;
  level?: string | null;
  status: ContentStatus;
  visibility: Visibility;
  passcode?: string | null;
  items: { type: CourseItemType; articleId?: string; quizId?: string; deckId?: string }[];
  groupIds?: string[];
}

// ───────────── Paths ─────────────

export interface PathCourse extends Course {
  pathItemId?: string;
}

export interface LearningPath extends ContentBase {
  description?: string | null;
  coverUrl?: string | null;
  courses?: PathCourse[];
  courseIds?: string[];
  items?: { id: string; order: number; courseId: string; course?: PathCourse }[];
  courseCount?: number;
  completedCourses?: number;
  completed?: boolean;
  nextCourseId?: string | null;
  _count?: { items?: number };
  /** 0..1 */
  progress?: number;
}

export interface PathInput {
  title: string;
  description?: string | null;
  coverUrl?: string | null;
  status: ContentStatus;
  visibility: Visibility;
  passcode?: string | null;
  courseIds: string[];
  groupIds?: string[];
}

// ───────────── Decks ─────────────

export interface Flashcard {
  id: string;
  deckId?: string;
  order: number;
  front: string;
  back: string;
  example?: string | null;
  review?: CardReviewState | null;
}

export interface CardReviewState {
  ease: number;
  interval: number;
  repetitions: number;
  dueAt: string;
  lastGrade?: number | null;
}

export interface Deck extends ContentBase {
  description?: string | null;
  category?: string | null;
  cards?: Flashcard[];
  cardCount?: number;
  dueCount?: number;
  newCount?: number;
  reviewedCount?: number;
  _count?: { cards?: number };
}

export interface ReviewResponse extends CardReviewState {
  id?: string;
  cardId: string;
  deckId?: string;
  xpGained?: number;
  levelUp?: boolean;
}

export interface StudyCard extends Flashcard {
  isNew?: boolean;
}

export interface StudySession {
  deck?: { id: string; title: string; description?: string | null };
  cards: StudyCard[];
  dueCount?: number;
  newCount?: number;
  nextDueAt?: string | null;
}

export interface DeckInput {
  title: string;
  description?: string | null;
  category?: string | null;
  status: ContentStatus;
  visibility: Visibility;
  passcode?: string | null;
  cards: { id?: string; front: string; back: string; example?: string | null }[];
  groupIds?: string[];
}

// ───────────── Community bits used here ─────────────

export interface CommentNode {
  id: string;
  userId: string;
  targetType: string;
  targetId: string;
  parentId?: string | null;
  body: string;
  createdAt: string;
  user?: (AuthorLite & { role?: string; level?: number }) | null;
  replies?: CommentNode[];
  children?: CommentNode[];
}

/** Type-agnostic content card (bookmarks, search, assignments) — API `ContentSummary`. */
export interface ContentSummary {
  id: string;
  type: ContentType;
  title: string;
  description?: string | null;
  slug?: string;
  category?: string | null;
  coverUrl?: string | null;
  coverColor?: string | null;
  status?: ContentStatus;
  visibility?: Visibility;
  link?: string;
  author?: { id: string; name: string } | null;
  questionCount?: number;
  readingMinutes?: number;
  itemCount?: number;
  courseCount?: number;
  cardCount?: number;
  locked?: boolean;
}

export interface Bookmark {
  id?: string;
  userId?: string;
  contentType: ContentType;
  contentId: string;
  createdAt?: string;
  content?: ContentSummary | null;
  locked?: boolean;
}

export interface SearchResults {
  quizzes: ContentSummary[];
  articles: ContentSummary[];
  courses: ContentSummary[];
  paths: ContentSummary[];
  decks: ContentSummary[];
}

export interface GroupLite {
  id: string;
  name: string;
  color?: string | null;
  _count?: { members?: number };
  memberCount?: number;
}
