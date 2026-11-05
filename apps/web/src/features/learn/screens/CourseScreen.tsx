'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { ArrowRight, BookOpen, Check, Layers, ListChecks, Printer, Award } from 'lucide-react';
import { Button, ButtonLink, Modal, Skeleton } from '@/components/ui';
import { fireConfetti } from '@/components/motion';
import { Mascot } from '@/components/brand/Mascot';
import { BookCatMark, OfficialWordmark } from '@/components/brand/BookCat';
import { Note, Stamp } from '@/components/notebook';
import { toast } from '@/components/ui/toast';
import { useAuth } from '@/lib/auth';
import { errorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useCompleteCourse, useCourse } from '../hooks';
import type { CourseItem } from '../types';

const ICON = { ARTICLE: BookOpen, QUIZ: ListChecks, DECK: Layers } as const;
const KIND = { ARTICLE: 'Məqalə', QUIZ: 'Test', DECK: 'Kartlar' } as const;

function itemHref(it: CourseItem) {
  if (it.type === 'ARTICLE') return `/articles/${it.article?.slug ?? it.articleId}`;
  if (it.type === 'QUIZ') return `/quizzes/${it.quizId ?? it.quiz?.id}`;
  return `/decks/${it.deckId ?? it.deck?.id}`;
}
function itemTitle(it: CourseItem) {
  return it.title ?? it.article?.title ?? it.quiz?.title ?? it.deck?.title ?? KIND[it.type];
}

export function CourseScreen({ id }: { id: string }) {
  const { data: course, isLoading, isError } = useCourse(id);
  const complete = useCompleteCourse(id);
  const [certOpen, setCertOpen] = useState(false);

  if (isLoading) return <div className="mx-auto max-w-4xl px-4 py-10"><Skeleton className="h-96 rounded-3xl" /></div>;
  if (isError || !course) {
    return (
      <div className="grid place-items-center px-4 py-20 text-center">
        <Mascot mode="sad" size={110} />
        <h1 className="mt-6 text-3xl">Kurs tapılmadı</h1>
        <ButtonLink href="/courses" className="mt-6">Bütün kurslar</ButtonLink>
      </div>
    );
  }

  const items = [...(course.items ?? [])].sort((a, b) => a.order - b.order);
  const done = items.filter((i) => i.done).length;
  const next = items.find((i) => !i.done);
  const allDone = items.length > 0 && done === items.length;
  const completed = Boolean(course.completed || course.completedAt);

  const onComplete = async () => {
    try {
      const r = await complete.mutateAsync();
      fireConfetti({ kind: 'summit' });
      if (r?.xpGained) toast.success(`Kurs tamamlandı! +${r.xpGained} XP`);
      setCertOpen(true);
    } catch (e) {
      toast.error(errorMessage(e, 'Əvvəlcə bütün addımları tamamla'));
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 pb-20 pt-8 sm:px-6">
      <Link href="/courses" className="hand text-xl text-muted hover:text-fg">← bütün kurslar</Link>

      <header className="mt-4">
        <div className="flex flex-wrap items-center gap-2">
          {course.level && <span className="rounded-full border-2 border-ink bg-ember/40 px-2.5 py-0.5 text-xs font-bold">{course.level}</span>}
          <Note className="text-2xl !text-signal">{course.category ?? 'kurs'}</Note>
        </div>
        <h1 className="mt-2 text-4xl leading-tight sm:text-6xl">{course.title}</h1>
        {course.description && <p className="mt-3 max-w-2xl text-lg text-muted">{course.description}</p>}
        <div className="mt-6 flex flex-wrap items-center gap-4">
          {completed ? (
            <Button size="lg" leftIcon={<Award />} onClick={() => setCertOpen(true)}>Sertifikatım</Button>
          ) : allDone ? (
            <Button size="lg" magnetic leftIcon={<Award />} loading={complete.isPending} onClick={onComplete}>Kursu bitir</Button>
          ) : next ? (
            <ButtonLink href={itemHref(next)} size="lg" magnetic rightIcon={<ArrowRight />}>{done ? 'Davam et' : 'Başla'}: {itemTitle(next)}</ButtonLink>
          ) : null}
          <span className="hand text-2xl text-muted">{done} / {items.length} addım</span>
        </div>
      </header>

      {/* Route */}
      <ol className="relative mt-12">
        <span aria-hidden className="absolute bottom-4 left-[26px] top-2 w-[3px] rounded-full bg-[repeating-linear-gradient(180deg,var(--border-strong)_0_4px,transparent_4px_10px)]" />
        <motion.span
          aria-hidden
          className="absolute left-[25px] top-2 w-[5px] origin-top rounded-full bg-signal"
          initial={{ height: 0 }}
          animate={{ height: `calc((100% - 1.5rem) * ${items.length ? done / items.length : 0})` }}
          transition={{ duration: 1.1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        />
        {items.map((it, i) => {
          const Icon = ICON[it.type];
          const isNext = next?.id === it.id;
          return (
            <motion.li key={it.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.07 }} className="relative pb-6 pl-20">
              <span className={cn(
                'absolute left-0 top-1 grid size-14 place-items-center rounded-full border-2 border-ink shadow-stamp-sm',
                it.done ? 'bg-moss text-white' : isNext ? 'bg-signal text-signal-fg' : 'bg-elev text-muted',
              )}>
                {it.done ? <Check className="size-6" strokeWidth={3} /> : <Icon className="size-6" />}
              </span>
              <Link href={itemHref(it)} className={cn('block rounded-2xl border bg-elev p-4 shadow-paper transition-transform hover:-translate-y-0.5', isNext ? 'border-2 border-ink' : 'border-line')}>
                <div className="flex items-center gap-2">
                  <span className="hand text-lg text-muted">{i + 1}. {KIND[it.type]}</span>
                  {isNext && <span className="rounded-full bg-signal px-2 py-0.5 text-[11px] font-bold text-signal-fg">növbəti</span>}
                </div>
                <div className="mt-0.5 font-display text-xl font-semibold">{itemTitle(it)}</div>
                {(it.article?.readingMinutes || it.quiz?.questionCount || it.deck?.cardCount) && (
                  <div className="mt-1 text-sm text-subtle">
                    {it.article?.readingMinutes ? `${it.article.readingMinutes} dəq oxu` : it.quiz?.questionCount ? `${it.quiz.questionCount} sual` : `${it.deck?.cardCount} kart`}
                  </div>
                )}
              </Link>
            </motion.li>
          );
        })}
        <li className="relative pl-20">
          <span className={cn('absolute left-0 top-0 grid size-14 place-items-center rounded-full border-2 border-dashed', completed ? 'border-ink bg-ember/50' : 'border-line-strong')}>🏁</span>
          <div className="hand pt-3 text-2xl text-muted">{completed ? 'Zirvə fəth edildi!' : 'Zirvə — sertifikat'}</div>
        </li>
      </ol>

      <Certificate open={certOpen} onClose={() => setCertOpen(false)} courseTitle={course.title} date={course.completedAt ?? new Date().toISOString()} />
    </div>
  );
}

function Certificate({ open, onClose, courseTitle, date }: { open: boolean; onClose: () => void; courseTitle: string; date: string }) {
  const { user } = useAuth();
  const d = new Date(date).toLocaleDateString('az-AZ', { day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <Modal open={open} onClose={onClose} size="xl" footer={<Button leftIcon={<Printer />} onClick={() => window.print()}>Çap et / PDF</Button>}>
      <div id="ev-certificate" className="paper-ruled relative overflow-hidden rounded-2xl border-[3px] border-double border-ink bg-[#FFFDF8] p-8 text-center text-[#2a1f17] sm:p-12">
        <div className="mx-auto w-20"><BookCatMark /></div>
        <OfficialWordmark className="mx-auto mt-2 h-8 w-auto" />
        <p className="hand mt-6 text-2xl text-[#6c5d50]">Bu sertifikat təsdiq edir ki,</p>
        <h2 className="mt-1 font-display text-4xl font-bold sm:text-5xl">{user?.name}</h2>
        <p className="hand mt-3 text-2xl text-[#6c5d50]">kursu uğurla tamamlayıb:</p>
        <p className="mt-1 font-display text-2xl font-semibold text-[#D75818]">«{courseTitle}»</p>
        <div className="mt-10 flex items-end justify-between gap-6 text-left">
          <div>
            <div className="hand text-3xl">Sədaqət Ağayeva</div>
            <div className="border-t border-[#2a1f17]/40 pt-1 text-xs uppercase tracking-[0.18em] text-[#6c5d50]">Müəllim</div>
          </div>
          <Stamp inView={false} delay={0.3} tone="signal" rotate={-12} className="text-[10px]">Eduventure<br />✓<br />{new Date(date).getFullYear()}</Stamp>
          <div className="text-right">
            <div className="font-display text-lg">{d}</div>
            <div className="border-t border-[#2a1f17]/40 pt-1 text-xs uppercase tracking-[0.18em] text-[#6c5d50]">Tarix</div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
