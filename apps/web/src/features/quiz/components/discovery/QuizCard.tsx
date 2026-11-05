'use client';

import Link from 'next/link';
import { Clock, KeyRound, Layers, Lock, Users } from 'lucide-react';
import { Card, ProgressRing, Skeleton } from '@/components/ui';
import { cn } from '@/lib/utils';
import { formatTimeLimit, percentTone, resolveCoverColor } from '../../lib/utils';
import type { QuizListItem } from '../../types';
import { BookmarkToggle } from '../shared/BookmarkToggle';
import { CoverArt } from '../shared/CoverArt';

interface QuizCardProps {
  quiz: QuizListItem;
  bookmarked: boolean;
  featured?: boolean;
  className?: string;
}

const WEEK = 7 * 24 * 3600 * 1000;

export function QuizCard({ quiz, bookmarked, featured, className }: QuizCardProps) {
  const color = resolveCoverColor(quiz.coverColor, quiz.id);
  const best = typeof quiz.myBest === 'number' ? Math.round(quiz.myBest) : null;
  const isNew = quiz.createdAt && Date.now() - Date.parse(quiz.createdAt) < WEEK;
  const passed = best !== null && best >= (quiz.passPercent ?? 60);

  return (
    <Card
      padded={false}
      interactive
      glow={color}
      className={cn('group flex h-full flex-col overflow-hidden', featured && 'sm:flex-row', className)}
    >
      {/* stretched link keeps the bookmark button a sibling (valid HTML) */}
      <Link
        href={`/quizzes/${quiz.id}`}
        className="absolute inset-0 z-[2] rounded-3xl focus-visible:outline-offset-4"
        aria-label={`${quiz.title} — ətraflı`}
      />

      <CoverArt
        seed={quiz.id}
        color={quiz.coverColor}
        className={cn('shrink-0', featured ? 'h-44 sm:h-auto sm:w-[46%]' : 'h-36')}
        rings={featured ? 11 : 8}
        summit={featured}
      >
        <div className="flex h-full flex-col justify-between p-4">
          <div className="flex items-start justify-between gap-2">
            <span className="inline-flex max-w-[70%] items-center gap-1.5 truncate rounded-full border border-line-strong bg-bg/55 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-fg backdrop-blur-md">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color }} />
              <span className="truncate">{quiz.category || 'Ümumi'}</span>
            </span>
            <BookmarkToggle quizId={quiz.id} active={bookmarked} className="relative z-[3]" />
          </div>
          <div className="flex items-center gap-1.5">
            {isNew && (
              <span className="rounded-full bg-signal px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-signal-fg">
                Yeni
              </span>
            )}
            {quiz.visibility === 'PASSCODE' && (
              <span className="inline-flex items-center gap-1 rounded-full border border-line-strong bg-bg/55 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-fg backdrop-blur-md">
                <KeyRound className="h-3 w-3" /> Kodla
              </span>
            )}
            {quiz.visibility === 'GROUPS' && (
              <span className="inline-flex items-center gap-1 rounded-full border border-line-strong bg-bg/55 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-fg backdrop-blur-md">
                <Lock className="h-3 w-3" /> Qrup
              </span>
            )}
          </div>
        </div>
      </CoverArt>

      <div className="relative z-[1] flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <h3
              className={cn(
                'font-display font-semibold leading-[1.15] tracking-tight transition-colors',
                featured ? 'text-2xl sm:text-[28px]' : 'text-[19px]',
              )}
            >
              {quiz.title}
            </h3>
            {quiz.description && (
              <p className={cn('mt-2 text-sm leading-relaxed text-muted', featured ? 'line-clamp-3' : 'line-clamp-2')}>
                {quiz.description}
              </p>
            )}
          </div>
          <ScoreBadge best={best} passed={passed} />
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-2 font-mono text-[11px] uppercase tracking-[0.1em] text-subtle">
          <span className="inline-flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5" /> {quiz.questionCount ?? 0} sual
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" /> {formatTimeLimit(quiz.timeLimitSec)}
          </span>
          {typeof quiz.attemptsCount === 'number' && (
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" /> {quiz.attemptsCount}
            </span>
          )}
        </div>
        {quiz.author?.name && featured && (
          <p className="text-xs text-subtle">
            Müəllif: <span className="text-muted">{quiz.author.name}</span>
          </p>
        )}
      </div>
    </Card>
  );
}

function ScoreBadge({ best, passed }: { best: number | null; passed: boolean }) {
  if (best === null) {
    return (
      <div className="flex shrink-0 flex-col items-center gap-1" title="Hələ cəhd etməmisən">
        <span className="grid h-[52px] w-[52px] place-items-center rounded-full border border-dashed border-line-strong font-mono text-[10px] uppercase tracking-[0.1em] text-subtle">
          Yeni
        </span>
      </div>
    );
  }
  return (
    <div className="flex shrink-0 flex-col items-center gap-1" title={`Ən yaxşı nəticən: ${best}%`}>
      <ProgressRing value={best} size={52} stroke={4} tone={passed ? 'moss' : percentTone(best) === 'danger' ? 'danger' : 'ember'}>
        <span className="text-[13px]">{best}</span>
      </ProgressRing>
      <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-subtle">Ən yaxşı</span>
    </div>
  );
}

export function QuizCardSkeleton({ featured }: { featured?: boolean }) {
  return (
    <div
      className={cn(
        'flex h-full flex-col overflow-hidden rounded-3xl border border-line bg-elev',
        featured && 'sm:flex-row',
      )}
    >
      <Skeleton className={cn('rounded-none', featured ? 'h-44 sm:h-auto sm:w-[46%]' : 'h-36')} />
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex gap-4">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-2/3" />
          </div>
          <Skeleton className="h-[52px] w-[52px] rounded-full" />
        </div>
        <Skeleton className="mt-4 h-3 w-1/2" />
      </div>
    </div>
  );
}
