'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Brand mascot: the orange Eduventure cat (redrawn from the legacy WavingCat). */

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

const FUR = '#FF8A1F';
const FUR_DEEP = '#E86A0C';
const CREAM = '#FFE9D2';
const INK = '#14110F';

export type MascotMode = 'peek' | 'static' | 'celebrate' | 'sad';

export interface MascotProps {
  mode?: MascotMode;
  size?: number;
  message?: string | null;
  className?: string;
}

export function Mascot({ mode = 'static', size = 160, message, className }: MascotProps) {
  const reduce = useReducedMotion();
  const waving = mode === 'peek' || mode === 'celebrate';
  const sad = mode === 'sad';
  const loop = { repeat: Infinity, ease: 'easeInOut' as const };

  return (
    <div className={cn('relative inline-block select-none', className)} style={{ width: size }}>
      <AnimatePresence>
        {message && (
          <motion.div
            key={message}
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 380, damping: 26 }}
            className="absolute bottom-[92%] left-1/2 z-10 w-max max-w-[220px] -translate-x-1/2 rounded-2xl border border-line-strong bg-elev px-3.5 py-2.5 text-center text-[13px] font-medium leading-snug text-fg shadow-xl"
          >
            {message}
            <span className="absolute left-1/2 top-full size-3 -translate-x-1/2 -translate-y-1.5 rotate-45 border-b border-r border-line-strong bg-elev" />
          </motion.div>
        )}
      </AnimatePresence>

      <svg viewBox="0 0 160 150" width={size} height={(size * 150) / 160} aria-hidden overflow="visible">
        {/* tail */}
        <motion.g
          style={{ originX: '128px', originY: '118px' }}
          animate={reduce ? undefined : { rotate: sad ? [0, -3, 0] : [0, 9, -4, 0] }}
          transition={{ duration: sad ? 4 : 2.4, ...loop }}
        >
          <path d="M126 120c22-2 30-26 18-44-4-6-12-4-10 3 6 14 2 28-12 31z" fill={FUR} />
          <path d="M144 76c-4-6-12-4-10 3l3 6c2-4 5-7 7-9z" fill={CREAM} />
        </motion.g>

        {/* body */}
        <path d="M44 140c-22 0-28-34-8-52 6-36 82-36 88 0 20 18 14 52-8 52z" fill={FUR} />
        <path d="M62 140c-6-20 0-38 18-38s24 18 18 38z" fill={CREAM} />
        {/* stripes */}
        <path d="M72 50c2 6 2 10 0 14M80 47v15M88 50c-2 6-2 10 0 14" stroke={FUR_DEEP} strokeWidth="3.5" strokeLinecap="round" fill="none" />

        {/* ears */}
        <path d="M44 74 38 30l30 20z" fill={FUR} />
        <path d="M116 74l6-44-30 20z" fill={FUR} />
        <path d="M47 62 44 40l15 11z" fill={CREAM} opacity=".9" />
        <path d="M113 62l3-22-15 11z" fill={CREAM} opacity=".9" />

        {/* head */}
        <ellipse cx="80" cy="78" rx="42" ry="34" fill={FUR} />
        <path d="M58 92c6 10 38 10 44 0-6-6-38-6-44 0z" fill={CREAM} />

        {/* eyes */}
        <motion.g
          style={{ originY: '76px' }}
          animate={reduce ? undefined : { scaleY: [1, 1, 0.1, 1, 1] }}
          transition={{ duration: 4.2, times: [0, 0.46, 0.5, 0.54, 1], repeat: Infinity }}
        >
          {mode === 'celebrate' ? (
            <>
              <path d="M58 78q6-8 12 0M90 78q6-8 12 0" stroke={INK} strokeWidth="3.5" strokeLinecap="round" fill="none" />
            </>
          ) : (
            <>
              <ellipse cx="64" cy="76" rx="6" ry={sad ? 5 : 7} fill={INK} />
              <ellipse cx="96" cy="76" rx="6" ry={sad ? 5 : 7} fill={INK} />
              <circle cx="66" cy="73" r="2" fill="#fff" />
              <circle cx="98" cy="73" r="2" fill="#fff" />
            </>
          )}
        </motion.g>
        {sad && <path d="M56 66l14 4M104 66l-14 4" stroke={INK} strokeWidth="3" strokeLinecap="round" />}

        {/* nose + mouth */}
        <path d="M76 86h8l-4 4z" fill="#F0587A" />
        <path
          d={sad ? 'M72 97q8-6 16 0' : 'M80 90v3m0 0q-4 5-8 2m8-2q4 5 8 2'}
          stroke={INK}
          strokeWidth="2.4"
          strokeLinecap="round"
          fill="none"
        />
        {/* whiskers */}
        <path d="M54 88 32 84M54 93 32 96M106 88l22-4M106 93l22 3" stroke={INK} strokeOpacity=".55" strokeWidth="1.8" strokeLinecap="round" />
        {/* cheeks */}
        <circle cx="56" cy="90" r="5" fill="#FF6B8A" opacity=".28" />
        <circle cx="104" cy="90" r="5" fill="#FF6B8A" opacity=".28" />

        {/* waving paw */}
        <motion.g
          style={{ originX: '40px', originY: '118px' }}
          animate={reduce || !waving ? { rotate: 0 } : { rotate: [0, -28, 6, -28, 0] }}
          transition={waving ? { duration: 1.4, ...loop, repeatDelay: 0.6 } : undefined}
        >
          <path d="M40 120c-8-10-10-26-6-36 3-7 13-7 15 0 3 10 2 24-1 36z" fill={FUR} />
          <ellipse cx="41" cy="84" rx="8" ry="6" fill={CREAM} />
        </motion.g>
        {/* resting paw */}
        <ellipse cx="112" cy="134" rx="12" ry="7" fill={CREAM} />
      </svg>
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
          className="pointer-events-none fixed bottom-20 right-0 z-40 hidden sm:block md:bottom-0"
          initial={{ x: reduce ? 0 : 140, opacity: reduce ? 0 : 1 }}
          animate={{ x: 18, opacity: 1 }}
          exit={{ x: reduce ? 0 : 160, opacity: reduce ? 0 : 1 }}
          transition={{ type: 'spring', stiffness: 140, damping: 18 }}
        >
          <div className="pointer-events-auto relative">
            <button
              type="button"
              onClick={dismiss}
              aria-label="Pişiyi gizlət"
              className="absolute -left-2 top-6 z-20 grid size-6 place-items-center rounded-full border border-line-strong bg-elev text-muted hover:text-fg"
            >
              <X className="size-3.5" />
            </button>
            <Mascot mode="peek" size={140} message={message} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
