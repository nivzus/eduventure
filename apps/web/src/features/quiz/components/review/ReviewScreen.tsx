'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Hourglass, Lightbulb, MessageSquareText, X } from 'lucide-react';
import { ButtonLink, Segmented, Skeleton } from '@/components/ui';
import { Mascot } from '@/components/brand/Mascot';
import { Note, Tape } from '@/components/notebook';
import { CommentThread } from '@/features/community/components/comments/CommentThread';
import { cn } from '@/lib/utils';
import { useAttempt } from '../../hooks';
import { correctText, userAnswerText, verdictOf, VERDICT_LABEL, type Verdict } from '../../lib/review';
import { plainQuestionText } from '../../lib/utils';

type Filter = 'all' | 'wrong' | 'correct';

const MARK: Record<Verdict, { icon: typeof Check; cls: string }> = {
  correct: { icon: Check, cls: 'bg-moss text-white' },
  wrong: { icon: X, cls: 'bg-danger text-white' },
  partial: { icon: Check, cls: 'bg-ember text-ink' },
  pending: { icon: Hourglass, cls: 'bg-aurora text-white' },
  skipped: { icon: X, cls: 'bg-subtle text-white' },
};

export function ReviewScreen({ id }: { id: string }) {
  const { data, isLoading, isError } = useAttempt(id);
  const [filter, setFilter] = useState<Filter>('all');

  const rows = useMemo(() => {
    if (!data) return [];
    const order = data.attempt.questionOrder?.length ? data.attempt.questionOrder : data.questions.map((q) => q.id);
    const byId = new Map(data.questions.map((q) => [q.id, q]));
    return order
      .map((qid, i) => {
        const q = byId.get(qid);
        if (!q) return null;
        const a = data.attempt.answers?.[qid];
        const r = data.attempt.result?.[qid];
        return { n: i + 1, q, a, r, v: verdictOf(r, a) };
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x));
  }, [data]);

  const shown = rows.filter((r) => (filter === 'all' ? true : filter === 'correct' ? r.v === 'correct' : r.v !== 'correct'));

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-44 rounded-3xl" />)}
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div className="mx-auto grid max-w-md place-items-center px-4 py-20 text-center">
        <Mascot mode="sad" size={120} />
        <h1 className="mt-6 text-3xl">Cavablar tapılmadı</h1>
        <ButtonLink href="/quizzes" className="mt-6">Testlərə qayıt</ButtonLink>
      </div>
    );
  }

  const hidden = data.attempt.status === 'IN_PROGRESS' || !data.quiz.showAnswers;

  return (
    <div className="mx-auto max-w-3xl px-4 pb-20 pt-8 sm:px-6">
      <Link href={`/attempts/${id}/result`} className="hand text-xl text-muted hover:text-fg">← nəticəyə qayıt</Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Note className="text-2xl !text-signal">səhvlər üzərində iş</Note>
          <h1 className="mt-1 text-4xl leading-tight sm:text-5xl">{data.quiz.title}</h1>
        </div>
        <Segmented
          tabs={[
            { value: 'all', label: `Hamısı · ${rows.length}` },
            { value: 'wrong', label: `Səhvlər · ${rows.filter((r) => r.v !== 'correct').length}` },
            { value: 'correct', label: 'Düzgünlər' },
          ]}
          value={filter}
          onChange={(v) => setFilter(v as Filter)}
        />
      </div>

      {data.attempt.feedback && (
        <div className="relative mt-6 rounded-2xl bg-[#FFE7A8] p-5 text-[#3b2a12] shadow-paper dark:bg-[#5b4a22] dark:text-[#fbeccb]">
          <Tape color="aurora" className="-top-3 left-6" rotate={-6} />
          <div className="flex items-center gap-2 font-display font-semibold"><MessageSquareText className="size-4" /> Müəllimin rəyi</div>
          <p className="hand mt-1 text-2xl leading-snug">{data.attempt.feedback}</p>
        </div>
      )}

      {hidden && (
        <p className="mt-6 rounded-2xl border-2 border-dashed border-line-strong p-4 text-muted">
          Bu test üçün düzgün cavablar gizlədilib — yalnız öz cavablarını görürsən.
        </p>
      )}

      <ol className="mt-8 space-y-5">
        <AnimatePresence initial={false}>
          {shown.map(({ n, q, a, r, v }) => {
            const M = MARK[v];
            const right = correctText(q);
            return (
              <motion.li
                layout
                key={q.id}
                id={`q-${q.id}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.35 }}
                className="paper-ruled relative scroll-mt-24 rounded-3xl border border-line bg-elev p-5 pl-14 shadow-paper sm:p-6 sm:pl-16"
              >
                <span className="hand absolute left-4 top-4 text-3xl text-subtle sm:left-5">{n}</span>
                <span className={cn('absolute -right-2 -top-2 grid size-9 place-items-center rounded-full border-2 border-ink shadow-stamp-sm', M.cls)} title={VERDICT_LABEL[v]}>
                  <M.icon className="size-4" strokeWidth={3} />
                </span>

                <div className="flex flex-wrap items-center gap-2 text-xs text-subtle">
                  <span className="font-mono">{r ? `${r.points}/${r.max}` : `0/${q.points}`} bal</span>
                  {q.tags.slice(0, 3).map((t) => <span key={t} className="rounded-full bg-sunken px-2 py-0.5">#{t}</span>)}
                </div>
                <p className="mt-2 font-display text-xl font-semibold leading-snug">{plainQuestionText(q)}</p>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className={cn('rounded-2xl border-2 px-4 py-3', v === 'correct' ? 'border-moss/50 bg-moss/10' : v === 'pending' ? 'border-aurora/40 bg-aurora/5' : 'border-danger/40 bg-danger/5')}>
                    <div className="hand text-lg text-muted">sənin cavabın</div>
                    <div className="mt-0.5 whitespace-pre-wrap font-semibold">{userAnswerText(q, a)}</div>
                  </div>
                  {q.type === 'OPEN' ? (
                    <div className="rounded-2xl border-2 border-dashed border-line-strong px-4 py-3">
                      <div className="hand text-lg text-muted">açıq sual</div>
                      <div className="mt-0.5 text-sm text-muted">{v === 'pending' ? 'Müəllim yoxlayır…' : 'Müəllim tərəfindən qiymətləndirilib.'}</div>
                    </div>
                  ) : (
                    !hidden && right && (
                      <div className="rounded-2xl border-2 border-moss/50 bg-moss/10 px-4 py-3">
                        <div className="hand text-lg text-muted">düzgün cavab</div>
                        <div className="mt-0.5 font-semibold text-moss">{right}</div>
                      </div>
                    )
                  )}
                </div>

                {q.explanation && !hidden && (
                  <div className="mt-4 flex gap-3 rounded-2xl bg-sunken px-4 py-3">
                    <Lightbulb className="mt-0.5 size-5 shrink-0 text-signal" />
                    <p className="text-[15px] leading-relaxed">{q.explanation}</p>
                  </div>
                )}
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ol>

      {shown.length === 0 && (
        <div className="mt-10 grid place-items-center text-center">
          <Mascot mode="celebrate" size={110} message="Səhv yoxdur!" />
        </div>
      )}

      <section className="mt-14">
        <CommentThread targetType="ATTEMPT" targetId={id} title="Müəllimə sual ver" />
      </section>
    </div>
  );
}
