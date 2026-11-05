'use client';

import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Check, Clock, Flag, Highlighter, ListTree, Link2, NotebookPen, Play, ScrollText } from 'lucide-react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion, useTransform } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Avatar, Badge, Button, Drawer, ProgressRing, Skeleton } from '@/components/ui';
import { toast } from '@/components/ui/toast';
import { ApiError, api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { AnnotationPopover, MarginNotes, NotesList, useAnnotationEngine } from '../components/articles/Annotations';
import { Markdown } from '../components/articles/Markdown';
import { TableOfContents, useActiveHeading, useToc } from '../components/articles/TableOfContents';
import { useReadingProgress } from '../components/articles/useReadingProgress';
import { BookmarkButton } from '../components/shared/BookmarkButton';
import { Comments } from '../components/shared/Comments';
import { CoverArt } from '../components/shared/CoverArt';
import { Rise } from '../components/shared/Rise';
import { ErrorState, isLockedError, PasscodeGate } from '../components/shared/States';
import { learnKeys, useAnnotations, useArticle } from '../hooks';
import { longDate } from '../lib/format';
import { isArticleDone, progressOf, questionCountOf, relatedQuizzesOf } from '../lib/normalize';
import { toneOf } from '../lib/topo';
import type { Article } from '../types';

const EASE = [0.22, 1, 0.36, 1] as const;

export function ArticleReaderScreen({ slug }: { slug: string }) {
  const qc = useQueryClient();
  const { data, isLoading, error, refetch } = useArticle(slug);
  const [unlocking, setUnlocking] = useState(false);

  if (isLoading) return <ReaderSkeleton />;

  if (error && isLockedError(error)) {
    return (
      <div className="py-10 md:py-16">
        <PasscodeGate
          kind="Məqalə"
          backHref="/articles"
          pending={unlocking}
          onUnlock={async (code) => {
            setUnlocking(true);
            try {
              const a = await api.get<Article>(`/articles/${encodeURIComponent(slug)}`, { passcode: code });
              qc.setQueryData(learnKeys.article(slug), a);
              qc.invalidateQueries({ queryKey: ['learn', 'articles'] });
              toast.success('Kilid açıldı');
            } catch (e) {
              if (e instanceof ApiError && e.status === 403) throw new ApiError(403, 'Giriş kodu yanlışdır');
              throw e;
            } finally {
              setUnlocking(false);
            }
          }}
        />
      </div>
    );
  }

  if (error || !data) return <ErrorState error={error} onRetry={() => refetch()} backHref="/articles" backLabel="Jurnala qayıt" className="mt-8" />;

  return <Reader key={data.id} article={data} />;
}

function Reader({ article }: { article: Article }) {
  const reduce = useReducedMotion();
  const bodyRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [wrapWidth, setWrapWidth] = useState(640);
  const [tocOpen, setTocOpen] = useState(false);
  const content = article.content ?? '';
  const contentKey = `${article.id}:${content.length}`;

  const reading = useReadingProgress({
    articleId: article.id,
    bodyRef,
    initialProgress: progressOf(article),
    initiallyCompleted: isArticleDone(article),
  });
  const { data: annotations = [] } = useAnnotations(article.id);
  const engine = useAnnotationEngine({ articleId: article.id, bodyRef, wrapRef, annotations, contentKey });
  const toc = useToc(bodyRef, contentKey);
  const active = useActiveHeading(toc);
  const quizzes = relatedQuizzesOf(article);
  const minutesLeft = Math.max(0, Math.ceil((article.readingMinutes || 1) * (1 - reading.percent / 100)));
  const barScale = useTransform(reading.smooth, [0, 1], [0, 1]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWrapWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Offer to resume where the reader stopped last time.
  const initial = progressOf(article);
  const [resumeShown, setResumeShown] = useState(initial > 5 && !isArticleDone(article));
  useEffect(() => {
    if (reading.percent > 4) setResumeShown(false);
  }, [reading.percent]);
  const resume = () => {
    const body = bodyRef.current;
    if (!body) return;
    const r = body.getBoundingClientRect();
    const target = window.scrollY + r.top - window.innerHeight * 0.2 + (r.height - window.innerHeight * 0.8) * (initial / 100);
    window.scrollTo({ top: target, behavior: 'smooth' });
    setResumeShown(false);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href.split('#')[0]);
      toast.success('Keçid kopyalandı');
    } catch {
      toast.error('Keçidi kopyalamaq alınmadı');
    }
  };

  const tone = toneOf(article.category);

  return (
    <>
      {/* Scroll progress — fixed hairline at the very top */}
      <motion.div
        aria-hidden
        className="ev-noprint fixed inset-x-0 top-0 z-[70] h-[3px] origin-left bg-signal"
        style={{ scaleX: barScale }}
      />

      <article className="@container mx-auto w-full max-w-[1320px] pb-28">
        {/* ── Header ── */}
        <header className="relative pt-2">
          <div className="flex items-center justify-between gap-3">
            <Link
              href="/articles"
              className="group inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.14em] text-muted uppercase hover:text-fg"
            >
              <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" /> Jurnal
            </Link>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={copyLink}
                aria-label="Keçidi kopyala"
                className="grid size-10 place-items-center rounded-full border border-line text-muted hover:border-line-strong hover:text-fg"
              >
                <Link2 className="size-4" />
              </button>
              <BookmarkButton type="ARTICLE" id={article.id} variant="chip" />
            </div>
          </div>

          <div className="mx-auto mt-10 max-w-[900px] text-center md:mt-14">
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE }}
              className="flex flex-wrap items-center justify-center gap-2"
            >
              {article.category && <Badge tone={tone}>{article.category}</Badge>}
              {article.tags?.slice(0, 3).map((t) => (
                <span key={t} className="font-mono text-[11px] tracking-[0.12em] text-subtle uppercase">
                  #{t}
                </span>
              ))}
            </motion.div>
            <motion.h1
              initial={reduce ? false : { opacity: 0, y: 24, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.8, ease: EASE, delay: 0.05 }}
              className="display-tight mt-6 text-[clamp(2.1rem,6vw,4.6rem)] font-semibold"
            >
              {article.title}
            </motion.h1>
            {article.excerpt && (
              <motion.p
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: EASE, delay: 0.15 }}
                className="mx-auto mt-6 max-w-2xl font-serif text-xl leading-snug text-muted italic md:text-2xl"
              >
                {article.excerpt}
              </motion.p>
            )}
            <motion.div
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-3 text-sm text-muted"
            >
              {article.author?.name && (
                <span className="inline-flex items-center gap-2">
                  <Avatar name={article.author.name} src={article.author.avatarUrl ?? undefined} size="sm" />
                  <span className="text-fg">{article.author.name}</span>
                </span>
              )}
              <span className="font-mono text-[11px] tracking-[0.14em] uppercase">{longDate(article.createdAt)}</span>
              <span className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[0.14em] uppercase">
                <Clock className="size-3.5" /> {article.readingMinutes} dəq oxu
              </span>
              {reading.completed && (
                <span className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[0.14em] text-moss uppercase">
                  <Check className="size-3.5" strokeWidth={3} /> Oxunub
                </span>
              )}
            </motion.div>
          </div>

          <motion.div
            initial={reduce ? false : { opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.2 }}
            className="mt-10 md:mt-14"
          >
            <CoverArt
              seed={article.id}
              toneKey={article.category}
              coverUrl={article.coverUrl}
              alt={article.title}
              density={1.5}
              className="aspect-[16/9] rounded-3xl border border-line md:aspect-[21/8]"
            />
          </motion.div>
        </header>

        {/* ── Body grid: TOC | text | margin notes (container queries) ── */}
        <div className="mt-12 grid gap-12 md:mt-16 @min-[980px]:grid-cols-[200px_minmax(0,1fr)] @min-[1240px]:grid-cols-[210px_minmax(0,680px)_250px] @min-[1240px]:justify-between">
          <aside className="ev-noprint hidden @min-[980px]:block">
            <div className="sticky top-28 space-y-6">
              <div className="flex items-center gap-3">
                <ProgressRing value={reading.percent} size={44} stroke={4} tone={reading.completed ? 'moss' : 'signal'} />
                <div>
                  <p className="font-mono text-xs tabular">{reading.completed ? 'Oxunub' : `${reading.percent}%`}</p>
                  <p className="text-xs text-subtle">{reading.completed ? 'Zirvəyə çatdın' : `~${minutesLeft} dəq qalıb`}</p>
                </div>
              </div>
              <div>
                <p className="mono-label mb-3">Mündəricat</p>
                <TableOfContents items={toc} active={active} />
              </div>
              {annotations.length > 0 && (
                <p className="inline-flex items-center gap-2 text-xs text-subtle @min-[1240px]:hidden">
                  <Highlighter className="size-3.5" /> {annotations.length} qeyd — aşağıda
                </p>
              )}
            </div>
          </aside>

          <div className="min-w-0">
            <div ref={wrapRef} className="relative mx-auto max-w-[680px]">
              {content.trim() ? (
                <Markdown ref={bodyRef} content={content} />
              ) : (
                <div ref={bodyRef} className="rounded-3xl border border-dashed border-line p-10 text-center text-muted">
                  Bu məqalənin mətni hələ əlavə edilməyib.
                </div>
              )}
              <AnnotationPopover engine={engine} annotations={annotations} wrapWidth={wrapWidth} />
            </div>
          </div>

          <aside className="ev-noprint hidden @min-[1240px]:block" aria-label="Qeydlərim">
            <MarginNotes engine={engine} annotations={annotations} />
          </aside>
        </div>

        {/* ── Summit: end of article ── */}
        <div className="mx-auto mt-20 max-w-[920px] space-y-16">
          <Summit article={article} completed={reading.completed} onComplete={reading.markComplete} pending={reading.completing} />

          {quizzes.length > 0 && (
            <section>
              <Rise className="mb-6 flex items-end justify-between gap-4">
                <div>
                  <p className="mono-label">Növbəti dayanacaq</p>
                  <h2 className="mt-2 font-display text-2xl font-semibold md:text-3xl">
                    Biliyini <span className="accent text-aurora">yoxla</span>
                  </h2>
                </div>
                <ScrollText className="size-6 text-aurora" />
              </Rise>
              <div className="grid gap-4 sm:grid-cols-2">
                {quizzes.map((q, i) => (
                  <Rise key={q.id} delay={i * 0.06}>
                    <Link
                      href={`/quizzes/${q.id}`}
                      className="group relative flex h-full items-center gap-4 overflow-hidden rounded-3xl border border-line bg-elev p-5 transition-colors hover:border-aurora/40"
                    >
                      <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-aurora/15 text-aurora">
                        <Play className="size-5 fill-current" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-display text-lg leading-tight font-semibold">{q.title}</span>
                        <span className="mt-1 block font-mono text-[11px] tracking-[0.12em] text-subtle uppercase">
                          {questionCountOf(q) ?? '—'} sual
                          {q.timeLimitSec ? ` · ${Math.round(q.timeLimitSec / 60)} dəq` : ''}
                        </span>
                      </span>
                      <ArrowRight className="size-5 text-subtle transition-transform group-hover:translate-x-1 group-hover:text-aurora" />
                    </Link>
                  </Rise>
                ))}
              </div>
            </section>
          )}

          {/* Notes list for narrow layouts */}
          <section className="ev-noprint @min-[1240px]:hidden">
            <div className="mb-5 flex items-end justify-between gap-4">
              <h2 className="font-display text-2xl font-semibold md:text-3xl">
                Qeydlərim <span className="accent text-muted">({annotations.length})</span>
              </h2>
              <NotebookPen className="size-5 text-subtle" />
            </div>
            {annotations.length ? (
              <NotesList engine={engine} annotations={annotations} />
            ) : (
              <p className="rounded-2xl border border-dashed border-line px-5 py-6 text-sm text-muted">
                <Highlighter className="mr-2 inline size-4 align-[-3px]" />
                Mətndən istənilən hissəni seç — rəngli işarə qoy və ya şəxsi qeyd yaz.
              </p>
            )}
          </section>

          <div className="ev-noprint">
            <Comments targetType="ARTICLE" targetId={article.id} />
          </div>
        </div>
      </article>

      {/* Resume pill */}
      <AnimatePresence>
        {resumeShown && (
          <motion.button
            type="button"
            onClick={resume}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30, delay: 0.6 }}
            className="ev-noprint fixed bottom-24 left-1/2 z-40 inline-flex -translate-x-1/2 items-center gap-2 rounded-full border border-line-strong bg-surface/90 px-4 py-2.5 text-sm font-medium shadow-pop backdrop-blur-xl md:bottom-8"
          >
            <span className="size-2 rounded-full bg-signal" />
            {Math.round(initial)}%-dən davam et
            <ArrowRight className="size-4" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Mobile / narrow TOC trigger */}
      <button
        type="button"
        onClick={() => setTocOpen(true)}
        className="ev-noprint fixed right-4 bottom-24 z-40 inline-flex items-center gap-2 rounded-full border border-line-strong bg-surface/90 py-1.5 pr-4 pl-1.5 text-sm shadow-pop backdrop-blur-xl lg:hidden"
        aria-label="Mündəricatı aç"
      >
        <ProgressRing value={reading.percent} size={32} stroke={3} tone={reading.completed ? 'moss' : 'signal'} />
        <ListTree className="size-4" />
      </button>
      <Drawer open={tocOpen} onClose={() => setTocOpen(false)} title="Mündəricat">
        <div className="space-y-6 pb-6">
          <div className="flex items-center gap-3">
            <ProgressRing value={reading.percent} size={44} stroke={4} tone={reading.completed ? 'moss' : 'signal'} />
            <p className="text-sm text-muted">
              {reading.completed ? 'Məqalə oxunub' : `${reading.percent}% oxunub · ~${minutesLeft} dəq qalıb`}
            </p>
          </div>
          <TableOfContents items={toc} active={active} onNavigate={() => setTocOpen(false)} layoutId="toc-active-drawer" />
        </div>
      </Drawer>
    </>
  );
}

function Summit({
  article,
  completed,
  onComplete,
  pending,
}: {
  article: Article;
  completed: boolean;
  onComplete: () => void;
  pending: boolean;
}) {
  const reduce = useReducedMotion();
  return (
    <Rise>
      <div
        className={cn(
          'relative overflow-hidden rounded-3xl border p-8 md:p-10',
          completed ? 'border-moss/30 bg-moss/[0.06]' : 'border-line bg-elev',
        )}
      >
        <CoverArt seed={`${article.id}-summit`} tone={completed ? 'moss' : 'signal'} meta={false} className="absolute inset-0 opacity-50" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-5">
            <motion.div
              className={cn(
                'grid size-16 shrink-0 place-items-center rounded-2xl border',
                completed ? 'border-moss/40 bg-moss/15 text-moss' : 'border-line-strong bg-bg/70 text-signal',
              )}
              initial={reduce ? false : { rotate: -10, scale: 0.8 }}
              whileInView={{ rotate: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ type: 'spring', stiffness: 200, damping: 14 }}
            >
              {completed ? <Check className="size-7" strokeWidth={3} /> : <Flag className="size-7" />}
            </motion.div>
            <div>
              <p className="mono-label">Məqalənin sonu · zirvə</p>
              <h3 className="mt-1.5 font-display text-2xl font-semibold">
                {completed ? 'Bu zirvə fəth olundu' : 'Sona çatdın'}
              </h3>
              <p className="mt-1 text-muted">
                {completed
                  ? 'Məqalə oxunmuş kimi qeyd olundu. Növbəti marşruta keç.'
                  : 'Oxumağı bitirmisənsə, məqaləni tamamlanmış kimi işarələ və +10 XP qazan.'}
              </p>
            </div>
          </div>
          {completed ? (
            <Link href="/articles" className="inline-flex h-11 items-center gap-2 rounded-2xl border border-line-strong px-5 text-sm font-medium hover:bg-fg/5">
              Digər məqalələr <ArrowRight className="size-4" />
            </Link>
          ) : (
            <Button onClick={onComplete} loading={pending} leftIcon={<Check className="size-4" />} magnetic>
              Oxunmuş kimi işarələ
            </Button>
          )}
        </div>
      </div>
    </Rise>
  );
}

function ReaderSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1320px] pt-2" aria-busy="true" aria-label="Yüklənir">
      <Skeleton className="h-4 w-24" />
      <div className="mx-auto mt-14 flex max-w-[900px] flex-col items-center gap-5">
        <Skeleton className="h-6 w-28 rounded-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-3/4" />
        <Skeleton className="h-6 w-2/3" />
      </div>
      <Skeleton className="mt-14 aspect-[16/9] w-full rounded-3xl md:aspect-[21/8]" />
      <div className="mx-auto mt-16 max-w-[680px] space-y-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className={cn('h-4', i % 3 === 2 ? 'w-2/3' : 'w-full')} />
        ))}
      </div>
    </div>
  );
}
