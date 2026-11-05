'use client';

import { BookOpen, SearchX } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useDeferredValue, useMemo, useState } from 'react';
import { Button, EmptyState, ProgressRing, Skeleton } from '@/components/ui';
import { cn } from '@/lib/utils';
import { ArticleCard, ArticleIndexRow, FeaturedArticle } from '../components/articles/ArticleCards';
import { FilterChips, Masthead } from '../components/shared/Masthead';
import { Rise } from '../components/shared/Rise';
import { SearchField } from '../components/shared/SearchField';
import { ErrorState } from '../components/shared/States';
import { useArticleCategories, useArticles } from '../hooks';
import { fold } from '../lib/format';
import { isArticleDone, progressOf } from '../lib/normalize';
import type { Article } from '../types';

type ReadFilter = 'all' | 'progress' | 'done' | 'new';

/** Bento rhythm for cards 2..5: wide/narrow alternation on a 12-col grid. */
const BENTO = ['lg:col-span-7', 'lg:col-span-5', 'lg:col-span-5', 'lg:col-span-7'];

export function ArticlesScreen() {
  const { data, isLoading, isError, error, refetch } = useArticles();
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('__all');
  const [state, setState] = useState<ReadFilter>('all');
  const query = useDeferredValue(q);

  const articles = useMemo(() => (data ?? []).filter((a) => a.status === 'PUBLISHED' || !a.status), [data]);
  const categories = useArticleCategories(articles);

  const stats = useMemo(() => {
    const done = articles.filter((a) => isArticleDone(a)).length;
    const progress = articles.filter((a) => !isArticleDone(a) && progressOf(a) > 0).length;
    return { done, progress, total: articles.length };
  }, [articles]);

  const filtered = useMemo(() => {
    const term = fold(query.trim());
    return articles.filter((a) => {
      if (category !== '__all' && a.category !== category) return false;
      const done = isArticleDone(a);
      const p = progressOf(a);
      if (state === 'done' && !done) return false;
      if (state === 'progress' && (done || p === 0)) return false;
      if (state === 'new' && (done || p > 0)) return false;
      if (!term) return true;
      return fold(`${a.title} ${a.excerpt ?? ''} ${(a.tags ?? []).join(' ')} ${a.category ?? ''}`).includes(term);
    });
  }, [articles, category, state, query]);

  const browsing = !query.trim() && category === '__all' && state === 'all';
  // Featured: the article you were reading, otherwise the newest.
  const featured: Article | undefined = browsing
    ? (filtered.find((a) => !isArticleDone(a) && progressOf(a) > 0) ?? filtered[0])
    : undefined;
  const rest = featured ? filtered.filter((a) => a.id !== featured.id) : filtered;
  const bento = browsing ? rest.slice(0, 4) : rest.slice(0, 6);
  const index = browsing ? rest.slice(4) : rest.slice(6);

  const resetFilters = () => {
    setQ('');
    setCategory('__all');
    setState('all');
  };

  return (
    <div className="mx-auto w-full max-w-[1400px] pb-24">
      <Masthead
        eyebrow="Jurnal"
        meta={isLoading ? '…' : `№ ${stats.total} məqalə`}
        title="Hər məqalə — yeni bir *zirvə*."
        description="Qrammatika, söz ehtiyatı və mədəniyyət haqqında oxunaqlı yazılar. Oxuduqca irəliləyişin avtomatik qeyd olunur, qeydlərin isə səninlə qalır."
        aside={
          !isLoading && stats.total > 0 ? (
            <div className="flex items-center gap-5 rounded-3xl border border-line bg-elev p-5 pr-7">
              <ProgressRing value={stats.total ? (stats.done / stats.total) * 100 : 0} size={76} stroke={6} tone="moss" />
              <div className="space-y-1.5">
                <p className="mono-label">Sənin jurnalın</p>
                <p className="font-display text-2xl font-semibold tabular">
                  {stats.done}
                  <span className="text-subtle">/{stats.total}</span>
                </p>
                <p className="text-sm text-muted">{stats.progress} məqalə yarımçıqdır</p>
              </div>
            </div>
          ) : null
        }
      />

      <div className="sticky top-16 z-20 -mx-4 mb-8 border-b border-line bg-bg/85 px-4 py-3 backdrop-blur-xl md:static md:mx-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <SearchField value={q} onChange={setQ} placeholder="Başlıq, mövzu və ya teq üzrə axtar…" className="lg:w-80" />
          <FilterChips
            layoutId="article-cat"
            label="Kateqoriya"
            value={category}
            onChange={setCategory}
            options={[
              { value: '__all', label: 'Hamısı', count: articles.length },
              ...categories.map((c) => ({ value: c.name, label: c.name, count: c.count })),
            ]}
            className="min-w-0 flex-1"
          />
          <FilterChips
            layoutId="article-state"
            label="Oxuma vəziyyəti"
            value={state}
            onChange={setState}
            options={[
              { value: 'all', label: 'Hər biri' },
              { value: 'progress', label: 'Yarımçıq' },
              { value: 'new', label: 'Yeni' },
              { value: 'done', label: 'Oxunub' },
            ]}
          />
        </div>
      </div>

      {isLoading ? (
        <ArticlesSkeleton />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : articles.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="size-6" />}
          title="Jurnal hələ boşdur"
          description="Müəllimlər ilk məqalələri dərc edən kimi burada görünəcək."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<SearchX className="size-6" />}
          title="Bu filtrə uyğun məqalə yoxdur"
          description="Axtarış sözünü dəyiş və ya filtrləri sıfırla."
          action={
            <Button variant="secondary" onClick={resetFilters}>
              Filtrləri sıfırla
            </Button>
          }
        />
      ) : (
        <div className="space-y-6 md:space-y-8">
          {featured && <FeaturedArticle article={featured} />}

          <motion.div layout className="grid gap-5 md:grid-cols-2 md:gap-6 lg:grid-cols-12">
            <AnimatePresence mode="popLayout">
              {bento.map((a, i) => (
                <motion.div
                  key={a.id}
                  layout
                  initial={{ opacity: 0, y: 16, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.2 } }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.05 * i }}
                  className={cn(browsing ? BENTO[i % 4] : 'lg:col-span-4')}
                >
                  <ArticleCard article={a} tall={browsing && (i === 0 || i === 3)} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>

          {index.length > 0 && (
            <section className="pt-10">
              <Rise className="mb-2 flex items-end justify-between gap-4">
                <h2 className="font-display text-2xl font-semibold md:text-3xl">
                  Arxivdən <span className="accent text-muted">bütün</span> yazılar
                </h2>
                <span className="mono-label tabular">{index.length} məqalə</span>
              </Rise>
              <div className="border-b border-line">
                {index.map((a, i) => (
                  <Rise key={a.id} delay={Math.min(i, 8) * 0.04}>
                    <ArticleIndexRow article={a} index={i + bento.length + (featured ? 2 : 1)} />
                  </Rise>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function ArticlesSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Yüklənir">
      <div className="grid overflow-hidden rounded-3xl border border-line bg-elev lg:grid-cols-12">
        <Skeleton className="aspect-[16/10] rounded-none lg:col-span-7 lg:aspect-auto lg:h-[440px]" />
        <div className="space-y-4 p-8 lg:col-span-5">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="mt-10 h-12 w-48 rounded-2xl" />
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-12">
        {BENTO.map((span, i) => (
          <div key={i} className={cn('overflow-hidden rounded-3xl border border-line bg-elev', span)}>
            <Skeleton className="aspect-[16/9] rounded-none" />
            <div className="space-y-3 p-6">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-6 w-4/5" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
