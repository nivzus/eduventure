'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, type ReactNode } from 'react';
import { api, ApiError } from './api';
import type { Role, User } from './types';

export const AUTH_QUERY_KEY = ['auth', 'me'] as const;

async function fetchMe(): Promise<User | null> {
  try {
    return await api.get<User>('/auth/me');
  } catch (e) {
    if (e instanceof ApiError && (e.status === 401 || e.status === 403)) return null;
    throw e;
  }
}

/**
 * const { user, isLoading, login, register, logout, refetch } = useAuth();
 * login/register throw ApiError on failure (show `errorMessage(e)`).
 */
export function useAuth() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: fetchMe,
    staleTime: 5 * 60_000,
    retry: 1,
  });

  const login = useCallback(
    async (email: string, password: string) => {
      const user = await api.post<User>('/auth/login', { email, password });
      qc.setQueryData(AUTH_QUERY_KEY, user);
      return user;
    },
    [qc],
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const user = await api.post<User>('/auth/register', { name, email, password });
      qc.setQueryData(AUTH_QUERY_KEY, user);
      return user;
    },
    [qc],
  );

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      /* ignore */
    }
    qc.setQueryData(AUTH_QUERY_KEY, null);
    qc.removeQueries({ predicate: (q) => q.queryKey[0] !== 'auth' });
  }, [qc]);

  const refetch = useCallback(async () => {
    const r = await query.refetch();
    return r.data ?? null;
  }, [query]);

  return {
    user: query.data ?? null,
    isLoading: query.isLoading,
    isAuthenticated: !!query.data,
    error: query.error,
    login,
    register,
    logout,
    refetch,
  };
}

export function hasRole(user: Pick<User, 'role'> | null | undefined, roles: Role[]) {
  return !!user && roles.includes(user.role);
}
export const isStaff = (user: Pick<User, 'role'> | null | undefined) => hasRole(user, ['TEACHER', 'ADMIN']);
export const isAdmin = (user: Pick<User, 'role'> | null | undefined) => hasRole(user, ['ADMIN']);

/**
 * Redirects to /login?next=… when signed out. Used by (app)/(focus) layouts.
 * `fallback` renders while auth resolves.
 */
export function AuthGuard({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !user) {
      const next = pathname && pathname !== '/' ? `?next=${encodeURIComponent(pathname)}` : '';
      router.replace(`/login${next}`);
    }
  }, [isLoading, user, router, pathname]);

  if (isLoading || !user) return <>{fallback}</>;
  return <>{children}</>;
}

/**
 * <RequireRole roles={['ADMIN']}>…</RequireRole>
 * Renders children only when the signed-in user has one of `roles`.
 * Otherwise renders `fallback` (default: a "no access" panel). Set `redirectTo` to redirect instead.
 */
export function RequireRole({
  roles,
  children,
  fallback,
  redirectTo,
}: {
  roles: Role[];
  children: ReactNode;
  fallback?: ReactNode;
  redirectTo?: string;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const allowed = hasRole(user, roles);

  useEffect(() => {
    if (!isLoading && !allowed && redirectTo) router.replace(redirectTo);
  }, [isLoading, allowed, redirectTo, router]);

  if (isLoading) return null;
  if (!allowed) return <>{fallback ?? <NoAccess />}</>;
  return <>{children}</>;
}

function NoAccess() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-6 text-center">
      <span className="mono-label">403 · icazə yoxdur</span>
      <h2 className="font-display text-2xl font-semibold">Bu əraziyə giriş bağlıdır</h2>
      <p className="max-w-sm text-muted">Bu bölmə yalnız müəyyən rollar üçün açıqdır. Səhv olduğunu düşünürsünüzsə, administratorla əlaqə saxlayın.</p>
    </div>
  );
}
