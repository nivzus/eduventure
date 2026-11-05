'use client';

import { motion, useReducedMotion } from 'motion/react';
import { Compass, Timer } from 'lucide-react';
import { cn, SPRING_UI } from '@/lib/utils';
import type { AttemptMode } from '../../types';

interface ModeCardsProps {
  value: AttemptMode;
  onChange: (m: AttemptMode) => void;
  timeLimitLabel: string;
  disabledExam?: boolean;
}

const MODES = [
  {
    value: 'EXAM' as const,
    title: 'İmtahan',
    Icon: Timer,
    lines: ['Vaxt ölçülür, nəticə qeydə alınır', 'Cavablar sonda açıqlanır'],
    xp: '+5–15 XP',
  },
  {
    value: 'PRACTICE' as const,
    title: 'Məşq',
    Icon: Compass,
    lines: ['Hər cavabı dərhal yoxla', 'İzahlar elə orada açılır'],
    xp: '+3 XP',
  },
];

/** Two big tactile cards — the mode is a choice of terrain, not a checkbox. */
export function ModeCards({ value, onChange, timeLimitLabel, disabledExam }: ModeCardsProps) {
  const reduce = useReducedMotion();
  return (
    <div role="radiogroup" aria-label="Rejim" className="grid grid-cols-2 gap-2.5">
      {MODES.map(({ value: v, title, Icon, lines, xp }) => {
        const active = value === v;
        const disabled = v === 'EXAM' && disabledExam;
        return (
          <motion.button
            key={v}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(v)}
            whileHover={reduce || disabled ? undefined : { y: -2 }}
            whileTap={reduce || disabled ? undefined : { scale: 0.97 }}
            className={cn(
              'group relative isolate flex min-h-[176px] flex-col overflow-hidden rounded-3xl border p-4 text-left transition-colors duration-300 sm:p-5',
              active ? 'border-transparent' : 'border-line bg-sunken/50 hover:border-line-strong',
              disabled && 'cursor-not-allowed opacity-40',
            )}
          >
            {active && (
              <motion.span
                layoutId="mode-card-active"
                transition={SPRING_UI}
                className="absolute inset-0 -z-10 rounded-3xl border border-signal/50 bg-signal/[0.08] shadow-[0_0_0_1px_var(--signal),0_20px_50px_-24px_var(--signal)] light:border-fg light:bg-fg/[0.04] light:shadow-[0_0_0_1px_var(--fg)]"
              />
            )}
            {/* tactile ridges */}
            <svg aria-hidden viewBox="0 0 120 60" className="absolute -right-6 -top-4 h-24 w-40 text-fg opacity-[0.07]" fill="none" stroke="currentColor">
              {[10, 18, 26, 34].map((r) => (
                <ellipse key={r} cx="90" cy="20" rx={r * 1.6} ry={r} />
              ))}
            </svg>
            <span
              className={cn(
                'grid h-11 w-11 place-items-center rounded-2xl border transition-colors',
                active ? 'border-transparent bg-signal text-signal-fg' : 'border-line-strong text-muted',
              )}
            >
              <Icon className="h-5 w-5" />
            </span>
            <span className="mt-4 font-display text-lg font-semibold tracking-tight sm:text-xl">{title}</span>
            <span className="mt-1.5 space-y-0.5 text-[13px] leading-snug text-muted">
              {lines.map((l) => (
                <span key={l} className="block">
                  {l}
                </span>
              ))}
            </span>
            <span className="mt-auto flex items-center justify-between gap-2 pt-4">
              <span className={cn('font-mono text-[10px] uppercase tracking-[0.14em]', active ? 'text-fg' : 'text-subtle')}>
                {v === 'EXAM' ? timeLimitLabel : 'Vaxtsız'}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-aurora">{xp}</span>
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
