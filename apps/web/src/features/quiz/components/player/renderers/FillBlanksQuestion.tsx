'use client';

import { useEffect, useMemo, useRef } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { blankCount, parseBlanks, textMatches } from '../../../lib/utils';
import type { RendererProps } from './types';

export function FillBlanksQuestion({ question, value, onChange, disabled, feedback, onSubmitIntent }: RendererProps<string[]>) {
  const segments = useMemo(() => parseBlanks(question.text), [question.text]);
  const total = useMemo(() => blankCount(question.text), [question.text]);
  const vals = Array.isArray(value) ? value : [];
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const blanks = feedback?.solution?.blanks;
  const revealed = feedback != null && Array.isArray(blanks);

  useEffect(() => {
    if (!disabled) refs.current[0]?.focus({ preventScroll: true });
  }, [question.id, disabled]);

  const setAt = (i: number, v: string) => {
    const next = Array.from({ length: total }, (_, k) => vals[k] ?? '');
    next[i] = v;
    onChange(next);
  };

  return (
    <div className="rounded-3xl border border-line bg-elev px-4 py-6 sm:px-8 sm:py-9">
      <p className="text-xl leading-[2.4] sm:text-2xl sm:leading-[2.3]">
        {segments.map((seg, k) => {
          if (seg.kind === 'text') return <span key={k}>{seg.value}</span>;
          const i = seg.index;
          const v = vals[i] ?? '';
          const ok = revealed ? textMatches(v, blanks?.[i]) : null;
          return (
            <span key={k} className="relative mx-1 inline-flex items-baseline align-baseline">
              <sup className="absolute -top-3 left-0 font-mono text-[10px] text-subtle">{seg.n}</sup>
              <input
                ref={(el) => {
                  refs.current[i] = el;
                }}
                type="text"
                value={v}
                disabled={disabled}
                aria-label={`Boşluq ${seg.n}`}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                onChange={(e) => setAt(i, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    e.stopPropagation();
                    const nextEl = refs.current[i + 1];
                    if (nextEl) nextEl.focus();
                    else onSubmitIntent?.();
                  }
                }}
                style={{ width: `${Math.max(5, Math.min(22, v.length + 2))}ch` }}
                className={cn(
                  'rounded-lg border-0 border-b-2 bg-surface/60 px-2 py-0.5 text-center font-semibold outline-none transition-[width,border-color,background-color] duration-200',
                  !revealed && 'border-line-strong focus:border-signal focus:bg-surface',
                  revealed && ok && 'border-moss bg-moss/10 text-moss',
                  revealed && !ok && 'border-danger bg-danger/10 text-danger',
                )}
              />
              {revealed && !ok && blanks?.[i]?.[0] && (
                <motion.span
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="ml-1.5 rounded-full border border-moss/30 bg-moss/10 px-2 py-0.5 text-sm font-semibold leading-none text-moss"
                >
                  {blanks[i][0]}
                </motion.span>
              )}
            </span>
          );
        })}
      </p>
      <p className="mt-5 mono-label">
        {total} boşluq · Tab/Enter ilə növbətinə keç
      </p>
    </div>
  );
}
