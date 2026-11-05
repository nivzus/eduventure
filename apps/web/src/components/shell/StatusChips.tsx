'use client';

import { motion } from 'motion/react';
import { Flame, Mountain } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useMeSummary } from '@/lib/hooks';
import { cn, formatNumber } from '@/lib/utils';
import { Tooltip } from '@/components/ui/Tooltip';
import { NumberTicker } from '@/components/motion/NumberTicker';

export function StreakChip({ className }: { className?: string }) {
  const { user } = useAuth();
  const { data } = useMeSummary();
  const streak = data?.streak ?? user?.streak ?? 0;
  const hot = streak > 0;
  return (
    <Tooltip content={hot ? `${streak} gün ardıcıl fəaliyyət` : 'Bu gün seriyaya başla'} side="bottom">
      <span
        tabIndex={0}
        className={cn(
          'inline-flex h-9 items-center gap-1.5 rounded-full border px-3 font-mono text-[13px] font-semibold tabular-nums',
          hot ? 'border-ember/30 bg-ember/10 text-ember' : 'border-line text-subtle',
          className,
        )}
      >
        <Flame className={cn('size-4', hot && 'animate-flicker')} fill={hot ? 'currentColor' : 'none'} fillOpacity={0.25} />
        {streak}
      </span>
    </Tooltip>
  );
}

export function XpChip({ className }: { className?: string }) {
  const { user } = useAuth();
  const { data } = useMeSummary();
  const level = data?.level ?? user?.level ?? 1;
  const xp = data?.xp ?? user?.xp ?? 0;
  const progress = Math.max(0, Math.min(1, data?.levelProgress ?? 0));
  const toNext = data?.nextLevelXp ? Math.max(0, data.nextLevelXp - xp) : null;

  return (
    <Tooltip content={toNext !== null ? `Növbəti səviyyəyə ${formatNumber(toNext)} XP` : `${formatNumber(xp)} XP`} side="bottom">
      <span tabIndex={0} className={cn('inline-flex h-9 items-center gap-2.5 rounded-full border border-aurora/25 bg-aurora/10 pl-1 pr-3', className)}>
        <span className="inline-flex h-7 items-center gap-1 rounded-full bg-aurora px-2 font-display text-[11px] font-bold text-white">
          <Mountain className="size-3.5" strokeWidth={2.4} />
          {level}
        </span>
        <span className="relative hidden h-1.5 w-14 overflow-hidden rounded-full bg-fg/10 sm:block">
          <motion.span
            className="absolute inset-y-0 left-0 rounded-full bg-aurora"
            initial={{ width: 0 }}
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          />
        </span>
        <span className="font-mono text-[12px] font-semibold tabular-nums text-aurora">
          <NumberTicker value={xp} duration={1} />
          <span className="ml-0.5 opacity-70">XP</span>
        </span>
      </span>
    </Tooltip>
  );
}
