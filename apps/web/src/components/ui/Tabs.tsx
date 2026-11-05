'use client';

import { motion } from 'motion/react';
import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface TabItem<T extends string = string> {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
  /** small counter after the label */
  count?: number;
  disabled?: boolean;
}

export interface TabsProps<T extends string = string> {
  tabs: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: 'sm' | 'md';
  /** stretch tabs to fill width */
  fill?: boolean;
  'aria-label'?: string;
}

function useRovingKeys<T extends string>(tabs: TabItem<T>[], value: T, onChange: (v: T) => void) {
  const ref = useRef<HTMLDivElement>(null);
  const onKeyDown = (e: KeyboardEvent) => {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const enabled = tabs.filter((t) => !t.disabled);
    const i = enabled.findIndex((t) => t.value === value);
    let next = i;
    if (e.key === 'ArrowRight') next = (i + 1) % enabled.length;
    if (e.key === 'ArrowLeft') next = (i - 1 + enabled.length) % enabled.length;
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = enabled.length - 1;
    onChange(enabled[next].value);
    requestAnimationFrame(() => ref.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]')?.focus());
  };
  return { ref, onKeyDown };
}

/** Underline tabs with a sliding layoutId indicator. */
export function Tabs<T extends string = string>({ tabs, value, onChange, className, size = 'md', fill, ...rest }: TabsProps<T>) {
  const id = useId();
  const { ref, onKeyDown } = useRovingKeys(tabs, value, onChange);
  return (
    <div
      ref={ref}
      role="tablist"
      aria-label={rest['aria-label']}
      onKeyDown={onKeyDown}
      className={cn('relative flex items-center gap-1 overflow-x-auto border-b border-line scrollbar-none', className)}
    >
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            role="tab"
            type="button"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            disabled={t.disabled}
            onClick={() => onChange(t.value)}
            className={cn(
              'relative inline-flex shrink-0 items-center gap-2 whitespace-nowrap font-semibold transition-colors duration-200 disabled:opacity-40 focus-visible:outline-offset-[-2px] [&_svg]:size-4',
              size === 'sm' ? 'h-10 px-3 text-[13px]' : 'h-12 px-4 text-sm',
              fill && 'flex-1 justify-center',
              active ? 'text-fg' : 'text-muted hover:text-fg',
            )}
          >
            {t.icon}
            {t.label}
            {t.count !== undefined && (
              <span className={cn('rounded-full px-1.5 py-0.5 font-mono text-[10px] leading-none', active ? 'bg-signal text-signal-fg' : 'bg-fg/[0.08] text-muted')}>
                {t.count}
              </span>
            )}
            {active && (
              <motion.span
                layoutId={`tabs-${id}`}
                className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-signal light:bg-fg"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Pill segmented control — same API as Tabs. */
export function Segmented<T extends string = string>({ tabs, value, onChange, className, size = 'md', fill, ...rest }: TabsProps<T>) {
  const id = useId();
  const { ref, onKeyDown } = useRovingKeys(tabs, value, onChange);
  return (
    <div
      ref={ref}
      role="tablist"
      aria-label={rest['aria-label']}
      onKeyDown={onKeyDown}
      className={cn(
        'relative inline-flex items-center gap-0.5 rounded-full border border-line bg-sunken/70 p-1 light:bg-bg-elev',
        fill && 'flex w-full',
        className,
      )}
    >
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            role="tab"
            type="button"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            disabled={t.disabled}
            onClick={() => onChange(t.value)}
            className={cn(
              'relative inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full font-semibold transition-colors duration-200 disabled:opacity-40 [&_svg]:size-4',
              size === 'sm' ? 'h-7 px-3 text-xs' : 'h-9 px-4 text-[13px]',
              fill && 'flex-1',
              active ? 'text-signal-fg' : 'text-muted hover:text-fg',
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 rounded-full bg-signal shadow-[inset_0_1px_0_rgba(255,255,255,.4)]"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <span className="relative z-[1] inline-flex items-center gap-1.5">
              {t.icon}
              {t.label}
              {t.count !== undefined && <span className="font-mono text-[10px] opacity-70">{t.count}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
