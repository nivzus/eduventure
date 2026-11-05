'use client';

import Link from 'next/link';
import { ArrowUpRight, Hourglass, Play } from 'lucide-react';
import { Badge, Skeleton } from '@/components/ui';
import { Stagger, StaggerItem } from '@/components/motion';
import { cn } from '@/lib/utils';
import { ATTEMPT_STATUS_LABEL, MODE_LABEL } from '../../lib/constants';
import { formatDateTime, formatDuration } from '../../lib/utils';
import type { Attempt } from '../../types';
import { AltitudeChart } from './AltitudeChart';

interface AttemptHistoryProps {
  attempts: Attempt[] | undefined;
  loading?: boolean;
  passPercent: number;
}

export function AttemptHistory({ attempts, loading, passPercent }: AttemptHistoryProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-2xl" />
        ))}
      </div>
    );
  }
  const list = [...(attempts ?? [])].sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
  if (!list.length) {
    return (
      <div className="rounded-3xl border border-dashed border-line-strong px-5 py-8 text-center">
        <p className="font-display text-base font-semibold">Hələ yola çıxmamısan</p>
        <p className="mt-1 text-sm text-muted">İlk cəhdindən sonra burada yüksəklik qrafikin görünəcək.</p>
      </div>
    );
  }

  const graded = list
    .filter((a) => a.status === 'SUBMITTED' || a.status === 'GRADED')
    .sort((a, b) => Date.parse(a.submittedAt ?? a.startedAt) - Date.parse(b.submittedAt ?? b.startedAt));
  const best = graded.reduce((m, a) => Math.max(m, a.percent), 0);

  return (
    <div className="space-y-5">
      {graded.length >= 2 && (
        <div className="rounded-3xl border border-line bg-sunken/40 p-4 pt-5 sm:p-5">
          <div className="mb-3 flex items-baseline justify-between">
            <p className="mono-label">Yüksəklik profili</p>
            <p className="font-mono text-xs text-muted">
              Zirvə: <span className="text-fg">{Math.round(best)}%</span>
            </p>
          </div>
          <AltitudeChart
            passPercent={passPercent}
            points={graded.map((a) => ({
              percent: a.percent,
              passed: a.passed,
              label: formatDateTime(a.submittedAt ?? a.startedAt),
            }))}
          />
        </div>
      )}

      <Stagger as="ul" className="space-y-2" inView={false}>
        {list.map((a) => {
          const inProgress = a.status === 'IN_PROGRESS';
          const pending = a.status === 'PENDING_REVIEW';
          const href = inProgress ? `/attempts/${a.id}` : `/attempts/${a.id}/result`;
          return (
            <StaggerItem as="li" key={a.id}>
              <Link
                href={href}
                className="group flex items-center gap-3 rounded-2xl border border-line bg-elev px-3.5 py-3 transition-colors hover:border-line-strong sm:gap-4 sm:px-4"
              >
                <span
                  className={cn(
                    'grid h-11 w-11 shrink-0 place-items-center rounded-xl font-display text-sm font-semibold tabular-nums',
                    inProgress && 'bg-signal text-signal-fg',
                    pending && 'bg-glacier/15 text-glacier',
                    !inProgress && !pending && (a.passed ? 'bg-moss/15 text-moss' : 'bg-ember/15 text-ember'),
                  )}
                >
                  {inProgress ? <Play className="h-4 w-4" /> : pending ? <Hourglass className="h-4 w-4" /> : `${Math.round(a.percent)}`}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold">{formatDateTime(a.startedAt)}</span>
                    <Badge tone={a.mode === 'PRACTICE' ? 'glacier' : 'neutral'} mono className="h-5 px-2">
                      {MODE_LABEL[a.mode]}
                    </Badge>
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">
                    {inProgress
                      ? 'Yarımçıq qalıb — davam et'
                      : pending
                        ? ATTEMPT_STATUS_LABEL.PENDING_REVIEW
                        : `${a.passed ? 'Keçdi' : 'Keçmədi'} · ${a.score}/${a.maxScore} bal · ${formatDuration(a.timeSpentSec)}`}
                  </span>
                </span>
                {!inProgress && !pending && (
                  <span className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-fg/[0.08] sm:block">
                    <span
                      className={cn('block h-full rounded-full', a.passed ? 'bg-moss' : 'bg-ember')}
                      style={{ width: `${Math.max(3, Math.min(100, a.percent))}%` }}
                    />
                  </span>
                )}
                <ArrowUpRight className="h-4 w-4 shrink-0 text-subtle transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-fg" />
              </Link>
            </StaggerItem>
          );
        })}
      </Stagger>
    </div>
  );
}
