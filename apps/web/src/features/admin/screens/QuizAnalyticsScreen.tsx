'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Download, Flag } from 'lucide-react';
import { Avatar, Badge, Button, Segmented, Table, TBody, TD, TH, THead, TR } from '@/components/ui';
import { Stamp } from '@/components/notebook';
import { errorMessage } from '@/lib/api';
import { QUESTION_TYPE_LABEL, type QuestionType } from '@/lib/types';
import { formatDuration, formatRatio, formatRelative } from '@/lib/utils';
import { useAttempts, useQuizStats } from '../hooks';
import { difficultyLabel, discriminationLabel, itemAnalysis, timeStats } from '../lib/analysis';
import { downloadCsv, stamp } from '../lib/csv';
import { ColumnChart, HBarList } from '../components/charts';
import { AdminPage, DerivedTag, EmptyNote, Kpi, PctBar, Sheet, SheetSkeleton } from '../components/kit';

const TONE_VAR = { moss: 'var(--moss)', signal: 'var(--signal)', ember: 'var(--ember)', danger: 'var(--danger)' } as const;

function TimeStrip({ t }: { t: NonNullable<ReturnType<typeof timeStats>> }) {
  const max = Math.max(1, t.max);
  const pos = (v: number) => `${(v / max) * 100}%`;
  return (
    <div className="pt-2">
      <div className="relative mx-2 h-12" role="img" aria-label={`Vaxt: minimum ${formatDuration(t.min)}, median ${formatDuration(t.median)}, maksimum ${formatDuration(t.max)}`}>
        <span className="absolute top-1/2 h-0.5 -translate-y-1/2 bg-ink" style={{ left: pos(t.min), width: `calc(${pos(t.max)} - ${pos(t.min)})` }} />
        <span className="absolute top-1/2 h-4 w-0.5 -translate-y-1/2 bg-ink" style={{ left: pos(t.min) }} />
        <span className="absolute top-1/2 h-4 w-0.5 -translate-x-full -translate-y-1/2 bg-ink" style={{ left: pos(t.max) }} />
        <span
          className="absolute top-1/2 h-9 -translate-y-1/2 rounded-md border-2 border-ink bg-signal/40"
          style={{ left: pos(t.p25), width: `max(4px, calc(${pos(t.p75)} - ${pos(t.p25)}))` }}
        />
        <span className="absolute top-1/2 h-11 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink" style={{ left: pos(t.median) }} />
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-center sm:grid-cols-5">
        {[
          ['Ən sürətli', t.min],
          ['25%', t.p25],
          ['Median', t.median],
          ['75%', t.p75],
          ['Ən yavaş', t.max],
        ].map(([l, v], i) => (
          <div key={String(l)} className={i === 1 || i === 3 ? 'hidden sm:block' : ''}>
            <dt className="mono-label !text-base">{l}</dt>
            <dd className="font-mono text-sm tabular">{formatDuration(v as number)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function QuizAnalyticsScreen({ id }: { id: string }) {
  const { data: s, isLoading, error } = useQuizStats(id);
  const { data: attempts } = useAttempts({ quizId: id });
  const [qSort, setQSort] = useState<'order' | 'hard'>('order');

  const items = useMemo(() => itemAnalysis(attempts ?? []), [attempts]);
  const times = useMemo(() => timeStats(attempts ?? []), [attempts]);
  const pass = s?.quiz.passPercent ?? 60;

  const questions = useMemo(() => {
    const q = (s?.questions ?? []).map((x, i) => ({ ...x, n: i + 1 }));
    return qSort === 'hard' ? [...q].sort((a, b) => (a.correctRate ?? 2) - (b.correctRate ?? 2)) : q;
  }, [s, qSort]);
  const hardest = useMemo(() => {
    const rated = (s?.questions ?? []).filter((q) => q.correctRate != null);
    if (!rated.length) return null;
    return rated.reduce((a, b) => ((b.correctRate ?? 1) < (a.correctRate ?? 1) ? b : a));
  }, [s]);

  const exportCsv = () => {
    if (!s) return;
    downloadCsv(
      `${s.quiz.title.replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase()}-${stamp()}`,
      ['Tələbə', 'Cəhd sayı', 'Ən yaxşı %', 'Orta %', 'Son nəticə %', 'Son cəhd'],
      s.byUser.map((u) => [u.name, u.attempts, u.bestPercent?.toFixed(1) ?? '', u.avgPercent?.toFixed(1) ?? '', u.lastPercent?.toFixed(1) ?? '', u.lastAt ?? '']),
    );
  };
  const exportQuestionsCsv = () => {
    if (!s) return;
    downloadCsv(
      `suallar-${stamp()}`,
      ['#', 'Sual', 'Tip', 'Düzgün cavab %', 'Orta bal', 'Maks bal', 'Ayırdetmə indeksi'],
      s.questions.map((q, i) => [i + 1, q.text, q.type, q.correctRate == null ? '' : (q.correctRate * 100).toFixed(1), q.avgPoints?.toFixed(2) ?? '', q.maxPoints ?? '', (q.discrimination ?? items.get(q.id)?.d)?.toFixed(2) ?? '']),
    );
  };

  return (
    <AdminPage
      back={{ href: '/admin/analytics', label: 'Bütün testlər' }}
      note={s?.quiz.category ?? 'test analizi'}
      title={s?.quiz.title ?? (isLoading ? 'Yüklənir…' : 'Test')}
      subtitle={s ? `keçid həddi ${pass}% · ${s.questions.length} sual` : undefined}
      actions={
        <>
          <DerivedTag show={s?.derived} />
          <Button variant="secondary" size="sm" leftIcon={<Download />} onClick={exportCsv} disabled={!s?.byUser.length}>
            Tələbələr CSV
          </Button>
          <Button variant="ghost" size="sm" leftIcon={<Download />} onClick={exportQuestionsCsv} disabled={!s?.questions.length}>
            Suallar CSV
          </Button>
        </>
      }
    >
      {error && !s ? (
        <Sheet>
          <EmptyNote mode="sad" message="Analiz yüklənmədi" hint={errorMessage(error)} />
        </Sheet>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <Kpi index={0} label="Cəhdlər" value={s?.attempts} hint={s ? `${s.byUser.length} tələbə${s.pendingReview ? ` · ${s.pendingReview} yoxlanılır` : ''}` : undefined} />
            <Kpi index={1} label="Orta nəticə" value={s?.avgPercent == null ? null : Math.round(s.avgPercent)} suffix="%" />
            <Kpi index={2} tone="signal" label="Keçid faizi" value={s?.passRate == null ? null : Math.round(s.passRate * 100)} suffix="%" hint={`≥ ${pass}% toplayanlar`} />
            <Kpi index={3} label="Orta vaxt" value={s?.avgTimeSec == null ? null : Math.round(s.avgTimeSec / 60)} suffix=" dəq" hint={s?.avgTimeSec != null ? formatDuration(s.avgTimeSec) : undefined} />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <Sheet title="Nəticələrin paylanması" note="neçə cəhd hansı faiz aralığına düşüb">
              {isLoading ? (
                <SheetSkeleton rows={4} />
              ) : s && s.distribution.some((d) => d.count > 0) ? (
                <>
                  <ColumnChart
                    touching
                    showValues
                    ariaLabel="Nəticə faizlərinin histogramı"
                    height={240}
                    valueLabel={(v) => `${v} cəhd`}
                    marker={{ at: Math.min(1, pass / 100), label: 'keçid' }}
                    data={s.distribution.map((d, i) => {
                      const from = (i / Math.max(1, s.distribution.length)) * 100;
                      return { key: `${d.label}-${i}`, label: d.label, title: `${d.label}%`, value: d.count, color: from >= pass ? 'var(--signal)' : 'var(--ember)' };
                    })}
                  />
                  <p className="mt-1 text-center font-mono text-[10px] uppercase tracking-wider text-subtle">nəticə, %</p>
                </>
              ) : (
                <EmptyNote message="Hələ cəhd yoxdur" />
              )}
            </Sheet>

            <Sheet title="Vaxt" note="testə sərf olunan vaxt">
              {times ? (
                <TimeStrip t={times} />
              ) : s?.avgTimeSec ? (
                <p className="font-display text-3xl font-bold">{formatDuration(s.avgTimeSec)}</p>
              ) : (
                <EmptyNote message="Vaxt məlumatı yoxdur" />
              )}
              {times && <p className="mt-4 text-sm text-muted">{times.n} cəhd əsasında. Qutu — cəhdlərin orta 50%-i, qalın xətt — median.</p>}
            </Sheet>
          </div>

          <Sheet
            className="mt-6"
            title="Suallar üzrə düzgün cavab faizi"
            note="ən çətin sual işarələnib"
            actions={
              <Segmented
                size="sm"
                aria-label="Sualların sırası"
                value={qSort}
                onChange={setQSort}
                tabs={[
                  { value: 'order', label: 'Sıra ilə' },
                  { value: 'hard', label: 'Çətindən' },
                ]}
              />
            }
          >
            {isLoading ? (
              <SheetSkeleton rows={4} />
            ) : !questions.length ? (
              <EmptyNote message="Sual yoxdur" />
            ) : (
              <HBarList
                inked
                max={1}
                data={questions.map((q) => {
                  const diff = q.correctRate == null ? null : difficultyLabel(q.correctRate);
                  const d = q.discrimination ?? items.get(q.id)?.d ?? null;
                  const isHardest = hardest?.id === q.id && (q.correctRate ?? 1) < 0.85;
                  return {
                    key: q.id,
                    value: q.correctRate ?? 0,
                    color: diff ? TONE_VAR[diff.tone] : 'var(--border-strong)',
                    display: q.correctRate == null ? 'yoxlanılmayıb' : formatRatio(q.correctRate),
                    label: (
                      <span className="inline-flex min-w-0 max-w-full items-center gap-2">
                        <span className="font-mono text-xs text-subtle">{q.n}.</span>
                        <span className="truncate" title={q.text}>
                          {q.text}
                        </span>
                        {isHardest && (
                          <Badge tone="danger" size="sm" icon={<Flag className="size-3" />}>
                            ən çətin
                          </Badge>
                        )}
                      </span>
                    ),
                    sub: (
                      <span className="flex flex-wrap gap-x-3 gap-y-0.5">
                        <span>{QUESTION_TYPE_LABEL[q.type as QuestionType] ?? q.type}</span>
                        {diff && <span>{diff.label}</span>}
                        {q.avgPoints != null && (
                          <span>
                            orta bal {q.avgPoints.toFixed(1)}
                            {q.maxPoints ? ` / ${q.maxPoints}` : ''}
                          </span>
                        )}
                        {d != null && <span>ayırdetmə {d.toFixed(2)} · {discriminationLabel(d)}</span>}
                      </span>
                    ),
                  };
                })}
              />
            )}
          </Sheet>

          <Sheet className="mt-6" title="Tələbələr" note="hər tələbənin ən yaxşı nəticəsi" bodyClassName="relative">
            {isLoading ? (
              <SheetSkeleton rows={5} />
            ) : !s?.byUser.length ? (
              <EmptyNote message="Bu testi hələ heç kim həll etməyib" />
            ) : (
              <>
                {s.byUser.some((u) => (u.bestPercent ?? 0) >= 100) && (
                  <div className="pointer-events-none absolute -top-16 right-2 hidden sm:block">
                    <Stamp tone="moss" rotate={10}>
                      100% var!
                    </Stamp>
                  </div>
                )}
                <Table wrapperClassName="rounded-2xl border-2 border-ink shadow-none" className="min-w-[620px]">
                  <THead>
                    <TR>
                      <TH>Tələbə</TH>
                      <TH className="text-right">Cəhd</TH>
                      <TH>Ən yaxşı</TH>
                      <TH>Son nəticə</TH>
                      <TH>Son cəhd</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {s.byUser.map((u) => (
                      <TR key={u.userId}>
                        <TD>
                          <Link href={`/u/${u.userId}`} className="flex items-center gap-3 font-semibold hover:underline">
                            <Avatar name={u.name} src={u.avatarUrl} size="sm" />
                            <span className="truncate">{u.name}</span>
                          </Link>
                        </TD>
                        <TD className="text-right font-mono tabular">{u.attempts}</TD>
                        <TD>
                          <PctBar value={u.bestPercent} pass={pass} />
                        </TD>
                        <TD>
                          <PctBar value={u.lastPercent ?? u.avgPercent} />
                        </TD>
                        <TD className="whitespace-nowrap text-sm text-muted">{u.lastAt ? formatRelative(u.lastAt) : '—'}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </>
            )}
          </Sheet>
        </>
      )}
    </AdminPage>
  );
}
