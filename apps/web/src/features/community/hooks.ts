'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  Achievement,
  ArticleLite,
  Assignment,
  CommentNode,
  CommentTarget,
  ContentLite,
  CourseLite,
  Group,
  LeaderboardEntry,
  LeaderboardPeriod,
  MeSummary,
  NotificationItem,
  PublicProfile,
  QuestView,
  QuizLite,
  UserLite,
} from './types';
import { asList, normalizeQuest } from './lib/normalize';

export const ck = {
  summary: ['community', 'summary'] as const,
  quests: ['community', 'quests'] as const,
  achievements: ['community', 'achievements'] as const,
  leaderboard: (period: LeaderboardPeriod, groupId?: string | null) => ['community', 'leaderboard', period, groupId ?? 'all'] as const,
  assignments: ['community', 'assignments', 'mine'] as const,
  groups: ['community', 'groups'] as const,
  group: (id: string) => ['community', 'group', id] as const,
  notifications: ['community', 'notifications'] as const,
  comments: (t: CommentTarget, id: string) => ['community', 'comments', t, id] as const,
  profile: (id: string) => ['community', 'profile', id] as const,
  courses: ['community', 'courses'] as const,
  articles: ['community', 'articles'] as const,
};

/* ─────────── me / summary ─────────── */

export function useMeSummary() {
  return useQuery({
    queryKey: ck.summary,
    queryFn: () => api.get<MeSummary>('/me/summary'),
  });
}

/* ─────────── quests & achievements ─────────── */

export function useQuests() {
  return useQuery({
    queryKey: ck.quests,
    queryFn: async () => asList<unknown>(await api.get<unknown>('/quests')).map(normalizeQuest).filter(Boolean) as QuestView[],
  });
}

export function useClaimQuest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<unknown>(`/quests/${id}/claim`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ck.quests });
      qc.invalidateQueries({ queryKey: ck.summary });
      qc.invalidateQueries({ queryKey: ['auth'] });
      qc.invalidateQueries({ queryKey: ['me'] });
    },
  });
}

export function useAchievements() {
  return useQuery({
    queryKey: ck.achievements,
    queryFn: async () => asList<Achievement>(await api.get<unknown>('/achievements')),
  });
}

/* ─────────── leaderboard ─────────── */

export function useLeaderboard(period: LeaderboardPeriod, groupId?: string | null) {
  return useQuery({
    queryKey: ck.leaderboard(period, groupId),
    queryFn: async () =>
      asList<LeaderboardEntry>(
        await api.get<unknown>('/leaderboard', groupId ? { period, groupId } : { period }),
      ),
    placeholderData: (prev) => prev,
  });
}

/* ─────────── assignments & groups ─────────── */

export function useMyAssignments() {
  return useQuery({
    queryKey: ck.assignments,
    queryFn: async () => asList<Assignment>(await api.get<unknown>('/assignments/mine')),
  });
}

export function useMyGroups(enabled = true) {
  return useQuery({
    queryKey: ck.groups,
    queryFn: async () => asList<Group>(await api.get<unknown>('/groups')),
    enabled,
  });
}

export function useGroup(id: string) {
  return useQuery({
    queryKey: ck.group(id),
    queryFn: () => api.get<Group>(`/groups/${id}`),
    enabled: !!id,
  });
}

/* ─────────── notifications ─────────── */

export function useNotifications() {
  return useQuery({
    queryKey: ck.notifications,
    queryFn: async () => asList<NotificationItem>(await api.get<unknown>('/notifications')),
  });
}

function useNotifInvalidate() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ck.notifications });
    qc.invalidateQueries({ queryKey: ['notifications'] });
  };
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  const invalidate = useNotifInvalidate();
  return useMutation({
    mutationFn: (id: string) => api.patch<unknown>(`/notifications/${id}/read`),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ck.notifications });
      const prev = qc.getQueryData<NotificationItem[]>(ck.notifications);
      qc.setQueryData<NotificationItem[]>(ck.notifications, (old) =>
        old?.map((n) => (n.id === id ? { ...n, readAt: n.readAt ?? new Date().toISOString() } : n)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(ck.notifications, ctx.prev),
    onSettled: invalidate,
  });
}

export function useReadAllNotifications() {
  const qc = useQueryClient();
  const invalidate = useNotifInvalidate();
  return useMutation({
    mutationFn: () => api.post<unknown>('/notifications/read-all'),
    onMutate: () => {
      const now = new Date().toISOString();
      qc.setQueryData<NotificationItem[]>(ck.notifications, (old) => old?.map((n) => ({ ...n, readAt: n.readAt ?? now })));
    },
    onSettled: invalidate,
  });
}

export function useClearNotifications() {
  const qc = useQueryClient();
  const invalidate = useNotifInvalidate();
  return useMutation({
    mutationFn: () => api.del<unknown>('/notifications'),
    onSuccess: () => qc.setQueryData<NotificationItem[]>(ck.notifications, []),
    onSettled: invalidate,
  });
}

/* ─────────── comments ─────────── */

export function useComments(targetType: CommentTarget, targetId: string) {
  return useQuery({
    queryKey: ck.comments(targetType, targetId),
    queryFn: async () => asList<CommentNode>(await api.get<unknown>('/comments', { targetType, targetId })),
    enabled: !!targetId,
  });
}

export function usePostComment(targetType: CommentTarget, targetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { body: string; parentId?: string | null }) =>
      api.post<CommentNode>('/comments', { targetType, targetId, body: v.body, ...(v.parentId ? { parentId: v.parentId } : {}) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ck.comments(targetType, targetId) }),
  });
}

export function useDeleteComment(targetType: CommentTarget, targetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<unknown>(`/comments/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ck.comments(targetType, targetId) }),
  });
}

/* ─────────── profile ─────────── */

export function usePublicProfile(id: string) {
  return useQuery({
    queryKey: ck.profile(id),
    queryFn: async () => normalizeProfile(await api.get<unknown>(`/users/${id}`)),
    enabled: !!id,
  });
}

function normalizeProfile(raw: unknown): PublicProfile {
  const r = (raw ?? {}) as Record<string, unknown>;
  const user = (r.user ?? r) as UserLite;
  const achievementsRaw = (r.achievements ?? (user as unknown as Record<string, unknown>).achievements ?? []) as unknown[];
  const achievements = achievementsRaw.map((a) => {
    const o = a as Record<string, unknown>;
    // UserAchievement {achievement, unlockedAt} or Achievement {..., unlockedAt}
    if (o && typeof o === 'object' && o.achievement) return { ...(o.achievement as Achievement), unlockedAt: (o.unlockedAt as string) ?? null };
    return o as unknown as Achievement;
  });
  const stats = (r.stats ?? {}) as PublicProfile['stats'];
  return { user, achievements, stats };
}

export function useUpdateMe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name?: string; bio?: string | null; avatarUrl?: string | null }) => api.patch<UserLite>('/me', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['auth'] });
      qc.invalidateQueries({ queryKey: ['me'] });
      qc.invalidateQueries({ queryKey: ['community'] });
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (body: { current: string; next: string }) => api.patch<unknown>('/me/password', body),
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

/* ─────────── learning content (read-only, for dashboard + studio) ─────────── */

export function useCoursesLite(enabled = true) {
  return useQuery({
    queryKey: ck.courses,
    queryFn: async () => asList<CourseLite>(await api.get<unknown>('/courses')),
    enabled,
  });
}

export function useArticlesLite(enabled = true) {
  return useQuery({
    queryKey: ck.articles,
    queryFn: async () => asList<ArticleLite>(await api.get<unknown>('/articles')),
    enabled,
  });
}

export function useMyQuizzes(enabled = true) {
  return useQuery({
    queryKey: ['community', 'quizzes', 'mine'],
    queryFn: async () => asList<QuizLite>(await api.get<unknown>('/quizzes', { mine: 1 })),
    enabled,
  });
}

export function useContentList(path: '/decks' | '/paths' | '/courses' | '/articles', enabled = true) {
  return useQuery({
    queryKey: ['community', 'content', path],
    queryFn: async () => asList<ContentLite>(await api.get<unknown>(path)),
    enabled,
  });
}

export function usePendingReviews(enabled = true) {
  return useQuery({
    queryKey: ['community', 'pending-review'],
    queryFn: async () => asList<{ id: string; quiz?: { id: string; title: string }; user?: { id: string; name: string }; submittedAt?: string }>(
      await api.get<unknown>('/attempts/pending-review'),
    ),
    enabled,
  });
}
