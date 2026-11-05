'use client';

import { motion, useReducedMotion, type Transition } from 'motion/react';
import { cn } from '@/lib/utils';
import { BOOK, CAT_DARK, CAT_LIGHT, CAT_ORIGIN } from './logo-paths';

/** Logo oranges (fixed brand colors, independent of theme). */
export const LOGO_ORANGE = '#D85810';
export const LOGO_PAGE = '#F0A458';

const EASE = [0.22, 1, 0.36, 1] as const;

export interface BookCatMarkProps {
  className?: string;
  /** play the opening sequence on mount (book opens → pages draw → cat appears) */
  animated?: boolean;
  /** delay before the opening sequence (s) */
  delay?: number;
  /** subtle idle life after opening: tail-light shimmer + breathing cat */
  idle?: boolean;
  title?: string;
}

/**
 * The Eduventure mark — an open book with the cat sitting on the right page.
 * Vector-rebuilt from the official logo so it stays crisp at any size and can animate.
 */
export function BookCatMark({ className, animated = false, delay = 0, idle = false, title }: BookCatMarkProps) {
  const reduce = useReducedMotion();
  const play = animated && !reduce;
  const t = (d: number, dur = 0.7): Transition => ({ delay: delay + d, duration: dur, ease: EASE });

  return (
    <svg
      viewBox="0 0 500 520"
      className={cn('block', className)}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      fill="none"
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      {/* left page swings open from the spine */}
      <motion.g
        style={{ originX: '247px', originY: '300px', transformBox: 'view-box' }}
        initial={play ? { scaleX: 0, skewY: -12 } : false}
        animate={{ scaleX: 1, skewY: 0 }}
        transition={t(0.05, 0.9)}
      >
        <path d={BOOK.leftFill} fill={LOGO_PAGE} />
        <path d={BOOK.leftFrame} stroke={LOGO_ORANGE} strokeWidth={BOOK.stroke} />
      </motion.g>

      {/* spine */}
      <motion.path
        d={BOOK.spine}
        stroke={LOGO_ORANGE}
        strokeWidth={BOOK.stroke}
        initial={play ? { pathLength: 0 } : false}
        animate={{ pathLength: 1 }}
        transition={t(0, 0.5)}
      />

      {/* right page draws itself like a pen stroke */}
      <motion.path
        d={BOOK.rightFrame}
        stroke={LOGO_ORANGE}
        strokeWidth={BOOK.stroke}
        initial={play ? { pathLength: 0 } : false}
        animate={{ pathLength: 1 }}
        transition={t(0.45, 1.1)}
      />

      {/* the cat */}
      <g transform={`translate(${CAT_ORIGIN.x} ${CAT_ORIGIN.y})`}>
      <motion.g
        initial={play ? { opacity: 0, y: 26 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={play ? { delay: delay + 1.15, type: 'spring', stiffness: 220, damping: 16 } : undefined}
      >
        <motion.g
          style={{ originX: '70px', originY: '279px', transformBox: 'view-box' }}
          animate={idle && !reduce ? { scaleY: [1, 1.025, 1] } : undefined}
          transition={idle ? { duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay: delay + 2 } : undefined}
        >
          <path d={CAT_DARK} fill={LOGO_ORANGE} />
          <motion.path
            d={CAT_LIGHT}
            fill={LOGO_PAGE}
            initial={play ? { opacity: 0 } : false}
            animate={idle && !reduce ? { opacity: [1, 0.55, 1] } : { opacity: 1 }}
            transition={idle ? { duration: 2.6, repeat: Infinity, ease: 'easeInOut', delay: delay + 1.8 } : t(1.5, 0.5)}
          />
        </motion.g>
      </motion.g>
      </g>
    </svg>
  );
}

/** Just the cat silhouette from the logo (for mascots, stamps, empty states). */
export function LogoCat({ className, color = LOGO_ORANGE, accent = LOGO_PAGE }: { className?: string; color?: string; accent?: string }) {
  return (
    <svg viewBox={`0 0 ${CAT_ORIGIN.w} ${CAT_ORIGIN.h}`} className={cn('block', className)} aria-hidden>
      <path d={CAT_DARK} fill={color} />
      <path d={CAT_LIGHT} fill={accent} />
    </svg>
  );
}

/** Full lockup: mark + EDUVENTURE / WITH SEDA (rounded caps, like the official logo). */
export function LogoLockup({
  className,
  animated,
  delay = 0,
  layout = 'stacked',
}: {
  className?: string;
  animated?: boolean;
  delay?: number;
  layout?: 'stacked' | 'inline';
}) {
  const reduce = useReducedMotion();
  const play = animated && !reduce;
  const stacked = layout === 'stacked';
  return (
    <div className={cn('inline-flex items-center', stacked ? 'flex-col gap-3' : 'gap-3', className)}>
      <BookCatMark animated={animated} delay={delay} idle className={stacked ? 'w-[62%]' : 'h-full w-auto'} />
      <motion.div
        className={cn('font-brand font-bold uppercase leading-none', stacked ? 'text-center' : '')}
        style={{ color: LOGO_ORANGE }}
        initial={play ? { opacity: 0, y: 10, letterSpacing: '0.3em' } : false}
        animate={{ opacity: 1, y: 0, letterSpacing: '0.04em' }}
        transition={{ delay: delay + 1.3, duration: 0.8, ease: EASE }}
      >
        <div className={stacked ? 'text-[1em]' : 'text-[0.62em]'}>Eduventure</div>
        <div className={cn('mt-[0.3em] font-medium tracking-[0.18em]', stacked ? 'text-[0.46em]' : 'text-[0.3em]')}>with Seda</div>
      </motion.div>
    </div>
  );
}
