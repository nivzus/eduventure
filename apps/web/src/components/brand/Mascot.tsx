'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LogoCat } from './BookCat';

/** Brand mascot: the cat from the Eduventure logo, with handwritten speech bubbles. */

export const MASCOT_MESSAGES = [
  'Uğurlar, tələbə! Bilik gücdür!',
  'Hər sual yeni bir imkandır!',
  'Öyrənməyə davam et, sən bacaracaqsan!',
  'Səhvlər öyrənməyin bir hissəsidir. Cəhd et!',
  'Hər test səni daha da gücləndirir!',
  'Bilik yolunda irəli!',
  'Özünə inan, hər şey yaxşı olacaq!',
  'Bu testi fəth et!',
  'Düşün, öyrən, uğur qazan!',
  'Həvəslə öyrən, zövqlə cavabla!',
];

export type MascotMode = 'peek' | 'static' | 'celebrate' | 'sad';

export interface MascotProps {
  mode?: MascotMode;
  size?: number;
  message?: string | null;
  className?: string;
}

export function Mascot({ mode = 'static', size = 140, message, className }: MascotProps) {
  const reduce = useReducedMotion();
  const h = size;
  const w = (size * 52) / 64;
  const face = mode === 'celebrate' ? 'joy' : mode === 'sad' ? 'sad' : 'happy';

  const body =
    reduce || mode === 'static'
      ? {}
      : mode === 'celebrate'
        ? { animate: { y: [0, -18, 0, -10, 0], rotate: [0, -4, 3, 0] }, transition: { duration: 1.3, repeat: Infinity, repeatDelay: 1.2, ease: 'easeOut' as const } }
        : mode === 'sad'
          ? { animate: { rotate: [0, -3, 0], y: [0, 2, 0] }, transition: { duration: 3.6, repeat: Infinity, ease: 'easeInOut' as const } }
          : { animate: { rotate: [0, 2.5, -1.5, 0] }, transition: { duration: 2.8, repeat: Infinity, ease: 'easeInOut' as const } };

  return (
    <div className={cn('relative inline-flex select-none flex-col items-center', className)} style={{ width: Math.max(w, 120) }}>
      <AnimatePresence>
        {message && (
          <motion.div
            key={message}
            initial={{ opacity: 0, y: 8, scale: 0.85, rotate: -6 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotate: -2 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 380, damping: 22 }}
            className="hand relative mb-2 w-max max-w-[210px] rounded-[18px] border-2 border-ink bg-elev px-3.5 py-2 text-center text-[19px] leading-[1.1] text-fg shadow-stamp-sm"
          >
            {message}
            <span className="absolute -bottom-[9px] left-1/2 size-4 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-ink bg-elev" />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div className="relative" style={{ height: h, width: w, originX: 0.5, originY: 1 }} {...body}>
        <LogoCat face={face} blink className="h-full w-full drop-shadow-[0_6px_0_rgba(42,31,23,.12)]" />
        {mode === 'celebrate' && !reduce && (
          <>
            {[[-0.1, 0.1, 0], [1.0, 0.05, 0.3], [0.9, 0.45, 0.6]].map(([x, y, d], i) => (
              <motion.span
                key={i}
                className="absolute text-signal"
                style={{ left: `${x * 100}%`, top: `${y * 100}%`, fontSize: Math.max(12, h * 0.12) }}
                animate={{ scale: [0, 1.2, 0], rotate: [0, 90] }}
                transition={{ duration: 1.4, repeat: Infinity, delay: d, repeatDelay: 0.6 }}
              >
                ✦
              </motion.span>
            ))}
          </>
        )}
      </motion.div>
      <svg width={w * 1.4} height="10" viewBox="0 0 100 10" className="-mt-1 text-ink/10" aria-hidden>
        <ellipse cx="50" cy="5" rx="46" ry="3.5" fill="currentColor" />
      </svg>
      <span className="sr-only">Eduventure pişiyi</span>
    </div>
  );
}

/** Peeks in from the bottom-right corner every 15–35s with a motivational message. Dismissible per session. */
export function MascotPeek() {
  const reduce = useReducedMotion();
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem('ev-mascot-off') === '1') setDismissed(true);
    } catch {}
  }, []);

  useEffect(() => {
    if (dismissed) return;
    let t: ReturnType<typeof setTimeout>;
    const schedule = (delay: number) => {
      t = setTimeout(() => {
        setMessage(MASCOT_MESSAGES[Math.floor(Math.random() * MASCOT_MESSAGES.length)]);
        setVisible(true);
        t = setTimeout(() => {
          setVisible(false);
          schedule(15000 + Math.random() * 20000);
        }, 6000);
      }, delay);
    };
    schedule(8000);
    return () => clearTimeout(t);
  }, [dismissed]);

  const dismiss = () => {
    setVisible(false);
    setDismissed(true);
    try {
      sessionStorage.setItem('ev-mascot-off', '1');
    } catch {}
  };

  return (
    <AnimatePresence>
      {visible && !dismissed && (
        <motion.div
          className="pointer-events-none fixed bottom-20 right-4 z-40 hidden sm:block md:bottom-0"
          initial={{ y: reduce ? 0 : 160, opacity: reduce ? 0 : 1 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: reduce ? 0 : 180, opacity: reduce ? 0 : 1 }}
          transition={{ type: 'spring', stiffness: 160, damping: 18 }}
        >
          <div className="pointer-events-auto relative">
            <button
              type="button"
              onClick={dismiss}
              aria-label="Pişiyi gizlət"
              className="absolute -left-3 top-2 z-20 grid size-7 place-items-center rounded-full border-2 border-ink bg-elev text-fg shadow-stamp-sm"
            >
              <X className="size-3.5" />
            </button>
            <Mascot mode="peek" size={120} message={message} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
