'use client';

import { motion, useReducedMotion } from 'motion/react';
import { Flag, Tent } from 'lucide-react';
import { NumberTicker } from '@/components/motion';
import { clamp, formatNumber, xpForLevel } from '@/lib/utils';

interface AltimeterProps {
  xp: number;
  level: number;
  /** 0-1 */
  progress: number;
  nextLevelXp: number;
}

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Level progress as a vertical altitude gauge: base camp (current level) at the
 * bottom, summit (next level) at the top, the climber marker at the current XP.
 */
export function Altimeter({ xp, level, progress, nextLevelXp }: AltimeterProps) {
  const reduce = useReducedMotion();
  const floor = xpForLevel(level);
  const ceil = nextLevelXp > floor ? nextLevelXp : xpForLevel(level + 1);
  const p = clamp(Number.isFinite(progress) ? progress : (xp - floor) / Math.max(1, ceil - floor));
  const pct = p * 100;
  const remaining = Math.max(0, ceil - xp);
  const majors = [0, 0.25, 0.5, 0.75, 1];
  const minors = Array.from({ length: 21 }, (_, i) => i / 20);

  return (
    <div className="flex h-full min-h-[340px] gap-5 sm:gap-7">
      {/* gauge */}
      <div className="relative flex w-[92px] shrink-0 flex-col" aria-hidden>
        <div className="relative flex-1">
          {/* track */}
          <div className="absolute inset-y-0 left-0 w-3.5 overflow-hidden rounded-full bg-sunken shadow-[inset_0_0_0_1px_var(--border)]">
            <motion.div
              className="absolute inset-x-0 bottom-0 rounded-full"
              style={{
                background: 'linear-gradient(to top, color-mix(in oklab, var(--signal) 18%, transparent), var(--signal))',
                boxShadow: '0 0 18px -2px color-mix(in oklab, var(--signal) 70%, transparent)',
              }}
              initial={reduce ? false : { height: '0%' }}
              animate={{ height: `${pct}%` }}
              transition={{ duration: 1.6, delay: 0.25, ease: EASE }}
            />
          </div>
          {/* ticks */}
          {minors.map((f) => {
            const major = majors.includes(f);
            return (
              <motion.span
                key={f}
                className="absolute left-5 h-px bg-[var(--border-strong)]"
                style={{ bottom: `${f * 100}%`, width: major ? 14 : 6, opacity: major ? 1 : 0.6 }}
                initial={reduce ? false : { scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.4, delay: 0.1 + f * 0.6, ease: EASE }}
              />
            );
          })}
          {majors.map((f) => (
            <span
              key={`l${f}`}
              className="absolute left-[42px] translate-y-1/2 font-mono text-[10px] tabular text-subtle"
              style={{ bottom: `${f * 100}%` }}
            >
              {formatNumber(Math.round(floor + (ceil - floor) * f))}
            </span>
          ))}
          {/* climber marker */}
          <motion.div
            className="absolute -left-[5px] z-10 translate-y-1/2"
            initial={reduce ? false : { bottom: '0%' }}
            animate={{ bottom: `${pct}%` }}
            transition={{ duration: 1.6, delay: 0.25, ease: EASE }}
          >
            <span className="relative grid size-6 place-items-center rounded-full border-2 border-bg bg-signal shadow-glow">
              <span className="absolute inset-0 animate-pulse-ring rounded-full bg-signal/40" />
              <span className="size-1.5 rounded-full bg-signal-fg" />
            </span>
          </motion.div>
        </div>
      </div>

      {/* readout */}
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-muted">
            <Flag className="size-4 text-signal" />
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">Zirvə · Səviyyə {level + 1}</span>
          </div>
          <p className="text-sm text-muted">
            <span className="font-semibold text-fg">{formatNumber(remaining)} XP</span> qalıb
          </p>
          <span
            className="block font-display text-5xl font-semibold leading-none text-transparent opacity-50 sm:text-6xl"
            style={{ WebkitTextStroke: '1px var(--border-strong)' }}
            aria-hidden
          >
            {String(level + 1).padStart(2, '0')}
          </span>
        </div>

        <div>
          <span className="mono-label">Hündürlük</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              <NumberTicker value={xp} />
            </span>
            <span className="font-mono text-xs text-subtle">XP</span>
          </div>
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-sunken">
            <motion.div
              className="h-full rounded-full bg-signal"
              initial={reduce ? false : { width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 1.4, delay: 0.4, ease: EASE }}
            />
          </div>
          <p className="mt-1.5 font-mono text-[11px] text-subtle tabular">{Math.round(pct)}% marşrut</p>
        </div>

        <div>
          <div className="flex items-center gap-2 text-muted">
            <Tent className="size-4" />
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">Düşərgə</span>
          </div>
          <div className="mt-1 flex items-end gap-3">
            <span className="display-tight text-[84px] font-bold leading-[0.8] sm:text-[96px]">{String(level).padStart(2, '0')}</span>
            <span className="pb-1 font-mono text-[11px] uppercase tracking-[0.14em] text-subtle">
              Səviyyə
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
