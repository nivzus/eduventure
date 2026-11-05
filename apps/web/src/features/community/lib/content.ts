import {
  BookOpen,
  Brain,
  FileText,
  Layers,
  ListChecks,
  Route,
  Sparkles,
  Target,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { ContentType, QuestPeriod, QuestType, Role } from '../types';

export type Tone = 'neutral' | 'signal' | 'ember' | 'aurora' | 'glacier' | 'moss' | 'danger';

export const CONTENT_META: Record<ContentType, { label: string; plural: string; icon: LucideIcon; tone: Tone }> = {
  QUIZ: { label: 'Test', plural: 'Testlər', icon: ListChecks, tone: 'signal' },
  ARTICLE: { label: 'Məqalə', plural: 'Məqalələr', icon: FileText, tone: 'glacier' },
  COURSE: { label: 'Kurs', plural: 'Kurslar', icon: Layers, tone: 'aurora' },
  PATH: { label: 'Tədris yolu', plural: 'Tədris yolları', icon: Route, tone: 'ember' },
  DECK: { label: 'Kart kolodası', plural: 'Kart kolodaları', icon: Brain, tone: 'moss' },
};

export const CONTENT_TYPES: ContentType[] = ['QUIZ', 'ARTICLE', 'COURSE', 'PATH', 'DECK'];

export function contentMeta(type: string | null | undefined) {
  const key = (type ?? 'QUIZ').toUpperCase() as ContentType;
  return CONTENT_META[key] ?? CONTENT_META.QUIZ;
}

export function contentHref(type: string, id: string, slug?: string | null): string {
  switch ((type ?? '').toUpperCase()) {
    case 'QUIZ':
      return `/quizzes/${id}`;
    case 'ARTICLE':
      return `/articles/${slug || id}`;
    case 'COURSE':
      return `/courses/${id}`;
    case 'PATH':
      return `/paths/${id}`;
    case 'DECK':
      return `/decks/${id}`;
    default:
      return '/dashboard';
  }
}

export const QUEST_META: Record<QuestType, { icon: LucideIcon; unit: string }> = {
  COMPLETE_QUIZZES: { icon: ListChecks, unit: 'test' },
  READ_ARTICLES: { icon: BookOpen, unit: 'məqalə' },
  STUDY_CARDS: { icon: Brain, unit: 'kart' },
  PERFECT_SCORE: { icon: Target, unit: '100% nəticə' },
  EARN_XP: { icon: Zap, unit: 'XP' },
};

export function questMeta(type: string) {
  return QUEST_META[type as QuestType] ?? { icon: Sparkles, unit: '' };
}

export const QUEST_TYPE_LABEL: Record<QuestType, string> = {
  COMPLETE_QUIZZES: 'Test tamamla',
  READ_ARTICLES: 'Məqalə oxu',
  STUDY_CARDS: 'Kart təkrarla',
  PERFECT_SCORE: '100% nəticə',
  EARN_XP: 'XP qazan',
};

export const PERIOD_LABEL: Record<QuestPeriod, string> = {
  DAILY: 'Günlük',
  WEEKLY: 'Həftəlik',
  ONCE: 'Birdəfəlik',
};

export const ROLE_LABEL: Record<Role, string> = {
  STUDENT: 'Tələbə',
  TEACHER: 'Müəllim',
  ADMIN: 'Admin',
};

export const ROLE_TONE: Record<Role, Tone> = {
  STUDENT: 'neutral',
  TEACHER: 'glacier',
  ADMIN: 'aurora',
};

/** Group colours offered in the editor; stored as token names (or any hex). */
export const GROUP_COLORS = ['signal', 'ember', 'aurora', 'glacier', 'moss', 'danger'] as const;

export function groupColorVar(color?: string | null): string {
  if (!color) return 'var(--aurora)';
  if ((GROUP_COLORS as readonly string[]).includes(color)) return `var(--${color})`;
  return color;
}

/** XP needed to reach `level` (level = floor(sqrt(xp/100)) + 1). */
export function xpForLevel(level: number): number {
  const l = Math.max(1, level);
  return 100 * (l - 1) * (l - 1);
}
