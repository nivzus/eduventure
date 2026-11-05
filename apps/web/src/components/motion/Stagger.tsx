'use client';

import { motion, type HTMLMotionProps, type Variants } from 'motion/react';
import type { ReactNode } from 'react';
import { EASE_OUT_EXPO } from '@/lib/utils';

type Tag = 'div' | 'ul' | 'ol' | 'section' | 'li' | 'span' | 'article';

export interface StaggerProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children?: ReactNode;
  as?: Tag;
  /** delay between children (s) */
  stagger?: number;
  delay?: number;
  /** animate when scrolled into view (default true); false = animate on mount */
  inView?: boolean;
  once?: boolean;
}

/**
 * <Stagger className="grid gap-4"> <StaggerItem>…</StaggerItem> … </Stagger>
 */
export function Stagger({ children, as = 'div', stagger = 0.05, delay = 0, inView = true, once = true, ...rest }: StaggerProps) {
  const Comp = motion[as] as typeof motion.div;
  const variants: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: stagger, delayChildren: delay } },
  };
  const trigger = inView
    ? { whileInView: 'show', viewport: { once, margin: '0px 0px -6% 0px' } }
    : { animate: 'show' };
  return (
    <Comp initial="hidden" variants={variants} {...trigger} {...rest}>
      {children}
    </Comp>
  );
}

export const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 16, filter: 'blur(6px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.5, ease: EASE_OUT_EXPO } },
};

export interface StaggerItemProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children?: ReactNode;
  as?: Tag;
}

export function StaggerItem({ children, as = 'div', ...rest }: StaggerItemProps) {
  const Comp = motion[as] as typeof motion.div;
  return (
    <Comp variants={staggerItemVariants} {...rest}>
      {children}
    </Comp>
  );
}
