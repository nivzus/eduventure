'use client';

import { useMemo } from 'react';
import { AnimatePresence, motion, Reorder, useDragControls, useReducedMotion } from 'motion/react';
import { ArrowDown, ArrowUp, Check, GripVertical, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { seededShuffle } from '../../../lib/utils';
import type { Question } from '../../../types';
import type { RendererProps } from './types';

/** The order a learner sees before touching anything (stable per attempt). */
export function initialOrdering(question: Question, seed: string): string[] {
  return seededShuffle(question.options, `${seed}:${question.id}`);
}

const SEP = '␟';

function toKeys(items: string[]): string[] {
  const seen = new Map<string, number>();
  return items.map((t) => {
    const n = seen.get(t) ?? 0;
    seen.set(t, n + 1);
    return `${t}${SEP}${n}`;
  });
}
const keyText = (k: string) => k.slice(0, k.lastIndexOf(SEP));

export function OrderingQuestion({ question, value, onChange, disabled, feedback, seed }: RendererProps<string[]>) {
  const items = useMemo(
    () => (Array.isArray(value) && value.length ? value : initialOrdering(question, seed)),
    [value, question, seed],
  );
  const keys = useMemo(() => toKeys(items), [items]);
  const solution = feedback?.solution?.order;
  const revealed = feedback != null && Array.isArray(solution);
  const allRight = revealed && solution!.every((t, i) => t === items[i]);

  const move = (from: number, to: number) => {
    if (disabled || to < 0 || to >= items.length) return;
    const next = [...items];
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x);
    onChange(next);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="mono-label">Sürüşdür və ya oxlarla düz</span>
        {!(Array.isArray(value) && value.length) && !disabled && (
          <button
            type="button"
            onClick={() => onChange(items)}
            className="mono-label rounded-full border border-line px-3 py-1.5 !text-muted transition-colors hover:border-line-strong hover:!text-fg"
          >
            Bu sıra düzgündür
          </button>
        )}
      </div>

      <Reorder.Group
        axis="y"
        values={keys}
        onReorder={(next: string[]) => !disabled && onChange(next.map(keyText))}
        className="relative grid gap-2"
        as="ol"
      >
        {keys.map((k, i) => (
          <OrderingRow
            key={k}
            id={k}
            index={i}
            count={keys.length}
            text={keyText(k)}
            disabled={disabled}
            state={revealed ? (solution![i] === keyText(k) ? 'ok' : 'bad') : undefined}
            onMove={move}
          />
        ))}
      </Reorder.Group>

      <AnimatePresence>
        {revealed && !allRight && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl border border-moss/25 bg-moss/[0.06] p-4">
              <p className="mono-label mb-3 !text-moss">Düzgün ardıcıllıq</p>
              <ol className="grid gap-1.5">
                {solution!.map((t, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="font-mono text-moss">{String(i + 1).padStart(2, '0')}</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ol>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function OrderingRow({
  id,
  index,
  count,
  text,
  disabled,
  state,
  onMove,
}: {
  id: string;
  index: number;
  count: number;
  text: string;
  disabled?: boolean;
  state?: 'ok' | 'bad';
  onMove: (from: number, to: number) => void;
}) {
  const controls = useDragControls();
  const reduce = useReducedMotion();
  return (
    <Reorder.Item
      value={id}
      as="li"
      dragListener={false}
      dragControls={controls}
      layout="position"
      whileDrag={{ scale: 1.02, boxShadow: '0 18px 40px -16px rgba(0,0,0,.55)', zIndex: 10 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      tabIndex={disabled ? -1 : 0}
      aria-label={`${index + 1}. ${text}`}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (disabled) return;
        if ((e.altKey || e.shiftKey) && e.key === 'ArrowUp') {
          e.preventDefault();
          onMove(index, index - 1);
        } else if ((e.altKey || e.shiftKey) && e.key === 'ArrowDown') {
          e.preventDefault();
          onMove(index, index + 1);
        }
      }}
      className={cn(
        'relative flex items-center gap-2 rounded-2xl border bg-elev py-2 pl-1.5 pr-2 outline-none sm:gap-3 sm:pl-2',
        'focus-visible:border-signal',
        !state && 'border-line',
        state === 'ok' && 'border-moss/60 bg-moss/10',
        state === 'bad' && 'border-danger/60 bg-danger/10',
      )}
    >
      <button
        type="button"
        aria-label="Sürüşdür"
        disabled={disabled}
        onPointerDown={(e) => !disabled && controls.start(e)}
        className="grid h-10 w-8 shrink-0 touch-none place-items-center rounded-xl text-subtle transition-colors hover:text-fg active:cursor-grabbing disabled:opacity-40 sm:cursor-grab"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span
        className={cn(
          'w-6 shrink-0 font-mono text-sm',
          state === 'ok' ? 'text-moss' : state === 'bad' ? 'text-danger' : 'text-subtle',
        )}
      >
        {String(index + 1).padStart(2, '0')}
      </span>
      <span className="min-w-0 flex-1 py-1 text-[15px] font-medium leading-snug sm:text-base">{text}</span>
      {state ? (
        <span className={cn('grid h-7 w-7 place-items-center rounded-full', state === 'ok' ? 'bg-moss text-bg' : 'bg-danger text-bg')}>
          {state === 'ok' ? <Check className="h-4 w-4" strokeWidth={3} /> : <X className="h-4 w-4" strokeWidth={3} />}
        </span>
      ) : (
        <span className="flex shrink-0 gap-1">
          <button
            type="button"
            aria-label="Yuxarı"
            disabled={disabled || index === 0}
            onClick={() => onMove(index, index - 1)}
            className="grid h-8 w-8 place-items-center rounded-lg border border-line text-muted transition-colors hover:border-line-strong hover:text-fg disabled:opacity-30"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label="Aşağı"
            disabled={disabled || index === count - 1}
            onClick={() => onMove(index, index + 1)}
            className="grid h-8 w-8 place-items-center rounded-lg border border-line text-muted transition-colors hover:border-line-strong hover:text-fg disabled:opacity-30"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </button>
        </span>
      )}
    </Reorder.Item>
  );
}
