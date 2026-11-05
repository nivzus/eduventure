'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { ArrowRight, Check, Flag, Lock } from 'lucide-react';
import { ButtonLink, Skeleton } from '@/components/ui';
import { Mascot } from '@/components/brand/Mascot';
import { LogoCat } from '@/components/brand/BookCat';
import { Note, Stamp } from '@/components/notebook';
import { cn } from '@/lib/utils';
import { usePath } from '../hooks';
import type { PathCourse } from '../types';

const EASE = [0.22, 1, 0.36, 1] as const;
/** Waypoint x positions (in %) zig-zag along the trail. */
const XS = [18, 72, 30, 78, 22, 66, 34, 74];

export function PathScreen({ id }: { id: string }) {
  const { data: path, isLoading, isError } = usePath(id);

  if (isLoading) return <div className="mx-auto max-w-4xl px-4 py-10"><Skeleton className="h-[520px] rounded-3xl" /></div>;
  if (isError || !path) {
    return (
      <div className="grid place-items-center px-4 py-20 text-center">
        <Mascot mode="sad" size={110} />
        <h1 className="mt-6 text-3xl">Yol tapılmadı</h1>
        <ButtonLink href="/paths" className="mt-6">Bütün yollar</ButtonLink>
      </div>
    );
  }

  const courses: PathCourse[] = [...(path.courses ?? path.items?.map((i) => i.course!).filter(Boolean) ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const n = courses.length;
  const doneN = courses.filter((c) => c.completed).length;
  const next = courses.find((c) => !c.completed);
  const STEP = 190;
  const TOP = 130; // room for the cat above the current waypoint
  const H = TOP + Math.max(0, n - 1) * STEP + 130;
  const pts = courses.map((_, i) => ({ x: XS[i % XS.length], y: TOP + i * STEP }));
  // smooth trail through the waypoints (viewBox 0..100 x 0..H)
  const d = pts.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = pts[i - 1];
    const my = (prev.y + p.y) / 2;
    return `${acc} C ${prev.x} ${my}, ${p.x} ${my}, ${p.x} ${p.y}`;
  }, '');
  const progress = n ? (doneN === n ? 1 : (doneN + (next?.progress ?? 0)) / Math.max(1, n - 1)) : 0;

  return (
    <div className="mx-auto max-w-4xl px-4 pb-20 pt-8 sm:px-6">
      <Link href="/paths" className="hand text-xl text-muted hover:text-fg">← bütün yollar</Link>
      <header className="mt-4 flex flex-wrap items-end justify-between gap-6">
        <div>
          <Note className="text-2xl !text-signal">öyrənmə yolu</Note>
          <h1 className="mt-1 text-4xl leading-tight sm:text-6xl">{path.title}</h1>
          {path.description && <p className="mt-3 max-w-xl text-lg text-muted">{path.description}</p>}
        </div>
        <div className="sm:text-right">
          <div className="font-display text-5xl font-bold tabular-nums">{doneN}<span className="text-2xl text-subtle">/{n}</span></div>
          <div className="hand text-xl text-muted">kurs tamamlandı</div>
        </div>
      </header>
      {next && (
        <ButtonLink href={`/courses/${next.id}`} size="lg" magnetic rightIcon={<ArrowRight />} className="mt-6">
          {doneN ? 'Davam et' : 'Yola çıx'}: {next.title}
        </ButtonLink>
      )}

      {/* Trail map */}
      <section className="paper-dots relative mt-10 overflow-hidden rounded-3xl border-2 border-ink bg-sunken shadow-[6px_6px_0_0_var(--ink)]" style={{ height: H }}>
        <svg viewBox={`0 0 100 ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
          <path d={d} stroke="var(--border-strong)" strokeWidth="3" strokeDasharray="2 9" strokeLinecap="round" fill="none" vectorEffect="non-scaling-stroke" />
          <motion.path d={d} stroke="var(--signal)" strokeWidth="5" strokeLinecap="round" fill="none" vectorEffect="non-scaling-stroke"
            initial={{ pathLength: 0 }} whileInView={{ pathLength: Math.min(1, Math.max(0.001, progress)) }} viewport={{ once: true }} transition={{ duration: 1.6, ease: EASE }} />
        </svg>

        {courses.map((c, i) => {
          const p = pts[i];
          const done = Boolean(c.completed);
          const isNext = next?.id === c.id;
          const right = p.x < 50;
          const pct = Math.round((c.progress ?? 0) * 100);
          return (
            <motion.div
              key={c.id}
              className="absolute"
              style={{ left: `${p.x}%`, top: p.y }}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15 * i, type: 'spring', stiffness: 260, damping: 20 }}
            >
              {/* waypoint */}
              <span className={cn(
                'absolute -left-7 -top-7 grid size-14 place-items-center rounded-full border-2 border-ink font-display text-lg font-bold shadow-stamp-sm',
                done ? 'bg-moss text-white' : isNext ? 'bg-signal text-signal-fg' : 'bg-elev text-muted',
              )}>
                {done ? <Check className="size-6" strokeWidth={3} /> : c.locked ? <Lock className="size-5" /> : i + 1}
              </span>
              {isNext && (
                <span className="absolute -top-[92px] left-0 -translate-x-1/2">
                  <LogoCat face="happy" blink className="h-14 w-auto" />
                </span>
              )}
              {/* card */}
              <Link
                href={`/courses/${c.id}`}
                className={cn(
                  'absolute top-[-2.6rem] w-[min(260px,52vw)] rounded-2xl border bg-elev p-3.5 shadow-paper transition-transform hover:-translate-y-0.5 sm:p-4',
                  right ? 'left-11' : 'right-11',
                  isNext ? 'border-2 border-ink' : 'border-line',
                )}
              >
                <div className="hand text-lg text-muted">{c.level ?? 'kurs'} · {c.itemCount ?? 0} addım</div>
                <div className="font-display text-base font-semibold leading-snug sm:text-lg">{c.title}</div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sunken">
                  <div className={cn('h-full rounded-full', done ? 'bg-moss' : 'bg-signal')} style={{ width: `${done ? 100 : pct}%` }} />
                </div>
              </Link>
            </motion.div>
          );
        })}

        <div className="absolute bottom-4 right-5 flex items-center gap-2">
          <Flag className="size-5 text-signal" />
          <span className="hand text-2xl">zirvə</span>
        </div>
        {path.completed && <Stamp inView={false} tone="moss" rotate={-12} className="absolute right-6 top-6 text-[10px]">Yol<br />fəth edildi</Stamp>}
      </section>
    </div>
  );
}
