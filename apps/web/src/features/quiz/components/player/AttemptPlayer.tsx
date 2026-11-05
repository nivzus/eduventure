'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CloudOff,
  CloudUpload,
  Flag,
  LayoutGrid,
  Loader2,
  MountainSnow,
  SearchCheck,
  X,
} from 'lucide-react';
import { Badge, Button, IconButton, Modal } from '@/components/ui';
import { toast } from '@/components/ui/toast';
import { fireConfetti } from '@/components/motion';
import { cn } from '@/lib/utils';
import { useAttempt, useCheckAnswer, useSaveAnswers, useSubmitAttempt } from '../../hooks';
import { MODE_LABEL } from '../../lib/constants';
import { errorMessage, errorStatus, isAnswered, readCorrect } from '../../lib/utils';
import type { AnswerMap, AnswerValue, AttemptBundle, Question } from '../../types';
import { ContourArt } from '../shared/ContourArt';
import { AttemptTimer } from './AttemptTimer';
import { NavDrawer } from './NavDrawer';
import { ProgressTrail, type WaypointState } from './ProgressTrail';
import { QuestionStage } from './QuestionStage';
import { initialOrdering, type RendererFeedback } from './renderers';
import { SubmitModal } from './SubmitModal';
import { PlayerError, PlayerSkeleton } from './PlayerStates';

/* ------------------------------------------------------------------ */
/* Local persistence (flags, position, practice checks, answer backup) */
/* ------------------------------------------------------------------ */

const lsKey = (id: string, k: string) => `ev:attempt:${id}:${k}`;
function readLS<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function writeLS(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* quota / private mode */
  }
}
function clearLS(id: string) {
  try {
    for (const k of ['answers', 'idx', 'flags', 'checks', 'visited']) localStorage.removeItem(lsKey(id, k));
  } catch {
    /* noop */
  }
}

type CheckState = RendererFeedback & { explanation?: string | null };

/* ------------------------------------------------------------------ */
/* Entry                                                               */
/* ------------------------------------------------------------------ */

export function AttemptPlayer({ id }: { id: string }) {
  const router = useRouter();
  const { data, isLoading, error, refetch } = useAttempt(id);
  const done = data && data.attempt.status !== 'IN_PROGRESS';

  useEffect(() => {
    if (done) router.replace(`/attempts/${id}/result`);
  }, [done, id, router]);

  if (isLoading) return <PlayerSkeleton />;
  if (error || !data) return <PlayerError error={error} onRetry={() => refetch()} />;
  if (done) return <PlayerSkeleton label="Nəticəyə yönləndirilir…" />;
  if (!data.questions.length)
    return <PlayerError title="Bu testdə sual yoxdur" description="Müəllif hələ sual əlavə etməyib." />;
  return <PlayerSession key={id} bundle={data} />;
}

/* ------------------------------------------------------------------ */
/* Session                                                             */
/* ------------------------------------------------------------------ */

function PlayerSession({ bundle }: { bundle: AttemptBundle }) {
  const { attempt, quiz, questions } = bundle;
  const id = attempt.id;
  const router = useRouter();
  const reduce = useReducedMotion();
  const total = questions.length;
  const isPractice = attempt.mode === 'PRACTICE';
  const limitSec = !isPractice && quiz.timeLimitSec ? quiz.timeLimitSec : null;
  const [startedAt] = useState(() => {
    const t = Date.parse(attempt.startedAt);
    return Number.isNaN(t) ? Date.now() : t;
  });

  /* ---------- state ---------- */
  const [answers, setAnswers] = useState<AnswerMap>(() => ({
    ...(attempt.answers ?? {}),
    ...(readLS<AnswerMap>(lsKey(id, 'answers')) ?? {}),
  }));
  const [index, setIndex] = useState(() => {
    const saved = readLS<number>(lsKey(id, 'idx'));
    if (typeof saved === 'number' && saved >= 0 && saved < total) return saved;
    const firstOpen = questions.findIndex((q) => !isAnswered(q, attempt.answers?.[q.id]));
    return firstOpen >= 0 ? firstOpen : 0;
  });
  const [direction, setDirection] = useState(1);
  const [flags, setFlags] = useState<string[]>(() => readLS<string[]>(lsKey(id, 'flags')) ?? []);
  const [visited, setVisited] = useState<string[]>(() => readLS<string[]>(lsKey(id, 'visited')) ?? []);
  const [checks, setChecks] = useState<Record<string, CheckState>>(
    () => readLS<Record<string, CheckState>>(lsKey(id, 'checks')) ?? {},
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [finishing, setFinishing] = useState<null | 'manual' | 'timeout'>(null);

  const save = useSaveAnswers(id);
  const check = useCheckAnswer(id);
  const submit = useSubmitAttempt(id);

  const question = questions[index];
  const flagSet = useMemo(() => new Set(flags), [flags]);
  const currentCheck = checks[question.id];
  const locked = Boolean(isPractice && currentCheck) || Boolean(finishing);

  /* ---------- persistence ---------- */
  useEffect(() => writeLS(lsKey(id, 'answers'), answers), [id, answers]);
  useEffect(() => writeLS(lsKey(id, 'idx'), index), [id, index]);
  useEffect(() => writeLS(lsKey(id, 'flags'), flags), [id, flags]);
  useEffect(() => writeLS(lsKey(id, 'checks'), checks), [id, checks]);
  useEffect(() => writeLS(lsKey(id, 'visited'), visited), [id, visited]);
  useEffect(() => {
    setVisited((v) => (v.includes(question.id) ? v : [...v, question.id]));
  }, [question.id]);

  /* ---------- autosave (debounced PATCH) ---------- */
  const dirty = useRef(false);
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const saveMutate = useRef(save.mutate);
  saveMutate.current = save.mutate;

  useEffect(() => {
    if (!dirty.current) return;
    const t = window.setTimeout(() => {
      dirty.current = false;
      setSaveState('saving');
      saveMutate.current(answersRef.current, {
        onSuccess: () => setSaveState('saved'),
        onError: () => {
          dirty.current = true;
          setSaveState('error');
        },
      });
    }, 900);
    return () => window.clearTimeout(t);
  }, [answers]);

  useEffect(() => {
    const flush = () => {
      if (!dirty.current) return;
      try {
        void fetch(`/api/attempts/${id}/answers`, {
          method: 'PATCH',
          keepalive: true,
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answers: answersRef.current }),
        });
        dirty.current = false;
      } catch {
        /* best effort */
      }
    };
    const onVis = () => document.visibilityState === 'hidden' && flush();
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [id]);

  const setAnswer = useCallback(
    (qid: string, v: AnswerValue) => {
      if (finishing) return;
      dirty.current = true;
      setAnswers((prev) => ({ ...prev, [qid]: v }));
    },
    [finishing],
  );

  /* ---------- navigation ---------- */
  const go = useCallback(
    (i: number) => {
      if (i < 0 || i >= total) return;
      setDirection(i >= index ? 1 : -1);
      setIndex(i);
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    },
    [index, total, reduce],
  );
  const next = useCallback(() => {
    if (index < total - 1) go(index + 1);
    else setConfirmOpen(true);
  }, [index, total, go]);
  const prev = useCallback(() => go(index - 1), [index, go]);
  const toggleFlag = useCallback(() => {
    setFlags((f) => (f.includes(question.id) ? f.filter((x) => x !== question.id) : [...f, question.id]));
  }, [question.id]);

  /* ---------- submit ---------- */
  const finalAnswers = useCallback((): AnswerMap => {
    const out: AnswerMap = { ...answersRef.current };
    for (const q of questions) {
      if (q.type === 'ORDERING' && !isAnswered(q, out[q.id]) && visited.includes(q.id)) {
        out[q.id] = initialOrdering(q, id);
      }
    }
    return out;
  }, [questions, visited, id]);

  const submittingRef = useRef(false);
  const doSubmit = useCallback(
    (reason: 'manual' | 'timeout') => {
      if (submittingRef.current) return;
      submittingRef.current = true;
      setConfirmOpen(false);
      setNavOpen(false);
      setExitOpen(false);
      setFinishing(reason);
      let timeSpentSec = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
      if (limitSec) timeSpentSec = Math.min(timeSpentSec, limitSec);
      submit.mutate(
        { answers: finalAnswers(), timeSpentSec },
        {
          onSuccess: () => {
            dirty.current = false;
            clearLS(id);
            router.replace(`/attempts/${id}/result`);
          },
          onError: (e) => {
            const status = errorStatus(e);
            if (status === 409) {
              clearLS(id);
              router.replace(`/attempts/${id}/result`);
              return;
            }
            submittingRef.current = false;
            setFinishing(null);
            toast.error(errorMessage(e, 'Cavabları təhvil vermək alınmadı'));
          },
        },
      );
    },
    [finalAnswers, id, limitSec, router, startedAt, submit],
  );

  /* ---------- practice check ---------- */
  const checkBtnRef = useRef<HTMLButtonElement>(null);
  const doCheck = useCallback(() => {
    if (!isPractice || currentCheck || check.isPending) return;
    let a = answers[question.id];
    if (question.type === 'ORDERING' && !isAnswered(question, a)) {
      a = initialOrdering(question, id);
      setAnswer(question.id, a);
    }
    if (!isAnswered(question, a)) return;
    check.mutate(
      { questionId: question.id, answer: a ?? null },
      {
        onSuccess: (res) => {
          const solution = readCorrect(question.type, res?.correctAnswer, question);
          setChecks((c) => ({
            ...c,
            [question.id]: {
              correct: res?.correct ?? null,
              solution,
              explanation: res?.explanation ?? question.explanation ?? null,
            },
          }));
          if (res?.correct) {
            const r = checkBtnRef.current?.getBoundingClientRect();
            fireConfetti({
              kind: 'stars',
              particleCount: 26,
              origin: r
                ? { x: (r.left + r.width / 2) / window.innerWidth, y: (r.top + r.height / 2) / window.innerHeight }
                : undefined,
            });
          }
        },
        onError: (e) => toast.error(errorMessage(e, 'Cavabı yoxlamaq alınmadı')),
      },
    );
  }, [isPractice, currentCheck, check, answers, question, id, setAnswer]);

  /* ---------- primary action ---------- */
  const answeredNow = isAnswered(question, answers[question.id]) || question.type === 'ORDERING';
  const isLast = index === total - 1;
  const primary = useCallback(() => {
    if (finishing) return;
    if (isPractice && !currentCheck) {
      if (answeredNow) doCheck();
      return;
    }
    if (isPractice && isLast) {
      const unchecked = questions.filter((q) => !checks[q.id]).length;
      if (unchecked === 0) doSubmit('manual');
      else setConfirmOpen(true);
      return;
    }
    next();
  }, [finishing, isPractice, currentCheck, answeredNow, doCheck, isLast, questions, checks, doSubmit, next]);

  /* ---------- keyboard ---------- */
  const keyHandler = useRef<(e: KeyboardEvent) => void>(() => {});
  keyHandler.current = (e: KeyboardEvent) => {
    if (confirmOpen || navOpen || exitOpen || finishing) return;
    if (e.defaultPrevented) return;
    const t = e.target as HTMLElement | null;
    const typing = !!t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName));
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      primary();
      return;
    }
    if (typing || e.metaKey || e.ctrlKey || e.altKey) return;

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (index < total - 1) go(index + 1);
      return;
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      prev();
      return;
    }
    if (e.key === 'f' || e.key === 'F') {
      e.preventDefault();
      toggleFlag();
      return;
    }
    if (e.key === 'Enter') {
      if (t && (t.tagName === 'BUTTON' || t.tagName === 'A')) return;
      e.preventDefault();
      primary();
      return;
    }
    if (/^[1-9]$/.test(e.key) && !locked) {
      const n = parseInt(e.key, 10) - 1;
      if (question.type === 'SINGLE' && n < question.options.length) {
        e.preventDefault();
        setAnswer(question.id, n);
      } else if (question.type === 'MULTIPLE' && n < question.options.length) {
        e.preventDefault();
        const cur = Array.isArray(answers[question.id]) ? (answers[question.id] as number[]) : [];
        const nextVal = cur.includes(n) ? cur.filter((x) => x !== n) : [...cur, n].sort((a, b) => a - b);
        setAnswer(question.id, nextVal);
      } else if (question.type === 'TRUE_FALSE' && n < 2) {
        e.preventDefault();
        setAnswer(question.id, n === 0);
      }
    }
  };
  useEffect(() => {
    const on = (e: KeyboardEvent) => keyHandler.current(e);
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, []);

  /* ---------- derived ---------- */
  const states: WaypointState[] = questions.map((q) => {
    const c = checks[q.id];
    if (c) return c.correct === null ? 'pending' : c.correct ? 'correct' : 'wrong';
    return isAnswered(q, answers[q.id]) ? 'answered' : 'idle';
  });
  const flaggedArr = questions.map((q) => flagSet.has(q.id));
  const answeredCount = states.filter((s) => s !== 'idle').length;
  const exitHref = quiz.id ? `/quizzes/${quiz.id}` : '/practice';

  const feedback: CheckState | null = isPractice && currentCheck ? currentCheck : null;

  return (
    <div className="relative flex min-h-dvh flex-col">
      {/* atmosphere */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
        <ContourArt
          seed={quiz.id || id}
          rings={12}
          width={1200}
          height={800}
          className="absolute -right-[20%] top-[10%] h-[120vh] w-[140vw] text-fg opacity-[0.045] sm:w-[110vw]"
        />
        <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-bg via-bg/80 to-transparent" />
      </div>

      {/* ---------- header ---------- */}
      <header className="glass sticky top-0 z-30 border-b border-line">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-3 sm:gap-3 sm:px-6">
          <IconButton label="Testdən çıx" icon={<X />} onClick={() => setExitOpen(true)} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-sm font-semibold tracking-tight sm:text-base">{quiz.title}</p>
            <div className="flex items-center gap-2">
              <Badge tone={isPractice ? 'glacier' : 'signal'} mono className="h-5 px-2">
                {MODE_LABEL[attempt.mode]}
              </Badge>
              <SaveIndicator state={saveState} />
            </div>
          </div>
          <TimerSlot startedAt={startedAt} limitSec={limitSec} onExpire={() => doSubmit('timeout')} />
          <IconButton
            label="Suallar xəritəsi"
            icon={<LayoutGrid />}
            variant="secondary"
            onClick={() => setNavOpen(true)}
            badge={flags.length || undefined}
          />
          <Button
            variant="outline"
            size="sm"
            className="hidden h-10 rounded-2xl md:inline-flex"
            leftIcon={<MountainSnow />}
            onClick={() => setConfirmOpen(true)}
          >
            Təhvil ver
          </Button>
        </div>
        <div className="mx-auto max-w-6xl px-4 pb-2 sm:px-6">
          <ProgressTrail count={total} current={index} states={states} flagged={flaggedArr} onJump={go} />
        </div>
      </header>

      {/* ---------- stage ---------- */}
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-36 pt-8 sm:px-6 sm:pt-12">
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <QuestionStage
            key={question.id}
            question={question}
            index={index}
            total={total}
            value={answers[question.id]}
            onChange={(v) => setAnswer(question.id, v)}
            flagged={flagSet.has(question.id)}
            disabled={locked}
            feedback={feedback}
            seed={id}
            direction={direction}
            onSubmitIntent={primary}
          />
        </AnimatePresence>
      </main>

      {/* ---------- footer ---------- */}
      <footer className="glass fixed inset-x-0 bottom-0 z-30 border-t border-line pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex h-[72px] max-w-3xl items-center gap-2 px-3 sm:gap-3 sm:px-6">
          <IconButton
            label="Əvvəlki sual (←)"
            icon={<ArrowLeft />}
            variant="secondary"
            size="lg"
            onClick={prev}
            disabled={index === 0}
          />
          <motion.button
            type="button"
            onClick={toggleFlag}
            whileTap={{ scale: 0.94 }}
            aria-pressed={flagSet.has(question.id)}
            aria-label="Sualı işarələ (F)"
            className={cn(
              'inline-flex h-12 items-center gap-2 rounded-2xl border px-3.5 text-sm font-semibold transition-colors sm:px-4',
              flagSet.has(question.id)
                ? 'border-ember/50 bg-ember/12 text-ember'
                : 'border-line bg-surface text-muted hover:text-fg',
            )}
          >
            <Flag className="h-4 w-4" fill={flagSet.has(question.id) ? 'currentColor' : 'none'} />
            <span className="hidden sm:inline">{flagSet.has(question.id) ? 'İşarələnib' : 'İşarələ'}</span>
            <kbd className="hidden rounded border border-current/30 px-1 font-mono text-[10px] opacity-60 lg:inline">F</kbd>
          </motion.button>

          <div className="hidden flex-1 items-center justify-center gap-3 text-subtle lg:flex">
            <span className="mono-label tabular">
              {answeredCount}/{total} cavab
            </span>
            <span className="mono-label">← → · 1–9 · Enter</span>
          </div>
          <div className="flex-1 lg:hidden" />

          {isPractice && !currentCheck && !isLast && (
            <Button variant="ghost" size="lg" className="hidden px-4 sm:inline-flex" onClick={next}>
              Keç
            </Button>
          )}
          <PrimaryAction
            ref={checkBtnRef}
            onClick={primary}
            pending={check.isPending}
            mode={
              isPractice && !currentCheck
                ? 'check'
                : isLast
                  ? isPractice
                    ? 'finish-practice'
                    : 'finish'
                  : 'next'
            }
            disabled={isPractice && !currentCheck && !answeredNow}
          />
        </div>
      </footer>

      {/* ---------- overlays ---------- */}
      <NavDrawer
        open={navOpen}
        onClose={() => setNavOpen(false)}
        questions={questions}
        states={states}
        flagged={flaggedArr}
        current={index}
        onJump={(i) => {
          go(i);
          setNavOpen(false);
        }}
        onSubmit={() => {
          setNavOpen(false);
          setConfirmOpen(true);
        }}
      />

      <SubmitModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => doSubmit('manual')}
        loading={submit.isPending}
        isPractice={isPractice}
        questions={questions}
        states={states}
        flagged={flaggedArr}
        onJump={(i) => {
          setConfirmOpen(false);
          go(i);
        }}
      />

      <Modal
        open={exitOpen}
        onClose={() => setExitOpen(false)}
        title="Düşərgəyə qayıdırsan?"
        description={
          limitSec
            ? 'Cavabların yadda saxlanılır. Diqqət: imtahan vaxtı sən çıxsan da işləməyə davam edir.'
            : 'Cavabların yadda saxlanılır — istənilən vaxt bu cəhdə qayıdıb davam edə bilərsən.'
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setExitOpen(false)}>
              Davam et
            </Button>
            <Link
              href={exitHref}
              onClick={() => {
                if (dirty.current) saveMutate.current(answersRef.current);
              }}
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-line-strong px-5 text-sm font-semibold transition-colors hover:bg-fg/[0.04]"
            >
              Çıx
            </Link>
          </>
        }
      />

      <AnimatePresence>{finishing && <FinishingOverlay reason={finishing} />}</AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Bits                                                                */
/* ------------------------------------------------------------------ */

function TimerSlot({
  startedAt,
  limitSec,
  onExpire,
}: {
  startedAt: number;
  limitSec: number | null;
  onExpire: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  const fired = useRef(false);
  const expireRef = useRef(onExpire);
  expireRef.current = onExpire;

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(t);
  }, []);

  const elapsed = Math.max(0, Math.floor((now - startedAt) / 1000));
  const remaining = limitSec ? Math.max(0, limitSec - elapsed) : null;

  useEffect(() => {
    if (remaining === 0 && !fired.current) {
      fired.current = true;
      expireRef.current();
    }
  }, [remaining]);

  return (
    <AttemptTimer
      seconds={remaining ?? elapsed}
      limitSec={limitSec}
      className={cn(!limitSec && 'hidden sm:flex')}
    />
  );
}

function SaveIndicator({ state }: { state: 'idle' | 'saving' | 'saved' | 'error' }) {
  if (state === 'idle') return null;
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={state}
        initial={{ opacity: 0, y: 3 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -3 }}
        transition={{ duration: 0.2 }}
        className={cn(
          'hidden items-center gap-1 font-mono text-[10px] uppercase tracking-[0.12em] sm:inline-flex',
          state === 'error' ? 'text-danger' : 'text-subtle',
        )}
      >
        {state === 'saving' && <Loader2 className="h-3 w-3 animate-spin" />}
        {state === 'saved' && <CloudUpload className="h-3 w-3" />}
        {state === 'error' && <CloudOff className="h-3 w-3" />}
        {state === 'saving' ? 'Saxlanılır' : state === 'saved' ? 'Saxlanıldı' : 'Saxlanılmadı'}
      </motion.span>
    </AnimatePresence>
  );
}

type PrimaryMode = 'next' | 'check' | 'finish' | 'finish-practice';

const PRIMARY: Record<PrimaryMode, { label: string; icon: React.ReactNode }> = {
  next: { label: 'Növbəti', icon: <ArrowRight /> },
  check: { label: 'Yoxla', icon: <SearchCheck /> },
  finish: { label: 'Bitir', icon: <MountainSnow /> },
  'finish-practice': { label: 'Məşqi bitir', icon: <Check /> },
};

function PrimaryAction({
  mode,
  onClick,
  disabled,
  pending,
  ref,
}: {
  mode: PrimaryMode;
  onClick: () => void;
  disabled?: boolean;
  pending?: boolean;
  ref?: React.Ref<HTMLButtonElement>;
}) {
  const { label, icon } = PRIMARY[mode];
  return (
    <Button
      ref={ref}
      size="lg"
      onClick={onClick}
      disabled={disabled}
      loading={pending}
      rightIcon={icon}
      className="min-w-[132px] px-5 sm:min-w-[168px]"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={mode}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
          className="inline-block"
        >
          {label}
        </motion.span>
      </AnimatePresence>
    </Button>
  );
}

function FinishingOverlay({ reason }: { reason: 'manual' | 'timeout' }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 grid place-items-center bg-bg/85 px-6 backdrop-blur-md"
      role="alertdialog"
      aria-live="assertive"
      aria-label="Cavablar təhvil verilir"
    >
      <div className="flex max-w-sm flex-col items-center text-center">
        <svg viewBox="0 0 220 120" className="mb-6 h-28 w-56" fill="none" aria-hidden>
          <motion.path
            d="M6 112 L58 58 L84 80 L128 22 L170 74 L214 112"
            stroke="var(--border-strong)"
            strokeWidth={2}
            strokeLinejoin="round"
          />
          <motion.path
            d="M6 112 L58 58 L84 80 L128 22"
            stroke="var(--signal)"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={reduce ? { duration: 0 } : { duration: 1.6, ease: [0.22, 1, 0.36, 1], repeat: Infinity, repeatDelay: 0.4 }}
          />
          <motion.g
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            <path d="M128 22 V2" stroke="var(--fg)" strokeWidth={2} />
            <path d="M128 2 L146 8 L128 14 Z" fill="var(--ember)" />
          </motion.g>
        </svg>
        {reason === 'timeout' && <p className="mono-label mb-2 !text-ember">Vaxt bitdi</p>}
        <h2 className="font-display text-2xl font-semibold tracking-tight">Zirvəyə qalxırıq…</h2>
        <p className="mt-2 text-muted">Cavabların təhvil verilir və yoxlanılır.</p>
      </div>
    </motion.div>
  );
}

export type { Question };
