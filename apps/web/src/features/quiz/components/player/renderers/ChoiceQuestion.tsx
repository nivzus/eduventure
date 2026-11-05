'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Check, X } from 'lucide-react';
import { cn, SPRING_UI } from '@/lib/utils';
import { letter } from '../../../lib/utils';
import type { RendererProps } from './types';

type ChoiceValue = number | number[];

export function ChoiceQuestion({ question, value, onChange, disabled, feedback }: RendererProps<ChoiceValue>) {
  const reduce = useReducedMotion();
  const multiple = question.type === 'MULTIPLE';
  const selected = new Set<number>(
    multiple ? (Array.isArray(value) ? value : []) : typeof value === 'number' ? [value] : [],
  );

  const solution = feedback?.solution;
  const correctSet = new Set<number>(
    solution?.indices ?? (typeof solution?.index === 'number' ? [solution.index] : []),
  );
  const revealed = Boolean(feedback && solution);

  const toggle = (i: number) => {
    if (disabled) return;
    if (multiple) {
      const next = new Set(selected);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      onChange([...next].sort((a, b) => a - b));
    } else {
      onChange(i);
    }
  };

  return (
    <div
      role={multiple ? 'group' : 'radiogroup'}
      aria-label={multiple ? 'Variantlar (bir neçəsini seçə bilərsən)' : 'Variantlar'}
      className="grid gap-2.5 sm:gap-3"
    >
      {multiple && (
        <p className="mono-label -mt-1 mb-1 text-glacier">Bir neçə düzgün cavab ola bilər</p>
      )}
      {question.options.map((opt, i) => {
        const isSel = selected.has(i);
        const isCorrect = revealed && correctSet.has(i);
        const isWrongPick = revealed && isSel && !correctSet.has(i);
        const missed = revealed && !isSel && correctSet.has(i);
        return (
          <motion.button
            key={i}
            type="button"
            role={multiple ? 'checkbox' : 'radio'}
            aria-checked={isSel}
            disabled={disabled}
            onClick={() => toggle(i)}
            whileTap={disabled || reduce ? undefined : { scale: 0.985 }}
            animate={isWrongPick && !reduce ? { x: [0, -7, 6, -4, 3, 0] } : { x: 0 }}
            transition={{ duration: 0.45 }}
            className={cn(
              'group relative flex w-full items-center gap-3 overflow-hidden rounded-2xl border px-3.5 py-3.5 text-left sm:gap-4 sm:px-5 sm:py-4',
              'transition-[border-color,background-color,color] duration-200',
              !revealed && !isSel && 'border-line bg-elev hover:border-line-strong hover:bg-surface',
              !revealed && isSel && 'border-transparent text-signal-fg',
              isCorrect && 'border-moss/60 bg-moss/10',
              isWrongPick && 'border-danger/60 bg-danger/10',
              revealed && !isCorrect && !isWrongPick && 'border-line bg-elev opacity-60',
              disabled && !revealed && 'cursor-not-allowed opacity-70',
            )}
          >
            {/* Selection highlight — travels between options for single choice */}
            <AnimatePresence initial={false}>
              {!revealed && isSel && (
                <motion.span
                  layoutId={multiple ? undefined : `choice-hl-${question.id}`}
                  key={multiple ? `hl-${i}` : 'hl'}
                  initial={multiple ? { opacity: 0, scale: 0.96 } : false}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={multiple ? { opacity: 0, scale: 0.96 } : undefined}
                  transition={SPRING_UI}
                  className="absolute inset-0 rounded-2xl bg-signal"
                  aria-hidden
                />
              )}
            </AnimatePresence>

            <span
              className={cn(
                'relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-xl border font-mono text-sm font-semibold transition-colors',
                multiple && 'rounded-lg',
                !revealed && !isSel && 'border-line-strong text-muted group-hover:text-fg',
                !revealed && isSel && 'border-signal-fg/25 bg-signal-fg/10 text-signal-fg',
                isCorrect && 'border-moss bg-moss text-bg',
                isWrongPick && 'border-danger bg-danger text-bg',
                revealed && !isCorrect && !isWrongPick && 'border-line text-subtle',
              )}
            >
              {isCorrect ? (
                <Check className="h-4 w-4" strokeWidth={3} />
              ) : isWrongPick ? (
                <X className="h-4 w-4" strokeWidth={3} />
              ) : multiple && isSel ? (
                <Check className="h-4 w-4" strokeWidth={3} />
              ) : (
                letter(i)
              )}
            </span>

            <span className="relative z-10 min-w-0 flex-1 text-[15px] font-medium leading-snug sm:text-base">
              {opt}
            </span>

            {missed && (
              <span className="relative z-10 mono-label !text-moss">Düzgün cavab</span>
            )}
            {!revealed && (
              <kbd
                className={cn(
                  'relative z-10 hidden h-6 min-w-6 place-items-center rounded-md border px-1.5 font-mono text-[11px] sm:grid',
                  isSel ? 'border-signal-fg/25 text-signal-fg/70' : 'border-line text-subtle',
                )}
                aria-hidden
              >
                {i + 1}
              </kbd>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
