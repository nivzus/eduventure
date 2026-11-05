'use client';

import Link from 'next/link';
import { ArrowRight, Compass, Flag } from 'lucide-react';
import { useMemo } from 'react';
import { TrailPath } from '@/components/motion';
import { ButtonLink } from '@/components/ui';
import { cn, hashString } from '@/lib/utils';
import { useArticlesLite, useCoursesLite } from '../../hooks';
import { contentMeta } from '../../lib/content';
import { articleProgress } from '../../lib/normalize';
import { InlineEmpty, Shimmer } from '../shared/States';

interface Item {
  id: string;
  type: 'COURSE' | 'ARTICLE';
  title: string;
  href: string;
  progress: number; // 0-1
  meta?: string | null;
  updatedAt?: string;
}

function trailFor(seed: string): [number, number][] {
  const h = hashString(seed);
  const pts: [number, number][] = [];
  for (let i = 0; i <= 6; i++) {
    const y = 26 - i * 2.2 + (((h >> (i * 3)) & 7) - 3.5) * 2.2;
    pts.push([(i / 6) * 200, Math.max(4, Math.min(36, y))]);
  }
  return pts;
}

export function ContinueLearning() {
  const courses = useCoursesLite();
  const articles = useArticlesLite();
  const loading = courses.isLoading || articles.isLoading;

  const items = useMemo<Item[]>(() => {
    const c: Item[] = (courses.data ?? [])
      .filter((x) => (x.progress ?? 0) > 0 && (x.progress ?? 0) < 1)
      .map((x) => ({ id: x.id, type: 'COURSE', title: x.title, href: `/courses/${x.id}`, progress: x.progress ?? 0, meta: x.category, updatedAt: x.updatedAt }));
    const a: Item[] = (articles.data ?? [])
      .map((x) => ({ x, p: articleProgress(x) }))
      .filter(({ p }) => p > 0 && p < 100)
      .map(({ x, p }) => ({
        id: x.id,
        type: 'ARTICLE',
        title: x.title,
        href: `/articles/${x.slug || x.id}`,
        progress: p / 100,
        meta: x.readingMinutes ? `${x.readingMinutes} dəq oxu` : x.category,
        updatedAt: x.updatedAt,
      }));
    return [...c, ...a].sort((m, n) => n.progress - m.progress).slice(0, 4);
  }, [courses.data, articles.data]);

  if (loading)
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <Shimmer key={i} className="h-36 rounded-2xl" />
        ))}
      </div>
    );

  if (!items.length)
    return (
      <InlineEmpty
        icon={Compass}
        title="Yarımçıq marşrut yoxdur"
        hint="Yeni kurs və ya məqaləyə başla — irəliləyişin burada görünəcək."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <ButtonLink href="/courses" size="sm" variant="secondary">
              Kurslar
            </ButtonLink>
            <ButtonLink href="/paths" size="sm" variant="ghost">
              Tədris yolları
            </ButtonLink>
          </div>
        }
      />
    );

  return (
    <div className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-1 scrollbar-none sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0">
      {items.map((it, i) => {
        const meta = contentMeta(it.type);
        const Icon = meta.icon;
        return (
          <Link
            key={`${it.type}-${it.id}`}
            href={it.href}
            className={cn(
              'group/cl relative flex min-w-[78%] snap-start flex-col justify-between gap-4 overflow-hidden rounded-2xl border border-line bg-sunken/60 p-4 transition-[border-color,transform] duration-300 ease-out-expo hover:-translate-y-0.5 hover:border-line-strong sm:min-w-0',
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-subtle">
                  <Icon className="size-3.5" />
                  {meta.label}
                  {it.meta ? ` · ${it.meta}` : ''}
                </span>
                <p className="mt-1.5 line-clamp-2 font-semibold leading-snug">{it.title}</p>
              </div>
              <span className="grid size-8 shrink-0 place-items-center rounded-full border border-line text-muted transition-colors group-hover/cl:border-signal/50 group-hover/cl:bg-signal group-hover/cl:text-signal-fg">
                <ArrowRight className="size-4" />
              </span>
            </div>
            <div>
              <div className="relative h-10">
                <TrailPath points={trailFor(it.id)} viewBox="0 0 200 40" progress={it.progress} strokeWidth={2} delay={0.2 + i * 0.1} className="h-10 w-full" />
                <Flag className="absolute -top-1 right-0 size-3.5 text-subtle" />
              </div>
              <div className="mt-1 flex items-center justify-between font-mono text-[11px] text-subtle">
                <span>Başlanğıc</span>
                <span className="text-fg tabular">{Math.round(it.progress * 100)}%</span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
