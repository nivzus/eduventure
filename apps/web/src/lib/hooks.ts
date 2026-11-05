'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { api } from './api';
import type { MeSummary, UnreadCountResponse } from './types';
import { useAuth } from './auth';

/** GET /me/summary (shared by shell + dashboard). queryKey: ['me','summary'] */
export function useMeSummary(enabled = true) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['me', 'summary'],
    queryFn: () => api.get<MeSummary>('/me/summary'),
    enabled: enabled && !!user,
    staleTime: 60_000,
  });
}

/** GET /notifications/unread-count → number. queryKey: ['notifications','unread'] */
export function useUnreadCount() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: async () => {
      const r = await api.get<UnreadCountResponse>('/notifications/unread-count');
      return typeof r === 'number' ? r : (r?.count ?? 0);
    },
    enabled: !!user,
    refetchInterval: 60_000,
  });
}

export function useDebounce<T>(value: T, delay = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export function useMediaQuery(query: string, initial = false) {
  const [matches, setMatches] = useState(initial);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const on = () => setMatches(mql.matches);
    on();
    mql.addEventListener('change', on);
    return () => mql.removeEventListener('change', on);
  }, [query]);
  return matches;
}

/** Keyboard shortcut. useHotkey('k', cb, { meta: true }) → ⌘K / Ctrl+K */
export function useHotkey(
  key: string,
  handler: (e: KeyboardEvent) => void,
  opts: { meta?: boolean; shift?: boolean; enabled?: boolean } = {},
) {
  const ref = useRef(handler);
  ref.current = handler;
  const { meta = false, shift = false, enabled = true } = opts;
  useEffect(() => {
    if (!enabled) return;
    const on = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== key.toLowerCase()) return;
      if (meta && !(e.metaKey || e.ctrlKey)) return;
      if (shift && !e.shiftKey) return;
      if (!meta) {
        const t = e.target as HTMLElement | null;
        if (t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))) return;
      }
      ref.current(e);
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [key, meta, shift, enabled]);
}

/** true after first client render (for hydration-sensitive UI) */
export function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}
