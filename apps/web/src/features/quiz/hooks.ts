'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { normalizeAttempt, normalizeAttemptBundle, normalizeQuestion } from './lib/utils';
import type {
  AnswerMap,
  AnswerValue,
  Attempt,
  AttemptBundle,
  AttemptMode,
  BankDraft,
  BankListParams,
  BankQuestion,
  BookmarkItem,
  CheckResult,
  CommentItem,
  GroupLite,
  QuizDetail,
  QuizListItem,
  QuizListParams,
  QuizPayload,
  SubmitResult,
  Visibility,
  WeakTopic,
} from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */

/* ------------------------------------------------------------------ */
/* Keys                                                                */
/* ------------------------------------------------------------------ */

export const quizKeys = {
  all: ['quizzes'] as const,
  list: (p: QuizListParams = {}) => ['quizzes', 'list', p] as const,
  categories: () => ['quizzes', 'categories'] as const,
  detail: (id: string) => ['quizzes', 'detail', id] as const,
  attempts: (p: Record<string, unknown>) => ['attempts', 'list', p] as const,
  attempt: (id: string) => ['attempts', 'detail', id] as const,
  pending: () => ['attempts', 'pending-review'] as const,
  weakTopics: () => ['practice', 'weak-topics'] as const,
  bank: (p: BankListParams = {}) => ['bank', 'list', p] as const,
  bankTags: () => ['bank', 'tags'] as const,
  bookmarks: () => ['bookmarks'] as const,
  comments: (type: string, id: string) => ['comments', type, id] as const,
  groups: () => ['groups'] as const,
};

function cleanParams(p: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(p)) {
    if (v === undefined || v === null || v === '' || v === false) continue;
    out[k] = v === true ? '1' : String(v);
  }
  return out;
}

function normalizeQuizDetail(raw: any): QuizDetail {
  const questions = Array.isArray(raw?.questions) ? raw.questions.map(normalizeQuestion) : [];
  questions.sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
  return { ...raw, tags: raw?.tags ?? [], questions };
}

function normalizeBank(raw: any): BankQuestion {
  const q = normalizeQuestion(raw);
  return {
    ...raw,
    ...q,
    correct: q.correct ?? null,
    difficulty: typeof raw?.difficulty === 'number' ? raw.difficulty : 2,
  } as BankQuestion;
}

/* ------------------------------------------------------------------ */
/* Discovery                                                           */
/* ------------------------------------------------------------------ */

export function useQuizzes(params: QuizListParams = {}, opts: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: quizKeys.list(params),
    queryFn: async () => {
      const data = await api.get<QuizListItem[]>('/quizzes', cleanParams({ ...params }));
      return (Array.isArray(data) ? data : []).map((q) => ({ ...q, tags: q.tags ?? [] }));
    },
    placeholderData: keepPreviousData,
    enabled: opts.enabled ?? true,
  });
}

export function useQuizCategories() {
  return useQuery({
    queryKey: quizKeys.categories(),
    queryFn: () => api.get<string[]>('/quizzes/categories'),
    staleTime: 5 * 60_000,
  });
}

export function useQuiz(id: string | undefined, opts: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: quizKeys.detail(id ?? ''),
    queryFn: async () => normalizeQuizDetail(await api.get<any>(`/quizzes/${id}`)),
    enabled: Boolean(id) && (opts.enabled ?? true),
  });
}

export function useAttempts(params: { mine?: boolean; quizId?: string; userId?: string }, enabled = true) {
  return useQuery({
    queryKey: quizKeys.attempts(params),
    queryFn: async () => {
      const data = await api.get<any[]>('/attempts', cleanParams(params));
      return (Array.isArray(data) ? data : []).map(normalizeAttempt);
    },
    enabled,
  });
}

/* ------------------------------------------------------------------ */
/* Bookmarks                                                           */
/* ------------------------------------------------------------------ */

export function useBookmarks(enabled = true) {
  return useQuery({
    queryKey: quizKeys.bookmarks(),
    queryFn: () => api.get<BookmarkItem[]>('/bookmarks'),
    enabled,
    staleTime: 60_000,
  });
}

export function useBookmarkedQuizIds(enabled = true) {
  const { data } = useBookmarks(enabled);
  const set = new Set<string>();
  for (const b of data ?? []) {
    if (String(b.contentType).toUpperCase() === 'QUIZ') set.add(b.contentId);
  }
  return set;
}

export function useToggleBookmark() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (contentId: string) =>
      api.post<{ bookmarked: boolean }>('/bookmarks/toggle', { contentType: 'QUIZ', contentId }),
    onMutate: async (contentId) => {
      await qc.cancelQueries({ queryKey: quizKeys.bookmarks() });
      const prev = qc.getQueryData<BookmarkItem[]>(quizKeys.bookmarks());
      if (prev) {
        const exists = prev.some((b) => b.contentId === contentId && String(b.contentType).toUpperCase() === 'QUIZ');
        qc.setQueryData<BookmarkItem[]>(
          quizKeys.bookmarks(),
          exists
            ? prev.filter((b) => !(b.contentId === contentId && String(b.contentType).toUpperCase() === 'QUIZ'))
            : [...prev, { contentType: 'QUIZ', contentId }],
        );
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(quizKeys.bookmarks(), ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: quizKeys.bookmarks() }),
  });
}

/* ------------------------------------------------------------------ */
/* Attempts                                                            */
/* ------------------------------------------------------------------ */

export function useStartAttempt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { quizId: string; mode: AttemptMode; passcode?: string }) => {
      const body: Record<string, unknown> = { mode: vars.mode };
      if (vars.passcode) body.passcode = vars.passcode;
      const raw = await api.post<any>(`/quizzes/${vars.quizId}/attempts`, body);
      return normalizeAttemptBundle(raw);
    },
    onSuccess: (bundle) => {
      qc.setQueryData(quizKeys.attempt(bundle.attempt.id), bundle);
      qc.invalidateQueries({ queryKey: ['attempts', 'list'] });
    },
  });
}

export function useSmartPractice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { tags?: string[]; count?: number }) => {
      const raw = await api.post<any>('/practice/smart', vars);
      return normalizeAttemptBundle(raw);
    },
    onSuccess: (bundle) => {
      qc.setQueryData(quizKeys.attempt(bundle.attempt.id), bundle);
    },
  });
}

export function useAttempt(id: string | undefined, opts: { refetchOnWindowFocus?: boolean } = {}) {
  return useQuery<AttemptBundle>({
    queryKey: quizKeys.attempt(id ?? ''),
    queryFn: async () => normalizeAttemptBundle(await api.get<any>(`/attempts/${id}`)),
    enabled: Boolean(id),
    refetchOnWindowFocus: opts.refetchOnWindowFocus ?? false,
  });
}

export function useSaveAnswers(id: string) {
  return useMutation({
    mutationFn: (answers: AnswerMap) => api.patch<unknown>(`/attempts/${id}/answers`, { answers }),
  });
}

export function useCheckAnswer(id: string) {
  return useMutation({
    mutationFn: (vars: { questionId: string; answer: AnswerValue }) =>
      api.post<CheckResult>(`/attempts/${id}/check`, vars),
  });
}

const SUBMIT_STASH = 'ev:quiz:submit:';

/** Rewards (XP/achievements) only come back from submit; keep them for the result screen. */
export function stashSubmitResult(id: string, res: SubmitResult) {
  try {
    sessionStorage.setItem(
      SUBMIT_STASH + id,
      JSON.stringify({
        xpGained: res.xpGained ?? 0,
        newAchievements: res.newAchievements ?? [],
        levelUp: Boolean(res.levelUp),
        at: Date.now(),
      }),
    );
  } catch {
    /* storage unavailable */
  }
}

export function readSubmitStash(
  id: string,
): { xpGained: number; newAchievements: SubmitResult['newAchievements']; levelUp: boolean; at: number } | null {
  try {
    const raw = sessionStorage.getItem(SUBMIT_STASH + id);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function useSubmitAttempt(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { answers: AnswerMap; timeSpentSec: number }) => {
      const raw = await api.post<any>(`/attempts/${id}/submit`, vars);
      const base = raw?.attempt ? { ...raw.attempt, ...raw } : raw;
      const attempt = normalizeAttempt(base);
      return {
        ...attempt,
        xpGained: raw?.xpGained ?? base?.xpGained ?? 0,
        newAchievements: raw?.newAchievements ?? base?.newAchievements ?? [],
        levelUp: Boolean(raw?.levelUp ?? base?.levelUp),
      } as SubmitResult;
    },
    onSuccess: (res) => {
      stashSubmitResult(id, res);
      qc.invalidateQueries({ queryKey: quizKeys.attempt(id) });
      qc.invalidateQueries({ queryKey: ['attempts', 'list'] });
      qc.invalidateQueries({ queryKey: quizKeys.all });
      qc.invalidateQueries({ queryKey: quizKeys.weakTopics() });
      qc.invalidateQueries({ queryKey: ['me'] });
      qc.invalidateQueries({ queryKey: ['auth'] });
    },
  });
}

/* ------------------------------------------------------------------ */
/* Practice                                                            */
/* ------------------------------------------------------------------ */

export function useWeakTopics() {
  return useQuery({
    queryKey: quizKeys.weakTopics(),
    queryFn: async () => {
      const data = await api.get<WeakTopic[]>('/practice/weak-topics');
      return (Array.isArray(data) ? data : []).map((t) => ({
        ...t,
        // tolerate 0-1 or 0-100 accuracy
        accuracy: t.accuracy <= 1 && t.accuracy >= 0 ? t.accuracy * 100 : t.accuracy,
      }));
    },
  });
}

/* ------------------------------------------------------------------ */
/* Comments (attempt discussion)                                       */
/* ------------------------------------------------------------------ */

export function useComments(targetType: string, targetId: string | undefined) {
  return useQuery({
    queryKey: quizKeys.comments(targetType, targetId ?? ''),
    queryFn: () => api.get<CommentItem[]>('/comments', { targetType, targetId: targetId ?? '' }),
    enabled: Boolean(targetId),
  });
}

export function usePostComment(targetType: string, targetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { body: string; parentId?: string }) =>
      api.post<CommentItem>('/comments', { targetType, targetId, ...vars }),
    onSuccess: () => qc.invalidateQueries({ queryKey: quizKeys.comments(targetType, targetId) }),
  });
}

export function useDeleteComment(targetType: string, targetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<unknown>(`/comments/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: quizKeys.comments(targetType, targetId) }),
  });
}

/* ------------------------------------------------------------------ */
/* Studio — quizzes                                                    */
/* ------------------------------------------------------------------ */

export function useCreateQuiz() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: QuizPayload) => normalizeQuizDetail(await api.post<any>('/quizzes', payload)),
    onSuccess: (quiz) => {
      qc.setQueryData(quizKeys.detail(quiz.id), quiz);
      qc.invalidateQueries({ queryKey: ['quizzes', 'list'] });
      qc.invalidateQueries({ queryKey: quizKeys.categories() });
    },
  });
}

export function useUpdateQuiz() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<QuizPayload> }) =>
      normalizeQuizDetail(await api.patch<any>(`/quizzes/${id}`, data)),
    onSuccess: (quiz, vars) => {
      if (quiz?.id && Array.isArray(quiz.questions) && vars.data.questions) {
        qc.setQueryData(quizKeys.detail(quiz.id), quiz);
      } else {
        qc.invalidateQueries({ queryKey: quizKeys.detail(vars.id) });
      }
      qc.invalidateQueries({ queryKey: ['quizzes', 'list'] });
      qc.invalidateQueries({ queryKey: quizKeys.categories() });
    },
  });
}

export function useDeleteQuiz() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<unknown>(`/quizzes/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quizzes', 'list'] }),
  });
}

export function useCloneQuiz() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<QuizDetail>(`/quizzes/${id}/clone`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quizzes', 'list'] }),
  });
}

export function useImportQuizCsv() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const fd = new FormData();
      fd.append('file', file);
      return api.upload<any>(`/quizzes/${id}/import`, fd);
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: quizKeys.detail(vars.id) });
      qc.invalidateQueries({ queryKey: ['quizzes', 'list'] });
    },
  });
}

export function useSetVisibility() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; visibility: Visibility; passcode?: string | null; groupIds?: string[] }) =>
      api.patch<unknown>(`/content/QUIZ/${vars.id}/visibility`, {
        visibility: vars.visibility,
        passcode: vars.visibility === 'PASSCODE' ? vars.passcode ?? undefined : undefined,
        groupIds: vars.visibility === 'GROUPS' ? vars.groupIds ?? [] : undefined,
      }),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['quizzes', 'list'] });
      qc.invalidateQueries({ queryKey: quizKeys.detail(vars.id) });
    },
  });
}

export function useGroups(enabled = true) {
  return useQuery({
    queryKey: quizKeys.groups(),
    queryFn: () => api.get<GroupLite[]>('/groups'),
    enabled,
    staleTime: 60_000,
  });
}

export function useUpload() {
  return useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      return api.upload<{ url: string }>('/uploads', fd);
    },
  });
}

/* ------------------------------------------------------------------ */
/* Studio — bank                                                       */
/* ------------------------------------------------------------------ */

export function useBank(params: BankListParams = {}, enabled = true) {
  return useQuery({
    queryKey: quizKeys.bank(params),
    queryFn: async () => {
      const data = await api.get<any[]>('/bank', cleanParams({ ...params }));
      return (Array.isArray(data) ? data : []).map(normalizeBank);
    },
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useBankTags(enabled = true) {
  return useQuery({
    queryKey: quizKeys.bankTags(),
    queryFn: () => api.get<string[]>('/bank/tags'),
    enabled,
    staleTime: 60_000,
  });
}

export function useSaveBankQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (draft: BankDraft) => {
      const { id, ...body } = draft;
      const raw = id ? await api.patch<any>(`/bank/${id}`, body) : await api.post<any>('/bank', body);
      return normalizeBank(raw);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bank'] });
    },
  });
}

export function useDeleteBankQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<unknown>(`/bank/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bank'] }),
  });
}

export function useImportBankCsv() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      return api.upload<any>('/bank/import', fd);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bank'] }),
  });
}

export function useBankToQuiz() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { questionIds: string[]; quizId: string }) => api.post<unknown>('/bank/to-quiz', vars),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: quizKeys.detail(vars.quizId) });
      qc.invalidateQueries({ queryKey: ['quizzes', 'list'] });
    },
  });
}

export function useAiGenerate() {
  return useMutation({
    mutationFn: async (vars: { topic: string; count: number; type?: string; level?: string }) => {
      const raw = await api.post<any>('/ai/generate-questions', vars);
      const list: any[] = Array.isArray(raw) ? raw : Array.isArray(raw?.questions) ? raw.questions : [];
      return list.map((q, i) => normalizeBank({ id: q.id ?? `ai-${Date.now()}-${i}`, ...q }));
    },
  });
}

/* ------------------------------------------------------------------ */
/* Studio — manual review                                              */
/* ------------------------------------------------------------------ */

export function usePendingReviews() {
  return useQuery({
    queryKey: quizKeys.pending(),
    queryFn: async () => {
      const data = await api.get<any[]>('/attempts/pending-review');
      return (Array.isArray(data) ? data : []).map((a) => ({
        ...normalizeAttempt(a),
        quiz: a.quiz,
        user: a.user,
        openCount: a.openCount ?? a.pendingCount ?? undefined,
      })) as (Attempt & { openCount?: number })[];
    },
  });
}

export function useGradeAttempt(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { points: Record<string, number>; feedback?: string }) =>
      api.post<any>(`/attempts/${id}/grade`, vars),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: quizKeys.pending() });
      qc.invalidateQueries({ queryKey: quizKeys.attempt(id) });
    },
  });
}
