'use client';

import { motion, useReducedMotion, type HTMLMotionProps } from 'motion/react';

const EASE = [0.22, 1, 0.36, 1] as const;

/** SPEC enter motion: fade + y16 + blur(6px)→0, in-view, optional stagger delay. */
export function Rise({
  delay = 0,
  y = 16,
  once = true,
  children,
  ...rest
}: { delay?: number; y?: number; once?: boolean } & HTMLMotionProps<'div'>) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y, filter: 'blur(6px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once, margin: '0px 0px -8% 0px' }}
      transition={{ duration: 0.5, ease: EASE, delay }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export const EASE_OUT_EXPO = EASE;
