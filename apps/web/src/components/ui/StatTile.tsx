'use client';

import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn, toneVar, type Tone } from '@/lib/utils';
import { NumberTicker } from '@/components/motion/NumberTicker';
import { renderIcon, type IconLike } from './_internal';

export interface StatTileProps {
  label: ReactNode;
  value: number | string;
  /** number → colored ±% chip; string → shown as-is */
  delta?: number | string;
  icon?: IconLike;
  tone?: Tone;
  /** appended after numeric value, e.g. "%" or " XP" */
  suffix?: string;
  prefix?: string;
  decimals?: number;
  hint?: ReactNode;
  className?: string;
}

/** <StatTile label="Orta nəticə" value={84} suffix="%" delta={6} icon={Target} tone="moss" /> */
export function StatTile({ label, value, delta, icon, tone = 'signal', suffix, prefix, decimals = 0, hint, className }: StatTileProps) {
  const color = toneVar[tone];
  const up = typeof delta === 'number' ? delta >= 0 : undefined;
  return (
    <div className={cn('group relative isolate flex flex-col justify-between gap-6 overflow-hidden rounded-3xl border border-line bg-elev p-5 shadow-inner-hl sm:p-6', className)}>
      <span
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 -z-[1] size-32 rounded-full opacity-[0.12] blur-2xl transition-opacity duration-500 group-hover:opacity-25"
        style={{ background: color }}
      />
      <div className="flex items-start justify-between gap-3">
        <span className="mono-label">{label}</span>
        {icon && (
          <span
            className="grid size-9 place-items-center rounded-xl border border-line [&_svg]:size-[18px]"
            style={{ color, background: `color-mix(in oklab, ${color} 10%, transparent)` }}
          >
            {renderIcon(icon, undefined, 18)}
          </span>
        )}
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="font-display text-3xl font-semibold leading-none tracking-[-0.03em] tabular-nums sm:text-[2.5rem]">
            {typeof value === 'number' ? <NumberTicker value={value} decimals={decimals} prefix={prefix} suffix={suffix} /> : (
              <>
                {prefix}
                {value}
                {suffix}
              </>
            )}
          </div>
          {hint && <div className="mt-2 text-[13px] text-muted">{hint}</div>}
        </div>
        {delta !== undefined && delta !== null && (
          <span
            className={cn(
              'inline-flex shrink-0 items-center gap-0.5 rounded-full px-2 py-1 font-mono text-[11px] font-semibold',
              up === undefined ? 'bg-fg/[0.06] text-muted' : up ? 'bg-moss/12 text-moss' : 'bg-danger/12 text-danger',
            )}
          >
            {up === true && <ArrowUpRight className="size-3.5" />}
            {up === false && <ArrowDownRight className="size-3.5" />}
            {typeof delta === 'number' ? `${Math.abs(delta)}%` : delta}
          </span>
        )}
      </div>
    </div>
  );
}
