'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { BookOpen, Layers, ListChecks } from 'lucide-react';
import { ProgressRing, Skeleton } from '@/components/ui';
import { Mascot } from '@/components/brand/Mascot';
import { Highlight, Note, Stamp } from '@/components/notebook';
import { useCourses } from '../hooks';
import type { Course } from '../types';

export function itemCountOf(c: Course) {
  return c.itemCount ?? c._count?.items ?? c.items?.length ?? 0;
}

export function CoursesScreen() {
  const { data, isLoading } = useCourses();
  const courses = data ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6">
      <Note className="text-2xl !text-signal">marşrutlar</Note>
      <h1 className="mt-1 text-4xl sm:text-6xl">
        <Highlight inView={false} delay={0.3}>Kurslar</Highlight>
      </h1>
      <p className="mt-3 max-w-xl text-lg text-muted">Hər kurs — məqalə, test və kartlardan ibarət kiçik səyahətdir.</p>

      {isLoading ? (
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {[0, 1].map((i) => <Skeleton key={i} className="h-52 rounded-3xl" />)}
        </div>
      ) : courses.length === 0 ? (
        <div className="mt-16 grid place-items-center"><Mascot mode="static" size={120} message="Kurslar tezliklə!" /></div>
      ) : (
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {courses.map((c, i) => {
            const p = Math.round((c.progress ?? 0) * 100);
            const counts = c.itemCounts ?? {};
            return (
              <motion.div key={c.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                <Link href={`/courses/${c.id}`} className="paper-ruled group relative flex gap-5 rounded-3xl border-2 border-ink bg-elev p-6 pl-14 shadow-stamp transition-transform hover:-translate-y-1 hover:rotate-[-0.4deg]">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {c.level && <span className="rounded-full border-2 border-ink bg-ember/40 px-2.5 py-0.5 text-xs font-bold">{c.level}</span>}
                      <span className="hand text-xl text-muted">{c.category ?? 'kurs'}</span>
                    </div>
                    <h2 className="mt-2 text-2xl leading-tight">{c.title}</h2>
                    {c.description && <p className="mt-2 line-clamp-2 text-muted">{c.description}</p>}
                    <div className="mt-4 flex flex-wrap gap-4 text-sm text-subtle">
                      <span className="inline-flex items-center gap-1.5"><ListChecks className="size-4" /> {itemCountOf(c)} addım</span>
                      {counts.ARTICLE ? <span className="inline-flex items-center gap-1.5"><BookOpen className="size-4" /> {counts.ARTICLE}</span> : null}
                      {counts.DECK ? <span className="inline-flex items-center gap-1.5"><Layers className="size-4" /> {counts.DECK}</span> : null}
                    </div>
                  </div>
                  <div className="shrink-0 self-center">
                    <ProgressRing value={p} size={76} stroke={7} tone="signal">
                      <span className="font-display text-lg font-bold">{p}%</span>
                    </ProgressRing>
                  </div>
                  {c.completed && <Stamp inView={false} tone="moss" rotate={-12} className="absolute -right-3 -top-4 text-[10px]">Bitdi<br />✓</Stamp>}
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
