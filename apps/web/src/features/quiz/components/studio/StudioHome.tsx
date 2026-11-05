'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, BookOpen, ClipboardCheck, FileQuestion, Layers, Library, Map, NotebookPen, Plus } from 'lucide-react';
import { ButtonLink, Skeleton } from '@/components/ui';
import { Mascot } from '@/components/brand/Mascot';
import { Highlight, Note, Stamp, Tape } from '@/components/notebook';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { usePendingReviews, useQuizzes } from '../../hooks';
import { formatRelative, resolveCoverColor } from '../../lib/utils';
import { StatusPill } from './parts';

const CREATE = [
  { href: '/studio/quizzes/new', label: 'Test', hint: '7 sual tipi, bank, AI', icon: FileQuestion, tint: 'bg-ember/35', rotate: -1.5 },
  { href: '/studio/articles/new', label: 'Məqalə', hint: 'Qayda, oxu mətni', icon: NotebookPen, tint: 'bg-glacier/25', rotate: 1 },
  { href: '/studio/courses/new', label: 'Kurs', hint: 'Addım-addım dərslər', icon: BookOpen, tint: 'bg-moss/25', rotate: -0.5 },
  { href: '/studio/paths/new', label: 'Yol', hint: 'Kurslardan marşrut', icon: Map, tint: 'bg-aurora/20', rotate: 1.5 },
  { href: '/studio/decks/new', label: 'Kart dəsti', hint: 'Söz kartları, SM-2', icon: Layers, tint: 'bg-[#FFE7A8] dark:bg-[#5b4a22]', rotate: -1 },
];

const SECTIONS = [
  { href: '/studio/quizzes', label: 'Testlər' },
  { href: '/studio/bank', label: 'Sual bankı' },
  { href: '/studio/review', label: 'Yoxlama' },
  { href: '/studio/articles', label: 'Məqalələr' },
  { href: '/studio/courses', label: 'Kurslar' },
  { href: '/studio/paths', label: 'Yollar' },
  { href: '/studio/decks', label: 'Kart dəstləri' },
];

function greeting() {
  const h = new Date().getHours();
  if (h < 6) return 'Gecən xeyir';
  if (h < 12) return 'Sabahın xeyir';
  if (h < 18) return 'Günortan xeyir';
  return 'Axşamın xeyir';
}

export function StudioHome() {
  const { user } = useAuth();
  const reduce = useReducedMotion();
  const pending = usePendingReviews();
  const quizzes = useQuizzes({ mine: true });
  const recent = [...(quizzes.data ?? [])].sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)).slice(0, 5);
  const pendingCount = pending.data?.length ?? 0;
  const firstName = user?.name?.split(' ')[0] ?? '';

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="min-w-0">
          <Note className="text-2xl !text-signal">müəllim studiyası</Note>
          <h1 className="mt-1 text-4xl leading-tight sm:text-6xl">
            {greeting()}, <Highlight>{firstName || 'müəllim'}</Highlight>!
          </h1>
          <p className="mt-3 max-w-xl text-lg text-muted">Bu gün nə hazırlayırıq? Yeni material yarat və ya tələbələrin cavablarını yoxla.</p>
        </div>
        <Mascot mode="peek" size={110} className="hidden sm:block" />
      </header>

      {/* Quick create */}
      <section className="mt-10">
        <h2 className="hand text-3xl text-muted">yeni yarat →</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {CREATE.map((c, i) => (
            <motion.div
              key={c.href}
              initial={reduce ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className={cn(i === CREATE.length - 1 && 'col-span-2 sm:col-span-1')}
            >
              <Link
                href={c.href}
                style={{ rotate: `${c.rotate}deg` }}
                className={cn(
                  'group relative flex h-full flex-col gap-3 rounded-2xl border-2 border-ink p-4 shadow-stamp transition-all hover:-translate-y-1 hover:rotate-0 hover:shadow-[5px_5px_0_0_var(--ink)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
                  c.tint,
                )}
              >
                <span className="grid size-11 place-items-center rounded-xl border-2 border-ink bg-surface">
                  <c.icon className="size-5" />
                </span>
                <span>
                  <span className="flex items-center gap-1 font-display text-xl font-bold">
                    {c.label} <Plus className="size-4 opacity-60 transition-transform group-hover:rotate-90" />
                  </span>
                  <span className="block text-sm text-muted">{c.hint}</span>
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      <div className="mt-12 grid gap-6 lg:grid-cols-[1fr_20rem]">
        {/* Recent quizzes */}
        <section className="paper-ruled relative rounded-3xl border-2 border-ink bg-elev p-4 pl-14 shadow-stamp sm:p-6 sm:pl-16">
          <Tape className="-top-3 left-10" />
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-2xl font-bold">Son testlərim</h2>
            <Link href="/studio/quizzes" className="hand text-xl text-signal hover:underline">
              hamısı →
            </Link>
          </div>
          <div className="mt-4">
            {quizzes.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-14" />
                ))}
              </div>
            ) : !recent.length ? (
              <div className="grid place-items-center py-8 text-center">
                <p className="hand text-2xl text-muted">Hələ test yaratmamısan</p>
                <ButtonLink href="/studio/quizzes/new" size="sm" className="mt-3" leftIcon={<Plus />}>
                  İlk testi yarat
                </ButtonLink>
              </div>
            ) : (
              <ul className="divide-y divide-dashed divide-line-strong">
                {recent.map((q) => (
                  <li key={q.id}>
                    <Link href={`/studio/quizzes/${q.id}`} className="group flex items-center gap-3 py-3">
                      <span className="size-3 shrink-0 rounded-full border-2 border-ink" style={{ background: resolveCoverColor(q.coverColor, q.id) }} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold group-hover:text-signal">{q.title}</span>
                        <span className="block text-xs text-muted">
                          {q.questionCount} sual · {formatRelative(q.updatedAt)}
                        </span>
                      </span>
                      <StatusPill status={q.status} className="hidden sm:inline-flex" />
                      <ArrowRight className="size-4 shrink-0 text-subtle transition-transform group-hover:translate-x-1" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <aside className="space-y-6">
          {/* Pending reviews */}
          <Link
            href="/studio/review"
            className="group relative block overflow-hidden rounded-3xl border-2 border-ink bg-[#FFE7A8] p-5 text-[#3b2a12] shadow-stamp transition-transform hover:-translate-y-1 dark:bg-[#5b4a22] dark:text-[#fbeccb]"
          >
            <span className="flex items-center gap-2 font-display text-lg font-bold">
              <ClipboardCheck className="size-5" /> Yoxlama gözləyir
            </span>
            <span className="mt-2 block font-mono text-5xl font-bold">{pending.isLoading ? '…' : pendingCount}</span>
            <span className="hand block text-xl opacity-80">{pendingCount ? 'açıq cavab səni gözləyir' : 'hər şey yoxlanılıb'}</span>
            {pendingCount > 0 && (
              <Stamp className="absolute -right-1 top-3" tone="danger" rotate={14}>
                təcili
              </Stamp>
            )}
          </Link>

          <div className="rounded-3xl border-2 border-line bg-elev p-5 shadow-paper">
            <p className="mono-label">bölmələr</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {SECTIONS.map((s) => (
                <li key={s.href}>
                  <Link href={s.href} className="inline-flex items-center gap-1 rounded-full border-2 border-ink bg-surface px-3 py-1 text-sm font-semibold transition-colors hover:bg-ember/30">
                    {s.href === '/studio/bank' && <Library className="size-3.5" />}
                    {s.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
