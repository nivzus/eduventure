'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, CheckCircle2, ClipboardCheck, Clock } from 'lucide-react';
import { Avatar, Badge, Button, Field, Input, Skeleton, Textarea } from '@/components/ui';
import { toast } from '@/components/ui/toast';
import { Mascot } from '@/components/brand/Mascot';
import { Note, Stamp, Tape } from '@/components/notebook';
import { cn } from '@/lib/utils';
import { useAttempt, useGradeAttempt, usePendingReviews } from '../../hooks';
import { MODE_LABEL, QUESTION_TYPE_LABEL } from '../../lib/constants';
import { VERDICT_LABEL, userAnswerText, verdictOf } from '../../lib/review';
import { errorMessage, formatDateTime, formatPoints, formatRelative, plainQuestionText, wordCount } from '../../lib/utils';
import { StudioHeader } from './parts';

/* ------------------------------------------------------------------ */
/* List                                                                */
/* ------------------------------------------------------------------ */

export function ReviewList() {
  const { data, isLoading } = usePendingReviews();
  const list = data ?? [];

  return (
    <div className="mx-auto max-w-5xl px-4 pb-20 pt-6 sm:px-6">
      <StudioHeader
        back={{ href: '/studio', label: 'studiya' }}
        eyebrow="açıq suallar"
        title="Yoxlama"
        accent="növbəsi"
        description="Tələbələrin açıq cavablarını oxu, bal ver və rəy yaz."
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : !list.length ? (
        <div className="paper-ruled relative grid place-items-center rounded-3xl border-2 border-ink bg-elev px-6 py-14 pl-14 text-center shadow-stamp">
          <Tape className="-top-3 left-1/2 -translate-x-1/2" color="moss" />
          <Mascot mode="celebrate" size={120} message="Hamısı yoxlanılıb!" />
          <p className="hand mt-5 text-3xl text-muted">Növbə boşdur — çay vaxtıdır ☕</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {list.map((a) => (
            <li key={a.id}>
              <Link
                href={`/studio/review/${a.id}`}
                className="group flex flex-wrap items-center gap-3 rounded-2xl border-2 border-line bg-elev px-3 py-3 shadow-paper transition-all hover:-translate-y-0.5 hover:border-ink hover:shadow-stamp sm:flex-nowrap sm:px-4"
              >
                <Avatar name={a.user?.name ?? 'Tələbə'} src={a.user?.avatarUrl ?? undefined} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-lg font-bold">{a.user?.name ?? 'Tələbə'}</p>
                  <p className="truncate text-sm text-muted">{a.quiz?.title ?? 'Test'}</p>
                </div>
                <div className="flex w-full items-center gap-2 sm:w-auto">
                  <Badge tone={a.mode === 'EXAM' ? 'ember' : 'glacier'}>{MODE_LABEL[a.mode]}</Badge>
                  {typeof a.openCount === 'number' && <Badge tone="aurora">{a.openCount} açıq</Badge>}
                  <span className="inline-flex items-center gap-1 text-xs text-muted" title={formatDateTime(a.submittedAt)}>
                    <Clock className="size-3.5" /> {formatRelative(a.submittedAt ?? a.startedAt)}
                  </span>
                  <span className="flex-1 sm:hidden" />
                  <ArrowRight className="size-5 text-subtle transition-transform group-hover:translate-x-1 group-hover:text-signal" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Detail                                                              */
/* ------------------------------------------------------------------ */

export function ReviewDetail({ attemptId }: { attemptId: string }) {
  const router = useRouter();
  const { data, isLoading, isError } = useAttempt(attemptId);
  const grade = useGradeAttempt(attemptId);
  const [points, setPoints] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState('');

  const rows = useMemo(() => {
    if (!data) return [];
    const order = data.attempt.questionOrder?.length ? data.attempt.questionOrder : data.questions.map((q) => q.id);
    const byId = new Map(data.questions.map((q) => [q.id, q]));
    return order
      .map((id, i) => ({ q: byId.get(id)!, n: i + 1 }))
      .filter((r) => r.q)
      .map((r) => ({ ...r, res: data.attempt.result?.[r.q.id], answer: data.attempt.answers?.[r.q.id] }));
  }, [data]);

  const manual = rows.filter((r) => r.q.type === 'OPEN' || r.res?.correct === null);
  const auto = rows.filter((r) => !manual.includes(r));

  useEffect(() => {
    if (!data) return;
    const init: Record<string, string> = {};
    for (const r of manual) if (r.res && r.res.correct !== null) init[r.q.id] = String(r.res.points);
    setPoints((p) => ({ ...init, ...p }));
    setFeedback((f) => f || data.attempt.feedback || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 px-4 py-8">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-48 rounded-3xl" />
        <Skeleton className="h-48 rounded-3xl" />
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div className="grid place-items-center px-4 py-20 text-center">
        <Mascot mode="sad" size={110} />
        <h1 className="mt-6 text-3xl">Cəhd tapılmadı</h1>
        <Button className="mt-6" onClick={() => router.push('/studio/review')}>
          Növbəyə qayıt
        </Button>
      </div>
    );
  }

  const { attempt, quiz } = data;
  const maxOf = (r: (typeof manual)[number]) => r.res?.max ?? r.q.points;
  const autoScore = auto.reduce((s, r) => s + (r.res?.points ?? 0), 0);
  const autoMax = auto.reduce((s, r) => s + (r.res?.max ?? r.q.points), 0);
  const manualScore = manual.reduce((s, r) => s + (Number(points[r.q.id]) || 0), 0);
  const manualMax = manual.reduce((s, r) => s + maxOf(r), 0);
  const total = autoMax + manualMax;
  const percent = total ? Math.round(((autoScore + manualScore) / total) * 100) : 0;
  const graded = attempt.status === 'GRADED';

  const invalid = manual.find((r) => {
    const v = points[r.q.id];
    if (v === undefined || v === '') return true;
    const n = Number(v);
    return !Number.isFinite(n) || n < 0 || n > maxOf(r);
  });

  const submit = async () => {
    if (invalid) {
      toast.error(`${invalid.n}-ci sual üçün 0–${maxOf(invalid)} arası bal yaz`);
      document.getElementById(`pts-${invalid.q.id}`)?.focus();
      return;
    }
    const payload: Record<string, number> = {};
    for (const r of manual) payload[r.q.id] = Number(points[r.q.id]);
    try {
      await grade.mutateAsync({ points: payload, feedback: feedback.trim() || undefined });
      toast.success(`${attempt.user?.name ?? 'Tələbə'} qiymətləndirildi — ${percent}%`);
      router.push('/studio/review');
    } catch (e) {
      toast.error(errorMessage(e, 'Qiymət yadda saxlanmadı'));
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 pb-32 pt-6 sm:px-6">
      <Link href="/studio/review" className="hand text-xl text-muted hover:text-fg">
        ← yoxlama növbəsi
      </Link>
      <header className="mt-3 flex flex-wrap items-center gap-4">
        <Avatar name={attempt.user?.name ?? 'Tələbə'} src={attempt.user?.avatarUrl ?? undefined} size="lg" />
        <div className="min-w-0 flex-1">
          <Note className="text-xl !text-signal">{MODE_LABEL[attempt.mode]} · {formatDateTime(attempt.submittedAt)}</Note>
          <h1 className="text-3xl leading-tight sm:text-4xl">{attempt.user?.name ?? 'Tələbə'}</h1>
          <p className="truncate text-muted">{quiz.title}</p>
        </div>
        {graded && (
          <Stamp tone="moss" inView={false}>
            yoxlanılıb
          </Stamp>
        )}
      </header>

      <div className="mt-6 flex flex-wrap gap-3">
        <span className="rounded-2xl border-2 border-line bg-elev px-4 py-2 text-sm">
          <span className="mono-label block">avtomatik</span>
          <b className="font-mono text-lg">
            {formatPoints(autoScore)} / {formatPoints(autoMax)}
          </b>
        </span>
        <span className="rounded-2xl border-2 border-line bg-elev px-4 py-2 text-sm">
          <span className="mono-label block">əl ilə</span>
          <b className="font-mono text-lg">
            {formatPoints(manualScore)} / {formatPoints(manualMax)}
          </b>
        </span>
        <span className="rounded-2xl border-2 border-ink bg-ember/25 px-4 py-2 text-sm shadow-stamp-sm">
          <span className="mono-label block">yekun</span>
          <b className="font-mono text-lg">{percent}%</b>
        </span>
      </div>

      {manual.length === 0 ? (
        <p className="mt-8 rounded-2xl border-2 border-dashed border-line-strong p-6 text-center text-muted">Bu cəhddə əl ilə yoxlanacaq sual yoxdur.</p>
      ) : (
        <ol className="mt-8 space-y-6">
          {manual.map((r) => {
            const answer = typeof r.answer === 'string' ? r.answer : userAnswerText(r.q, r.answer);
            const max = maxOf(r);
            const v = points[r.q.id] ?? '';
            const bad = v !== '' && (Number(v) < 0 || Number(v) > max || !Number.isFinite(Number(v)));
            return (
              <li key={r.q.id} className="relative rounded-3xl border-2 border-ink bg-elev p-4 shadow-stamp sm:p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="hand text-3xl text-signal">{r.n}.</span>
                  <Badge tone="aurora">{QUESTION_TYPE_LABEL[r.q.type]}</Badge>
                  <span className="text-sm text-muted">maks. {formatPoints(max)} bal</span>
                </div>
                <p className="mt-2 text-lg font-semibold">{plainQuestionText(r.q)}</p>
                <div className="paper-ruled mt-4 rounded-2xl border border-line bg-surface px-4 py-3 pl-14 leading-8">
                  {answer && answer !== '—' ? (
                    <p className="whitespace-pre-wrap text-[17px]">{answer}</p>
                  ) : (
                    <p className="hand text-xl text-subtle">cavab yazılmayıb</p>
                  )}
                </div>
                {typeof r.answer === 'string' && r.answer.trim() && <p className="mt-1 text-right text-xs text-subtle">{wordCount(r.answer)} söz</p>}
                {r.q.explanation && (
                  <p className="mt-3 text-sm text-muted">
                    <span className="hand text-lg text-moss">nümunə / izah:</span> {r.q.explanation}
                  </p>
                )}
                <div className="mt-4 flex flex-wrap items-end gap-3">
                  <Field label="Bal" htmlFor={`pts-${r.q.id}`} error={bad ? `0–${formatPoints(max)}` : undefined}>
                    <Input
                      id={`pts-${r.q.id}`}
                      type="number"
                      min={0}
                      max={max}
                      step={0.5}
                      inputMode="decimal"
                      value={v}
                      invalid={bad}
                      onChange={(e) => setPoints((p) => ({ ...p, [r.q.id]: e.target.value }))}
                      rightSlot={<span className="pr-3 text-sm text-muted">/ {formatPoints(max)}</span>}
                      wrapperClassName="w-36"
                    />
                  </Field>
                  <div className="flex gap-1.5 pb-0.5">
                    {[0, max / 2, max].map((x, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setPoints((p) => ({ ...p, [r.q.id]: String(x) }))}
                        className={cn(
                          'rounded-full border-2 px-3 py-1.5 text-sm font-bold transition-colors',
                          Number(v) === x && v !== '' ? 'border-ink bg-ember/40' : 'border-line-strong hover:border-ink',
                        )}
                      >
                        {i === 0 ? '0' : i === 1 ? '½' : 'Tam'}
                      </button>
                    ))}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {auto.length > 0 && (
        <details className="mt-8 rounded-2xl border-2 border-line bg-elev p-4">
          <summary className="cursor-pointer font-semibold">Avtomatik yoxlanılan suallar ({auto.length})</summary>
          <ul className="mt-3 space-y-2 text-sm">
            {auto.map((r) => {
              const verdict = verdictOf(r.res, r.answer);
              return (
                <li key={r.q.id} className="flex items-start gap-2">
                  <span className="hand w-6 shrink-0 text-lg text-subtle">{r.n}.</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{plainQuestionText(r.q)}</span>
                    <span className="text-muted">cavab: {userAnswerText(r.q, r.answer)}</span>
                  </span>
                  <Badge tone={verdict === 'correct' ? 'moss' : verdict === 'partial' ? 'ember' : 'danger'}>{VERDICT_LABEL[verdict]}</Badge>
                </li>
              );
            })}
          </ul>
        </details>
      )}

      <Field label="Tələbəyə rəy" htmlFor="grade-feedback" hint="Bildirişdə və nəticə səhifəsində göstəriləcək" className="mt-8">
        <Textarea id="grade-feedback" rows={3} autoGrow value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Əla fikirlər! Növbəti dəfə keçmiş zamana diqqət et…" />
      </Field>

      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center px-4">
        <div className="pointer-events-auto flex w-full max-w-xl items-center justify-between gap-3 rounded-2xl border-2 border-ink bg-elev px-4 py-2.5 shadow-stamp">
          <span className="hand truncate text-xl">
            <ClipboardCheck className="mr-1 inline size-5 align-[-3px]" />
            yekun: <b className="font-mono">{formatPoints(autoScore + manualScore)}</b> / {formatPoints(total)}
          </span>
          <Button leftIcon={<CheckCircle2 />} loading={grade.isPending} disabled={!manual.length} onClick={submit}>
            {graded ? 'Yenilə' : 'Qiymətləndir'}
          </Button>
        </div>
      </div>
    </div>
  );
}
