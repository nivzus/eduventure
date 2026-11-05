'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'motion/react';
import { CloudOff, Compass, Plus, RotateCcw, Search, Sparkles, X } from 'lucide-react';
import {
  Button,
  ButtonLink,
  EmptyState,
  Input,
  Kbd,
  PageHeader,
  Segmented,
  Select,
} from '@/components/ui';
import { Stagger, StaggerItem } from '@/components/motion';
import { hasRole, useAuth } from '@/lib/auth';
import { useDebounce, useHotkey } from '@/lib/hooks';
import { cn, SPRING_UI } from '@/lib/utils';
import { useBookmarkedQuizIds, useQuizCategories, useQuizzes } from '../../hooks';
import type { QuizListItem } from '../../types';
import { QuizCard, QuizCardSkeleton } from './QuizCard';

type SortKey = 'new' | 'popular' | 'title' | 'short' | 'long';
type ProgressFilter = 'all' | 'fresh' | 'done' | 'saved';

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'new', label: 'Ən yenilər' },
  { value: 'popular', label: 'Ən populyar' },
  { value: 'title', label: 'Ad (A–Z)' },
  { value: 'short', label: 'Az sual' },
  { value: 'long', label: 'Çox sual' },
];

function sortQuizzes(list: QuizListItem[], sort: SortKey) {
  const arr = [...list];
  switch (sort) {
    case 'popular':
      return arr.sort((a, b) => (b.attemptsCount ?? 0) - (a.attemptsCount ?? 0));
    case 'title':
      return arr.sort((a, b) => a.title.localeCompare(b.title, 'az'));
    case 'short':
      return arr.sort((a, b) => (a.questionCount ?? 0) - (b.questionCount ?? 0));
    case 'long':
      return arr.sort((a, b) => (b.questionCount ?? 0) - (a.questionCount ?? 0));
    case 'new':
    default:
      return arr.sort((a, b) => Date.parse(b.createdAt ?? '') - Date.parse(a.createdAt ?? ''));
  }
}

export function QuizDiscovery() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const reduce = useReducedMotion();
  const { user } = useAuth();
  const isAuthor = hasRole(user, ['TEACHER', 'ADMIN']);

  const [q, setQ] = useState(params.get('q') ?? '');
  const [category, setCategory] = useState(params.get('category') ?? '');
  const [sort, setSort] = useState<SortKey>((params.get('sort') as SortKey) || 'new');
  const [progress, setProgress] = useState<ProgressFilter>((params.get('show') as ProgressFilter) || 'all');
  const tag = params.get('tag') ?? undefined;
  const debouncedQ = useDebounce(q.trim(), 300);
  const searchRef = useRef<HTMLInputElement>(null);
  useHotkey('/', (e) => {
    e.preventDefault();
    searchRef.current?.focus();
  });

  // keep URL shareable
  useEffect(() => {
    const sp = new URLSearchParams();
    if (debouncedQ) sp.set('q', debouncedQ);
    if (category) sp.set('category', category);
    if (sort !== 'new') sp.set('sort', sort);
    if (progress !== 'all') sp.set('show', progress);
    if (tag) sp.set('tag', tag);
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [debouncedQ, category, sort, progress, tag, pathname, router]);

  const quizzes = useQuizzes({ q: debouncedQ || undefined, category: category || undefined, tag });
  const categories = useQuizCategories();
  const bookmarked = useBookmarkedQuizIds(Boolean(user));

  const list = useMemo(() => {
    const raw = (quizzes.data ?? []).filter((x) => x.status === 'PUBLISHED' || !x.status);
    const filtered = raw.filter((x) => {
      if (progress === 'fresh') return typeof x.myBest !== 'number';
      if (progress === 'done') return typeof x.myBest === 'number';
      if (progress === 'saved') return bookmarked.has(x.id);
      return true;
    });
    return sortQuizzes(filtered, sort);
  }, [quizzes.data, progress, bookmarked, sort]);

  const stats = useMemo(() => {
    const all = quizzes.data ?? [];
    const done = all.filter((x) => typeof x.myBest === 'number');
    const avg = done.length ? Math.round(done.reduce((s, x) => s + (x.myBest ?? 0), 0) / done.length) : null;
    return { total: all.length, done: done.length, avg };
  }, [quizzes.data]);

  const filtersActive = Boolean(debouncedQ || category || progress !== 'all' || tag);
  const featureFirst = !filtersActive && sort === 'new' && list.length >= 4;

  const reset = () => {
    setQ('');
    setCategory('');
    setProgress('all');
    setSort('new');
    if (tag) router.replace(pathname);
  };

  const cats = categories.data ?? [];

  return (
    <div className="relative">
      <PageHeader
        size="lg"
        eyebrow={
          <>
            Ekspedisiyalar
            {stats.total > 0 && <span className="text-fg">· {stats.total} test</span>}
          </>
        }
        title={
          <>
            Hansı <em>zirvəni</em> fəth edəcəksən?
          </>
        }
        description="Hər test bir marşrutdur: suallar — dayanacaqlar, nəticə — yüksəklik. Bir mövzu seç və yola düş."
        actions={
          <>
            <ButtonLink href="/practice" variant="secondary" leftIcon={<Sparkles />}>
              Ağıllı məşq
            </ButtonLink>
            {isAuthor && (
              <ButtonLink href="/studio/quizzes/new" leftIcon={<Plus />}>
                Yeni test
              </ButtonLink>
            )}
          </>
        }
      />

      {stats.done > 0 && (
        <motion.dl
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="-mt-2 mb-8 flex flex-wrap gap-x-8 gap-y-2"
        >
          <Stat label="Tamamlanıb" value={`${stats.done}/${stats.total}`} />
          {stats.avg !== null && <Stat label="Orta ən yaxşı nəticə" value={`${stats.avg}%`} />}
          <Stat label="Əlfəcinlər" value={String(bookmarked.size)} />
        </motion.dl>
      )}

      {/* toolbar */}
      <div className="sticky top-[var(--app-topbar-h,64px)] z-20 -mx-4 mb-6 border-b border-line bg-bg/80 px-4 pb-4 pt-3 backdrop-blur-xl sm:mx-0 sm:rounded-3xl sm:border sm:bg-elev/70 sm:p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <Input
            ref={searchRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Test axtar: mövzu, ad, təsvir…"
            leftIcon={<Search />}
            aria-label="Testlərdə axtar"
            wrapperClassName="flex-1"
            rightSlot={
              q ? (
                <button
                  type="button"
                  onClick={() => setQ('')}
                  className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:text-fg"
                  aria-label="Axtarışı təmizlə"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : (
                <Kbd className="mr-2 hidden sm:inline-flex">/</Kbd>
              )
            }
          />
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1 overflow-x-auto scrollbar-none lg:flex-none">
              <Segmented
                size="sm"
                value={progress}
                onChange={setProgress}
                aria-label="Filtr"
                tabs={[
                  { value: 'all', label: 'Hamısı' },
                  { value: 'fresh', label: 'Yeni' },
                  { value: 'done', label: 'Həll etdiklərim' },
                  ...(user ? [{ value: 'saved' as const, label: 'Əlfəcin' }] : []),
                ]}
              />
            </div>
            <Select
              selectSize="sm"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              options={SORTS}
              aria-label="Sırala"
              wrapperClassName="w-[150px] shrink-0"
            />
          </div>
        </div>

        {/* category chips */}
        {(cats.length > 0 || categories.isLoading) && (
          <LayoutGroup id="quiz-cats">
            <div className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-0.5 scrollbar-none" role="tablist" aria-label="Kateqoriyalar">
              {['', ...cats].map((c) => {
                const active = category === c;
                return (
                  <button
                    key={c || '__all'}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setCategory(c)}
                    className={cn(
                      'relative shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors',
                      active ? 'border-transparent text-signal-fg' : 'border-line text-muted hover:border-line-strong hover:text-fg',
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="cat-pill"
                        transition={SPRING_UI}
                        className="absolute inset-0 rounded-full bg-signal"
                        aria-hidden
                      />
                    )}
                    <span className="relative">{c || 'Bütün mövzular'}</span>
                  </button>
                );
              })}
            </div>
          </LayoutGroup>
        )}
        {tag && (
          <div className="mt-3 flex items-center gap-2 text-sm text-muted">
            Teq: <span className="rounded-full bg-fg/[0.08] px-2.5 py-0.5 font-semibold text-fg">#{tag}</span>
            <button type="button" onClick={() => router.replace(pathname)} className="text-subtle hover:text-fg">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* results */}
      {quizzes.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={cn(i === 0 && 'sm:col-span-2')}>
              <QuizCardSkeleton featured={i === 0} />
            </div>
          ))}
        </div>
      ) : quizzes.isError ? (
        <EmptyState
          icon={CloudOff}
          title="Testləri yükləmək alınmadı"
          description="Bağlantını yoxla və yenidən cəhd et."
          action={
            <Button variant="secondary" leftIcon={<RotateCcw />} onClick={() => quizzes.refetch()}>
              Yenidən yüklə
            </Button>
          }
        />
      ) : list.length === 0 ? (
        <EmptyState
          icon={Compass}
          title={filtersActive ? 'Bu marşrutda heç nə tapılmadı' : 'Hələ test yoxdur'}
          description={
            filtersActive
              ? 'Axtarışı qısalt, başqa mövzu seç və ya filtrləri sıfırla.'
              : 'Müəllimlər yeni ekspedisiyalar hazırlayır — tezliklə burada olacaq.'
          }
          action={
            filtersActive ? (
              <Button variant="secondary" leftIcon={<RotateCcw />} onClick={reset}>
                Filtrləri sıfırla
              </Button>
            ) : isAuthor ? (
              <ButtonLink href="/studio/quizzes/new" leftIcon={<Plus />}>
                İlk testi yarat
              </ButtonLink>
            ) : undefined
          }
        />
      ) : (
        <>
          <p className="mb-4 mono-label" aria-live="polite">
            {list.length} test tapıldı
            {quizzes.isFetching && <span className="ml-2 text-glacier">· yenilənir</span>}
          </p>
          <Stagger
            key={`${category}|${progress}|${sort}|${debouncedQ}`}
            inView={false}
            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
          >
            <AnimatePresence initial={false}>
              {list.map((quiz, i) => (
                <StaggerItem key={quiz.id} className={cn(featureFirst && i === 0 && 'sm:col-span-2')}>
                  <QuizCard quiz={quiz} bookmarked={bookmarked.has(quiz.id)} featured={featureFirst && i === 0} />
                </StaggerItem>
              ))}
            </AnimatePresence>
          </Stagger>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="mono-label">{label}</dt>
      <dd className="font-display text-lg font-semibold tabular-nums tracking-tight">{value}</dd>
    </div>
  );
}
