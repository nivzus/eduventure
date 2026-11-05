'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, CircleCheck, CircleX, ClipboardList, Crosshair, Hourglass, ScrollText, Sparkles } from 'lucide-react';
import { ButtonLink } from '@/components/ui';
import { NumberTicker } from '@/components/motion';
import { cn, formatNumber } from '@/lib/utils';
import type { Assignment, SummaryAttempt, WeakTopic } from '../../types';
import { contentHref, contentMeta } from '../../lib/content';
import { dueInfo, pct, relativeTime } from '../../lib/format';
import { InlineEmpty } from '../shared/States';

const EASE = [0.22, 1, 0.36, 1] as const;

/* ─────────── due flashcards ─────────── */

export function DueCards({ count }: { count: number }) {
  const reduce = useReducedMotion();
  const has = count > 0;
  return (
    <div className="flex h-full items-center gap-5">
      <div className="relative h-28 w-24 shrink-0" aria-hidden>
        {[2, 1, 0].map((i) => (
          <motion.div
            key={i}
            className={cn(
              'absolute inset-0 rounded-2xl border',
              i === 0 ? 'grid place-items-center border-line-strong bg-surface' : 'border-line bg-elev',
            )}
            initial={reduce ? false : { rotate: 0, y: 10, opacity: 0 }}
            animate={{ rotate: i === 0 ? -4 : i === 1 ? 5 : 12, x: i * 6, y: 0, opacity: 1 }}
            whileHover={i === 0 ? { rotate: -8, y: -4 } : undefined}
            transition={{ type: 'spring', stiffness: 120, damping: 20, delay: 0.2 + (2 - i) * 0.08 }}
          >
            {i === 0 && (
              <span className={cn('display-tight text-4xl font-bold', has ? 'text-fg' : 'text-subtle')}>
                <NumberTicker value={count} />
              </span>
            )}
          </motion.div>
        ))}
      </div>
      <div className="min-w-0 space-y-3">
        <div>
          <span className="mono-label">Təkrar növbəsi</span>
          <p className="mt-1 font-semibold leading-snug">{has ? `${formatNumber(count)} kart sizi gözləyir` : 'Bu gün təkrar yoxdur'}</p>
          <p className="mt-0.5 text-xs text-muted">{has ? 'Aralıqlı təkrar yaddaşı möhkəmləndirir.' : 'Yaddaş təzədir. Yeni koloda seçə bilərsiniz.'}</p>
        </div>
        <ButtonLink href="/decks" size="sm" variant={has ? 'primary' : 'secondary'} rightIcon={<ArrowRight />}>
          {has ? 'Təkrara başla' : 'Kolodalar'}
        </ButtonLink>
      </div>
    </div>
  );
}

/* ─────────── assignments due soon ─────────── */

const DUE_STYLE: Record<string, string> = {
  overdue: 'text-ember',
  today: 'text-signal light:text-fg',
  soon: 'text-fg',
  later: 'text-muted',
  none: 'text-subtle',
  done: 'text-moss',
};

export function AssignmentsDue({ items }: { items: Assignment[] }) {
  const open = items
    .filter((a) => !a.done)
    .sort((a, b) => (a.dueAt ? +new Date(a.dueAt) : Infinity) - (b.dueAt ? +new Date(b.dueAt) : Infinity))
    .slice(0, 4);
  if (!open.length)
    return <InlineEmpty icon={ClipboardList} title="Aktiv tapşırıq yoxdur" hint="Müəllim yeni tapşırıq verəndə burada görünəcək. Afərin!" />;
  return (
    <ol className="relative space-y-1">
      <span aria-hidden className="absolute bottom-3 left-[15px] top-3 w-px bg-[repeating-linear-gradient(to_bottom,var(--border-strong)_0_3px,transparent_3px_7px)]" />
      {open.map((a, i) => {
        const due = dueInfo(a.dueAt);
        const meta = contentMeta(a.contentType);
        const Icon = meta.icon;
        return (
          <motion.li key={a.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.06, duration: 0.4, ease: EASE }}>
            <Link
              href={a.content ? contentHref(a.contentType, a.contentId, a.content.slug) : contentHref(a.contentType, a.contentId)}
              className="group/as relative flex items-center gap-3 rounded-xl py-2 pr-2 transition-colors hover:bg-fg/[0.04]"
            >
              <span
                className={cn(
                  'relative z-[1] grid size-8 shrink-0 place-items-center rounded-full border bg-elev',
                  due.tone === 'overdue' ? 'border-ember/50 text-ember shadow-[0_0_16px_-4px_var(--ember)]' : 'border-line text-muted',
                )}
              >
                <Icon className="size-3.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{a.title}</span>
                <span className={cn('font-mono text-[11px]', DUE_STYLE[due.tone])}>{due.label}</span>
              </span>
              <ArrowRight className="size-4 shrink-0 text-subtle opacity-0 transition-opacity group-hover/as:opacity-100" />
            </Link>
          </motion.li>
        );
      })}
    </ol>
  );
}

/* ─────────── weak topics ─────────── */

export function WeakTopics({ topics }: { topics: WeakTopic[] }) {
  const reduce = useReducedMotion();
  const list = [...topics].sort((a, b) => pct(a.accuracy) - pct(b.accuracy)).slice(0, 5);
  if (!list.length)
    return <InlineEmpty icon={Crosshair} title="Zəif mövzu tapılmadı" hint="Bir neçə test həll edin — sistem çətinlik çəkdiyiniz mövzuları burada göstərəcək." />;
  return (
    <div className="space-y-4">
      <ul className="space-y-3">
        {list.map((t, i) => {
          const acc = Math.round(pct(t.accuracy));
          return (
            <li key={t.tag}>
              <Link href={`/practice?tags=${encodeURIComponent(t.tag)}`} className="group/wt block">
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <span className="truncate text-sm font-medium group-hover/wt:underline group-hover/wt:decoration-signal group-hover/wt:underline-offset-4">#{t.tag}</span>
                  <span className="shrink-0 font-mono text-[11px] tabular text-muted">
                    {acc}% · {formatNumber(t.total)} sual
                  </span>
                </div>
                <div className="relative h-1.5 overflow-hidden rounded-full bg-ember/15">
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-full bg-ember"
                    initial={reduce ? false : { width: 0 }}
                    animate={{ width: `${acc}%` }}
                    transition={{ duration: 0.8, delay: 0.15 + i * 0.06, ease: EASE }}
                  />
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
      <ButtonLink href={`/practice?tags=${encodeURIComponent(list.map((t) => t.tag).join(','))}`} size="sm" variant="secondary" leftIcon={<Sparkles />} block>
        Ağıllı məşq
      </ButtonLink>
    </div>
  );
}

/* ─────────── recent attempts ─────────── */

export function RecentAttempts({ attempts }: { attempts: SummaryAttempt[] }) {
  const list = attempts.slice(0, 5);
  if (!list.length)
    return (
      <InlineEmpty
        icon={ScrollText}
        title="Hələ test həll etməmisiniz"
        hint="İlk testinizi tamamlayın — nəticələr burada jurnal kimi toplanacaq."
        action={
          <ButtonLink href="/quizzes" size="sm" rightIcon={<ArrowRight />}>
            Testlərə bax
          </ButtonLink>
        }
      />
    );
  return (
    <ul className="-mx-2 divide-y divide-line">
      {list.map((a, i) => {
        const pending = a.status === 'PENDING_REVIEW';
        const p = Math.round(a.percent ?? 0);
        return (
          <motion.li key={a.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05, duration: 0.4, ease: EASE }}>
            <Link href={`/attempts/${a.id}/result`} className="group/ra flex items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-fg/[0.04]">
              <span
                className={cn(
                  'grid size-9 shrink-0 place-items-center rounded-xl border',
                  pending ? 'border-glacier/30 bg-glacier/10 text-glacier' : a.passed ? 'border-moss/30 bg-moss/10 text-moss' : 'border-danger/30 bg-danger/10 text-danger',
                )}
              >
                {pending ? <Hourglass className="size-4" /> : a.passed ? <CircleCheck className="size-4" /> : <CircleX className="size-4" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{a.quiz?.title ?? 'Test'}</span>
                <span className="font-mono text-[11px] text-subtle">
                  {relativeTime(a.submittedAt ?? a.startedAt)}
                  {a.mode === 'PRACTICE' ? ' · məşq' : ''}
                  {pending ? ' · yoxlanılır' : a.passed ? ' · keçdi' : ' · keçmədi'}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="font-display text-lg font-semibold">{pending ? '—' : `${p}%`}</span>
              </span>
            </Link>
          </motion.li>
        );
      })}
    </ul>
  );
}
