'use client';

import { motion, useMotionValue, useReducedMotion, useSpring } from 'motion/react';
import type { ReactNode, PointerEvent } from 'react';
import { cn } from '@/lib/utils';

export interface MagneticProps {
  children: ReactNode;
  /** 0–1 pull strength (default .35) */
  strength?: number;
  className?: string;
  disabled?: boolean;
}

/** Wrap anything to make it drift toward the cursor. */
export function Magnetic({ children, strength = 0.35, className, disabled }: MagneticProps) {
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 260, damping: 18, mass: 0.6 });
  const sy = useSpring(y, { stiffness: 260, damping: 18, mass: 0.6 });
  const off = disabled || reduce;

  const onMove = (e: PointerEvent<HTMLSpanElement>) => {
    if (off || e.pointerType !== 'mouse') return;
    const r = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * strength);
    y.set((e.clientY - (r.top + r.height / 2)) * strength);
  };
  const reset = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.span
      className={cn('inline-flex', className)}
      style={{ x: sx, y: sy }}
      onPointerMove={onMove}
      onPointerLeave={reset}
    >
      {children}
    </motion.span>
  );
}
