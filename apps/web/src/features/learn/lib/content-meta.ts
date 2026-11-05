import { BookOpenText, FileText, Layers, Route, ScrollText, type LucideIcon } from 'lucide-react';
import type { ContentType, CourseItemType } from '../types';
import type { Tone } from './topo';

export interface TypeMeta {
  label: string;
  plural: string;
  icon: LucideIcon;
  tone: Tone;
  href: (c: { id: string; slug?: string | null; link?: string | null }) => string;
}

export const TYPE_META: Record<ContentType, TypeMeta> = {
  QUIZ: {
    label: 'Test',
    plural: 'Testlər',
    icon: ScrollText,
    tone: 'aurora',
    href: (c) => c.link ?? `/quizzes/${c.id}`,
  },
  ARTICLE: {
    label: 'Məqalə',
    plural: 'Məqalələr',
    icon: FileText,
    tone: 'glacier',
    href: (c) => c.link ?? `/articles/${c.slug ?? c.id}`,
  },
  COURSE: {
    label: 'Kurs',
    plural: 'Kurslar',
    icon: BookOpenText,
    tone: 'signal',
    href: (c) => c.link ?? `/courses/${c.id}`,
  },
  PATH: {
    label: 'Tədris yolu',
    plural: 'Tədris yolları',
    icon: Route,
    tone: 'ember',
    href: (c) => c.link ?? `/paths/${c.id}`,
  },
  DECK: {
    label: 'Kart dəsti',
    plural: 'Kart dəstləri',
    icon: Layers,
    tone: 'moss',
    href: (c) => c.link ?? `/decks/${c.id}`,
  },
};

export const ITEM_META: Record<CourseItemType, TypeMeta> = {
  ARTICLE: TYPE_META.ARTICLE,
  QUIZ: TYPE_META.QUIZ,
  DECK: TYPE_META.DECK,
};

export const STATUS_META = {
  DRAFT: { label: 'Qaralama', tone: 'neutral' },
  PUBLISHED: { label: 'Dərc edilib', tone: 'moss' },
  ARCHIVED: { label: 'Arxiv', tone: 'ember' },
} as const;

export const VISIBILITY_META = {
  PUBLIC: { label: 'Hamıya açıq', short: 'Açıq' },
  PRIVATE: { label: 'Yalnız mən', short: 'Gizli' },
  GROUPS: { label: 'Seçilmiş qruplar', short: 'Qruplar' },
  PASSCODE: { label: 'Şifrə ilə', short: 'Şifrəli' },
} as const;

export const HIGHLIGHT_COLORS = ['signal', 'ember', 'aurora', 'glacier'] as const;
export const HIGHLIGHT_LABEL: Record<(typeof HIGHLIGHT_COLORS)[number], string> = {
  signal: 'Fənər',
  ember: 'Közər',
  aurora: 'Aurora',
  glacier: 'Buzlaq',
};

/** Flashcard grades (API 0..3) with keyboard digits 1..4. */
export const GRADES = [
  { grade: 0, key: '1', label: 'Yenidən', hint: '10 dəq', tone: 'danger' },
  { grade: 1, key: '2', label: 'Çətin', hint: '1 gün', tone: 'ember' },
  { grade: 2, key: '3', label: 'Yaxşı', hint: 'növbəti', tone: 'moss' },
  { grade: 3, key: '4', label: 'Asan', hint: 'uzun', tone: 'glacier' },
] as const;

export const COURSE_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
