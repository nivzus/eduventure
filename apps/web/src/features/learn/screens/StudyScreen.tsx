'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useTransform, type PanInfo } from 'motion/react';
import { RotateCcw, Sparkles, X } from 'lucide-react';
import { Button, ButtonLink, Kbd, Skeleton } from '@/components/ui';
import { fireConfetti } from '@/components/motion';
import { Mascot } from '@/components/brand/Mascot';
import { Note, Stamp } from '@/components/notebook';
import { toast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { useInvalidateDecks, useReviewCard, useStudySession } from '../hooks';
import type { Grade, StudyCard } from '../types';

const GRADES: { g: Grade; label: string; hint: string; cls: string }[] = [
  { g: 0, label: 'Yenidən', hint: '<1 dəq', cls: 'bg-danger text-white' },
  { g: 1, label: 'Çətin', hint: 'tez', cls: 'bg-ember text-ink' },
  { g: 2, label: 'Yaxşı', hint: 'normal', cls: 'bg-moss text-white' },
  { g: 3, label: 'Asan', hint: 'gec', cls: 'bg-aurora text-white' },
];

export function StudyScreen({ id }: { id: string }) {
  const { data, isLoading, isError } = useStudySession(id);
  const review = useReviewCard();
  const invalidate = useInvalidateDecks();
  const reduce = useReducedMotion();

  const [queue, setQueue] = useState<StudyCard[]>([]);
  const [total, setTotal] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [exitDir, setExitDir] = useState(0);
  const [stats, setStats] = useState({ done: 0, again: 0, xp: 0 });

  useEffect(() => {
    if (data) {
      setQueue(data.cards);
      setTotal(data.cards.length);
    }
  }, [data]);

  const card = queue[0];
  const finished = Boolean(data) && total > 0 && !card;

  const celebrated = useRef(false);
  useEffect(() => {
    if (!finished || celebrated.current) return;
    celebrated.current = true;
    invalidate();
    if (!reduce) fireConfetti({ kind: 'stars' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  const grade = useCallback(
    (g: Grade) => {
      if (!card || review.isPending) return;
      setExitDir(g === 0 ? -1 : 1);
      review.mutate(
        { cardId: card.id, grade: g },
        {
          onSuccess: (r) => setStats((s) => ({ ...s, xp: s.xp + (r?.xpGained ?? 1) })),
          onError: () => toast.error('Cavab yadda saxlanmadı'),
        },
      );
      setStats((s) => ({ ...s, done: s.done + 1, again: s.again + (g === 0 ? 1 : 0) }));
      setFlipped(false);
      // "Again" cards come back at the end of this session
      setQueue((q) => (g === 0 ? [...q.slice(1), q[0]] : q.slice(1)));
    },
    [card, review],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!card) return;
      if (e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (flipped && ['1', '2', '3', '4'].includes(e.key)) {
        grade((Number(e.key) - 1) as Grade);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [card, flipped, grade]);

  if (isLoading) return <div className="mx-auto max-w-xl px-4 py-24"><Skeleton className="aspect-[4/3] rounded-3xl" /></div>;
  if (isError) {
    return (
      <div className="grid min-h-dvh place-items-center px-4 text-center">
        <div>
          <Mascot mode="sad" size={110} />
          <h1 className="mt-6 text-3xl">Dəst açılmadı</h1>
          <ButtonLink href="/decks" className="mt-6">Kartlara qayıt</ButtonLink>
        </div>
      </div>
    );
  }

  const progress = total ? Math.min(1, stats.done / Math.max(total, stats.done)) : 0;

  return (
    <div className="paper-dots relative flex min-h-dvh flex-col">
      {/* top bar */}
      <header className="mx-auto flex w-full max-w-3xl items-center gap-4 px-4 pt-5">
        <Link href={`/decks/${id}`} aria-label="Bağla" className="grid size-10 place-items-center rounded-full border-2 border-ink bg-elev shadow-stamp-sm">
          <X className="size-4" />
        </Link>
        <div className="h-3 flex-1 overflow-hidden rounded-full border-2 border-ink bg-elev">
          <motion.div className="h-full bg-signal" animate={{ width: `${progress * 100}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} />
        </div>
        <span className="font-mono text-sm text-muted tabular-nums">{Math.min(stats.done, total)}/{total}</span>
      </header>

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-4 py-8">
        {data?.deck?.title && <Note className="mb-6 text-2xl">{data.deck.title}</Note>}

        {total === 0 ? (
          <div className="text-center">
            <Mascot mode="static" size={120} message="Bu gün təkrar yoxdur!" />
            <p className="mt-4 text-muted">Kartlar vaxtı çatanda qayıdacaq. Sabah yenə gəl.</p>
            <ButtonLink href="/decks" className="mt-6">Digər dəstlər</ButtonLink>
          </div>
        ) : finished ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative w-full rounded-3xl border-2 border-ink bg-elev p-8 text-center shadow-[6px_6px_0_0_var(--ink)]">
            <Stamp inView={false} delay={0.4} tone="moss" className="absolute -right-3 -top-4 text-[10px]">Sessiya<br />bitdi</Stamp>
            <Mascot mode="celebrate" size={120} />
            <h1 className="mt-4 text-4xl">Əla iş!</h1>
            <p className="mt-2 text-muted">{stats.done} kart təkrarlandı{stats.again ? `, ${stats.again} dəfə «yenidən»` : ''}.</p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-[#FFE7A8] px-4 py-2 font-display text-xl font-bold text-[#3b2a12]">
              <Sparkles className="size-5 text-signal" /> +{stats.xp} XP
            </div>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <ButtonLink href="/decks">Bütün dəstlər</ButtonLink>
              <Button variant="secondary" leftIcon={<RotateCcw />} onClick={() => window.location.reload()}>Yenə</Button>
            </div>
          </motion.div>
        ) : (
          <>
            <div className="relative aspect-[4/3] w-full [perspective:1400px]">
              <AnimatePresence mode="popLayout" custom={exitDir}>
                <FlashCard key={card.id + stats.done} card={card} flipped={flipped} onFlip={() => setFlipped((f) => !f)} onSwipe={(dir) => (flipped ? grade(dir > 0 ? 2 : 0) : setFlipped(true))} exitDir={exitDir} />
              </AnimatePresence>
            </div>

            <div className="mt-8 h-24 w-full">
              <AnimatePresence mode="wait">
                {flipped ? (
                  <motion.div key="grades" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid grid-cols-4 gap-2 sm:gap-3">
                    {GRADES.map((x, i) => (
                      <button
                        key={x.g}
                        onClick={() => grade(x.g)}
                        className={cn('flex flex-col items-center rounded-2xl border-2 border-ink py-2.5 font-display font-semibold shadow-stamp transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-none', x.cls)}
                      >
                        {x.label}
                        <span className="text-[11px] font-medium opacity-80">{i + 1} · {x.hint}</span>
                      </button>
                    ))}
                  </motion.div>
                ) : (
                  <motion.div key="flip" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-3">
                    <Button size="lg" onClick={() => setFlipped(true)}>Cavabı göstər</Button>
                    <span className="hidden text-sm text-subtle sm:block"><Kbd>Space</Kbd> çevir · sonra <Kbd>1</Kbd>–<Kbd>4</Kbd> qiymət · sürüşdür ← →</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function FlashCard({ card, flipped, onFlip, onSwipe, exitDir }: { card: StudyCard; flipped: boolean; onFlip: () => void; onSwipe: (dir: number) => void; exitDir: number }) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-220, 220], [-12, 12]);
  const againOpacity = useTransform(x, [-140, -40], [1, 0]);
  const goodOpacity = useTransform(x, [40, 140], [0, 1]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (Math.abs(info.offset.x) > 120) onSwipe(info.offset.x > 0 ? 1 : -1);
  };

  return (
    <motion.div
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
      style={{ x, rotate }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      onDragEnd={onDragEnd}
      initial={{ y: 40, opacity: 0, scale: 0.94 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ x: exitDir * 420, opacity: 0, rotate: exitDir * 18, transition: { duration: 0.35 } }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
    >
      <motion.div
        className="relative h-full w-full [transform-style:preserve-3d]"
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ type: 'spring', stiffness: 110, damping: 15 }}
        onClick={onFlip}
      >
        {/* front */}
        <div className="paper-ruled absolute inset-0 flex flex-col rounded-3xl border-2 border-ink bg-elev p-6 pl-14 shadow-[6px_6px_0_0_var(--ink)] [backface-visibility:hidden]">
          <span className="hand text-xl text-muted">{card.isNew ? 'yeni söz' : 'təkrar'}</span>
          <div className="grid flex-1 place-items-center">
            <span className="text-center font-display text-4xl font-bold sm:text-5xl">{card.front}</span>
          </div>
          <span className="hand text-center text-lg text-subtle">toxun və çevir</span>
        </div>
        {/* back */}
        <div className="absolute inset-0 flex flex-col rounded-3xl border-2 border-ink bg-signal p-6 text-signal-fg shadow-[6px_6px_0_0_var(--ink)] [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <span className="hand text-xl opacity-80">{card.front}</span>
          <div className="grid flex-1 place-items-center text-center">
            <div>
              <div className="font-display text-3xl font-bold sm:text-4xl">{card.back}</div>
              {card.example && <p className="hand mt-3 text-2xl opacity-90">“{card.example}”</p>}
            </div>
          </div>
        </div>
      </motion.div>
      {/* swipe hints */}
      <motion.span style={{ opacity: againOpacity }} className="pointer-events-none absolute left-4 top-4 -rotate-12 rounded-lg border-2 border-danger px-2 py-1 font-display font-bold text-danger">YENİDƏN</motion.span>
      <motion.span style={{ opacity: goodOpacity }} className="pointer-events-none absolute right-4 top-4 rotate-12 rounded-lg border-2 border-moss px-2 py-1 font-display font-bold text-moss">YAXŞI</motion.span>
    </motion.div>
  );
}
