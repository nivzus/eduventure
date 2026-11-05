'use client';

import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CornerDownLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { textMatches } from '../../../lib/utils';
import type { RendererProps } from './types';

export function TextQuestion({ question, value, onChange, disabled, feedback, onSubmitIntent }: RendererProps<string>) {
  const ref = useRef<HTMLInputElement>(null);
  const text = typeof value === 'string' ? value : '';
  const accepted = feedback?.solution?.answers;
  const revealed = feedback != null;
  const ok = revealed && (feedback?.correct ?? textMatches(text, accepted));

  useEffect(() => {
    if (!disabled) ref.current?.focus({ preventScroll: true });
  }, [question.id, disabled]);

  return (
    <div className="space-y-4">
      <label className="group relative block">
        <span className="sr-only">Cavabın</span>
        <input
          ref={ref}
          type="text"
          value={text}
          disabled={disabled}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder="Cavabını yaz…"
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
              e.preventDefault();
              e.stopPropagation();
              onSubmitIntent?.();
            }
          }}
          className={cn(
            'w-full rounded-none border-0 border-b-2 bg-transparent px-1 pb-3 pt-2 font-display text-2xl font-medium tracking-tight outline-none transition-colors sm:text-4xl',
            'placeholder:text-subtle/70',
            !revealed && 'border-line-strong focus:border-signal',
            revealed && ok && 'border-moss text-moss',
            revealed && !ok && 'border-danger text-danger line-through decoration-2',
          )}
        />
        {!revealed && (
          <span className="pointer-events-none absolute bottom-3 right-1 hidden items-center gap-1.5 text-subtle sm:flex">
            <span className="mono-label">Enter</span>
            <CornerDownLeft className="h-3.5 w-3.5" />
          </span>
        )}
      </label>
      <p className="mono-label">Böyük-kiçik hərf və artıq boşluqlar nəzərə alınmır</p>

      <AnimatePresence>
        {revealed && !ok && accepted && accepted.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap items-center gap-2"
          >
            <span className="mono-label !text-moss">Qəbul olunan cavab{accepted.length > 1 ? 'lar' : ''}</span>
            {accepted.map((a) => (
              <span key={a} className="rounded-full border border-moss/30 bg-moss/10 px-3 py-1 text-sm font-semibold text-moss">
                {a}
              </span>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
