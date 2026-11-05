'use client';

import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import { cn, toneVar, type Tone } from '@/lib/utils';

export interface ProgressProps {
  value: number;
  max?: number;
  tone?: Tone;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /** altimeter tick marks (count) */
  ticks?: number;
  label?: ReactNode;
  showValue?: boolean;
  className?: string;
  'aria-label'?: string;
}

const heights = { xs: 'h-1', sm: 'h-1.5', md: 'h-2.5', lg: 'h-4' };

/** <Progress value={7} max={10} tone="aurora" /> */
export function Progress({ value, max = 100, tone = 'signal', size = 'sm', ticks, label, showValue, className, ...rest }: ProgressProps) {
  const reduce = useReducedMotion();
  const pct = Math.max(0, Math.min(100, max ? (value / max) * 100 : 0));
  const color = toneVar[tone];
  return (
    <div className={cn('w-full', className)}>
      {(label || showValue) && (
        <div className="mb-2 flex items-center justify-between gap-3">
          {label && <span className="mono-label">{label}</span>}
          {showValue && <span className="font-mono text-xs tabular-nums text-muted">{Math.round(pct)}%</span>}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-label={rest['aria-label']}
        className={cn('relative w-full overflow-hidden rounded-full bg-fg/[0.08]', heights[size])}
      >
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ background: color, boxShadow: `0 0 16px -2px color-mix(in oklab, ${color} 60%, transparent)` }}
          initial={{ width: reduce ? `${pct}%` : 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        />
        {ticks && ticks > 1 && (
          <div className="pointer-events-none absolute inset-0 flex justify-between px-[1px]">
            {Array.from({ length: ticks - 1 }).map((_, i) => (
              <span key={i} className="h-full w-px bg-bg/60" style={{ marginLeft: i === 0 ? `${100 / ticks}%` : undefined }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export interface ProgressRingProps {
  /** 0–max (default max 100) */
  value: number;
  max?: number;
  size?: number;
  stroke?: number;
  tone?: Tone;
  className?: string;
  /** center content (defaults to nothing) */
  children?: ReactNode;
  'aria-label'?: string;
}

/** <ProgressRing value={72} size={64} stroke={6} tone="moss">72%</ProgressRing> */
export function ProgressRing({ value, max = 100, size = 56, stroke = 5, tone = 'signal', className, children, ...rest }: ProgressRingProps) {
  const reduce = useReducedMotion();
  const pct = Math.max(0, Math.min(1, max ? value / max : 0));
  const r = (size - stroke) / 2;
  const color = toneVar[tone];
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-label={rest['aria-label']}
      className={cn('relative inline-grid shrink-0 place-items-center', className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" className="text-fg/[0.08]" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          initial={{ pathLength: reduce ? pct : 0 }}
          animate={{ pathLength: pct }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          style={{ filter: `drop-shadow(0 0 6px color-mix(in oklab, ${color} 45%, transparent))` }}
        />
      </svg>
      {children !== undefined && <div className="absolute inset-0 grid place-items-center text-center font-display text-sm font-semibold tabular-nums">{children}</div>}
    </div>
  );
}
