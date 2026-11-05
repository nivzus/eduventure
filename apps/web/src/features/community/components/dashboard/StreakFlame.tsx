'use client';

import { motion, useReducedMotion } from 'motion/react';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { ActivityDay } from '../../types';
import { dayKey } from '../../lib/format';

const WEEK_SHORT = ['B', 'Be', 'Ça', 'Ç', 'Ca', 'C', 'Ş'];

interface StreakFlameProps {
  streak: number;
  activity?: ActivityDay[];
}

export function Flame({ lit, size = 96 }: { lit: boolean; size?: number }) {
  const reduce = useReducedMotion();
  const animate = lit && !reduce;
  return (
    <motion.svg
      width={size}
      height={size * 1.2}
      viewBox="0 0 100 120"
      aria-hidden
      initial={{ scale: 0.6, opacity: 0, y: 12 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 120, damping: 20, delay: 0.15 }}
      style={{ filter: lit ? 'drop-shadow(0 10px 28px color-mix(in oklab, var(--ember) 55%, transparent))' : undefined }}
    >
      <defs>
        <linearGradient id="ev-flame-outer" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor={lit ? 'var(--ember)' : 'var(--fg-subtle)'} />
          <stop offset="1" stopColor={lit ? 'color-mix(in oklab, var(--ember) 60%, #ffd84d)' : 'var(--border-strong)'} />
        </linearGradient>
        <linearGradient id="ev-flame-inner" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor={lit ? '#ffe9a8' : 'var(--fg-muted)'} />
          <stop offset="1" stopColor={lit ? 'var(--signal)' : 'var(--fg-subtle)'} stopOpacity={lit ? 0.9 : 0.4} />
        </linearGradient>
      </defs>
      <motion.path
        d="M50 4C56 26 80 38 80 70c0 24-14 44-30 46-16-2-30-22-30-46 0-14 6-24 12-30 1 10 5 16 11 18C42 40 40 22 50 4Z"
        fill="url(#ev-flame-outer)"
        style={{ originX: '50%', originY: '100%' }}
        animate={animate ? { scaleY: [1, 1.05, 0.97, 1.03, 1], skewX: [0, -2, 1.5, -1, 0] } : undefined}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.path
        d="M50 52c4 12 16 18 16 34 0 14-8 24-16 25-8-1-16-11-16-25 0-8 3-13 7-16 0 6 3 9 6 10-1-10 0-20 3-28Z"
        fill="url(#ev-flame-inner)"
        style={{ originX: '50%', originY: '100%' }}
        animate={animate ? { scaleY: [1, 0.94, 1.08, 0.98, 1], scaleX: [1, 1.04, 0.96, 1.02, 1] } : undefined}
        transition={{ duration: 1.7, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
      />
    </motion.svg>
  );
}

/** Streak with a living flame and the last 7 days as embers. */
export function StreakFlame({ streak, activity = [] }: StreakFlameProps) {
  const lit = streak > 0;
  const week = useMemo(() => {
    const map = new Map(activity.map((d) => [d.date.slice(0, 10), d.count]));
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i));
      return { key: dayKey(d), label: WEEK_SHORT[d.getDay()], count: map.get(dayKey(d)) ?? 0, today: i === 6 };
    });
  }, [activity]);

  return (
    <div className="flex h-full flex-col justify-between gap-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="mono-label">Günlük seriya</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={cn('display-tight text-6xl font-bold', lit ? 'text-fg' : 'text-subtle')}>{streak}</span>
            <span className="text-sm text-muted">gün</span>
          </div>
          <p className="mt-2 max-w-[22ch] text-sm text-muted">
            {lit
              ? streak >= 7
                ? 'Alov güclüdür — ritmi qoru.'
                : 'Hər gün bir addım. Sabah da qayıt.'
              : 'Bu gün bir dərs et və alovu yenidən yandır.'}
          </p>
        </div>
        <Flame lit={lit} size={84} />
      </div>
      <ol className="grid grid-cols-7 gap-1.5" aria-label="Son 7 günün fəaliyyəti">
        {week.map((d, i) => (
          <li key={d.key} className="flex flex-col items-center gap-1.5">
            <motion.span
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.35 + i * 0.05, type: 'spring', stiffness: 380, damping: 30 }}
              className={cn(
                'grid h-7 w-full max-w-9 place-items-center rounded-full border text-[10px] font-mono',
                d.count > 0 ? 'border-ember/40 bg-ember/20 text-ember' : 'border-line bg-sunken text-subtle',
                d.today && 'ring-1 ring-[var(--border-strong)] ring-offset-2 ring-offset-[var(--bg-elev)]',
              )}
              title={`${d.count} fəaliyyət`}
            >
              {d.count > 0 ? d.count : '·'}
            </motion.span>
            <span className={cn('font-mono text-[10px] uppercase', d.today ? 'text-fg' : 'text-subtle')}>{d.label}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
