import { BadRequestException } from '@nestjs/common';
import { ContentType } from '@prisma/client';

const AZ_MAP: Record<string, string> = {
  ə: 'e', Ə: 'e', ğ: 'g', Ğ: 'g', ı: 'i', I: 'i', İ: 'i', ö: 'o', Ö: 'o', ü: 'u', Ü: 'u', ş: 's', Ş: 's', ç: 'c', Ç: 'c',
};

/** URL slug with Azerbaijani transliteration ("Qəhrəmanın səyahəti" → "qehremanin-seyaheti"). */
export function slugify(input: string): string {
  const s = (input ?? '')
    .split('')
    .map((ch) => AZ_MAP[ch] ?? ch)
    .join('')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
  return s || 'meqale';
}

/** ~200 words per minute, minimum 1. Markdown syntax is stripped first. */
export function readingMinutes(markdown: string): number {
  const text = (markdown ?? '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~\-|]/g, ' ');
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

const TYPE_ALIASES: Record<string, ContentType> = {
  quiz: ContentType.QUIZ,
  quizzes: ContentType.QUIZ,
  article: ContentType.ARTICLE,
  articles: ContentType.ARTICLE,
  course: ContentType.COURSE,
  courses: ContentType.COURSE,
  path: ContentType.PATH,
  paths: ContentType.PATH,
  learning_path: ContentType.PATH,
  learningpath: ContentType.PATH,
  deck: ContentType.DECK,
  decks: ContentType.DECK,
  flashcard_deck: ContentType.DECK,
};

/** Accepts `QUIZ`, `quiz`, `quizzes`, … and returns the ContentType enum value. */
export function parseContentType(raw: string): ContentType {
  const t = TYPE_ALIASES[(raw ?? '').toLowerCase()];
  if (!t) throw new BadRequestException(`Naməlum məzmun növü: ${raw}`);
  return t;
}

/** Frontend route for a piece of content (SPEC §1 route map). */
export function contentLink(type: ContentType, c: { id: string; slug?: string | null }): string {
  switch (type) {
    case ContentType.QUIZ:
      return `/quizzes/${c.id}`;
    case ContentType.ARTICLE:
      return `/articles/${c.slug ?? c.id}`;
    case ContentType.COURSE:
      return `/courses/${c.id}`;
    case ContentType.PATH:
      return `/paths/${c.id}`;
    case ContentType.DECK:
      return `/decks/${c.id}`;
  }
}

export const CONTENT_TYPE_LABEL: Record<ContentType, string> = {
  QUIZ: 'Test',
  ARTICLE: 'Məqalə',
  COURSE: 'Kurs',
  PATH: 'Tədris yolu',
  DECK: 'Kart dəsti',
};

export function uniqStrings(arr: (string | null | undefined)[] | undefined | null): string[] {
  return Array.from(new Set((arr ?? []).filter((x): x is string => typeof x === 'string' && x.length > 0)));
}
