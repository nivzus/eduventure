'use client';

import { motion, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/utils';

const EASE = [0.22, 1, 0.36, 1] as const;

interface MastheadProps {
  eyebrow: string;
  /** right side of the eyebrow rule, e.g. "№ 12 məqalə" */
  meta?: React.ReactNode;
  /** Plain words; wrap the accent word in `*asterisks*` to set it in Instrument Serif italic. */
  title: string;
  description?: React.ReactNode;
  aside?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

/** Editorial page masthead: mono rule, oversized display title with a serif accent word, staggered word reveal. */
export function Masthead({ eyebrow, meta, title, description, aside, actions, className }: MastheadProps) {
  const reduce = useReducedMotion();
  const words = title.split(' ');

  return (
    <header className={cn('relative pt-2 pb-8 md:pb-12', className)}>
      <div className="flex items-center gap-3">
        <span className="size-1.5 rounded-full bg-signal" aria-hidden />
        <span className="mono-label text-muted">{eyebrow}</span>
        <motion.span
          aria-hidden
          className="h-px flex-1 origin-left bg-line-strong"
          initial={reduce ? false : { scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.9, ease: EASE }}
        />
        {meta && <span className="mono-label tabular">{meta}</span>}
      </div>

      <div className="mt-6 grid gap-8 md:mt-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="min-w-0">
          <h1 className="display-tight text-[clamp(2.4rem,7vw,5.6rem)] font-semibold">
            {words.map((w, i) => {
              const accent = /^\*.+\*[.,!?—]*$/.test(w);
              const clean = accent ? w.replace(/\*/g, '') : w;
              return (
                <span key={i} className="inline-block overflow-hidden pb-[0.12em] align-bottom">
                  <motion.span
                    className={cn('inline-block', accent && 'accent pr-[0.08em] text-signal light:text-ember')}
                    initial={reduce ? false : { y: '105%', opacity: 0 }}
                    animate={{ y: '0%', opacity: 1 }}
                    transition={{ duration: 0.8, ease: EASE, delay: 0.05 + i * 0.05 }}
                  >
                    {clean}
                  </motion.span>
                  {i < words.length - 1 && ' '}
                </span>
              );
            })}
          </h1>
          {description && (
            <motion.p
              className="mt-5 max-w-2xl text-base text-muted md:text-lg"
              initial={reduce ? false : { opacity: 0, y: 12, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.5, ease: EASE, delay: 0.25 }}
            >
              {description}
            </motion.p>
          )}
          {actions && (
            <motion.div
              className="mt-6 flex flex-wrap items-center gap-3"
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE, delay: 0.32 }}
            >
              {actions}
            </motion.div>
          )}
        </div>
        {aside && (
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.2 }}
          >
            {aside}
          </motion.div>
        )}
      </div>
    </header>
  );
}

interface ChipOption<V extends string> {
  value: V;
  label: string;
  count?: number;
}

/** Horizontal, scrollable filter chips with a shared-layout active pill. */
export function FilterChips<V extends string>({
  options,
  value,
  onChange,
  layoutId,
  className,
  label,
}: {
  options: ChipOption<V>[];
  value: V;
  onChange: (v: V) => void;
  layoutId: string;
  className?: string;
  label?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn('scrollbar-none -mx-4 flex gap-1.5 overflow-x-auto px-4 md:mx-0 md:px-0', className)}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'relative inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors',
              active ? 'border-transparent text-signal-fg' : 'border-line text-muted hover:border-line-strong hover:text-fg',
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-full bg-signal"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <span className="relative">{o.label}</span>
            {o.count !== undefined && (
              <span className={cn('relative font-mono text-[11px] tabular', active ? 'opacity-70' : 'text-subtle')}>
                {o.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
