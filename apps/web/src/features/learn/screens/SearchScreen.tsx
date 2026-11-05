'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'motion/react';
import { Search, X } from 'lucide-react';
import { Segmented, Skeleton } from '@/components/ui';
import { Mascot } from '@/components/brand/Mascot';
import { Note } from '@/components/notebook';
import { useDebounce } from '@/lib/hooks';
import { useSearch } from '../hooks';
import type { ContentSummary, ContentType, SearchResults } from '../types';
import { contentHref, TYPE_META } from './BookmarksScreen';

type Tab = 'all' | keyof SearchResults;
const KEYS: { key: keyof SearchResults; type: ContentType }[] = [
  { key: 'courses', type: 'COURSE' },
  { key: 'quizzes', type: 'QUIZ' },
  { key: 'articles', type: 'ARTICLE' },
  { key: 'decks', type: 'DECK' },
  { key: 'paths', type: 'PATH' },
];

function mark(text: string, q: string): ReactNode {
  const t = q.trim();
  if (!t) return text;
  const i = text.toLocaleLowerCase('az').indexOf(t.toLocaleLowerCase('az'));
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark className="marker bg-transparent text-inherit">{text.slice(i, i + t.length)}</mark>
      {text.slice(i + t.length)}
    </>
  );
}

export function SearchScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState(params.get('q') ?? '');
  const [tab, setTab] = useState<Tab>('all');
  const dq = useDebounce(q, 250);
  const { data, isFetching } = useSearch(dq);

  useEffect(() => {
    const url = dq.trim() ? `${pathname}?q=${encodeURIComponent(dq.trim())}` : pathname;
    router.replace(url, { scroll: false });
  }, [dq, pathname, router]);

  const rows = useMemo(() => {
    if (!data) return [] as { type: ContentType; item: ContentSummary }[];
    return KEYS.filter((k) => tab === 'all' || tab === k.key).flatMap((k) => data[k.key].map((item) => ({ type: k.type, item })));
  }, [data, tab]);

  const counts = data ? KEYS.reduce((s, k) => s + data[k.key].length, 0) : 0;
  const ready = dq.trim().length >= 2;

  return (
    <div className="mx-auto max-w-4xl px-4 pb-20 pt-8 sm:px-6">
      <Note className="text-2xl !text-signal">axtarış</Note>
      <div className="relative mt-3">
        <Search className="pointer-events-none absolute left-5 top-1/2 size-6 -translate-y-1/2 text-subtle" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Test, məqalə, kurs, söz…"
          className="h-16 w-full rounded-2xl border-2 border-ink bg-elev pl-14 pr-14 font-display text-xl shadow-stamp outline-none placeholder:text-subtle focus:shadow-[4px_4px_0_0_var(--ink)]"
        />
        {q && (
          <button type="button" aria-label="Təmizlə" onClick={() => setQ('')} className="absolute right-4 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full hover:bg-fg/5">
            <X className="size-5" />
          </button>
        )}
      </div>

      {ready && data && (
        <div className="mt-6 overflow-x-auto scrollbar-none">
          <Segmented
            value={tab}
            onChange={(v) => setTab(v as Tab)}
            tabs={[{ value: 'all', label: `Hamısı · ${counts}` }, ...KEYS.filter((k) => data[k.key].length).map((k) => ({ value: k.key, label: `${TYPE_META[k.type].plural} · ${data[k.key].length}` }))]}
          />
        </div>
      )}

      <div className="mt-6">
        {!ready ? (
          <div className="mt-10 flex flex-col items-center text-center">
            <Mascot mode="static" size={110} message="Nə axtarırıq?" />
            <p className="mt-4 text-muted">Ən azı 2 hərf yaz. Məsələn: <button className="font-semibold text-signal underline" onClick={() => setQ('present')}>present</button>, <button className="font-semibold text-signal underline" onClick={() => setQ('artikl')}>artikl</button></p>
          </div>
        ) : isFetching && !data ? (
          <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
        ) : rows.length === 0 ? (
          <div className="mt-10 flex flex-col items-center text-center">
            <Mascot mode="sad" size={110} message="Heç nə tapılmadı" />
            <p className="mt-4 text-muted">Başqa söz yoxla və ya yazılışı dəyiş.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {rows.map(({ type, item }, i) => {
              const M = TYPE_META[type];
              return (
                <motion.li key={`${type}:${item.id}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.3) }}>
                  <Link href={contentHref(type, item.id, item)} className="flex items-center gap-4 rounded-2xl border border-line bg-elev p-4 shadow-paper transition-colors hover:border-ink/50">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl border-2 border-ink bg-ember/30"><M.icon className="size-5" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="hand block text-lg text-muted">{M.label}{item.category ? ` · ${item.category}` : ''}</span>
                      <span className="block truncate font-display text-lg font-semibold">{mark(item.title, dq)}</span>
                      {item.description && <span className="block truncate text-sm text-muted">{mark(item.description, dq)}</span>}
                    </span>
                  </Link>
                </motion.li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
