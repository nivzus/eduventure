'use client';

import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  BookOpen,
  CornerDownLeft,
  GraduationCap,
  Layers,
  ListChecks,
  LogOut,
  Moon,
  Route,
  Search,
  SunMedium,
  type LucideIcon,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useDebounce, useHotkey } from '@/lib/hooks';
import { useTheme } from '@/lib/theme';
import type { SearchResults } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Kbd } from '@/components/ui/Kbd';
import { Spinner } from '@/components/ui/Spinner';
import { useDialogBehavior, useMounted } from '@/components/ui/_internal';
import { navForRole } from './nav';

/* ── global open state: openCommandPalette() from anywhere ── */
let isOpen = false;
const subs = new Set<() => void>();
function setOpenState(v: boolean) {
  isOpen = v;
  subs.forEach((s) => s());
}
export const openCommandPalette = () => setOpenState(true);
export const closeCommandPalette = () => setOpenState(false);
export function useCommandPalette() {
  const open = useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    () => isOpen,
    () => false,
  );
  return { open, setOpen: setOpenState };
}

const norm = (s: string) =>
  s
    .toLocaleLowerCase('az')
    .replace(/ə/g, 'e')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g');

interface Cmd {
  id: string;
  group: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  run: () => void;
}

export function CommandPalette() {
  const { open, setOpen } = useCommandPalette();
  const mounted = useMounted();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const debounced = useDebounce(q.trim(), 220);

  useHotkey('k', (e) => {
    e.preventDefault();
    setOpen(!isOpen);
  }, { meta: true });
  useHotkey('/', (e) => {
    e.preventDefault();
    setOpen(true);
  });

  const close = () => setOpen(false);
  useDialogBehavior(open, close, dialogRef);

  useEffect(() => {
    if (!open) {
      setQ('');
      setActive(0);
    }
  }, [open]);

  const search = useQuery({
    queryKey: ['search', 'palette', debounced],
    queryFn: ({ signal }) => api.get<SearchResults>('/search', { q: debounced }, { signal }),
    enabled: open && debounced.length >= 2,
    staleTime: 30_000,
  });

  const go = (href: string) => () => {
    close();
    router.push(href);
  };

  const commands = useMemo<Cmd[]>(() => {
    const nq = norm(q.trim());
    const nav: Cmd[] = navForRole(user?.role)
      .flatMap((g) => g.items.map((it) => ({ it, g, key: norm(`${it.label} ${g.label} ${it.keywords ?? ''}`) })))
      .filter((x) => !nq || x.key.includes(nq))
      .map(({ it, g }) => ({ id: `nav:${it.href}`, group: 'Keçidlər', label: it.label, hint: g.label, icon: it.icon, run: go(it.href) }));

    const r = search.data;
    const results: Cmd[] = [];
    if (r && debounced.length >= 2) {
      r.quizzes?.forEach((x) => results.push({ id: `q:${x.id}`, group: 'Testlər', label: x.title, hint: x.category ?? undefined, icon: ListChecks, run: go(`/quizzes/${x.id}`) }));
      r.articles?.forEach((x) => results.push({ id: `a:${x.id}`, group: 'Məqalələr', label: x.title, hint: x.category ?? undefined, icon: BookOpen, run: go(`/articles/${x.slug ?? x.id}`) }));
      r.courses?.forEach((x) => results.push({ id: `c:${x.id}`, group: 'Kurslar', label: x.title, icon: GraduationCap, run: go(`/courses/${x.id}`) }));
      r.paths?.forEach((x) => results.push({ id: `p:${x.id}`, group: 'Yollar', label: x.title, icon: Route, run: go(`/paths/${x.id}`) }));
      r.decks?.forEach((x) => results.push({ id: `d:${x.id}`, group: 'Kartlar', label: x.title, icon: Layers, run: go(`/decks/${x.id}`) }));
    }

    const actions: Cmd[] = [
      { id: 'act:theme', group: 'Əməliyyatlar', label: theme === 'dark' ? 'İşıqlı temaya keç' : 'Qaranlıq temaya keç', icon: theme === 'dark' ? SunMedium : Moon, run: () => { toggle(); close(); } },
      { id: 'act:logout', group: 'Əməliyyatlar', label: 'Hesabdan çıx', icon: LogOut, run: async () => { close(); await logout(); router.push('/login'); } },
    ].filter((c) => !nq || norm(c.label).includes(nq));

    const all = [...results, ...nav.slice(0, nq ? 8 : 12), ...actions];
    if (debounced.length >= 2) {
      all.push({ id: 'all', group: 'Axtarış', label: `“${q.trim()}” üçün bütün nəticələr`, icon: Search, run: go(`/search?q=${encodeURIComponent(q.trim())}`) });
    }
    return all;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, debounced, search.data, user?.role, theme]);

  useEffect(() => setActive(0), [q, search.data]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(commands.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      commands[active]?.run();
    }
  };

  if (!mounted) return null;

  let lastGroup = '';
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[120] flex items-start justify-center px-3 pt-[10vh] sm:pt-[14vh]" data-lenis-prevent>
          <motion.div
            className="absolute inset-0 bg-[#05050a]/70 backdrop-blur-md light:bg-[#2a2418]/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            onClick={close}
          />
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Komanda paneli"
            className="relative w-full max-w-[640px] overflow-hidden rounded-3xl border border-line-strong bg-elev shadow-pop"
            initial={{ opacity: 0, scale: 0.94, y: -12, filter: 'blur(8px)' }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.97, y: -6, transition: { duration: 0.14 } }}
            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
          >
            <div className="flex items-center gap-3 border-b border-line px-5">
              {search.isFetching ? <Spinner size={18} className="text-signal light:text-aurora" /> : <Search className="size-[18px] text-subtle" />}
              <input
                autoFocus
                data-autofocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Test, məqalə, kurs axtar və ya səhifəyə keç…"
                className="h-16 flex-1 bg-transparent text-base text-fg outline-none placeholder:text-subtle focus-visible:outline-none"
                role="combobox"
                aria-expanded="true"
                aria-controls="cmdk-list"
                aria-activedescendant={commands[active] ? `cmdk-${commands[active].id}` : undefined}
              />
              <Kbd>esc</Kbd>
            </div>
            <div ref={listRef} id="cmdk-list" role="listbox" className="max-h-[min(440px,60vh)] overflow-y-auto p-2">
              {commands.length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <p className="font-display text-base font-semibold">Heç nə tapılmadı</p>
                  <p className="mt-1 text-sm text-muted">Başqa söz yoxla — məsələn, “present perfect”.</p>
                </div>
              ) : (
                commands.map((c, i) => {
                  const header = c.group !== lastGroup ? c.group : null;
                  lastGroup = c.group;
                  const Icon = c.icon;
                  const isActive = i === active;
                  return (
                    <div key={c.id}>
                      {header && <div className="mono-label px-3 pb-1.5 pt-3 text-[10px]">{header}</div>}
                      <button
                        type="button"
                        id={`cmdk-${c.id}`}
                        data-idx={i}
                        role="option"
                        aria-selected={isActive}
                        onMouseMove={() => setActive(i)}
                        onClick={() => c.run()}
                        className={cn('relative flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm transition-colors', isActive ? 'text-fg' : 'text-muted')}
                      >
                        {isActive && (
                          <motion.span layoutId="cmdk-active" className="absolute inset-0 rounded-2xl bg-fg/[0.07]" transition={{ type: 'spring', stiffness: 500, damping: 36 }} />
                        )}
                        <span className={cn('relative grid size-8 shrink-0 place-items-center rounded-xl border border-line bg-surface', isActive && 'border-signal/40 text-signal light:border-line-strong light:text-aurora')}>
                          <Icon className="size-4" />
                        </span>
                        <span className="relative min-w-0 flex-1 truncate font-medium">{c.label}</span>
                        {c.hint && <span className="relative hidden font-mono text-[10.5px] uppercase tracking-wider text-subtle sm:inline">{c.hint}</span>}
                        {isActive && <ArrowRight className="relative size-4 text-fg" />}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
            <div className="flex items-center gap-4 border-t border-line bg-sunken/40 px-5 py-3 text-[11px] text-subtle light:bg-bg">
              <span className="flex items-center gap-1.5"><Kbd>↑</Kbd><Kbd>↓</Kbd> seç</span>
              <span className="flex items-center gap-1.5"><Kbd><CornerDownLeft className="size-3" /></Kbd> aç</span>
              <span className="ml-auto flex items-center gap-1.5"><Kbd>⌘</Kbd><Kbd>K</Kbd> bağla</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/** The search-pill trigger in the top bar. */
export function CommandTrigger({ className }: { className?: string }) {
  const { setOpen } = useCommandPalette();
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className={cn(
        'group flex h-10 w-full max-w-[420px] items-center gap-3 rounded-2xl border border-line bg-sunken/60 pl-3.5 pr-2 text-sm text-subtle transition hover:border-line-strong hover:text-muted light:bg-surface',
        className,
      )}
    >
      <Search className="size-4 transition-transform duration-300 group-hover:scale-110" />
      <span className="flex-1 truncate text-left">Axtar və ya keç…</span>
      <span className="flex items-center gap-1">
        <Kbd>⌘</Kbd>
        <Kbd>K</Kbd>
      </span>
    </button>
  );
}
