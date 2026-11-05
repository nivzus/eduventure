'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { api } from '@/lib/api';
import type {
  Annotation,
  Article,
  ArticleInput,
  ArticleProgressResponse,
  Bookmark,
  CardReviewState,
  CommentNode,
  ContentType,
  Course,
  CourseCompleteResponse,
  CourseInput,
  Deck,
  DeckInput,
  Grade,
  GroupLite,
  HighlightColor,
  LearningPath,
  PathInput,
  QuizLite,
  SearchResults,
  StudySession,
  Visibility,
} from './types';

/** Query keys — namespaced under "learn" so other features never collide. */
export const learnKeys = {
  all: ['learn'] as const,
  articles: (p?: object) => ['learn', 'articles', p ?? {}] as const,
  article: (slug: string) => ['learn', 'article', slug] as const,
  articleCategories: () => ['learn', 'article-categories'] as const,
  annotations: (articleId: string) => ['learn', 'annotations', articleId] as const,
  courses: (p?: object) => ['learn', 'courses', p ?? {}] as const,
  course: (id: string) => ['learn', 'course', id] as const,
  paths: (p?: object) => ['learn', 'paths', p ?? {}] as const,
  path: (id: string) => ['learn', 'path', id] as const,
  decks: (p?: object) => ['learn', 'decks', p ?? {}] as const,
  deck: (id: string) => ['learn', 'deck', id] as const,
  study: (id: string) => ['learn', 'study', id] as const,
  bookmarks: () => ['learn', 'bookmarks'] as const,
  search: (q: string) => ['learn', 'search', q] as const,
  comments: (type: string, id: string) => ['learn', 'comments', type, id] as const,
  quizOptions: () => ['learn', 'quiz-options'] as const,
  groups: () => ['learn', 'groups'] as const,
};

type Params = Record<string, string | number | boolean | undefined | null>;
const clean = (p: Params) =>
  Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined && v !== null && v !== '')) as Record<
    string,
    string | number | boolean
  >;

// ───────────────────────────── Articles ─────────────────────────────

export function useArticles(params: { q?: string; category?: string; tag?: string; mine?: boolean; status?: string } = {}) {
  const p = clean({ ...params, mine: params.mine ? 1 : undefined });
  return useQuery({
    queryKey: learnKeys.articles(p),
    queryFn: () => api.get<Article[]>('/articles', p),
    placeholderData: keepPreviousData,
  });
}

export function useArticle(slugOrId: string | undefined) {
  return useQuery({
    queryKey: learnKeys.article(slugOrId ?? ''),
    queryFn: () => api.get<Article>(`/articles/${encodeURIComponent(slugOrId!)}`),
    enabled: Boolean(slugOrId) && slugOrId !== 'new',
    retry: (count, err: unknown) => {
      const status = (err as { status?: number })?.status;
      if (status && status >= 400 && status < 500) return false;
      return count < 2;
    },
  });
}

export function useSaveArticleProgress(articleId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (progress: number) =>
      api.put<ArticleProgressResponse>(`/articles/${articleId}/progress`, { progress: Math.round(progress) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['learn', 'articles'] });
    },
  });
}

export function useAnnotations(articleId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: learnKeys.annotations(articleId ?? ''),
    queryFn: () => api.get<Annotation[]>(`/articles/${articleId}/annotations`),
    enabled: Boolean(articleId) && enabled,
  });
}

export function useCreateAnnotation(articleId: string | undefined) {
  const qc = useQueryClient();
  const key = learnKeys.annotations(articleId ?? '');
  return useMutation({
    mutationFn: (body: { quote: string; note?: string | null; color: HighlightColor; startOffset: number; endOffset: number }) =>
      api.post<Annotation>(`/articles/${articleId}/annotations`, body),
    onSuccess: (created) => {
      qc.setQueryData<Annotation[]>(key, (old) => [...(old ?? []), created]);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export function useUpdateAnnotation(articleId: string | undefined) {
  const qc = useQueryClient();
  const key = learnKeys.annotations(articleId ?? '');
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; note?: string | null; color?: HighlightColor }) =>
      api.patch<Annotation>(`/annotations/${id}`, body),
    onMutate: async ({ id, ...body }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Annotation[]>(key);
      qc.setQueryData<Annotation[]>(key, (old) => (old ?? []).map((a) => (a.id === id ? { ...a, ...body } : a)));
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(key, ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export function useDeleteAnnotation(articleId: string | undefined) {
  const qc = useQueryClient();
  const key = learnKeys.annotations(articleId ?? '');
  return useMutation({
    mutationFn: (id: string) => api.del<unknown>(`/annotations/${id}`),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Annotation[]>(key);
      qc.setQueryData<Annotation[]>(key, (old) => (old ?? []).filter((a) => a.id !== id));
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(key, ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

/** Category list derived from published articles (no dedicated endpoint in the contract). */
export function useArticleCategories(articles: Article[] | undefined) {
  return useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of articles ?? []) if (a.category) counts.set(a.category, (counts.get(a.category) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name, n]) => ({ name, count: n }));
  }, [articles]);
}

// ───────────────────────────── Unlock (passcode) ─────────────────────────────

export function useUnlockContent(type: ContentType, id: string | undefined, invalidate: readonly unknown[]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (passcode: string) => api.post<unknown>(`/content/${type}/${id}/unlock`, { passcode }),
    onSuccess: () => qc.invalidateQueries({ queryKey: invalidate }),
  });
}

// ───────────────────────────── Courses ─────────────────────────────

export function useCourses(params: { mine?: boolean; q?: string } = {}) {
  const p = clean({ q: params.q, mine: params.mine ? 1 : undefined });
  return useQuery({
    queryKey: learnKeys.courses(p),
    queryFn: () => api.get<Course[]>('/courses', p),
    placeholderData: keepPreviousData,
  });
}

export function useCourse(id: string | undefined) {
  return useQuery({
    queryKey: learnKeys.course(id ?? ''),
    queryFn: () => api.get<Course>(`/courses/${id}`),
    enabled: Boolean(id) && id !== 'new',
    retry: (count, err: unknown) => {
      const status = (err as { status?: number })?.status;
      if (status && status >= 400 && status < 500) return false;
      return count < 2;
    },
  });
}

export function useCompleteCourse(id: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<CourseCompleteResponse>(`/courses/${id}/complete`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: learnKeys.course(id ?? '') });
      qc.invalidateQueries({ queryKey: ['learn', 'courses'] });
      qc.invalidateQueries({ queryKey: ['learn', 'paths'] });
    },
  });
}

// ───────────────────────────── Paths ─────────────────────────────

export function usePaths(params: { mine?: boolean } = {}) {
  const p = clean({ mine: params.mine ? 1 : undefined });
  return useQuery({
    queryKey: learnKeys.paths(p),
    queryFn: () => api.get<LearningPath[]>('/paths', p),
  });
}

export function usePath(id: string | undefined) {
  return useQuery({
    queryKey: learnKeys.path(id ?? ''),
    queryFn: () => api.get<LearningPath>(`/paths/${id}`),
    enabled: Boolean(id) && id !== 'new',
    retry: (count, err: unknown) => {
      const status = (err as { status?: number })?.status;
      if (status && status >= 400 && status < 500) return false;
      return count < 2;
    },
  });
}

// ───────────────────────────── Decks ─────────────────────────────

export function useDecks(params: { mine?: boolean } = {}) {
  const p = clean({ mine: params.mine ? 1 : undefined });
  return useQuery({
    queryKey: learnKeys.decks(p),
    queryFn: () => api.get<Deck[]>('/decks', p),
  });
}

export function useDeck(id: string | undefined) {
  return useQuery({
    queryKey: learnKeys.deck(id ?? ''),
    queryFn: () => api.get<Deck>(`/decks/${id}`),
    enabled: Boolean(id) && id !== 'new',
    retry: (count, err: unknown) => {
      const status = (err as { status?: number })?.status;
      if (status && status >= 400 && status < 500) return false;
      return count < 2;
    },
  });
}

/** `GET /decks/:id/study` — accepts either a bare card array or `{cards, …}`. */
export function useStudySession(id: string | undefined) {
  return useQuery({
    queryKey: learnKeys.study(id ?? ''),
    queryFn: async (): Promise<StudySession> => {
      const raw = await api.get<StudySession | StudySession['cards']>(`/decks/${id}/study`);
      return Array.isArray(raw) ? { cards: raw } : { ...raw, cards: raw.cards ?? [] };
    },
    enabled: Boolean(id),
    staleTime: Infinity,
    gcTime: 0,
    refetchOnWindowFocus: false,
  });
}

export function useReviewCard() {
  return useMutation({
    mutationFn: ({ cardId, grade }: { cardId: string; grade: Grade }) =>
      api.post<CardReviewState>(`/flashcards/${cardId}/review`, { grade }),
  });
}

export function useInvalidateDecks() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['learn'], predicate: (q) => ['decks', 'deck'].includes(String(q.queryKey[1])) });
}

// ───────────────────────────── Bookmarks ─────────────────────────────

export function useBookmarks(enabled = true) {
  return useQuery({
    queryKey: learnKeys.bookmarks(),
    queryFn: () => api.get<Bookmark[]>('/bookmarks'),
    enabled,
    staleTime: 60_000,
  });
}

/** Fast membership test: `has('ARTICLE', id)`. */
export function useBookmarkSet() {
  const { data } = useBookmarks();
  return useMemo(() => {
    const set = new Set((data ?? []).map((b) => `${b.contentType}:${b.contentId}`));
    return { has: (type: ContentType, id: string) => set.has(`${type}:${id}`), size: set.size };
  }, [data]);
}

export function useToggleBookmark() {
  const qc = useQueryClient();
  const key = learnKeys.bookmarks();
  return useMutation({
    mutationFn: (v: { contentType: ContentType; contentId: string }) =>
      api.post<{ bookmarked: boolean }>('/bookmarks/toggle', v),
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Bookmark[]>(key);
      qc.setQueryData<Bookmark[]>(key, (old = []) => {
        const exists = old.some((b) => b.contentType === v.contentType && b.contentId === v.contentId);
        return exists
          ? old.filter((b) => !(b.contentType === v.contentType && b.contentId === v.contentId))
          : [...old, { contentType: v.contentType, contentId: v.contentId, createdAt: new Date().toISOString() }];
      });
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(key, ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

// ───────────────────────────── Search ─────────────────────────────

export function useSearch(q: string) {
  const term = q.trim();
  return useQuery({
    queryKey: learnKeys.search(term),
    queryFn: () => api.get<Partial<SearchResults>>('/search', { q: term }),
    enabled: term.length >= 2,
    placeholderData: keepPreviousData,
    select: (d): SearchResults => ({
      quizzes: d.quizzes ?? [],
      articles: d.articles ?? [],
      courses: d.courses ?? [],
      paths: d.paths ?? [],
      decks: d.decks ?? [],
    }),
  });
}

// ───────────────────────────── Comments ─────────────────────────────

export function useComments(targetType: string, targetId: string | undefined) {
  return useQuery({
    queryKey: learnKeys.comments(targetType, targetId ?? ''),
    queryFn: () => api.get<CommentNode[]>('/comments', { targetType, targetId: targetId! }),
    enabled: Boolean(targetId),
  });
}

export function usePostComment(targetType: string, targetId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { body: string; parentId?: string }) =>
      api.post<CommentNode>('/comments', { targetType, targetId, ...v }),
    onSettled: () => qc.invalidateQueries({ queryKey: learnKeys.comments(targetType, targetId ?? '') }),
  });
}

export function useDeleteComment(targetType: string, targetId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<unknown>(`/comments/${id}`),
    onSettled: () => qc.invalidateQueries({ queryKey: learnKeys.comments(targetType, targetId ?? '') }),
  });
}

// ───────────────────────────── Studio ─────────────────────────────

export function useQuizOptions(enabled = true) {
  return useQuery({
    queryKey: learnKeys.quizOptions(),
    queryFn: () => api.get<QuizLite[]>('/quizzes'),
    enabled,
    staleTime: 60_000,
  });
}

export function useGroupOptions(enabled = true) {
  return useQuery({
    queryKey: learnKeys.groups(),
    queryFn: () => api.get<GroupLite[]>('/groups'),
    enabled,
    staleTime: 60_000,
  });
}

export function useUpload() {
  return useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      return api.upload<{ url: string }>('/uploads', fd);
    },
  });
}

export function useSetVisibility() {
  return useMutation({
    mutationFn: (v: { type: ContentType; id: string; visibility: Visibility; passcode?: string | null; groupIds?: string[] }) =>
      api.patch<unknown>(`/content/${v.type}/${v.id}/visibility`, {
        visibility: v.visibility,
        passcode: v.passcode ?? undefined,
        groupIds: v.groupIds,
      }),
  });
}

function useSaveEntity<TInput, TOut extends { id: string }>(base: string, listKey: string, detailKey: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id?: string; body: TInput }) =>
      id ? api.patch<TOut>(`${base}/${id}`, body) : api.post<TOut>(base, body),
    onSuccess: (saved) => {
      qc.invalidateQueries({ queryKey: ['learn', listKey] });
      qc.invalidateQueries({ queryKey: ['learn', detailKey] });
      return saved;
    },
  });
}

function useDeleteEntity(base: string, listKey: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<unknown>(`${base}/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['learn', listKey] }),
  });
}

export const useSaveArticle = () => useSaveEntity<ArticleInput, Article>('/articles', 'articles', 'article');
export const useDeleteArticle = () => useDeleteEntity('/articles', 'articles');
export const useSaveCourse = () => useSaveEntity<CourseInput, Course>('/courses', 'courses', 'course');
export const useDeleteCourse = () => useDeleteEntity('/courses', 'courses');
export const useSavePath = () => useSaveEntity<PathInput, LearningPath>('/paths', 'paths', 'path');
export const useDeletePath = () => useDeleteEntity('/paths', 'paths');
export const useSaveDeck = () => useSaveEntity<DeckInput, Deck>('/decks', 'decks', 'deck');
export const useDeleteDeck = () => useDeleteEntity('/decks', 'decks');
