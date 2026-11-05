'use client';

import { motion, useReducedMotion } from 'motion/react';
import { Check, Hourglass, Lightbulb, X } from 'lucide-react';
import { cn, EASE_OUT_EXPO } from '@/lib/utils';

interface PracticeFeedbackProps {
  correct: boolean | null;
  explanation?: string | null;
}

const PRAISE = ['Əla!', 'Düz tapdın!', 'Möhtəşəm!', 'Bax belə!', 'Doğrudur!'];
const NUDGE = ['Bu dəfə alınmadı', 'Az qala!', 'Səhvdir — amma öyrəndin', 'Yanlış cavab'];

export function PracticeFeedback({ correct, explanation }: PracticeFeedbackProps) {
  const reduce = useReducedMotion();
  const pool = correct ? PRAISE : NUDGE;
  const title =
    correct === null ? 'Müəllim yoxlayacaq' : pool[Math.abs((explanation ?? '').length) % pool.length];
  const tone = correct === null ? 'glacier' : correct ? 'moss' : 'danger';

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 18, filter: 'blur(6px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
      className={cn(
        'relative overflow-hidden rounded-3xl border p-4 sm:p-5',
        tone === 'moss' && 'border-moss/35 bg-moss/[0.07]',
        tone === 'danger' && 'border-danger/35 bg-danger/[0.07]',
        tone === 'glacier' && 'border-glacier/35 bg-glacier/[0.07]',
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        <motion.span
          initial={reduce ? false : { scale: 0, rotate: -40 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 16, delay: 0.05 }}
          className={cn(
            'grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-bg',
            tone === 'moss' && 'bg-moss',
            tone === 'danger' && 'bg-danger',
            tone === 'glacier' && 'bg-glacier',
          )}
        >
          {correct === null ? (
            <Hourglass className="h-5 w-5" strokeWidth={2.6} />
          ) : correct ? (
            <Check className="h-5 w-5" strokeWidth={3} />
          ) : (
            <X className="h-5 w-5" strokeWidth={3} />
          )}
        </motion.span>
        <div>
          <p
            className={cn(
              'font-display text-lg font-semibold tracking-tight',
              tone === 'moss' && 'text-moss',
              tone === 'danger' && 'text-danger',
              tone === 'glacier' && 'text-glacier',
            )}
          >
            {title}
          </p>
          <p className="text-sm text-muted">
            {correct === null
              ? 'Açıq suallar avtomatik yoxlanılmır.'
              : correct
                ? 'Növbəti suala keç — Enter.'
                : 'Düzgün cavab yuxarıda işarələndi.'}
          </p>
        </div>
      </div>

      {explanation && (
        <motion.div
          initial={reduce ? false : { opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.5, ease: EASE_OUT_EXPO, delay: 0.2 }}
          className="overflow-hidden"
        >
          <div className="mt-4 flex gap-3 border-t border-line pt-4">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-signal light:text-aurora" />
            <div>
              <p className="mono-label mb-1">İzah</p>
              <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-fg/90">{explanation}</p>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
