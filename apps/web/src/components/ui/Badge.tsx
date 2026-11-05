import type { HTMLAttributes, ReactNode } from 'react';
import { cn, toneSoft, type Tone } from '@/lib/utils';

export type BadgeTone = Tone;

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  variant?: 'soft' | 'solid' | 'outline';
  size?: 'sm' | 'md';
  icon?: ReactNode;
  /** leading status dot */
  dot?: boolean;
  /** mono uppercase meta style */
  mono?: boolean;
}

const solid: Record<Tone, string> = {
  neutral: 'bg-fg text-bg border-transparent',
  signal: 'bg-signal text-signal-fg border-transparent',
  ember: 'bg-ember text-white border-transparent',
  aurora: 'bg-aurora text-white border-transparent',
  glacier: 'bg-glacier text-[#04232c] border-transparent',
  moss: 'bg-moss text-[#052e16] border-transparent',
  danger: 'bg-danger text-white border-transparent',
};
const outline: Record<Tone, string> = {
  neutral: 'border-line-strong text-muted',
  signal: 'border-signal/50 text-fg',
  ember: 'border-ember/50 text-ember',
  aurora: 'border-aurora/50 text-aurora',
  glacier: 'border-glacier/50 text-glacier',
  moss: 'border-moss/50 text-moss',
  danger: 'border-danger/50 text-danger',
};
const dotColor: Record<Tone, string> = {
  neutral: 'bg-subtle',
  signal: 'bg-signal',
  ember: 'bg-ember',
  aurora: 'bg-aurora',
  glacier: 'bg-glacier',
  moss: 'bg-moss',
  danger: 'bg-danger',
};

/** <Badge tone="aurora" icon={<Sparkles />}>+20 XP</Badge> */
export function Badge({ tone = 'neutral', variant = 'soft', size = 'sm', icon, dot, mono, className, children, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border font-semibold leading-none [&_svg]:size-3.5',
        size === 'sm' ? 'h-6 px-2.5 text-xs' : 'h-7 px-3 text-[13px]',
        mono && 'font-mono text-[10.5px] uppercase tracking-[0.12em]',
        variant === 'soft' ? toneSoft[tone] : variant === 'solid' ? solid[tone] : outline[tone],
        className,
      )}
      {...rest}
    >
      {dot && <span className={cn('size-1.5 rounded-full', dotColor[tone])} />}
      {icon}
      {children}
    </span>
  );
}
