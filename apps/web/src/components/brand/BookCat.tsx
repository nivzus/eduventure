'use client';

import { useId } from 'react';
import { motion, useReducedMotion, type Transition } from 'motion/react';
import { cn } from '@/lib/utils';
import { OFFICIAL } from './logo-paths';

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

/**
 * Standalone cat outline: head, ears, nose, chest and paws follow the official logo exactly;
 * the back (hidden behind the book spine in the logo) is one round convex arc from the shoulder to the haunch.
 */
const CAT_PATH =
  'M86.4 74.5 C88.8 73.6 91.6 73.4 91.7 69.1 C91.7 64.4 90.8 61 96.6 56.6 C97 54.6 99.9 50.8 101.1 50.4 L102.1 56.1 C102.9 56.4 105.3 56.4 107 59.4 C107.6 61.4 109.1 62.9 109.9 63.4 C110.9 63.6 110.9 65.6 109.4 67.1 C107.6 69.1 104.4 69.6 104.2 70.9 C104.1 73.4 105.3 75.9 105.3 79.4 C105.3 86.1 102.6 88.3 103.2 91.9 C103.6 95 103.3 99.4 104.6 101.4 C105.7 103 108.2 103.5 108.6 105.6 C108.9 107.2 108 107.9 106.6 107.9 L101.6 107.9 C100.2 107.9 99.3 106.9 98.8 105.6 C98.2 107 97 108.1 95 108.2 L79 108.2 C70 108.4 63.6 104.6 62.8 97 C62 88.5 69 80 76.5 76.6 C79.6 75.2 83.2 74.6 86.4 74.5 Z';

export type CatFace = 'none' | 'happy' | 'joy' | 'sad';

/**
 * The cat from the official logo, standing on its own (rounded back added), optionally with a cute face.
 * viewBox is in the logo's coordinate space.
 */
export function LogoCat({ className, face = 'none', blink = false }: { className?: string; face?: CatFace; blink?: boolean }) {
  const reduce = useReducedMotion();
  return (
    <svg viewBox="58 46 54 64" className={cn('block', className)} aria-hidden>
      <path d={CAT_PATH} fill={LOGO_ORANGE} />
      <path d={OFFICIAL.tail} fill={LOGO_PAGE} />

      {face === 'happy' && (
        <>
          <motion.g
            style={{ transformBox: 'fill-box', originY: 0.5 }}
            animate={blink && !reduce ? { scaleY: [1, 1, 0.1, 1, 1] } : undefined}
            transition={blink ? { duration: 4, times: [0, 0.47, 0.5, 0.53, 1], repeat: Infinity } : undefined}
          >
            <ellipse cx="104" cy="60.6" rx="1.1" ry="1.35" fill="#2a1f17" />
            <circle cx="104.35" cy="60.15" r="0.38" fill="#fff" />
          </motion.g>
          <ellipse cx="105.8" cy="64.5" rx="1.5" ry="0.9" fill="#FF8FA3" opacity=".7" />
        </>
      )}
      {face === 'joy' && (
        <>
          <path d="M102.7 61.3 q1.3 -1.6 2.6 0" stroke="#2a1f17" strokeWidth="0.85" fill="none" strokeLinecap="round" />
          <ellipse cx="105.8" cy="64.5" rx="1.6" ry="1" fill="#FF8FA3" opacity=".85" />
        </>
      )}
      {face === 'sad' && (
        <>
          <path d="M102.8 60.3 q1.3 1.3 2.6 0" stroke="#2a1f17" strokeWidth="0.85" fill="none" strokeLinecap="round" />
          <path d="M102.7 59 l2.3 -0.7" stroke="#2a1f17" strokeWidth="0.6" strokeLinecap="round" />
          <motion.path
            d="M104.6 62.2 q-0.9 1.4 0 2 q0.9 -0.6 0 -2 z"
            fill="#7CC4F0"
            initial={false}
            animate={reduce ? undefined : { y: [0, 2.5], opacity: [1, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 0.8, ease: 'easeIn' }}
          />
        </>
      )}
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
