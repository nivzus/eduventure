'use client';

import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { BookOpen, BookmarkX, Layers, ListChecks, Route, GraduationCap } from 'lucide-react';
import { IconButton, Skeleton } from '@/components/ui';
import { Mascot } from '@/components/brand/Mascot';
import { Highlight, Note, Tape } from '@/components/notebook';
import { useBookmarks, useToggleBookmark } from '../hooks';
import type { ContentSummary, ContentType } from '../types';

export const TYPE_META: Record<ContentType, { label: string; plural: string; icon: typeof BookOpen }> = {
  QUIZ: { label: 'Test', plural: 'Testlər', icon: ListChecks },
  ARTICLE: { label: 'Məqalə', plural: 'Məqalələr', icon: BookOpen },
  COURSE: { label: 'Kurs', plural: 'Kurslar', icon: GraduationCap },
  PATH: { label: 'Yol', plural: 'Yollar', icon: Route },
  DECK: { label: 'Kartlar', plural: 'Kart dəstləri', icon: Layers },
};

export function contentHref(type: ContentType, id: string, c?: Partial<ContentSummary> | null) {
  if (c?.link) return c.link;
  switch (type) {
    case 'QUIZ': return `/quizzes/${id}`;
    case 'ARTICLE': return `/articles/${c?.slug ?? id}`;
    case 'COURSE': return `/courses/${id}`;
    case 'PATH': return `/paths/${id}`;
    case 'DECK': return `/decks/${id}`;
  }
}

function meta(c?: ContentSummary | null) {
  if (!c) return '';
  if (c.questionCount) return `${c.questionCount} sual`;
  if (c.readingMinutes) return `${c.readingMinutes} dəq oxu`;
  if (c.cardCount) return `${c.cardCount} kart`;
  if (c.itemCount) return `${c.itemCount} addım`;
  if (c.courseCount) return `${c.courseCount} kurs`;
  return c.category ?? '';
}

const ORDER: ContentType[] = ['COURSE', 'PATH', 'QUIZ', 'ARTICLE', 'DECK'];
const TAPE = ['ember', 'aurora', 'moss', 'glacier'] as const;

export function BookmarksScreen() {
  const { data, isLoading } = useBookmarks();
  const toggle = useToggleBookmark();
  const list = data ?? [];
  const groups = ORDER.map((t) => ({ t, items: list.filter((b) => b.contentType === t) })).filter((g) => g.items.length);

  return (
    <div className="mx-auto max-w-5xl px-4 pb-20 pt-8 sm:px-6">
      <Note className="text-2xl !text-signal">yadda saxladıqların</Note>
      <h1 className="mt-1 text-4xl sm:text-6xl">
        <Highlight inView={false} delay={0.3}>Seçilmişlər</Highlight>
      </h1>

      {isLoading ? (
        <div className="mt-10 grid gap-4 sm:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
      ) : groups.length === 0 ? (
        <div className="mt-16 flex flex-col items-center text-center">
          <Mascot mode="static" size={120} message="Hələ heç nə saxlamamısan" />
          <p className="mt-4 max-w-sm text-muted">Testlərdə, məqalələrdə və kurslarda əlfəcin işarəsinə toxun — burada görünəcək.</p>
        </div>
      ) : (
        <div className="mt-10 space-y-12">
          {groups.map((g) => {
            const M = TYPE_META[g.t];
            return (
              <section key={g.t}>
                <h2 className="flex items-center gap-2 text-2xl"><M.icon className="size-5 text-signal" /> {M.plural} <span className="hand text-xl text-subtle">· {g.items.length}</span></h2>
                <motion.ul layout className="mt-4 grid gap-4 sm:grid-cols-2">
                  <AnimatePresence initial={false}>
                    {g.items.map((b, i) => (
                      <motion.li
                        layout
                        key={`${b.contentType}:${b.contentId}`}
                        initial={{ opacity: 0, y: 10, rotate: 0 }}
                        animate={{ opacity: 1, y: 0, rotate: i % 2 ? 0.6 : -0.6 }}
                        exit={{ opacity: 0, scale: 0.85, rotate: -6, transition: { duration: 0.25 } }}
                        className="relative"
                      >
                        <Tape color={TAPE[i % TAPE.length]} className="-top-2.5 left-6 !h-5 !w-16" rotate={-5} />
                        <Link href={contentHref(b.contentType, b.contentId, b.content)} className="block rounded-2xl border border-line bg-elev p-4 pr-14 shadow-paper transition-colors hover:border-ink/50">
                          <div className="hand text-lg text-muted">{M.label}{meta(b.content) ? ` · ${meta(b.content)}` : ''}</div>
                          <div className="font-display text-lg font-semibold leading-snug">{b.content?.title ?? 'Əlçatan deyil'}</div>
                          {b.content?.description && <p className="mt-1 line-clamp-1 text-sm text-muted">{b.content.description}</p>}
                        </Link>
                        <IconButton
                          label="Seçilmişlərdən çıxar"
                          className="absolute right-3 top-1/2 -translate-y-1/2"
                          onClick={() => toggle.mutate({ contentType: b.contentType, contentId: b.contentId })}
                        >
                          <BookmarkX className="size-5" />
                        </IconButton>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </motion.ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
