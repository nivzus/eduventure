'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, Clock, Hourglass, RotateCcw, Sparkles, Target, Trophy } from 'lucide-react';
import { ButtonLink, Skeleton } from '@/components/ui';
import { NumberTicker, fireConfetti } from '@/components/motion';
import { Mascot } from '@/components/brand/Mascot';
import { AchievementBadge } from '@/components/brand/AchievementBadge';
import { CircleMark, Highlight, Note, Scribble, Stamp, Tape } from '@/components/notebook';
import { cn } from '@/lib/utils';
import { readSubmitStash, useAttempt } from '../../hooks';
import { VERDICT_LABEL, verdictOf, type Verdict } from '../../lib/review';
import { plainQuestionText } from '../../lib/utils';

const EASE = [0.22, 1, 0.36, 1] as const;

const VERDICT_STYLE: Record<Verdict, string> = {
  correct: 'border-moss/50 bg-moss/10 text-moss',
  wrong: 'border-danger/45 bg-danger/10 text-danger',
  partial: 'border-ember bg-ember/20 text-signal',
  pending: 'border-aurora/40 bg-aurora/10 text-aurora',
  skipped: 'border-line-strong bg-sunken text-subtle',
};

function fmtTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m ? `${m} dəq ${s} san` : `${s} san`;
}

export function ResultScreen({ id }: { id: string }) {
  const { data, isLoading, isError } = useAttempt(id);
  const reduce = useReducedMotion();
  const [reward, setReward] = useState<ReturnType<typeof readSubmitStash>>(null);
  useEffect(() => setReward(readSubmitStash(id)), [id]);

  const attempt = data?.attempt;
  const pending = attempt?.status === 'PENDING_REVIEW';
  const passed = Boolean(attempt?.passed) && !pending;
  const percent = Math.round(attempt?.percent ?? 0);

  const rows = useMemo(() => {
    if (!data) return [];
    const order = data.attempt.questionOrder?.length ? data.attempt.questionOrder : data.questions.map((q) => q.id);
    const byId = new Map(data.questions.map((q) => [q.id, q]));
    return order
      .map((qid) => byId.get(qid))
      .filter(Boolean)
      .map((q) => ({ q: q!, r: data.attempt.result?.[q!.id], v: verdictOf(data.attempt.result?.[q!.id], data.attempt.answers?.[q!.id]) }));
  }, [data]);

  const counts = useMemo(() => {
    const c = { correct: 0, wrong: 0, partial: 0, pending: 0, skipped: 0 } as Record<Verdict, number>;
    rows.forEach((r) => c[r.v]++);
    return c;
  }, [rows]);

  useEffect(() => {
    if (!passed || reduce) return;
    const t = setTimeout(() => fireConfetti({ kind: 'summit' }), 900);
    return () => clearTimeout(t);
  }, [passed, reduce]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-10 sm:px-6">
        <Skeleton className="h-72 rounded-3xl" />
        <Skeleton className="h-40 rounded-3xl" />
      </div>
    );
  }
  if (isError || !data || !attempt) {
    return (
      <div className="mx-auto grid max-w-md place-items-center px-4 py-20 text-center">
        <Mascot mode="sad" size={120} />
        <h1 className="mt-6 text-3xl">Nəticə tapılmadı</h1>
        <p className="mt-2 text-muted">Bu cəhd mövcud deyil və ya ona baxmaq icazən yoxdur.</p>
        <ButtonLink href="/quizzes" className="mt-6">Testlərə qayıt</ButtonLink>
      </div>
    );
  }

  const xp = reward?.xpGained ?? 0;
  const achievements = reward?.newAchievements ?? [];
  const passPercent = data.quiz.passPercent ?? 60;

  return (
    <div className="mx-auto max-w-5xl px-4 pb-20 pt-8 sm:px-6">
      <Link href={`/quizzes/${data.quiz.id}`} className="hand text-xl text-muted hover:text-fg">← {data.quiz.title}</Link>

      {/* Hero sheet */}
      <motion.section
        initial={{ opacity: 0, y: 18, rotate: -0.6 }}
        animate={{ opacity: 1, y: 0, rotate: 0 }}
        transition={{ duration: 0.7, ease: EASE }}
        className="paper-ruled relative mt-5 overflow-hidden rounded-3xl border-2 border-ink bg-elev p-6 pl-14 shadow-[6px_6px_0_0_var(--ink)] sm:p-10 sm:pl-20"
      >
        <Tape color={passed ? 'moss' : 'ember'} className="-top-2 left-1/3" rotate={-3} />
        <div className="grid items-center gap-8 md:grid-cols-[1.3fr_1fr]">
          <div>
            <Note className="text-2xl !text-signal">{data.quiz.mode === 'PRACTICE' ? 'məşq nəticəsi' : 'imtahan nəticəsi'}</Note>
            <h1 className="mt-2 text-4xl leading-[1.02] sm:text-6xl">
              {pending ? (
                <>Müəllim <Highlight inView={false} delay={0.5}>yoxlayır</Highlight></>
              ) : passed ? (
                <>Zirvəyə <Scribble inView={false} delay={0.6}>çatdın!</Scribble></>
              ) : (
                <>Az qaldı — <Highlight inView={false} delay={0.5}>yenidən</Highlight></>
              )}
            </h1>
            <p className="mt-4 max-w-md text-lg text-muted">
              {pending
                ? 'Açıq suallarını müəllim yoxlayandan sonra yekun bal və bildiriş gələcək.'
                : passed
                  ? 'Əla iş! Bu mövzunu fəth etdin. Səhvlərə nəzər salıb daha da möhkəmləndir.'
                  : `Keçid həddi ${passPercent}%. Səhvlərini gözdən keçir — növbəti cəhd daha yaxşı olacaq.`}
            </p>

            <div className="mt-7 flex flex-wrap gap-x-7 gap-y-3 text-sm">
              <span className="inline-flex items-center gap-2"><Target className="size-4 text-signal" /> <b className="font-display text-base">{attempt.score}/{attempt.maxScore}</b> bal</span>
              <span className="inline-flex items-center gap-2"><Clock className="size-4 text-signal" /> {fmtTime(attempt.timeSpentSec ?? 0)}</span>
              <span className="inline-flex items-center gap-2"><Trophy className="size-4 text-signal" /> keçid {passPercent}%</span>
            </div>
          </div>

          <div className="relative grid place-items-center">
            <div className="text-center">
              <CircleMark delay={0.9} inView={false} className="px-4">
                <span className="font-display text-[88px] font-extrabold leading-none tabular-nums sm:text-[110px]">
                  <NumberTicker value={percent} />%
                </span>
              </CircleMark>
              <div className="mt-6 flex justify-center">
                <Mascot mode={pending ? 'static' : passed ? 'celebrate' : 'sad'} size={110} />
              </div>
            </div>
            {!pending && (
              <Stamp inView={false} delay={1.4} tone={passed ? 'moss' : 'danger'} rotate={passed ? -14 : 10} className="absolute -right-2 top-0 text-[11px] sm:right-2">
                {passed ? <>Keçdin<br />✓</> : <>Hələ<br />yox</>}
              </Stamp>
            )}
          </div>
        </div>
      </motion.section>

      {/* Rewards */}
      {(xp > 0 || reward?.levelUp || achievements.length > 0) && (
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.6, ease: EASE }}
          className="mt-6 flex w-fit max-w-full flex-wrap items-center gap-4 rounded-3xl border border-line bg-elev p-4 shadow-paper"
        >
          {xp > 0 && (
            <div className="flex items-center gap-3 rounded-2xl bg-[#FFE7A8] px-4 py-3 text-[#3b2a12] shadow-paper dark:bg-[#5b4a22] dark:text-[#fbeccb]">
              <Sparkles className="size-5 text-signal" />
              <span className="font-display text-2xl font-bold">+<NumberTicker value={xp} /> XP</span>
            </div>
          )}
          {reward?.levelUp && <Stamp inView={false} delay={1.5} tone="aurora" rotate={-8} className="text-[10px]">Yeni<br />səviyyə!</Stamp>}
          {achievements.map((a, i) => (
            <motion.div
              key={a.id ?? a.code}
              initial={{ scale: 0.4, opacity: 0, rotate: -20 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ delay: 1.6 + i * 0.2, type: 'spring', stiffness: 300, damping: 16 }}
              className="flex items-center gap-3"
            >
              <AchievementBadge icon={a.icon} size="sm" />
              <div>
                <div className="font-display font-semibold">{a.title}</div>
                <div className="text-xs text-muted">{a.description}</div>
              </div>
            </motion.div>
          ))}
        </motion.section>
      )}

      {/* Actions */}
      <div className="mt-8 flex flex-wrap gap-3">
        <ButtonLink href={`/attempts/${id}/review`} size="lg" rightIcon={<ArrowRight />}>Cavablara bax</ButtonLink>
        <ButtonLink href={`/quizzes/${data.quiz.id}`} size="lg" variant="secondary" leftIcon={<RotateCcw />}>Yenidən cəhd</ButtonLink>
        {(counts.wrong > 0 || counts.partial > 0) && (
          <ButtonLink href="/practice" size="lg" variant="outline">Səhvləri məşq et</ButtonLink>
        )}
      </div>

      {/* Breakdown */}
      <section className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-3xl">Sual-sual</h2>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(counts) as Verdict[]).filter((k) => counts[k] > 0).map((k) => (
              <span key={k} className={cn('rounded-full border-2 px-3 py-1 text-sm font-semibold', VERDICT_STYLE[k])}>
                {VERDICT_LABEL[k]} · {counts[k]}
              </span>
            ))}
          </div>
        </div>
        <ol className="mt-5 grid gap-2.5">
          {rows.map(({ q, r, v }, i) => (
            <motion.li
              key={q.id}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: Math.min(i * 0.04, 0.4), duration: 0.4, ease: EASE }}
            >
              <Link
                href={`/attempts/${id}/review#q-${q.id}`}
                className="group flex items-center gap-4 rounded-2xl border border-line bg-elev px-4 py-3 shadow-paper transition-colors hover:border-ink/50"
              >
                <span className="hand w-8 shrink-0 text-2xl text-subtle">{i + 1}.</span>
                <span className="min-w-0 flex-1 truncate">{plainQuestionText(q)}</span>
                <span className="hidden shrink-0 font-mono text-xs text-subtle sm:block">{r ? `${r.points}/${r.max}` : `0/${q.points}`}</span>
                <span className={cn('shrink-0 rounded-full border-2 px-2.5 py-0.5 text-xs font-bold', VERDICT_STYLE[v])}>
                  {v === 'pending' ? <Hourglass className="inline size-3" /> : null} {VERDICT_LABEL[v]}
                </span>
              </Link>
            </motion.li>
          ))}
        </ol>
      </section>
    </div>
  );
}
