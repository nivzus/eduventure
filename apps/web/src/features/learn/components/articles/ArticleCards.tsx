'use client';

import { ArrowUpRight, Check, Clock, Lock } from 'lucide-react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { Badge, Card } from '@/components/ui';
import { cn } from '@/lib/utils';
import { shortDate, pad2 } from '../../lib/format';
import { isArticleDone, progressOf } from '../../lib/normalize';
import { toneOf } from '../../lib/topo';
import type { Article } from '../../types';
import { BookmarkButton } from '../shared/BookmarkButton';
import { CoverArt } from '../shared/CoverArt';

const EASE = [0.22, 1, 0.36, 1] as const;

export function articleHref(a: Pick<Article, 'slug' | 'id'>) {
  return `/articles/${a.slug || a.id}`;
}

/** 2px progress rail along a card's bottom edge. */
function ProgressRail({ article }: { article: Article }) {
  const p = progressOf(article);
  const done = isArticleDone(article);
  const reduce = useReducedMotion();
  if (!p && !done) return null;
  return (
    <div className="absolute inset-x-0 bottom-0 h-[3px] bg-line" aria-hidden>
      <motion.div
        className={cn('h-full', done ? 'bg-moss' : 'bg-signal')}
        initial={reduce ? false : { width: 0 }}
        whileInView={{ width: `${done ? 100 : p}%` }}
        viewport={{ once: true }}
        transition={{ duration: 1, ease: EASE, delay: 0.2 }}
      />
    </div>
  );
}

export function ReadState({ article, className }: { article: Article; className?: string }) {
  const p = progressOf(article);
  if (isArticleDone(article))
    return (
      <span className={cn('inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[0.14em] text-moss uppercase', className)}>
        <Check className="size-3.5" strokeWidth={3} /> Oxunub
      </span>
    );
  if (p > 0)
    return (
      <span className={cn('font-mono text-[11px] tracking-[0.14em] text-signal uppercase tabular light:text-fg', className)}>
        {Math.round(p)}% oxunub
      </span>
    );
  return <span className={cn('font-mono text-[11px] tracking-[0.14em] text-subtle uppercase', className)}>Yeni</span>;
}

function MetaLine({ article }: { article: Article }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] tracking-[0.12em] text-subtle uppercase">
      <span className="inline-flex items-center gap-1.5">
        <Clock className="size-3" /> {article.readingMinutes || 1} dəq
      </span>
      <span aria-hidden>·</span>
      <span>{shortDate(article.createdAt)}</span>
      {article.locked && (
        <>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1 text-ember">
            <Lock className="size-3" /> Şifrəli
          </span>
        </>
      )}
    </div>
  );
}

/** Large hero for the featured article. */
export function FeaturedArticle({ article }: { article: Article }) {
  const p = progressOf(article);
  const done = isArticleDone(article);
  const reduce = useReducedMotion();
  return (
    <motion.article
      initial={reduce ? false : { opacity: 0, y: 24, filter: 'blur(8px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.8, ease: EASE, delay: 0.15 }}
      className="group relative grid overflow-hidden rounded-3xl border border-line bg-elev lg:grid-cols-12"
    >
      <CoverArt
        seed={article.id}
        toneKey={article.category}
        coverUrl={article.coverUrl}
        alt={article.title}
        density={1.3}
        className="aspect-[16/10] lg:col-span-7 lg:aspect-auto lg:min-h-[440px]"
      >
        <div className="absolute inset-0 bg-gradient-to-t from-elev/70 via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-transparent lg:to-elev/40" />
        <span className="absolute top-4 left-4 inline-flex items-center gap-2 rounded-full border border-line-strong bg-bg/70 px-3 py-1 font-mono text-[10px] tracking-[0.16em] uppercase backdrop-blur">
          <span className="size-1.5 animate-pulse rounded-full bg-signal" /> {p > 0 && !done ? 'Davam et' : 'Seçilmiş'}
        </span>
      </CoverArt>
      <div className="relative flex flex-col p-6 md:p-10 lg:col-span-5">
        <div className="flex items-start justify-between gap-4">
          {article.category ? (
            <Badge tone={toneOf(article.category)}>{article.category}</Badge>
          ) : (
            <span className="mono-label">Jurnal</span>
          )}
          <BookmarkButton type="ARTICLE" id={article.id} className="relative z-10" />
        </div>
        <h2 className="mt-6 font-display text-3xl leading-[1.02] font-semibold tracking-tight md:text-[2.6rem]">
          <Link href={articleHref(article)} className="after:absolute after:inset-0 focus-visible:outline-none">
            {article.title}
          </Link>
        </h2>
        {article.excerpt && <p className="mt-4 line-clamp-4 text-muted md:text-lg">{article.excerpt}</p>}
        <div className="mt-auto pt-8">
          <MetaLine article={article} />
          <div className="mt-5 flex items-center gap-4">
            <span className="inline-flex h-12 items-center gap-2 rounded-2xl bg-signal px-5 font-medium text-signal-fg transition-transform group-hover:translate-x-0.5">
              {done ? 'Yenidən oxu' : p > 0 ? `Davam et · ${Math.round(p)}%` : 'Oxumağa başla'}
              <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </span>
            {author(article)}
          </div>
        </div>
      </div>
      <ProgressRail article={article} />
    </motion.article>
  );
}

function author(article: Article) {
  if (!article.author?.name) return null;
  return <span className="text-sm text-muted">{article.author.name}</span>;
}

/** Bento card (cover on top). */
export function ArticleCard({ article, tall, className }: { article: Article; tall?: boolean; className?: string }) {
  return (
    <Card interactive padded={false} className={cn('group relative flex h-full flex-col overflow-hidden', className)}>
      <CoverArt
        seed={article.id}
        toneKey={article.category}
        coverUrl={article.coverUrl}
        alt={article.title}
        className={cn('shrink-0', tall ? 'aspect-[4/3] md:aspect-[16/11]' : 'aspect-[16/9]')}
      >
        <div className="absolute top-3 left-3 flex gap-2">
          {article.category && (
            <span className="rounded-full border border-line-strong bg-bg/75 px-2.5 py-1 font-mono text-[10px] tracking-[0.14em] uppercase backdrop-blur">
              {article.category}
            </span>
          )}
        </div>
      </CoverArt>
      <BookmarkButton type="ARTICLE" id={article.id} size="sm" className="absolute top-3 right-3 z-10" />
      <div className="flex flex-1 flex-col p-5 md:p-6">
        <MetaLine article={article} />
        <h3 className={cn('mt-3 font-display font-semibold tracking-tight', tall ? 'text-2xl md:text-[1.7rem]' : 'text-xl')}>
          <Link href={articleHref(article)} className="after:absolute after:inset-0 focus-visible:outline-none">
            {article.title}
          </Link>
        </h3>
        {article.excerpt && (
          <p className={cn('mt-3 text-sm text-muted', tall ? 'line-clamp-3 md:text-base' : 'line-clamp-2')}>{article.excerpt}</p>
        )}
        <div className="mt-auto flex items-center justify-between pt-5">
          <ReadState article={article} />
          <ArrowUpRight className="size-4 text-subtle transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-fg" />
        </div>
      </div>
      <ProgressRail article={article} />
    </Card>
  );
}

/** Magazine index row: big numeral, title, category, minutes, state. */
export function ArticleIndexRow({ article, index }: { article: Article; index: number }) {
  const tone = toneOf(article.category);
  return (
    <div className="group relative isolate grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 border-t border-line py-5 md:grid-cols-[5rem_minmax(0,1fr)_12rem_9rem_auto] md:gap-6 md:py-6">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 origin-left scale-x-0 rounded-2xl bg-gradient-to-r from-surface to-transparent transition-transform duration-500 ease-[cubic-bezier(.22,1,.36,1)] group-hover:scale-x-100"
      />
      <span className="font-display text-3xl font-medium text-subtle tabular transition-colors group-hover:text-fg md:text-4xl">
        {pad2(index)}
      </span>
      <div className="min-w-0">
        <h3 className="font-display text-lg font-semibold tracking-tight md:text-xl">
          <Link href={articleHref(article)} className="after:absolute after:inset-0 focus-visible:outline-none">
            {article.title}
          </Link>
        </h3>
        {article.excerpt && <p className="mt-1 line-clamp-1 text-sm text-muted">{article.excerpt}</p>}
        <div className="mt-2 flex items-center gap-3 md:hidden">
          <ReadState article={article} />
          <span className="font-mono text-[11px] text-subtle uppercase">{article.readingMinutes} dəq</span>
        </div>
      </div>
      <span className="hidden items-center gap-2 text-sm text-muted md:inline-flex">
        <span className="size-2 rounded-full" style={{ background: `var(--${tone})` }} />
        <span className="truncate">{article.category ?? 'Ümumi'}</span>
      </span>
      <span className="hidden flex-col gap-1 md:flex">
        <ReadState article={article} />
        <span className="font-mono text-[11px] tracking-[0.12em] text-subtle uppercase">
          {article.readingMinutes} dəq{article.locked ? ' · şifrəli' : ''}
        </span>
      </span>
      <BookmarkButton type="ARTICLE" id={article.id} size="sm" className="relative z-10" />
    </div>
  );
}
