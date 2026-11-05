'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowRight, Check, ClipboardList, Eye, Flame } from 'lucide-react';
import { useMemo, useState } from 'react';
import { differenceInCalendarDays } from 'date-fns';
import { ButtonLink, EmptyState, PageHeader, Segmented, Skeleton } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useMyAssignments } from '../hooks';
import { contentHref, contentMeta, groupColorVar } from '../lib/content';
import { dueInfo, fmtDate } from '../lib/format';
import type { Assignment } from '../types';
import { ErrorState } from '../components/shared/States';

const EASE = [0.22, 1, 0.36, 1] as const;
type Filter = 'active' | 'done' | 'all';

type BucketKey = 'overdue' | 'today' | 'tomorrow' | 'week' | 'later' | 'none' | 'done';
const BUCKETS: { key: BucketKey; title: string; hint: string }[] = [
  { key: 'overdue', title: 'Gecikmiş', hint: 'Alov sönməmiş tamamla' },
  { key: 'today', title: 'Bu gün', hint: 'Günün sonuna qədər' },
  { key: 'tomorrow', title: 'Sabah', hint: 'Bir gün qalıb' },
  { key: 'week', title: 'Bu həftə', hint: '7 gün ərzində' },
  { key: 'later', title: 'Daha sonra', hint: 'Uzaq düşərgələr' },
  { key: 'none', title: 'Müddətsiz', hint: 'Öz tempinlə' },
  { key: 'done', title: 'Tamamlanmış', hint: 'Fəth edilmiş zirvələr' },
];

function bucketOf(a: Assignment, now: Date): BucketKey {
  if (a.done) return 'done';
  if (!a.dueAt) return 'none';
  const d = new Date(a.dueAt);
  if (d.getTime() < now.getTime()) return 'overdue';
  const days = differenceInCalendarDays(d, now);
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days < 7) return 'week';
  return 'later';
}

function AssignmentCard({ a, index }: { a: Assignment; index: number }) {
  const reduce = useReducedMotion();
  const meta = contentMeta(a.contentType);
  const Icon = meta.icon;
  const due = dueInfo(a.dueAt, a.done);
  const overdue = due.tone === 'overdue';
  const href = contentHref(a.contentType, a.contentId, a.content?.slug);

  return (
    <motion.li
      layout={!reduce}
      initial={reduce ? false : { opacity: 0, x: -10, filter: 'blur(4px)' }}
      animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, x: 10 }}
      transition={{ duration: 0.45, delay: Math.min(index, 10) * 0.04, ease: EASE }}
      className="relative pl-12 sm:pl-14"
    >
      {/* trail node */}
      <span
        className={cn(
          'absolute left-[9px] top-5 z-[1] grid size-[30px] place-items-center rounded-full border-2 sm:left-[13px]',
          a.done && 'border-moss bg-moss text-[#052e16]',
          overdue && 'border-ember bg-bg text-ember',
          !a.done && !overdue && 'border-line-strong bg-bg text-muted',
        )}
      >
        {overdue && <span className="absolute inset-0 animate-pulse-ring rounded-full bg-ember/40" />}
        {a.done ? <Check className="size-3.5" strokeWidth={3} /> : overdue ? <Flame className="size-3.5" /> : <Icon className="size-3.5" />}
      </span>

      <div
        className={cn(
          'group/ac flex flex-col gap-4 rounded-3xl border bg-elev p-4 shadow-inner-hl transition-colors sm:flex-row sm:items-center sm:p-5',
          overdue ? 'border-ember/35 bg-[linear-gradient(100deg,color-mix(in_oklab,var(--ember)_9%,transparent),transparent_55%)]' : 'border-line hover:border-line-strong',
          a.done && 'opacity-75',
        )}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-subtle">
              <Icon className="size-3.5" />
              {meta.label}
            </span>
            {a.group && (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                <span className="size-2 rounded-full" style={{ background: groupColorVar(a.group.color) }} />
                {a.group.name}
              </span>
            )}
          </div>
          <h3 className={cn('mt-1.5 font-sans text-base font-semibold leading-snug tracking-normal sm:text-lg', a.done && 'line-through decoration-fg/25')}>
            {a.title || a.content?.title}
          </h3>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
            <span className={cn('font-mono', overdue ? 'text-ember' : a.done ? 'text-moss' : due.tone === 'today' ? 'text-fg' : 'text-muted')}>{due.label}</span>
            {a.dueAt && !a.done && <span className="text-subtle">· son tarix {fmtDate(a.dueAt, 'd MMMM, HH:mm')}</span>}
            {a.assignedBy?.name && <span className="text-subtle">· {a.assignedBy.name}</span>}
          </p>
        </div>
        <ButtonLink
          href={href}
          size="sm"
          variant={a.done ? 'ghost' : overdue ? 'primary' : 'secondary'}
          rightIcon={a.done ? <Eye /> : <ArrowRight />}
          className="self-start sm:self-auto"
        >
          {a.done ? 'Bax' : 'Başla'}
        </ButtonLink>
      </div>
    </motion.li>
  );
}

export function AssignmentsScreen() {
  const q = useMyAssignments();
  const [filter, setFilter] = useState<Filter>('active');
  const all = q.data ?? [];
  const now = useMemo(() => new Date(), [q.dataUpdatedAt]); // eslint-disable-line react-hooks/exhaustive-deps
  const counts = useMemo(() => {
    const done = all.filter((a) => a.done).length;
    const overdue = all.filter((a) => bucketOf(a, now) === 'overdue').length;
    return { done, active: all.length - done, overdue };
  }, [all, now]);

  const grouped = useMemo(() => {
    const visible = all.filter((a) => (filter === 'all' ? true : filter === 'done' ? a.done : !a.done));
    const map = new Map<BucketKey, Assignment[]>();
    visible.forEach((a) => {
      const k = bucketOf(a, now);
      map.set(k, [...(map.get(k) ?? []), a]);
    });
    map.forEach((list, k) =>
      list.sort((x, y) =>
        k === 'done'
          ? +new Date(y.dueAt ?? y.createdAt ?? 0) - +new Date(x.dueAt ?? x.createdAt ?? 0)
          : +new Date(x.dueAt ?? 8.64e15) - +new Date(y.dueAt ?? 8.64e15),
      ),
    );
    return BUCKETS.filter((b) => map.has(b.key)).map((b) => ({ ...b, items: map.get(b.key)! }));
  }, [all, filter, now]);

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Marşrut planı"
        title={
          <>
            Mənim <em>tapşırıqlarım</em>
          </>
        }
        description={
          q.data
            ? `${counts.active} aktiv${counts.overdue ? ` · ${counts.overdue} gecikmiş` : ''} · ${counts.done} tamamlanmış`
            : 'Müəllimlərin sizə və qruplarınıza verdiyi tapşırıqlar — son tarixə görə düzülüb.'
        }
        actions={
          <Segmented
            value={filter}
            onChange={setFilter}
            aria-label="Filtr"
            tabs={[
              { value: 'active', label: 'Aktiv', count: q.data ? counts.active : undefined },
              { value: 'done', label: 'Tamamlanmış', count: q.data ? counts.done : undefined },
              { value: 'all', label: 'Hamısı' },
            ]}
          />
        }
      />

      {q.isLoading ? (
        <div className="space-y-3 pl-12 sm:pl-14">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-24 rounded-3xl" />
          ))}
        </div>
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : !grouped.length ? (
        <EmptyState
          icon={ClipboardList}
          title={filter === 'done' ? 'Hələ tamamlanmış tapşırıq yoxdur' : filter === 'active' ? 'Aktiv tapşırıq yoxdur — afərin!' : 'Tapşırıq yoxdur'}
          description="Müəllim yeni test, məqalə və ya kurs təyin etdikdə burada görünəcək. Bu arada öz marşrutunuzu seçin."
          action={
            <ButtonLink href="/quizzes" variant="secondary" rightIcon={<ArrowRight />}>
              Testlərə bax
            </ButtonLink>
          }
        />
      ) : (
        <div className="relative">
          {/* the trail */}
          <span
            aria-hidden
            className="absolute bottom-6 left-[23px] top-2 w-[2px] sm:left-[27px]"
            style={{ background: 'repeating-linear-gradient(to bottom, var(--border-strong) 0 6px, transparent 6px 12px)' }}
          />
          <AnimatePresence mode="popLayout" initial={false}>
            {grouped.map((g) => (
              <motion.section key={g.key} layout className="relative mb-8 last:mb-0" aria-labelledby={`b-${g.key}`}>
                <header className="relative mb-3 flex items-baseline gap-3 pl-12 sm:pl-14">
                  <span
                    aria-hidden
                    className={cn(
                      'absolute left-[17px] top-1.5 size-3.5 rotate-45 rounded-[3px] border-2 sm:left-[21px]',
                      g.key === 'overdue' ? 'border-ember bg-ember' : g.key === 'done' ? 'border-moss bg-moss' : 'border-signal bg-bg light:border-fg',
                    )}
                  />
                  <h2 id={`b-${g.key}`} className={cn('text-lg font-semibold sm:text-xl', g.key === 'overdue' && 'text-ember')}>
                    {g.title}
                  </h2>
                  <span className="mono-label">
                    {g.items.length} · {g.hint}
                  </span>
                </header>
                <ul className="space-y-3">
                  {g.items.map((a, i) => (
                    <AssignmentCard key={a.id} a={a} index={i} />
                  ))}
                </ul>
              </motion.section>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
