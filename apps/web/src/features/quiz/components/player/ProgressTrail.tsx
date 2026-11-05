'use client';

import { useMemo } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Flag, MountainSnow } from 'lucide-react';
import { cn, EASE_OUT_EXPO } from '@/lib/utils';

export type WaypointState = 'idle' | 'answered' | 'correct' | 'wrong' | 'pending';

interface ProgressTrailProps {
  count: number;
  current: number;
  states: WaypointState[];
  flagged: boolean[];
  onJump?: (index: number) => void;
  className?: string;
}

const VB_W = 1000;
const VB_H = 28;
const MID = 14;

function yAt(i: number) {
  return MID + Math.sin(i * 0.85) * 5;
}

/**
 * The quiz as a mountain trail: one waypoint per question, a drawn path up to
 * where you are, flags on marked questions, a summit at the end.
 */
export function ProgressTrail({ count, current, states, flagged, onJump, className }: ProgressTrailProps) {
  const reduce = useReducedMotion();
  const pts = useMemo(
    () => Array.from({ length: count }, (_, i) => [((i + 0.5) / count) * VB_W, yAt(i)] as const),
    [count],
  );
  const d = useMemo(() => {
    if (!pts.length) return '';
    let s = `M0,${MID}`;
    for (const [x, y] of pts) s += ` L${x.toFixed(1)},${y.toFixed(1)}`;
    s += ` L${VB_W},${MID}`;
    return s;
  }, [pts]);

  const answered = states.filter((s) => s !== 'idle').length;
  const progress = count ? (current + 0.5) / count : 0;
  const dense = count > 24;

  return (
    <div className={cn('relative flex w-full items-center gap-3', className)}>
      <div className="relative h-9 flex-1">
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          preserveAspectRatio="none"
          className="absolute inset-x-0 top-1/2 h-7 w-full -translate-y-1/2 overflow-visible"
          aria-hidden
        >
          <path
            d={d}
            stroke="var(--border-strong)"
            strokeWidth={1.5}
            strokeDasharray="2 5"
            strokeLinecap="round"
            fill="none"
            vectorEffect="non-scaling-stroke"
          />
          <motion.path
            d={d}
            stroke="var(--signal)"
            strokeWidth={2}
            strokeLinecap="round"
            fill="none"
            vectorEffect="non-scaling-stroke"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: progress }}
            transition={reduce ? { duration: 0 } : { duration: 0.8, ease: EASE_OUT_EXPO }}
          />
        </svg>

        {pts.map(([x, y], i) => {
          const state = states[i] ?? 'idle';
          const isCurrent = i === current;
          const isFlagged = flagged[i];
          return (
            <button
              key={i}
              type="button"
              onClick={() => onJump?.(i)}
              aria-label={`Sual ${i + 1}${isFlagged ? ', işarələnib' : ''}${state !== 'idle' ? ', cavablanıb' : ''}`}
              aria-current={isCurrent ? 'step' : undefined}
              title={`Sual ${i + 1}`}
              className={cn(
                'group absolute -translate-x-1/2 -translate-y-1/2 rounded-full outline-none',
                dense ? 'h-5 w-3 sm:w-4' : 'h-7 w-7',
                'focus-visible:ring-2 focus-visible:ring-signal',
              )}
              style={{ left: `${(x / VB_W) * 100}%`, top: `${(y / VB_H) * 100}%` }}
            >
              <span className="absolute inset-0 grid place-items-center">
                {isCurrent && !reduce && (
                  <span className="absolute h-3 w-3 rounded-full bg-signal/40 animate-pulse-ring" />
                )}
                <motion.span
                  layout
                  className={cn(
                    'relative block rounded-full border transition-colors duration-300',
                    isCurrent
                      ? 'h-3.5 w-3.5 border-signal bg-signal shadow-[0_0_0_4px_color-mix(in_oklab,var(--signal)_22%,transparent)]'
                      : dense
                        ? 'h-1.5 w-1.5'
                        : 'h-2.5 w-2.5',
                    !isCurrent && state === 'idle' && 'border-line-strong bg-bg',
                    !isCurrent && state === 'answered' && 'border-fg bg-fg',
                    !isCurrent && state === 'correct' && 'border-moss bg-moss',
                    !isCurrent && state === 'wrong' && 'border-danger bg-danger',
                    !isCurrent && state === 'pending' && 'border-glacier bg-glacier',
                    'group-hover:scale-125',
                  )}
                />
              </span>
              {isFlagged && (
                <motion.span
                  initial={{ y: 6, opacity: 0, scale: 0.6 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  className="absolute -top-3 left-1/2 -translate-x-1/2 text-ember"
                >
                  <Flag className={dense ? 'h-2.5 w-2.5' : 'h-3 w-3'} fill="currentColor" strokeWidth={2.4} />
                </motion.span>
              )}
            </button>
          );
        })}
      </div>
      <span
        className={cn(
          'shrink-0 text-subtle transition-colors duration-500',
          answered === count && count > 0 && 'text-signal',
        )}
        aria-hidden
      >
        <MountainSnow className="h-4 w-4" />
      </span>
    </div>
  );
}
