'use client';

import { motion, useReducedMotion } from 'motion/react';
import { Hourglass, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatClock } from '../../lib/utils';

interface AttemptTimerProps {
  /** Seconds remaining (countdown) — or elapsed when `limitSec` is absent. */
  seconds: number;
  limitSec?: number | null;
  className?: string;
}

/** Mono countdown. Turns ember in the last 20% / 60s and pulses in the last 10s. */
export function AttemptTimer({ seconds, limitSec, className }: AttemptTimerProps) {
  const reduce = useReducedMotion();
  const countdown = Boolean(limitSec);
  const ratio = countdown && limitSec ? Math.max(0, Math.min(1, seconds / limitSec)) : 1;
  const warn = countdown && (seconds <= 60 || ratio <= 0.2);
  const critical = countdown && seconds <= 10;

  const R = 9;
  const C = 2 * Math.PI * R;

  return (
    <div
      role="timer"
      aria-live={critical ? 'assertive' : 'off'}
      aria-label={countdown ? `Qalan vaxt ${formatClock(seconds)}` : `Keçən vaxt ${formatClock(seconds)}`}
      className={cn(
        'relative flex h-10 items-center gap-2 rounded-2xl border px-3 font-mono text-[15px] font-medium tabular-nums transition-colors duration-500',
        warn ? 'border-ember/50 bg-ember/10 text-ember' : 'border-line bg-elev text-fg',
        className,
      )}
    >
      {countdown ? (
        <svg viewBox="0 0 24 24" className="h-5 w-5 -rotate-90" aria-hidden>
          <circle cx="12" cy="12" r={R} fill="none" stroke="currentColor" strokeOpacity={0.2} strokeWidth={2.5} />
          <circle
            cx="12"
            cy="12"
            r={R}
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - ratio)}
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>
      ) : (
        <Timer className="h-4 w-4 text-muted" aria-hidden />
      )}
      <motion.span
        key={critical ? seconds : 'steady'}
        initial={critical && !reduce ? { scale: 1.25 } : false}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 20 }}
      >
        {formatClock(seconds)}
      </motion.span>
      {critical && !reduce && (
        <span className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-ember/60 animate-pulse" aria-hidden />
      )}
      {warn && !critical && <Hourglass className="h-3.5 w-3.5" aria-hidden />}
    </div>
  );
}
