'use client';

import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/utils';

/* Hand-drawn notebook primitives: they draw themselves like a pen on paper. */

const EASE = [0.22, 1, 0.36, 1] as const;
type Draw = { delay?: number; duration?: number; inView?: boolean };

function useDraw({ delay = 0, duration = 0.9, inView = true }: Draw) {
  const reduce = useReducedMotion();
  if (reduce) return {};
  const target = { pathLength: 1, opacity: 1 };
  return {
    initial: { pathLength: 0, opacity: 0 },
    ...(inView ? { whileInView: target, viewport: { once: true, margin: '-10% 0px' } } : { animate: target }),
    transition: { pathLength: { delay, duration, ease: EASE }, opacity: { delay, duration: 0.01 } },
  };
}

/** Marker underline under a word. Wrap the word: <Scribble>macəra</Scribble> */
export function Scribble({ children, color = 'var(--signal)', className, ...draw }: { children: ReactNode; color?: string; className?: string } & Draw) {
  const d = useDraw({ duration: 0.8, ...draw });
  return (
    <span className={cn('relative inline-block whitespace-nowrap', className)}>
      <span className="relative z-10">{children}</span>
      <svg className="pointer-events-none absolute -bottom-[0.18em] left-[-4%] h-[0.38em] w-[108%] overflow-visible" viewBox="0 0 200 20" preserveAspectRatio="none" aria-hidden>
        <motion.path d="M3 13 C 40 6, 90 4, 140 8 S 190 13, 197 9" stroke={color} strokeWidth="5" strokeLinecap="round" fill="none" {...d} />
        <motion.path d="M20 17 C 70 12, 120 12, 180 15" stroke={color} strokeWidth="3" strokeLinecap="round" fill="none" opacity=".55" {...useDraw({ duration: 0.6, ...draw, delay: (draw.delay ?? 0) + 0.45 })} />
      </svg>
    </span>
  );
}

/** Marker highlight swiping behind a word. */
export function Highlight({ children, className, delay = 0, inView = true }: { children: ReactNode; className?: string; delay?: number; inView?: boolean }) {
  const reduce = useReducedMotion();
  const target = { scaleX: 1 };
  return (
    <span className={cn('relative inline-block whitespace-nowrap', className)}>
      <motion.span
        aria-hidden
        className="absolute inset-x-[-0.12em] bottom-[0.08em] top-[0.42em] -z-0 origin-left -rotate-[1.2deg] rounded-[0.2em] bg-ember/75"
        initial={reduce ? false : { scaleX: 0 }}
        {...(inView ? { whileInView: target, viewport: { once: true } } : { animate: target })}
        transition={{ delay, duration: 0.7, ease: EASE }}
      />
      <span className="relative">{children}</span>
    </span>
  );
}

/** Hand-drawn ellipse around something. */
export function CircleMark({ children, color = 'var(--signal)', className, ...draw }: { children: ReactNode; color?: string; className?: string } & Draw) {
  const d = useDraw({ duration: 1, ...draw });
  return (
    <span className={cn('relative inline-block', className)}>
      <span className="relative z-10">{children}</span>
      <svg className="pointer-events-none absolute -inset-x-[18%] -inset-y-[28%] h-[156%] w-[136%] overflow-visible" viewBox="0 0 200 100" preserveAspectRatio="none" aria-hidden>
        <motion.path d="M150 14 C 110 0, 30 6, 12 40 C -2 72, 60 96, 120 90 C 180 84, 204 52, 182 26 C 168 10, 130 6, 104 10" stroke={color} strokeWidth="3.2" strokeLinecap="round" fill="none" {...d} />
      </svg>
    </span>
  );
}

/** Curvy hand-drawn arrow. direction = where it points. */
export function HandArrow({ className, color = 'currentColor', flip, ...draw }: { className?: string; color?: string; flip?: boolean } & Draw) {
  const body = useDraw({ duration: 0.8, ...draw });
  const head = useDraw({ duration: 0.3, ...draw, delay: (draw.delay ?? 0) + 0.7 });
  return (
    <svg viewBox="0 0 120 80" className={cn('overflow-visible', flip && '-scale-x-100', className)} fill="none" aria-hidden>
      <motion.path d="M6 10 C 30 4, 64 12, 78 34 C 88 50, 92 60, 104 68" stroke={color} strokeWidth="3" strokeLinecap="round" {...body} />
      <motion.path d="M90 66 L 105 69 L 101 54" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...head} />
    </svg>
  );
}

/** Washi tape strip (decorative). */
export function Tape({ className, color = 'ember', rotate = -6 }: { className?: string; color?: 'ember' | 'aurora' | 'moss' | 'glacier'; rotate?: number }) {
  const bg = { ember: 'bg-ember/70', aurora: 'bg-aurora/35', moss: 'bg-moss/40', glacier: 'bg-glacier/40' }[color];
  return (
    <span
      aria-hidden
      className={cn('pointer-events-none absolute z-20 h-6 w-24 backdrop-blur-[1px] [mask-image:linear-gradient(90deg,transparent_0,black_6%,black_94%,transparent_100%)]', bg, className)}
      style={{ rotate: `${rotate}deg`, backgroundImage: 'repeating-linear-gradient(90deg, rgba(255,255,255,.18) 0 6px, transparent 6px 12px)' }}
    />
  );
}

/** Round rubber stamp that lands with a thud. */
export function Stamp({ children, className, tone = 'signal', rotate = -12, delay = 0, inView = true }: { children: ReactNode; className?: string; tone?: 'signal' | 'moss' | 'danger' | 'aurora'; rotate?: number; delay?: number; inView?: boolean }) {
  const reduce = useReducedMotion();
  const color = { signal: 'text-signal border-signal', moss: 'text-moss border-moss', danger: 'text-danger border-danger', aurora: 'text-aurora border-aurora' }[tone];
  const target = { scale: 1, opacity: 0.92, rotate };
  return (
    <motion.span
      className={cn('inline-grid place-items-center rounded-full border-[3px] border-double px-4 py-3 text-center font-display text-[11px] font-semibold uppercase leading-tight tracking-[0.14em] mix-blend-multiply dark:mix-blend-normal', color, className)}
      initial={reduce ? false : { scale: 2.2, opacity: 0, rotate: rotate - 18 }}
      {...(inView ? { whileInView: target, viewport: { once: true } } : { animate: target })}
      transition={{ delay, type: 'spring', stiffness: 520, damping: 22, mass: 0.9 }}
    >
      {children}
    </motion.span>
  );
}

/** Handwritten margin note. */
export function Note({ children, className, rotate = -3 }: { children: ReactNode; className?: string; rotate?: number }) {
  return (
    <span className={cn('hand inline-block text-xl text-muted', className)} style={{ rotate: `${rotate}deg` }}>
      {children}
    </span>
  );
}

/** A loose paper sheet with optional tape — for floating UI fragments. */
export function PaperScrap({ children, className, tape, rotate = 0 }: { children: ReactNode; className?: string; tape?: 'ember' | 'aurora' | 'moss' | 'glacier'; rotate?: number }) {
  return (
    <div className={cn('relative rounded-2xl border border-line bg-elev p-5 shadow-paper', className)} style={{ rotate: `${rotate}deg` }}>
      {tape && <Tape color={tape} className="-top-3 left-1/2 -translate-x-1/2" rotate={-4} />}
      {children}
    </div>
  );
}
