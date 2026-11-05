'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { Avatar } from '@/components/ui';
import { cn, formatNumber } from '@/lib/utils';
import type { LeaderboardEntry } from '../../types';

const EASE = [0.22, 1, 0.36, 1] as const;

export function LeaderRow({ entry, max, me, index = 0, compact, className }: { entry: LeaderboardEntry; max: number; me?: boolean; index?: number; compact?: boolean; className?: string }) {
  const reduce = useReducedMotion();
  const share = max > 0 ? Math.max(0.02, entry.xp / max) : 0;
  return (
    <motion.li
      layout={!reduce}
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ layout: { type: 'spring', stiffness: 380, damping: 30 }, duration: 0.4, delay: Math.min(index, 12) * 0.03, ease: EASE }}
      className={cn(
        'group/lr relative list-none rounded-2xl border transition-colors',
        me ? 'border-signal/40 bg-signal/[0.07] light:border-aurora/40 light:bg-aurora/[0.06]' : 'border-transparent hover:border-line hover:bg-fg/[0.03]',
        className,
      )}
    >
      <Link href={`/u/${entry.user.id}`} className={cn('flex items-center gap-3 sm:gap-4', compact ? 'px-2 py-2' : 'px-3 py-2.5 sm:px-4')}>
        <span className={cn('w-7 shrink-0 text-right font-mono tabular', compact ? 'text-xs text-subtle' : 'text-sm text-muted')}>
          {String(entry.rank).padStart(2, '0')}
        </span>
        <Avatar name={entry.user.name} src={entry.user.avatarUrl} size={compact ? 'sm' : 36} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold">{entry.user.name}</span>
            {me && <span className="shrink-0 rounded-full bg-signal px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-signal-fg">sən</span>}
          </span>
          {!compact && (
            <span className="mt-1.5 flex items-center gap-2">
              <span className="relative h-1 flex-1 overflow-hidden rounded-full bg-fg/[0.07]">
                <motion.span
                  className={cn('absolute inset-y-0 left-0 rounded-full', me ? 'bg-signal light:bg-aurora' : 'bg-aurora/70')}
                  initial={reduce ? false : { width: 0 }}
                  animate={{ width: `${share * 100}%` }}
                  transition={{ duration: 0.8, ease: EASE }}
                />
              </span>
              <span className="shrink-0 font-mono text-[10px] uppercase text-subtle">Sv {entry.user.level}</span>
            </span>
          )}
        </span>
        <span className="shrink-0 text-right">
          <span className={cn('font-display font-semibold tabular', compact ? 'text-sm' : 'text-base')}>{formatNumber(entry.xp)}</span>
          <span className="ml-1 font-mono text-[10px] text-subtle">XP</span>
        </span>
      </Link>
    </motion.li>
  );
}
