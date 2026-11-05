'use client';

import { keepPreviousData, useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ContentType, Role, Visibility } from '@/lib/types';
import type { Assignment, Group } from '@/features/community/types';
import { asList } from '@/features/community/lib/normalize';
import type {
  AdminAchievement,
  AdminAttempt,
  AdminQuest,
  AdminUser,
  GroupStatsData,
  PermissionRow,
  PickableContent,
  QuizStatsData,
  StatsOverviewData,
} from './types';

export const ak = {
  overview: ['admin', 'overview'] as const,
  users: (q: string, role: string) => ['admin', 'users', q, role] as const,
  attempts: (quizId?: string, userId?: string) => ['admin', 'attempts', quizId ?? '', userId ?? ''] as const,
  quizStats: (id: string) => ['admin', 'quiz-stats', id] as const,
  groupStats: (id: string) => ['admin', 'group-stats', id] as const,
  groups: ['admin', 'groups'] as const,
  group: (id: string) => ['admin', 'group', id] as const,
  groupAssignments: (id: string) => ['admin', 'group-assignments', id] as const,
  quests: ['admin', 'quests'] as const,
  achievements: ['admin', 'achievements'] as const,
  permissions: ['admin', 'permissions'] as const,
  content: (type: ContentType) => ['admin', 'content', type] as const,
};

/* ─────────── stats ─────────── */

export function useStatsOverview() {
  return useQuery({ queryKey: ak.overview, queryFn: () => api.get<StatsOverviewData>('/stats/overview') });
}

export function useQuizStats(id: string) {
  return useQuery({ queryKey: ak.quizStats(id), queryFn: () => api.get<QuizStatsData>(`/stats/quizzes/${id}`), enabled: !!id });
}

export function useGroupStats(id: string) {
  return useQuery({ queryKey: ak.groupStats(id), queryFn: () => api.get<GroupStatsData>(`/stats/groups/${id}`), enabled: !!id, retry: false });
}

export function useAttempts(params: { quizId?: string; userId?: string }) {
  return useQuery({
    queryKey: ak.attempts(params.quizId, params.userId),
    queryFn: async () => asList<AdminAttempt>(await api.get<unknown>('/attempts', { quizId: params.quizId, userId: params.userId })),
    placeholderData: keepPreviousData,
  });
}

/* ─────────── users ─────────── */

export function useUsers(q = '', role = '') {
  return useQuery({
    queryKey: ak.users(q, role),
    queryFn: async () => asList<AdminUser>(await api.get<unknown>('/users', { q: q || undefined, role: role || undefined })),
    placeholderData: keepPreviousData,
  });
}

export function useChangeRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: Role }) => api.patch<AdminUser>(`/users/${id}/role`, { role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<unknown>(`/users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

/* ─────────── groups ─────────── */

export function useAllGroups() {
  return useQuery({ queryKey: ak.groups, queryFn: async () => asList<Group>(await api.get<unknown>('/groups')) });
}

export function useAdminGroup(id: string) {
  return useQuery({ queryKey: ak.group(id), queryFn: () => api.get<Group>(`/groups/${id}`), enabled: !!id && id !== 'new' });
}

function useGroupInvalidate() {
  const qc = useQueryClient();
  return (id?: string) => {
    qc.invalidateQueries({ queryKey: ak.groups });
    qc.invalidateQueries({ queryKey: ['community', 'groups'] });
    if (id) {
      qc.invalidateQueries({ queryKey: ak.group(id) });
      qc.invalidateQueries({ queryKey: ak.groupStats(id) });
      qc.invalidateQueries({ queryKey: ak.groupAssignments(id) });
      qc.invalidateQueries({ queryKey: ['community', 'group', id] });
    }
  };
}

export type GroupInput = { name: string; description?: string | null; color?: string | null };

export function useCreateGroup() {
  const inv = useGroupInvalidate();
  return useMutation({ mutationFn: (body: GroupInput) => api.post<Group>('/groups', body), onSuccess: () => inv() });
}

export function useUpdateGroup(id: string) {
  const inv = useGroupInvalidate();
  return useMutation({ mutationFn: (body: Partial<GroupInput>) => api.patch<Group>(`/groups/${id}`, body), onSuccess: () => inv(id) });
}

export function useDeleteGroup() {
  const inv = useGroupInvalidate();
  return useMutation({ mutationFn: (id: string) => api.del<unknown>(`/groups/${id}`), onSuccess: () => inv() });
}

export function useAddMembers(id: string) {
  const inv = useGroupInvalidate();
  return useMutation({ mutationFn: (userIds: string[]) => api.post<unknown>(`/groups/${id}/members`, { userIds }), onSuccess: () => inv(id) });
}

export function useRemoveMember(id: string) {
  const inv = useGroupInvalidate();
  return useMutation({ mutationFn: (userId: string) => api.del<unknown>(`/groups/${id}/members/${userId}`), onSuccess: () => inv(id) });
}

/* ─────────── assignments ─────────── */

export function useGroupAssignments(groupId: string) {
  return useQuery({
    queryKey: ak.groupAssignments(groupId),
    queryFn: async () => asList<Assignment>(await api.get<unknown>('/assignments', { groupId })),
    enabled: !!groupId && groupId !== 'new',
  });
}

export function useCreateAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { contentType: ContentType; contentId: string; groupIds?: string[]; userIds?: string[]; dueAt?: string | null }) =>
      api.post<unknown>('/assignments', body),
    onSuccess: (_d, v) => {
      v.groupIds?.forEach((g) => {
        qc.invalidateQueries({ queryKey: ak.groupAssignments(g) });
        qc.invalidateQueries({ queryKey: ak.group(g) });
      });
      qc.invalidateQueries({ queryKey: ['community', 'assignments'] });
    },
  });
}

export function useDeleteAssignment(groupId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<unknown>(`/assignments/${id}`),
    onSuccess: () => {
      if (groupId) {
        qc.invalidateQueries({ queryKey: ak.groupAssignments(groupId) });
        qc.invalidateQueries({ queryKey: ak.group(groupId) });
      }
    },
  });
}

/* ─────────── content pickers ─────────── */

const CONTENT_PATH: Record<ContentType, string> = {
  QUIZ: '/quizzes',
  ARTICLE: '/articles',
  COURSE: '/courses',
  PATH: '/paths',
  DECK: '/decks',
};

export function useContentOptions(type: ContentType, enabled = true) {
  return useQuery({
    queryKey: ak.content(type),
    queryFn: async () =>
      asList<{ id: string; title: string; status?: string; slug?: string }>(await api.get<unknown>(CONTENT_PATH[type])).map(
        (c): PickableContent => ({ id: c.id, title: c.title, status: c.status, slug: c.slug, type }),
      ),
    enabled,
    staleTime: 60_000,
  });
}

export function useQuizOptions() {
  return useContentOptions('QUIZ');
}

/* ─────────── quests & achievements ─────────── */

export function useAdminQuests() {
  return useQuery({ queryKey: ak.quests, queryFn: async () => asList<AdminQuest>(await api.get<unknown>('/admin/quests')) });
}

export type QuestInput = Omit<AdminQuest, 'id' | 'createdAt'>;

export function useSaveQuest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<QuestInput> & { id?: string }) =>
      id ? api.patch<AdminQuest>(`/admin/quests/${id}`, body) : api.post<AdminQuest>('/admin/quests', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ak.quests });
      qc.invalidateQueries({ queryKey: ['community', 'quests'] });
    },
  });
}

export function useDeleteQuest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<unknown>(`/admin/quests/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ak.quests }),
  });
}

export function useAdminAchievements() {
  return useQuery({ queryKey: ak.achievements, queryFn: async () => asList<AdminAchievement>(await api.get<unknown>('/admin/achievements')) });
}

export type AchievementInput = Omit<AdminAchievement, 'id' | 'createdAt' | '_count' | 'unlockedCount'>;

export function useSaveAchievement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<AchievementInput> & { id?: string }) =>
      id ? api.patch<AdminAchievement>(`/admin/achievements/${id}`, body) : api.post<AdminAchievement>('/admin/achievements', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ak.achievements });
      qc.invalidateQueries({ queryKey: ['community', 'achievements'] });
    },
  });
}

export function useDeleteAchievement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<unknown>(`/admin/achievements/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ak.achievements }),
  });
}

/* ─────────── permissions ─────────── */

export function usePermissions() {
  return useQuery({
    queryKey: ak.permissions,
    queryFn: async () =>
      asList<PermissionRow & { contentType?: ContentType }>(await api.get<unknown>('/content/permissions')).map((r) => ({
        ...r,
        type: (r.type ?? r.contentType ?? 'QUIZ') as ContentType,
        groupIds: r.groupIds ?? r.groups?.map((g) => g.id) ?? [],
        groups: r.groups ?? [],
      })),
  });
}

export function useSetVisibility() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ type, id, ...body }: { type: ContentType; id: string; visibility: Visibility; passcode?: string; groupIds?: string[] }) =>
      api.patch<PermissionRow>(`/content/${type.toLowerCase()}/${id}/visibility`, body),
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: ak.permissions });
      const prev = qc.getQueryData<PermissionRow[]>(ak.permissions);
      qc.setQueryData<PermissionRow[]>(ak.permissions, (old) =>
        old?.map((r) => (r.id === v.id && r.type === v.type ? { ...r, visibility: v.visibility, passcode: v.passcode ?? r.passcode, groupIds: v.groupIds ?? r.groupIds } : r)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(ak.permissions, ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ak.permissions }),
  });
}

/** Fetch several quiz stats in parallel (used by analytics list sparklines). */
export function useManyQuizStats(ids: string[]) {
  return useQueries({
    queries: ids.map((id) => ({ queryKey: ak.quizStats(id), queryFn: () => api.get<QuizStatsData>(`/stats/quizzes/${id}`), staleTime: 60_000 })),
  });
}
