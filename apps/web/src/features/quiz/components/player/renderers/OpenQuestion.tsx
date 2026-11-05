'use client';

import { useEffect, useRef } from 'react';
import { PenLine } from 'lucide-react';
import { cn } from '@/lib/utils';
import { wordCount } from '../../../lib/utils';
import type { RendererProps } from './types';

export function OpenQuestion({ question, value, onChange, disabled }: RendererProps<string>) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const text = typeof value === 'string' ? value : '';
  const words = wordCount(text);

  // autosize
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(Math.max(el.scrollHeight, 200), 520)}px`;
  }, [text]);

  useEffect(() => {
    if (!disabled) ref.current?.focus({ preventScroll: true });
  }, [question.id, disabled]);

  return (
    <div className="overflow-hidden rounded-3xl border border-line bg-elev focus-within:border-line-strong">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5 sm:px-5">
        <span className="flex items-center gap-2 mono-label">
          <PenLine className="h-3.5 w-3.5" /> Sərbəst cavab
        </span>
        <span className="mono-label tabular">
          <span className={cn(words > 0 && 'text-fg')}>{words}</span> söz · {text.length} simvol
        </span>
      </div>
      <textarea
        ref={ref}
        value={text}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Fikrini burada ətraflı yaz. Cavabını müəllim yoxlayıb qiymətləndirəcək…"
        className="block min-h-[200px] w-full resize-none bg-transparent px-4 py-4 text-base leading-relaxed outline-none sm:px-5 sm:text-[17px]"
      />
      <div className="flex items-center justify-between border-t border-line px-4 py-2 sm:px-5">
        <span className="text-xs text-subtle">⌘/Ctrl + Enter — növbəti sual</span>
        <span className="text-xs text-subtle">Avtomatik yadda saxlanılır</span>
      </div>
    </div>
  );
}
