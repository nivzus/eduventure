'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { Flag, MountainSnow } from 'lucide-react';
import { Button, Drawer, Segmented } from '@/components/ui';
import { cn } from '@/lib/utils';
import { QUESTION_TYPE_LABEL } from '../../lib/constants';
import { plainQuestionText } from '../../lib/utils';
import type { Question } from '../../types';
import type { WaypointState } from './ProgressTrail';

type Filter = 'all' | 'open' | 'flagged';

interface NavDrawerProps {
  open: boolean;
  onClose: () => void;
  questions: Question[];
  states: WaypointState[];
  flagged: boolean[];
  current: number;
  onJump: (i: number) => void;
  onSubmit: () => void;
}

export function NavDrawer({ open, onClose, questions, states, flagged, current, onJump, onSubmit }: NavDrawerProps) {
  const [filter, setFilter] = useState<Filter>('all');
  const openCount = states.filter((s) => s === 'idle').length;
  const flagCount = flagged.filter(Boolean).length;
  const visible = questions
    .map((q, i) => ({ q, i }))
    .filter(({ i }) => (filter === 'open' ? states[i] === 'idle' : filter === 'flagged' ? flagged[i] : true));

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Marşrut xəritəsi"
      description={`${questions.length - openCount} / ${questions.length} sual cavablanıb`}
      side="right"
      size="md"
      footer={
        <Button block leftIcon={<MountainSnow />} onClick={onSubmit}>
          Təhvil verməyə keç
        </Button>
      }
    >
      <Segmented
        size="sm"
        fill
        value={filter}
        onChange={setFilter}
        tabs={[
          { value: 'all', label: 'Hamısı', count: questions.length },
          { value: 'open', label: 'Cavabsız', count: openCount },
          { value: 'flagged', label: 'İşarəli', count: flagCount },
        ]}
      />

      <div className="mt-5 grid grid-cols-5 gap-2 sm:grid-cols-6">
        {visible.map(({ q, i }) => {
          const s = states[i];
          return (
            <motion.button
              key={q.id}
              type="button"
              layout
              whileTap={{ scale: 0.92 }}
              onClick={() => onJump(i)}
              aria-label={`Sual ${i + 1}`}
              className={cn(
                'relative grid aspect-square place-items-center rounded-2xl border font-mono text-sm font-semibold transition-colors',
                i === current && 'ring-2 ring-signal ring-offset-2 ring-offset-elev',
                s === 'idle' && 'border-line bg-sunken/60 text-muted hover:border-line-strong hover:text-fg',
                s === 'answered' && 'border-transparent bg-fg text-bg',
                s === 'correct' && 'border-transparent bg-moss text-bg',
                s === 'wrong' && 'border-transparent bg-danger text-bg',
                s === 'pending' && 'border-transparent bg-glacier text-bg',
              )}
            >
              {i + 1}
              {flagged[i] && (
                <Flag className="absolute -right-1 -top-1 h-3.5 w-3.5 text-ember" fill="currentColor" strokeWidth={2} />
              )}
            </motion.button>
          );
        })}
      </div>
      {visible.length === 0 && (
        <p className="mt-6 text-center text-sm text-muted">
          {filter === 'open' ? 'Bütün suallar cavablanıb. Əla!' : 'İşarələnmiş sual yoxdur.'}
        </p>
      )}

      <div className="mt-8 space-y-1">
        <p className="mono-label mb-2">Suallar</p>
        {visible.map(({ q, i }) => (
          <button
            key={q.id}
            type="button"
            onClick={() => onJump(i)}
            className={cn(
              'flex w-full items-start gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-fg/[0.05]',
              i === current && 'bg-fg/[0.06]',
            )}
          >
            <span className="w-6 shrink-0 pt-0.5 font-mono text-xs text-subtle">{String(i + 1).padStart(2, '0')}</span>
            <span className="min-w-0 flex-1">
              <span className="line-clamp-1 text-sm">{plainQuestionText(q) || '—'}</span>
              <span className="mono-label">{QUESTION_TYPE_LABEL[q.type]}</span>
            </span>
            {states[i] !== 'idle' && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-fg" />}
          </button>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2 border-t border-line pt-4">
        <Legend className="bg-fg" label="Cavablanıb" />
        <Legend className="border border-line bg-sunken" label="Cavabsız" />
        <Legend className="bg-moss" label="Düzgün" />
        <Legend className="bg-danger" label="Səhv" />
      </div>
    </Drawer>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs text-muted">
      <span className={cn('h-3 w-3 rounded', className)} /> {label}
    </span>
  );
}
