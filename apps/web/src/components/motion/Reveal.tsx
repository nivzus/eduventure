'use client';

import { motion, type HTMLMotionProps } from 'motion/react';
import type { ReactNode } from 'react';
import { EASE_OUT_EXPO } from '@/lib/utils';

type RevealTag = 'div' | 'section' | 'li' | 'span' | 'header' | 'article' | 'p' | 'h1' | 'h2' | 'h3';

export interface RevealProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children?: ReactNode;
  as?: RevealTag;
  delay?: number;
  /** translateY start (px) */
  y?: number;
  duration?: number;
  /** animate only first time it enters the viewport (default true) */
  once?: boolean;
  blur?: boolean;
}

/** In-view fade-up with blur. <Reveal delay={0.1}>…</Reveal> */
export function Reveal({
  children,
  as = 'div',
  delay = 0,
  y = 16,
  duration = 0.6,
  once = true,
  blur = true,
  ...rest
}: RevealProps) {
  const Comp = motion[as] as typeof motion.div;
  return (
    <Comp
      initial={{ opacity: 0, y, filter: blur ? 'blur(6px)' : 'blur(0px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once, margin: '0px 0px -8% 0px' }}
      transition={{ duration, ease: EASE_OUT_EXPO, delay }}
      {...rest}
    >
      {children}
    </Comp>
  );
}
