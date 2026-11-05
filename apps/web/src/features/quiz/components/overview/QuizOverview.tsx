'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  CircleSlash,
  Clock,
  CloudOff,
  Compass,
  Eye,
  EyeOff,
  Layers,
  LogIn,
  MapPinOff,
  Pencil,
  Play,
  RotateCcw,
  Save,
  Shuffle,
  Target,
  Timer,
} from 'lucide-react';
import { Avatar, Button, ButtonLink, EmptyState, Skeleton } from '@/components/ui';
import { toast } from '@/components/ui/toast';
import { Reveal } from '@/components/motion';
import { hasRole, useAuth } from '@/lib/auth';
import { cn, EASE_OUT_EXPO } from '@/lib/utils';
import { useAttempts, useBookmarkedQuizIds, useQuiz, useStartAttempt } from '../../hooks';
import { QUESTION_TYPE_LABEL } from '../../lib/constants';
import { errorMessage, errorStatus, formatTimeLimit } from '../../lib/utils';
import type { AttemptMode, QuestionType } from '../../types';
import { BookmarkToggle } from '../shared/BookmarkToggle';
import { CoverArt } from '../shared/CoverArt';
import { AttemptHistory } from './AttemptHistory';
import { ModeCards } from './ModeCards';
import { PasscodeModal } from './PasscodeModal';

const PASS_KEY = (id: string) => `ev:quiz-pass:${id}`;

export function QuizOverview({ id }: { id: string }) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const { user, isLoading: authLoading } = useAuth();
  const quiz = useQuiz(id);
  const attempts = useAttempts({ mine: true, quizId: id }, Boolean(user));
  const bookmarked = useBookmarkedQuizIds(Boolean(user));
  const start = useStartAttempt();

  const [mode, setMode] = useState<AttemptMode>('EXAM');
  const [passOpen, setPassOpen] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);

  const q = quiz.data;
  const questionCount = q?.questions?.length || q?.questionCount || 0;
  const myAttempts = useMemo(() => attempts.data ?? [], [attempts.data]);
  const resumable = myAttempts.find((a) => a.status === 'IN_PROGRESS');
  const usedExam = myAttempts.filter((a) => a.mode === 'EXAM' && a.status !== 'IN_PROGRESS').length;
  const examLocked = Boolean(q?.maxAttempts && usedExam >= q.maxAttempts);
  const effectiveMode: AttemptMode = examLocked ? 'PRACTICE' : mode;
  const isAuthor = Boolean(user && q && (q.authorId === user.id || hasRole(user, ['ADMIN'])));

  const typeMix = useMemo(() => {
    const m = new Map<QuestionType, number>();
    for (const x of q?.questions ?? []) m.set(x.type, (m.get(x.type) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [q?.questions]);

  const begin = (passcode?: string) => {
    if (!q) return;
    let code = passcode;
    if (!code && q.visibility === 'PASSCODE') {
      try {
        code = sessionStorage.getItem(PASS_KEY(q.id)) ?? undefined;
      } catch {
        /* noop */
      }
      if (!code) {
        setPassError(null);
        setPassOpen(true);
        return;
      }
    }
    start.mutate(
      { quizId: q.id, mode: effectiveMode, passcode: code },
      {
        onSuccess: (bundle) => {
          if (code) {
            try {
              sessionStorage.setItem(PASS_KEY(q.id), code);
            } catch {
              /* noop */
            }
          }
          setPassOpen(false);
          router.push(`/attempts/${bundle.attempt.id}`);
        },
        onError: (e) => {
          const status = errorStatus(e);
          const msg = errorMessage(e);
          const looksLikeCode = /kod|passcode|parol/i.test(msg);
          if (q.visibility === 'PASSCODE' && (status === 403 || status === 400 || looksLikeCode)) {
            try {
              sessionStorage.removeItem(PASS_KEY(q.id));
            } catch {
              /* noop */
            }
            setPassError(code ? 'Kod yanlışdır. Yenidən yoxla.' : null);
            setPassOpen(true);
            return;
          }
          toast.error(msg);
        },
      },
    );
  };

  if (quiz.isLoading) return <OverviewSkeleton />;
  if (quiz.isError || !q) {
    const status = errorStatus(quiz.error);
    return (
      <div className="pt-6">
        <EmptyState
          icon={status === 404 ? MapPinOff : CloudOff}
          title={status === 404 ? 'Bu marşrut xəritədə yoxdur' : status === 403 ? 'Bu testə girişin yoxdur' : 'Test yüklənmədi'}
          description={
            status === 404
              ? 'Test silinib və ya link səhvdir.'
              : status === 403
                ? 'Test yalnız müəyyən qruplar üçün açıqdır. Müəlliminlə əlaqə saxla.'
                : errorMessage(quiz.error)
          }
          action={
            <>
              {status !== 404 && status !== 403 && (
                <Button variant="secondary" leftIcon={<RotateCcw />} onClick={() => quiz.refetch()}>
                  Yenidən yüklə
                </Button>
              )}
              <ButtonLink href="/quizzes" leftIcon={<ArrowLeft />}>
                Bütün testlər
              </ButtonLink>
            </>
          }
        />
      </div>
    );
  }

  const rules = [
    {
      icon: Timer,
      text: q.timeLimitSec
        ? `İmtahan rejimində ${formatTimeLimit(q.timeLimitSec)} vaxtın var. Vaxt bitəndə cavablar avtomatik təhvil verilir.`
        : 'Vaxt məhdudiyyəti yoxdur — tələsmədən düşün.',
    },
    { icon: Target, text: `Keçid həddi — ${q.passPercent}%. Bu həddi aşanda zirvə bayrağını sancırsan.` },
    q.shuffleQuestions || q.shuffleOptions
      ? { icon: Shuffle, text: 'Suallar və ya variantlar hər cəhddə qarışdırılır.' }
      : null,
    q.showAnswers
      ? { icon: Eye, text: 'Bitirdikdən sonra düzgün cavabları və izahları görəcəksən.' }
      : { icon: EyeOff, text: 'Düzgün cavablar gizli saxlanılır — yalnız nəticəni görəcəksən.' },
    q.maxAttempts
      ? { icon: CircleSlash, text: `İmtahan üçün maksimum ${q.maxAttempts} cəhd. Məşq rejimi limitsizdir.` }
      : null,
    { icon: Save, text: 'Cavabların avtomatik saxlanılır — bağlantı kəsilsə də itmir.' },
  ].filter(Boolean) as { icon: typeof Timer; text: string }[];

  return (
    <div className="pb-16">
      <Link
        href="/quizzes"
        className="group mb-5 inline-flex items-center gap-2 text-sm font-semibold text-muted transition-colors hover:text-fg"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" /> Bütün testlər
      </Link>

      {/* ---------- hero ---------- */}
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 16, filter: 'blur(6px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.8, ease: EASE_OUT_EXPO }}
      >
        <CoverArt
          seed={q.id}
          color={q.coverColor}
          animated
          summit
          rings={12}
          className="rounded-3xl border border-line"
        >
          <div className="flex min-h-[260px] flex-col justify-between gap-10 p-5 sm:min-h-[340px] sm:p-8">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-line-strong bg-bg/55 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] backdrop-blur-md">
                  Baza düşərgəsi
                </span>
                {q.category && (
                  <Link
                    href={`/quizzes?category=${encodeURIComponent(q.category)}`}
                    className="rounded-full border border-line-strong bg-bg/55 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted backdrop-blur-md hover:text-fg"
                  >
                    {q.category}
                  </Link>
                )}
              </div>
              <div className="flex items-center gap-2">
                {isAuthor && (
                  <ButtonLink href={`/studio/quizzes/${q.id}`} variant="secondary" size="sm" leftIcon={<Pencil />}>
                    Redaktə
                  </ButtonLink>
                )}
                {user && <BookmarkToggle quizId={q.id} active={bookmarked.has(q.id)} size="md" />}
              </div>
            </div>
            <div className="max-w-3xl">
              <h1 className="font-display text-[34px] font-semibold leading-[1.02] tracking-[-0.035em] sm:text-6xl">{q.title}</h1>
              {q.description && <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-fg/80 sm:text-base">{q.description}</p>}
            </div>
          </div>
        </CoverArt>
      </motion.div>

      {/* ---------- stat strip ---------- */}
      <Reveal className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-line bg-line sm:grid-cols-4">
        <Meta icon={Layers} label="Suallar" value={String(questionCount)} />
        <Meta icon={Clock} label="Vaxt" value={formatTimeLimit(q.timeLimitSec)} />
        <Meta icon={Target} label="Keçid həddi" value={`${q.passPercent}%`} />
        <Meta
          icon={RotateCcw}
          label="Cəhdlər"
          value={q.maxAttempts ? `${usedExam} / ${q.maxAttempts}` : user ? `${usedExam} · limitsiz` : 'Limitsiz'}
        />
      </Reveal>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-10">
        {/* ---------- left ---------- */}
        <div className="min-w-0 space-y-10">
          <Reveal as="section">
            <h2 className="mono-label mb-4">Marşrut qaydaları</h2>
            <ol className="divide-y divide-line rounded-3xl border border-line bg-elev">
              {rules.map((r, i) => (
                <li key={i} className="flex items-start gap-4 px-4 py-3.5 sm:px-5">
                  <span className="pt-0.5 font-mono text-xs text-subtle">{String(i + 1).padStart(2, '0')}</span>
                  <r.icon className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
                  <span className="text-[15px] leading-snug">{r.text}</span>
                </li>
              ))}
            </ol>
          </Reveal>

          {typeMix.length > 0 && (
            <Reveal as="section">
              <h2 className="mono-label mb-4">Ərazinin relyefi</h2>
              <div className="flex h-3 overflow-hidden rounded-full bg-fg/[0.06]">
                {typeMix.map(([t, c], i) => (
                  <motion.span
                    key={t}
                    initial={reduce ? false : { width: 0 }}
                    whileInView={{ width: `${(c / questionCount) * 100}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.9, delay: i * 0.08, ease: EASE_OUT_EXPO }}
                    className="h-full border-r-2 border-bg last:border-0"
                    style={{ background: TYPE_COLORS[i % TYPE_COLORS.length] }}
                  />
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
                {typeMix.map(([t, c], i) => (
                  <span key={t} className="inline-flex items-center gap-2 text-sm text-muted">
                    <span className="h-2 w-2 rounded-full" style={{ background: TYPE_COLORS[i % TYPE_COLORS.length] }} />
                    {QUESTION_TYPE_LABEL[t]} <span className="font-mono text-xs text-subtle">×{c}</span>
                  </span>
                ))}
              </div>
            </Reveal>
          )}

          {q.tags?.length > 0 && (
            <Reveal as="section">
              <h2 className="mono-label mb-3">Teqlər</h2>
              <div className="flex flex-wrap gap-1.5">
                {q.tags.map((t) => (
                  <Link
                    key={t}
                    href={`/quizzes?tag=${encodeURIComponent(t)}`}
                    className="rounded-full border border-line px-3 py-1 text-[13px] font-medium text-muted transition-colors hover:border-line-strong hover:text-fg"
                  >
                    #{t}
                  </Link>
                ))}
              </div>
            </Reveal>
          )}

          {user && (
            <Reveal as="section">
              <h2 className="mono-label mb-4">Sənin cəhdlərin</h2>
              <AttemptHistory attempts={attempts.data} loading={attempts.isLoading} passPercent={q.passPercent} />
            </Reveal>
          )}
        </div>

        {/* ---------- right: launch pad ---------- */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-3xl border border-line bg-elev p-4 shadow-inner-hl sm:p-5">
            <p className="mono-label mb-3">Rejimi seç</p>
            <ModeCards
              value={effectiveMode}
              onChange={setMode}
              timeLimitLabel={q.timeLimitSec ? formatTimeLimit(q.timeLimitSec) : 'Vaxtsız'}
              disabledExam={examLocked}
            />
            {examLocked && (
              <p className="mt-3 rounded-2xl border border-ember/30 bg-ember/[0.07] px-3.5 py-2.5 text-sm text-ember">
                İmtahan cəhdlərin bitib. Məşq rejimində davam edə bilərsən.
              </p>
            )}

            <div className="mt-4 space-y-2">
              {resumable && (
                <ButtonLink
                  href={`/attempts/${resumable.id}`}
                  block
                  size="lg"
                  variant="secondary"
                  leftIcon={<Play />}
                >
                  Yarımçıq cəhdi davam et
                </ButtonLink>
              )}
              {!user && !authLoading ? (
                <ButtonLink href={`/login?next=/quizzes/${q.id}`} block size="lg" leftIcon={<LogIn />} magnetic>
                  Başlamaq üçün daxil ol
                </ButtonLink>
              ) : (
                <Button
                  block
                  size="lg"
                  magnetic
                  onClick={() => begin()}
                  loading={start.isPending && !passOpen}
                  disabled={questionCount === 0}
                  rightIcon={<ArrowRight />}
                  leftIcon={effectiveMode === 'EXAM' ? <Timer /> : <Compass />}
                >
                  {questionCount === 0
                    ? 'Hələ sual yoxdur'
                    : effectiveMode === 'EXAM'
                      ? 'Ekspedisiyaya başla'
                      : 'Məşqə başla'}
                </Button>
              )}
            </div>
            <p className="mt-3 text-center text-xs text-subtle">
              Klaviatura: <span className="font-mono">1–9</span> seçim · <span className="font-mono">← →</span> keçid ·{' '}
              <span className="font-mono">F</span> işarə
            </p>
          </div>

          {q.author?.name && (
            <div className="mt-4 flex items-center gap-3 rounded-3xl border border-line px-4 py-3">
              <Avatar name={q.author.name} src={q.author.avatarUrl} size="sm" />
              <div className="min-w-0">
                <p className="mono-label">Bələdçi</p>
                <Link href={`/u/${q.author.id}`} className="truncate text-sm font-semibold hover:underline">
                  {q.author.name}
                </Link>
              </div>
            </div>
          )}
        </aside>
      </div>

      <PasscodeModal
        open={passOpen}
        onClose={() => setPassOpen(false)}
        onSubmit={(code) => begin(code)}
        loading={start.isPending}
        error={passError}
        quizTitle={q.title}
      />
    </div>
  );
}

const TYPE_COLORS = ['var(--signal)', 'var(--aurora)', 'var(--glacier)', 'var(--ember)', 'var(--moss)', 'var(--fg-muted)', 'var(--danger)'];

function Meta({ icon: Icon, label, value }: { icon: typeof Layers; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-3 bg-elev px-4 py-4 sm:px-5">
      <span className="flex items-center gap-2 mono-label">
        <Icon className="h-3.5 w-3.5" /> {label}
      </span>
      <span className="font-display text-xl font-semibold tracking-tight tabular-nums sm:text-2xl">{value}</span>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="pb-16" aria-busy="true">
      <Skeleton className="mb-5 h-4 w-28" />
      <Skeleton className="h-[260px] w-full rounded-3xl sm:h-[340px]" />
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 rounded-3xl" />
        ))}
      </div>
      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-12 rounded-2xl" />
          ))}
        </div>
        <Skeleton className={cn('h-80 rounded-3xl')} />
      </div>
    </div>
  );
}
