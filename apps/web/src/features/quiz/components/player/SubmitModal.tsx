'use client';

import { AlertTriangle, Flag, MountainSnow } from 'lucide-react';
import { Button, Modal } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { Question } from '../../types';
import type { WaypointState } from './ProgressTrail';

interface SubmitModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
  isPractice: boolean;
  questions: Question[];
  states: WaypointState[];
  flagged: boolean[];
  onJump: (i: number) => void;
}

export function SubmitModal({ open, onClose, onConfirm, loading, isPractice, questions, states, flagged, onJump }: SubmitModalProps) {
  const total = questions.length;
  const unanswered = states.map((s, i) => (s === 'idle' ? i : -1)).filter((i) => i >= 0);
  const flaggedIdx = flagged.map((f, i) => (f ? i : -1)).filter((i) => i >= 0);
  const answered = total - unanswered.length;
  const pct = total ? Math.round((answered / total) * 100) : 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isPractice ? 'Məşqi bitirək?' : 'Zirvəyə hazırsan?'}
      description={
        isPractice
          ? 'Məşq nəticən saxlanılacaq və səhv etdiyin mövzular növbəti ağıllı məşqə düşəcək.'
          : 'Təhvil verdikdən sonra cavabları dəyişmək mümkün olmayacaq.'
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Yoxlamağa qayıt
          </Button>
          <Button onClick={onConfirm} loading={loading} leftIcon={<MountainSnow />} magnetic>
            {isPractice ? 'Bitir' : 'Təhvil ver'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="rounded-2xl border border-line bg-sunken/60 p-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="mono-label">Cavablanıb</p>
              <p className="font-display text-3xl font-semibold tracking-tight tabular-nums">
                {answered}
                <span className="text-lg text-subtle"> / {total}</span>
              </p>
            </div>
            <p className="font-mono text-sm text-muted">{pct}%</p>
          </div>
          <div className="mt-3 flex h-2 gap-[3px]" aria-hidden>
            {states.map((s, i) => (
              <span
                key={i}
                className={cn(
                  'h-full flex-1 rounded-full',
                  s === 'idle' ? 'bg-fg/10' : s === 'wrong' ? 'bg-danger' : s === 'correct' ? 'bg-moss' : 'bg-signal',
                )}
              />
            ))}
          </div>
        </div>

        {unanswered.length > 0 && (
          <div className="rounded-2xl border border-ember/30 bg-ember/[0.07] p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-ember">
              <AlertTriangle className="h-4 w-4" /> {unanswered.length} sual cavabsız qalıb
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {unanswered.slice(0, 24).map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onJump(i)}
                  className="h-8 min-w-8 rounded-lg border border-ember/30 px-2 font-mono text-xs text-ember transition-colors hover:bg-ember/15"
                >
                  {i + 1}
                </button>
              ))}
              {unanswered.length > 24 && <span className="self-center text-xs text-muted">+{unanswered.length - 24}</span>}
            </div>
          </div>
        )}

        {flaggedIdx.length > 0 && (
          <div>
            <p className="mono-label mb-2 flex items-center gap-1.5">
              <Flag className="h-3 w-3 text-ember" fill="currentColor" /> İşarələnmiş suallar
            </p>
            <div className="flex flex-wrap gap-1.5">
              {flaggedIdx.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onJump(i)}
                  className="h-8 min-w-8 rounded-lg border border-line px-2 font-mono text-xs text-muted transition-colors hover:border-line-strong hover:text-fg"
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
