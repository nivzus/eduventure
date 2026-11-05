'use client';

import { useId } from 'react';
import { motion, useReducedMotion, type Transition } from 'motion/react';
import { cn } from '@/lib/utils';
import { CAT_DARK, CAT_LIGHT, CAT_ORIGIN, OFFICIAL } from './logo-paths';

/** Logo oranges (fixed brand colors from the official SVG, independent of theme). */
export const LOGO_ORANGE = '#D75818';
export const LOGO_PAGE = '#EEA457';
const LOGO_INK = '#A53E18';

const EASE = [0.22, 1, 0.36, 1] as const;

export interface BookCatMarkProps {
  className?: string;
  /** play the opening sequence on mount (cover → pages open → cat revealed by the white page) */
  animated?: boolean;
  /** delay before the opening sequence (s) */
  delay?: number;
  /** subtle idle life: tail highlight glints, book breathes */
  idle?: boolean;
  title?: string;
}

/**
 * The official Eduventure mark — open book; the right page is transparent and its outline reveals the sitting cat.
 * Paths come 1:1 from public/brand/eduventure-logo.svg.
 */
export function BookCatMark({ className, animated = false, delay = 0, idle = false, title }: BookCatMarkProps) {
  const reduce = useReducedMotion();
  const play = animated && !reduce;
  const t = (d: number, dur = 0.7): Transition => ({ delay: delay + d, duration: dur, ease: EASE });
  const fill = { transformBox: 'fill-box' as const };
  const maskId = `ev-page-${useId().replace(/:/g, '')}`;

  return (
    <svg
      viewBox="21 -2 112 112"
      className={cn('block', className)}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <defs>
        {/* the right page is cut out of the cover → transparent page, the cat stays */}
        <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="-10" width="160" height="130">
          <rect x="0" y="-10" width="160" height="130" fill="#fff" />
          <motion.path
            d={OFFICIAL.rightPage}
            fill="#000"
            style={{ ...fill, originX: 0, originY: 0.5 }}
            initial={play ? { scaleX: 0 } : false}
            animate={{ scaleX: 1 }}
            transition={t(0.6, 0.9)}
          />
        </mask>
      </defs>
      <motion.g
        style={{ ...fill, originX: 0.5, originY: 1 }}
        animate={idle && !reduce ? { scale: [1, 1.012, 1] } : undefined}
        transition={idle ? { duration: 4, repeat: Infinity, ease: 'easeInOut', delay: delay + 2.2 } : undefined}
      >
        {/* cover / frame + cat body */}
        <motion.path
          d={OFFICIAL.base}
          fill={LOGO_ORANGE}
          mask={`url(#${maskId})`}
          style={{ ...fill, originX: 0.5, originY: 1 }}
          initial={play ? { scaleY: 0.2, opacity: 0 } : false}
          animate={{ scaleY: 1, opacity: 1 }}
          transition={play ? { delay, type: 'spring', stiffness: 160, damping: 15 } : undefined}
        />
        {/* left page swings open from the spine */}
        <motion.path
          d={OFFICIAL.leftPage}
          fill={LOGO_PAGE}
          style={{ ...fill, originX: 1, originY: 0.5 }}
          initial={play ? { scaleX: 0 } : false}
          animate={{ scaleX: 1 }}
          transition={t(0.35, 0.8)}
        />
        <motion.path d={OFFICIAL.ear} fill={LOGO_ORANGE} initial={play ? { opacity: 0 } : false} animate={{ opacity: 1 }} transition={t(1.3, 0.3)} />
        {/* tail highlight: appears after the cat, then glints */}
        <motion.g initial={play ? { opacity: 0 } : false} animate={{ opacity: 1 }} transition={t(1.4, 0.5)}>
          <motion.path
            d={OFFICIAL.tail}
            fill={LOGO_PAGE}
            animate={idle && !reduce ? { opacity: [1, 0.45, 1] } : undefined}
            transition={idle ? { duration: 2.6, repeat: Infinity, ease: 'easeInOut', delay: delay + 2 } : undefined}
          />
        </motion.g>
      </motion.g>
    </svg>
  );
}

/** Official "EDUVENTURE / WITH SEDA" wordmark (letter paths from the logo file). */
export function OfficialWordmark({ className, color = LOGO_ORANGE }: { className?: string; color?: string }) {
  return (
    <svg viewBox="2 124 146 36" className={cn('block', className)} role="img" aria-label="Eduventure with Seda">
      <g fill={color} stroke={LOGO_INK} strokeWidth={0.15}>
        {OFFICIAL.word.map((d) => (
          <path key={d} d={d} />
        ))}
        {OFFICIAL.sub.map((d) => (
          <path key={d} d={d} />
        ))}
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

/** Full lockup: animated mark + official wordmark. */
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
        initial={play ? { opacity: 0, y: 10 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: delay + 1.3, duration: 0.8, ease: EASE }}
        className={stacked ? 'w-full' : 'h-[70%]'}
      >
        <OfficialWordmark className={stacked ? 'w-full' : 'h-full w-auto'} />
      </motion.div>
    </div>
  );
}
