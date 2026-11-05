'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { Route } from 'lucide-react';
import { ProgressRing, Skeleton } from '@/components/ui';
import { Mascot } from '@/components/brand/Mascot';
import { Highlight, Note, Stamp } from '@/components/notebook';
import { usePaths } from '../hooks';

export function PathsScreen() {
  const { data, isLoading } = usePaths();
  const paths = data ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6">
      <Note className="text-2xl !text-signal">xəritələr</Note>
      <h1 className="mt-1 text-4xl sm:text-6xl">
        Öyrənmə <Highlight inView={false} delay={0.3}>yolları</Highlight>
      </h1>
      <p className="mt-3 max-w-xl text-lg text-muted">Bir neçə kursu birləşdirən böyük marşrut — başlanğıcdan zirvəyə qədər.</p>

      {isLoading ? (
        <div className="mt-10 grid gap-6 md:grid-cols-2">{[0, 1].map((i) => <Skeleton key={i} className="h-56 rounded-3xl" />)}</div>
      ) : paths.length === 0 ? (
        <div className="mt-16 grid place-items-center"><Mascot mode="static" size={120} message="Yollar tezliklə!" /></div>
      ) : (
        <div className="mt-10 grid gap-8 md:grid-cols-2">
          {paths.map((p, i) => {
            const pct = Math.round((p.progress ?? 0) * 100);
            const n = p.courseCount ?? p.courseIds?.length ?? p.courses?.length ?? 0;
            return (
              <motion.div key={p.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
                <Link href={`/paths/${p.id}`} className="group relative block overflow-hidden rounded-3xl border-2 border-ink bg-elev shadow-stamp transition-transform hover:-translate-y-1 hover:rotate-[-0.4deg]">
                  {/* mini map */}
                  <div className="paper-dots relative h-36 border-b-2 border-dashed border-line-strong bg-sunken">
                    <svg viewBox="0 0 400 140" className="absolute inset-0 h-full w-full" preserveAspectRatio="none" aria-hidden>
                      <path d="M20 115 C 90 30, 150 130, 210 70 S 330 20, 380 40" stroke="var(--border-strong)" strokeWidth="3" strokeDasharray="2 10" strokeLinecap="round" fill="none" />
                      <motion.path d="M20 115 C 90 30, 150 130, 210 70 S 330 20, 380 40" stroke="var(--signal)" strokeWidth="4" strokeLinecap="round" fill="none" initial={{ pathLength: 0 }} animate={{ pathLength: Math.max(0.02, p.progress ?? 0) }} transition={{ delay: 0.3 + i * 0.07, duration: 1.2 }} />
                    </svg>
                    <span className="absolute bottom-3 left-3 text-2xl">⛺</span>
                    <span className="absolute right-3 top-2 text-2xl">🏁</span>
                  </div>
                  <div className="flex items-center gap-5 p-6">
                    <div className="min-w-0 flex-1">
                      <div className="hand flex items-center gap-1.5 text-lg text-muted"><Route className="size-4" /> {n} kurs</div>
                      <h2 className="mt-1 text-2xl leading-tight">{p.title}</h2>
                      {p.description && <p className="mt-1.5 line-clamp-2 text-muted">{p.description}</p>}
                    </div>
                    <ProgressRing value={pct} size={70} stroke={7} tone="signal"><span className="font-display font-bold">{pct}%</span></ProgressRing>
                  </div>
                  {p.completed && <Stamp inView={false} tone="moss" rotate={-12} className="absolute right-4 top-4 text-[10px]">Zirvə<br />✓</Stamp>}
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
