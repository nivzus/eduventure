'use client';

import { motion, useReducedMotion } from 'motion/react';
import { Fragment, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface KineticTextProps {
  /** plain text; wrap accent words in *asterisks* → rendered in serif italic */
  text: string;
  className?: string;
  accentClassName?: string;
  delay?: number;
  stagger?: number;
  /** animate on mount (default) or when in view */
  inView?: boolean;
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span' | 'div';
}

/**
 * Word-by-word masked rise. <KineticText as="h1" text="Öyrən *macəra* ilə" />
 */
export function KineticText({ text, className, accentClassName, delay = 0, stagger = 0.06, inView = false, as = 'h2' }: KineticTextProps) {
  const reduce = useReducedMotion();
  const Comp = motion[as] as typeof motion.h2;
  const lines = text.split('\n');
  let idx = 0;
  const trigger = inView ? { whileInView: 'show', viewport: { once: true, margin: '0px 0px -10% 0px' } } : { animate: 'show' };

  return (
    <Comp className={className} initial="hidden" {...trigger} aria-label={text.replace(/\*/g, '')}>
      {lines.map((line, li) => (
        <span key={li} className="block" aria-hidden>
          {line.split(' ').filter(Boolean).map((raw, wi, arr) => {
            const accent = /^\*.*\*[.,!?:;]*$/.test(raw);
            const word = accent ? raw.replace(/\*/g, '') : raw;
            const i = idx++;
            const node: ReactNode = (
              <span className="inline-block overflow-hidden pb-[0.12em] -mb-[0.12em] align-bottom">
                <motion.span
                  className={cn('inline-block will-change-transform', accent && cn('accent pr-[0.06em]', accentClassName))}
                  variants={{
                    hidden: reduce ? { opacity: 0 } : { y: '110%', rotate: 4, opacity: 0 },
                    show: {
                      y: '0%',
                      rotate: 0,
                      opacity: 1,
                      transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: delay + i * stagger },
                    },
                  }}
                >
                  {word}
                </motion.span>
              </span>
            );
            return (
              <Fragment key={wi}>
                {node}
                {wi < arr.length - 1 ? ' ' : null}
              </Fragment>
            );
          })}
        </span>
      ))}
    </Comp>
  );
}
