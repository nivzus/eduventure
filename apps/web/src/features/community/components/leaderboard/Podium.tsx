'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef } from 'react';
import { Crown } from 'lucide-react';
import { Avatar } from '@/components/ui';
import { cn, formatNumber } from '@/lib/utils';
import type { LeaderboardEntry } from '../../types';
import { ContourField } from '../shared/ContourField';

const SPRING = { type: 'spring', stiffness: 120, damping: 20 } as const;

const SLOTS = [
  { place: 2, height: 0.68, delay: 0.15, ring: 'aurora' as const, tone: 'var(--aurora)' },
  { place: 1, height: 1, delay: 0.3, ring: 'signal' as const, tone: 'var(--signal)' },
  { place: 3, height: 0.5, delay: 0, ring: 'ember' as const, tone: 'var(--ember)' },
];

/** Summit podium for the top 3: pillars rise, climbers land, flag waves on #1. */
export function Podium({ entries, meId, animKey }: { entries: LeaderboardEntry[]; meId?: string; animKey: string }) {
  const reduce = useReducedMotion();
  const byPlace = new Map(entries.slice(0, 3).map((e, i) => [i + 1, e]));
  // entrance choreography only on first paint; afterwards climbers glide between pillars (layoutId)
  const first = useRef(true);
  useEffect(() => {
    const t = setTimeout(() => (first.current = false), 1500);
    return () => clearTimeout(t);
  }, []);
  const enter = !reduce && first.current;

  return (
    <div className="relative isolate overflow-hidden rounded-3xl border border-line bg-elev px-3 pt-8 shadow-inner-hl sm:px-8 sm:pt-10">
      <ContourField seed={`podium-${animKey}`} x={0.5} y={0.42} rings={11} className="-z-[1] opacity-70" />
      <div aria-hidden className="absolute inset-x-0 bottom-0 -z-[1] h-1/2 bg-gradient-to-t from-bg/80 to-transparent" />
      <ol className="mx-auto grid max-w-2xl grid-cols-3 items-end gap-2 sm:gap-5">
        {SLOTS.map((slot) => {
          const e = byPlace.get(slot.place);
          const me = e && e.user.id === meId;
          return (
            <li key={slot.place} className="flex flex-col items-center" aria-label={e ? `${slot.place}. yer: ${e.user.name}, ${e.xp} XP` : `${slot.place}. yer boşdur`}>
              {/* climber */}
              <div className="relative mb-3 flex min-h-[132px] w-full flex-col items-center justify-end text-center sm:min-h-[150px]">
                {e ? (
                  <motion.div
                    key={e.user.id}
                    layoutId={reduce ? undefined : `podium-${e.user.id}`}
                    initial={enter ? { y: -36, opacity: 0, scale: 0.8 } : { opacity: 0 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    transition={{ ...SPRING, delay: enter ? slot.delay + 0.45 : 0 }}
                    className="flex w-full flex-col items-center"
                  >
                    {slot.place === 1 && (
                      <motion.span
                        className="mb-1 text-signal light:text-ember"
                        animate={reduce ? undefined : { rotate: [-6, 6, -6], y: [0, -2, 0] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                        aria-hidden
                      >
                        <Crown className="size-6" />
                      </motion.span>
                    )}
                    <Link href={`/u/${e.user.id}`} className="rounded-full focus-visible:outline-offset-4">
                      <Avatar name={e.user.name} src={e.user.avatarUrl} size={slot.place === 1 ? 76 : 60} ring={slot.ring} />
                    </Link>
                    <Link href={`/u/${e.user.id}`} className="mt-2.5 line-clamp-1 max-w-full px-1 text-[13px] font-semibold hover:underline sm:text-sm">
                      {e.user.name}
                      {me && <span className="ml-1 font-mono text-[10px] uppercase text-signal light:text-aurora">sən</span>}
                    </Link>
                    <span className="mt-0.5 font-mono text-[11px] text-muted tabular">
                      {formatNumber(e.xp)} XP · Sv {e.user.level}
                    </span>
                  </motion.div>
                ) : (
                  <span className="grid size-14 place-items-center rounded-full border border-dashed border-line-strong font-mono text-xs text-subtle">?</span>
                )}
              </div>
              {/* pillar */}
              <motion.div
                className={cn(
                  'relative w-full overflow-hidden rounded-t-[22px] border border-b-0 border-line-strong',
                  'bg-[linear-gradient(to_bottom,color-mix(in_oklab,var(--surface)_100%,transparent),color-mix(in_oklab,var(--surface)_30%,transparent))]',
                )}
                style={{ height: `${Math.round(slot.height * 190)}px`, originY: 1 }}
                initial={reduce ? false : { scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ ...SPRING, delay: slot.delay }}
              >
                <span aria-hidden className="absolute inset-x-0 top-0 h-[3px]" style={{ background: slot.tone, boxShadow: `0 0 24px 2px ${slot.tone}` }} />
                <span aria-hidden className="absolute inset-0 topo-texture opacity-40" />
                <span className="absolute inset-x-0 top-4 text-center font-display text-4xl font-bold tracking-tight text-fg/90 sm:text-6xl">
                  {String(slot.place).padStart(2, '0')}
                </span>
              </motion.div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
