'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Radial reward burst: shockwave ring + spark particles + floating "+XP" label.
 * Mount inside a `relative` container; toggle with `active` (keyed by a burst id).
 */
export function ClaimBurst({ burstKey, amount, color = 'var(--signal)' }: { burstKey: number | null; amount?: number; color?: string }) {
  const reduce = useReducedMotion();
  const sparks = 14;
  return (
    <AnimatePresence>
      {burstKey != null && (
        <span key={burstKey} aria-hidden className="pointer-events-none absolute inset-0 z-30 grid place-items-center overflow-visible">
          {!reduce && (
            <>
              <motion.span
                className="absolute size-10 rounded-full border-2"
                style={{ borderColor: color }}
                initial={{ scale: 0.3, opacity: 0.9 }}
                animate={{ scale: 4.2, opacity: 0 }}
                transition={{ duration: 0.9, ease: EASE }}
              />
              <motion.span
                className="absolute size-10 rounded-full"
                style={{ background: `radial-gradient(circle, color-mix(in oklab, ${color} 55%, transparent), transparent 70%)` }}
                initial={{ scale: 0.4, opacity: 1 }}
                animate={{ scale: 3, opacity: 0 }}
                transition={{ duration: 0.7, ease: EASE }}
              />
              {Array.from({ length: sparks }, (_, i) => {
                const a = (i / sparks) * Math.PI * 2 + (i % 2 ? 0.2 : 0);
                const dist = 46 + (i % 3) * 18;
                return (
                  <motion.span
                    key={i}
                    className="absolute rounded-full"
                    style={{ width: i % 3 ? 4 : 6, height: i % 3 ? 4 : 6, background: i % 4 === 0 ? 'var(--aurora)' : color }}
                    initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                    animate={{ x: Math.cos(a) * dist, y: Math.sin(a) * dist, opacity: 0, scale: 0.4 }}
                    transition={{ duration: 0.8 + (i % 3) * 0.1, ease: EASE }}
                  />
                );
              })}
            </>
          )}
          {amount != null && (
            <motion.span
              className="absolute whitespace-nowrap rounded-full bg-signal px-2.5 py-1 font-mono text-xs font-bold text-signal-fg shadow-glow"
              initial={{ y: 0, opacity: 0, scale: 0.6 }}
              animate={{ y: -54, opacity: [0, 1, 1, 0], scale: 1 }}
              transition={{ duration: 1.5, ease: EASE, times: [0, 0.15, 0.7, 1] }}
            >
              +{amount} XP
            </motion.span>
          )}
        </span>
      )}
    </AnimatePresence>
  );
}
