'use client';

import { motion, useReducedMotion } from 'motion/react';
import { Check, X } from 'lucide-react';
import { cn, SPRING_UI } from '@/lib/utils';
import type { RendererProps } from './types';

const SIDES = [
  { value: true, label: 'Doğru', hint: '1', Icon: Check },
  { value: false, label: 'Yanlış', hint: '2', Icon: X },
] as const;

export function TrueFalseQuestion({ question, value, onChange, disabled, feedback }: RendererProps<boolean>) {
  const reduce = useReducedMotion();
  const solution = feedback?.solution?.value;
  const revealed = feedback != null && typeof solution === 'boolean';

  return (
    <div role="radiogroup" aria-label="Doğru və ya yanlış" className="grid grid-cols-2 gap-2.5 sm:gap-4">
      {SIDES.map(({ value: v, label, hint, Icon }) => {
        const isSel = value === v;
        const isCorrect = revealed && solution === v;
        const isWrongPick = revealed && isSel && solution !== v;
        return (
          <motion.button
            key={String(v)}
            type="button"
            role="radio"
            aria-checked={isSel}
            disabled={disabled}
            onClick={() => !disabled && onChange(v)}
            whileTap={disabled || reduce ? undefined : { scale: 0.97 }}
            whileHover={disabled || reduce ? undefined : { y: -2 }}
            animate={isWrongPick && !reduce ? { x: [0, -8, 7, -4, 3, 0] } : { x: 0 }}
            transition={{ duration: 0.45 }}
            className={cn(
              'group relative isolate flex aspect-[4/3] max-h-56 w-full flex-col justify-between overflow-hidden rounded-3xl border p-4 text-left sm:aspect-[16/10] sm:p-6',
              'transition-[border-color,background-color] duration-200',
              !revealed && !isSel && 'border-line bg-elev hover:border-line-strong',
              !revealed && isSel && 'border-transparent text-signal-fg',
              isCorrect && 'border-moss/70 bg-moss/12',
              isWrongPick && 'border-danger/70 bg-danger/12',
              revealed && !isCorrect && !isWrongPick && 'border-line bg-elev opacity-55',
            )}
          >
            {!revealed && isSel && (
              <motion.span
                layoutId={`tf-hl-${question.id}`}
                transition={SPRING_UI}
                className="absolute inset-0 -z-10 rounded-3xl bg-signal"
                aria-hidden
              />
            )}
            <span className="flex w-full items-start justify-between">
              <span
                className={cn(
                  'grid h-10 w-10 place-items-center rounded-2xl border sm:h-12 sm:w-12',
                  !revealed && !isSel && 'border-line-strong text-muted',
                  !revealed && isSel && 'border-signal-fg/20 bg-signal-fg/10',
                  isCorrect && 'border-moss bg-moss text-bg',
                  isWrongPick && 'border-danger bg-danger text-bg',
                  revealed && !isCorrect && !isWrongPick && 'border-line text-subtle',
                )}
              >
                <Icon className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.6} />
              </span>
              {!revealed && (
                <kbd
                  aria-hidden
                  className={cn(
                    'hidden rounded-md border px-1.5 py-0.5 font-mono text-[11px] sm:inline',
                    isSel ? 'border-signal-fg/25 text-signal-fg/70' : 'border-line text-subtle',
                  )}
                >
                  {hint}
                </kbd>
              )}
              {isCorrect && <span className="mono-label !text-moss">Düzgün</span>}
            </span>
            <span className="font-display text-2xl font-semibold tracking-tight sm:text-4xl">{label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
