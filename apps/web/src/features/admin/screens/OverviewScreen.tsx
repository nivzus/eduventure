'use client';

import Link from 'next/link';
import { Activity, ClipboardCheck, Percent, ScrollText, UsersRound } from 'lucide-react';
import { Avatar, Badge } from '@/components/ui';
import { Stamp } from '@/components/notebook';
import { errorMessage } from '@/lib/api';
import { formatPercent, formatRelative } from '@/lib/utils';
import { useStatsOverview } from '../hooks';
import { HBarList, TrailLine } from '../components/charts';
import { AdminPage, dayLabelShort, DerivedTag, EmptyNote, Kpi, Sheet, SheetSkeleton } from '../components/kit';

export function OverviewScreen() {
  const { data, isLoading, error } = useStatsOverview();
  const days = data?.attemptsByDay ?? [];
  const total14 = days.reduce((s, d) => s + d.count, 0);

  return (
    <AdminPage note="komandir masası" title="Admin paneli" subtitle="bütün səyahətçilərin xəritəsi bir baxışda" actions={<DerivedTag show={data?.derived} />}>
      {error && !data ? (
        <Sheet>
          <EmptyNote mode="sad" message="Statistika yüklənmədi" hint={errorMessage(error)} />
        </Sheet>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
            <Kpi index={0} label="İstifadəçilər" value={data?.users} icon={<UsersRound className="size-4" />} />
            <Kpi index={1} label="Aktiv (7 gün)" value={data?.activeUsers7d} icon={<Activity className="size-4" />} hint={data?.users ? `${formatPercent(((data.activeUsers7d ?? 0) / data.users) * 100)} istifadəçi` : undefined} />
            <Kpi index={2} label="Testlər" value={data?.quizzes} icon={<ScrollText className="size-4" />} />
            <Kpi index={3} label="Cəhdlər" value={data?.attempts} icon={<ClipboardCheck className="size-4" />} hint={data?.pendingReview ? `${data.pendingReview} yoxlama gözləyir` : undefined} />
            <div className="col-span-2 lg:col-span-1">
              <Kpi index={4} tone="signal" label="Orta nəticə" value={data?.avgPercent == null ? null : Math.round(data.avgPercent)} suffix="%" icon={<Percent className="size-4" />} />
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
            <Sheet title="Gündəlik cəhdlər" note={`son ${days.length || 14} gün · cəmi ${total14}`}>
              {isLoading ? (
                <SheetSkeleton rows={4} />
              ) : days.length ? (
                <TrailLine
                  ariaLabel="Gündəlik cəhdlərin sayı"
                  data={days.map((d) => ({ key: d.date, label: dayLabelShort(d.date), value: d.count, title: new Date(d.date).toLocaleDateString('az-AZ', { day: 'numeric', month: 'long' }) }))}
                  valueLabel={(v) => `${v} cəhd`}
                  height={250}
                />
              ) : (
                <EmptyNote message="Hələ cəhd yoxdur" />
              )}
            </Sheet>

            <Sheet title="Populyar testlər" note="cəhd sayına görə" actions={<Link href="/admin/analytics" className="hand text-lg text-signal hover:underline">hamısı →</Link>}>
              {isLoading ? (
                <SheetSkeleton rows={4} />
              ) : (
                <HBarList
                  inked
                  emptyLabel="Hələ test həll olunmayıb"
                  data={(data?.topQuizzes ?? []).slice(0, 6).map((q) => ({
                    key: q.id,
                    label: (
                      <Link href={`/admin/analytics/quizzes/${q.id}`} className="font-semibold hover:underline">
                        {q.title}
                      </Link>
                    ),
                    value: q.attempts,
                    display: `${q.attempts} cəhd${q.avgPercent != null ? ` · ort. ${Math.round(q.avgPercent)}%` : ''}`,
                  }))}
                />
              )}
            </Sheet>
          </div>

          <Sheet className="mt-6" title="Son cəhdlər" note="kim nə vaxt nə topladı" bodyClassName="-mx-4 sm:-mx-6">
            {isLoading ? (
              <SheetSkeleton rows={5} className="px-4 sm:px-6" />
            ) : !data?.recentAttempts.length ? (
              <EmptyNote message="Hələ cəhd yoxdur" />
            ) : (
              <ul className="divide-y divide-line border-t border-line">
                {data.recentAttempts.slice(0, 8).map((a) => (
                  <li key={a.id} className="flex items-center gap-3 px-4 py-3 sm:px-6">
                    <Avatar name={a.user?.name} src={a.user?.avatarUrl} size="sm" />
                    <div className="min-w-0 flex-1">
                      <Link href={a.user ? `/u/${a.user.id}` : '#'} className="block truncate font-semibold hover:underline">
                        {a.user?.name ?? 'İstifadəçi'}
                      </Link>
                      <Link href={`/admin/analytics/quizzes/${a.quizId}`} className="block truncate text-sm text-muted hover:text-fg">
                        {a.quiz?.title ?? 'Test'}
                      </Link>
                    </div>
                    <div className="hidden text-right font-mono text-xs text-subtle sm:block">{formatRelative(a.submittedAt ?? a.createdAt)}</div>
                    <div className="relative w-16 shrink-0 text-right">
                      {a.percent >= 100 ? (
                        <Stamp tone="moss" rotate={-8} className="!px-2 !py-1">
                          100%
                        </Stamp>
                      ) : (
                        <Badge tone={a.passed ? 'moss' : 'ember'} variant="soft" mono>
                          {Math.round(a.percent ?? 0)}%
                        </Badge>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Sheet>
        </>
      )}
    </AdminPage>
  );
}
