'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Search } from 'lucide-react';
import { Badge, Button, Input, Select, Table, TBody, TD, TH, THead, TR } from '@/components/ui';
import { STATUS_LABEL, type ContentStatus } from '@/lib/types';
import { formatDuration, formatRatio } from '@/lib/utils';
import { useAdminQuizzes, useManyQuizStats } from '../hooks';
import { downloadCsv, stamp } from '../lib/csv';
import { ColumnChart } from '../components/charts';
import { AdminPage, DerivedTag, EmptyNote, PctBar, Sheet, SheetSkeleton } from '../components/kit';

type SortKey = 'attempts' | 'avg' | 'pass' | 'title';

export function AnalyticsScreen() {
  const router = useRouter();
  const quizzes = useAdminQuizzes();
  const list = quizzes.data ?? [];
  const stats = useManyQuizStats(list.map((q) => q.id));
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<SortKey>('attempts');

  const rows = useMemo(() => {
    const r = list.map((quiz, i) => {
      const s = stats[i]?.data;
      return {
        ...quiz,
        attempts: s?.attempts ?? quiz.attemptsCount ?? 0,
        avg: s?.avgPercent ?? null,
        pass: s?.passRate ?? null,
        time: s?.avgTimeSec ?? null,
        loading: stats[i]?.isLoading ?? false,
        derived: s?.derived,
      };
    });
    const needle = q.trim().toLocaleLowerCase('az');
    const filtered = needle ? r.filter((x) => `${x.title} ${x.category ?? ''}`.toLocaleLowerCase('az').includes(needle)) : r;
    const by: Record<SortKey, (a: (typeof r)[number], b: (typeof r)[number]) => number> = {
      attempts: (a, b) => b.attempts - a.attempts,
      avg: (a, b) => (a.avg ?? 101) - (b.avg ?? 101),
      pass: (a, b) => (a.pass ?? 2) - (b.pass ?? 2),
      title: (a, b) => a.title.localeCompare(b.title, 'az'),
    };
    return [...filtered].sort(by[sort]);
  }, [list, stats, q, sort]);

  const withData = rows.filter((r) => r.avg != null && r.attempts > 0);
  const derived = rows.some((r) => r.derived);

  const exportCsv = () =>
    downloadCsv(
      `test-analitikasi-${stamp()}`,
      ['Test', 'Kateqoriya', 'Status', 'Sual', 'Cəhd', 'Orta %', 'Keçid faizi %', 'Orta vaxt (san)'],
      rows.map((r) => [
        r.title,
        r.category ?? '',
        r.status ? (STATUS_LABEL[r.status as ContentStatus] ?? r.status) : '',
        r.questionCount ?? '',
        r.attempts,
        r.avg == null ? '' : r.avg.toFixed(1),
        r.pass == null ? '' : (r.pass * 100).toFixed(1),
        r.time == null ? '' : Math.round(r.time),
      ]),
    );

  return (
    <AdminPage
      note="ölçü cədvəli"
      title="Analitika"
      subtitle="hansı test asandır, hansı dağ kimi çətin?"
      actions={
        <>
          <DerivedTag show={derived} />
          <Button variant="secondary" size="sm" leftIcon={<Download />} onClick={exportCsv} disabled={!rows.length}>
            CSV ixrac
          </Button>
        </>
      }
    >
      <Sheet title="Testlər üzrə orta nəticə" note="sütuna toxun — detallar" className="mb-6">
        {quizzes.isLoading ? (
          <SheetSkeleton rows={3} />
        ) : withData.length ? (
          <ColumnChart
            ariaLabel="Testlər üzrə orta nəticə faizi"
            height={230}
            showValues
            valueLabel={(v) => `${Math.round(v)}%`}
            data={withData.slice(0, 16).map((r) => ({
              key: r.id,
              label: r.title.length > 10 ? `${r.title.slice(0, 9)}…` : r.title,
              title: r.title,
              value: r.avg ?? 0,
              color: (r.avg ?? 0) >= (r.passPercent ?? 60) ? 'var(--signal)' : 'var(--ember)',
            }))}
          />
        ) : (
          <EmptyNote message="Hələ nəticə yoxdur" />
        )}
      </Sheet>

      <Sheet bodyClassName="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Test axtar…" leftIcon={<Search className="size-4" />} wrapperClassName="w-full sm:max-w-xs" aria-label="Test axtar" />
          <Select
            selectSize="sm"
            aria-label="Sıralama"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            wrapperClassName="w-full sm:w-56"
            options={[
              { value: 'attempts', label: 'Ən çox cəhd' },
              { value: 'avg', label: 'Ən aşağı orta nəticə' },
              { value: 'pass', label: 'Ən aşağı keçid faizi' },
              { value: 'title', label: 'Ada görə (A–Z)' },
            ]}
          />
        </div>

        {quizzes.isLoading ? (
          <SheetSkeleton rows={6} />
        ) : !rows.length ? (
          <EmptyNote message="Test tapılmadı" />
        ) : (
          <Table wrapperClassName="rounded-2xl border-2 border-ink shadow-none" className="min-w-[760px]">
            <THead>
              <TR>
                <TH>Test</TH>
                <TH className="text-right">Sual</TH>
                <TH className="text-right">Cəhd</TH>
                <TH>Orta nəticə</TH>
                <TH className="text-right">Keçid</TH>
                <TH className="text-right">Orta vaxt</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((r) => (
                <TR key={r.id} interactive onClick={() => router.push(`/admin/analytics/quizzes/${r.id}`)}>
                  <TD>
                    <Link href={`/admin/analytics/quizzes/${r.id}`} onClick={(e) => e.stopPropagation()} className="block max-w-[280px] truncate font-semibold hover:underline">
                      {r.title}
                    </Link>
                    <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                      {r.category && <span>{r.category}</span>}
                      {r.status && r.status !== 'PUBLISHED' && (
                        <Badge size="sm" tone={r.status === 'DRAFT' ? 'neutral' : 'ember'} variant="outline">
                          {STATUS_LABEL[r.status as ContentStatus] ?? r.status}
                        </Badge>
                      )}
                    </span>
                  </TD>
                  <TD className="text-right font-mono tabular">{r.questionCount ?? '—'}</TD>
                  <TD className="text-right font-mono tabular">{r.attempts}</TD>
                  <TD>{r.loading ? <span className="text-subtle">…</span> : <PctBar value={r.avg} pass={r.passPercent} />}</TD>
                  <TD className="text-right font-mono tabular">{formatRatio(r.pass)}</TD>
                  <TD className="whitespace-nowrap text-right font-mono text-sm tabular">{r.time ? formatDuration(r.time) : '—'}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Sheet>
    </AdminPage>
  );
}
