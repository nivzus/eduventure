'use client';

import { animate, useInView, useReducedMotion } from 'motion/react';
import { useEffect, useRef } from 'react';
import { cn, formatNumber } from '@/lib/utils';

export interface NumberTickerProps {
  value: number;
  /** start value for the first run (default 0) */
  from?: number;
  duration?: number;
  delay?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  /** custom formatter (overrides decimals) */
  format?: (n: number) => string;
}

/** Animated counter that runs when scrolled into view and re-animates on value change. */
export function NumberTicker({
  value,
  from = 0,
  duration = 1.4,
  delay = 0,
  decimals = 0,
  prefix = '',
  suffix = '',
  className,
  format,
}: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -5% 0px' });
  const reduce = useReducedMotion();
  const last = useRef(from);
  const fmt = (n: number) => prefix + (format ? format(n) : formatNumber(n, decimals)) + suffix;

  useEffect(() => {
    const el = ref.current;
    if (!el || !inView) return;
    if (reduce) {
      el.textContent = fmt(value);
      last.current = value;
      return;
    }
    const controls = animate(last.current, value, {
      duration,
      delay,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        el.textContent = fmt(decimals ? v : Math.round(v));
      },
    });
    last.current = value;
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, inView, reduce]);

  return (
    <span ref={ref} className={cn('tabular-nums', className)}>
      {fmt(from)}
    </span>
  );
}
