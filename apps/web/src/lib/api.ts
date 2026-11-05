/**
 * Thin fetch wrapper for the Eduventure REST API.
 *
 *   api.get<Quiz[]>('/quizzes', { q: 'verb', mine: 1 })
 *   api.post<User>('/auth/login', { email, password })
 *   api.upload<{ url: string }>('/uploads', formData)
 *
 * - base `/api` (Next rewrites to the Nest server), `credentials: 'include'`
 * - on 401 → POST /api/auth/refresh once (single-flight), then retries the request
 * - throws `ApiError { status, message, data }`
 */

export type QueryParams = Record<string, string | number | boolean | null | undefined | (string | number)[]>;

export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}

/** Human message for any thrown value (Azerbaijani fallbacks). */
export function errorMessage(e: unknown, fallback = 'Xəta baş verdi. Yenidən cəhd edin.'): string {
  if (e instanceof ApiError) {
    if (e.status === 0) return 'Serverə qoşulmaq mümkün olmadı.';
    if (e.status >= 500 && !e.message) return 'Server xətası. Bir az sonra yenidən cəhd edin.';
    return e.message || fallback;
  }
  if (e instanceof Error) return e.message || fallback;
  return fallback;
}

const BASE = '/api';

function baseUrl() {
  if (typeof window === 'undefined') {
    return `${process.env.API_URL ?? 'http://localhost:4000'}${BASE}`;
  }
  return BASE;
}

export function buildUrl(path: string, params?: QueryParams) {
  let p = path.startsWith('http') ? path : path.replace(/^\/?(api\/)?/, '/');
  if (!path.startsWith('http')) p = baseUrl() + p;
  if (params) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null || v === '') continue;
      if (Array.isArray(v)) v.forEach((x) => sp.append(k, String(x)));
      else sp.set(k, String(v));
    }
    const qs = sp.toString();
    if (qs) p += (p.includes('?') ? '&' : '?') + qs;
  }
  return p;
}

let refreshing: Promise<boolean> | null = null;

function refreshSession(): Promise<boolean> {
  if (!refreshing) {
    refreshing = fetch(buildUrl('/auth/refresh'), { method: 'POST', credentials: 'include' })
      .then((r) => r.ok)
      .catch(() => false)
      .finally(() => {
        setTimeout(() => (refreshing = null), 0);
      });
  }
  return refreshing;
}

const NO_REFRESH = ['/auth/refresh', '/auth/login', '/auth/register', '/auth/logout'];

async function parseBody(res: Response): Promise<unknown> {
  if (res.status === 204) return undefined;
  const text = await res.text();
  if (!text) return undefined;
  const ct = res.headers.get('content-type') ?? '';
  if (ct.includes('application/json')) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
  return text;
}

function extractMessage(data: unknown, status: number): string {
  if (data && typeof data === 'object' && 'message' in data) {
    const m = (data as { message: unknown }).message;
    if (Array.isArray(m)) return m.join(', ');
    if (typeof m === 'string') return m;
  }
  if (typeof data === 'string' && data.length < 300) return data;
  if (status === 401) return 'Sessiya bitib. Yenidən daxil olun.';
  if (status === 403) return 'Bu əməliyyat üçün icazəniz yoxdur.';
  if (status === 404) return 'Tapılmadı.';
  if (status >= 500) return 'Server xətası. Bir az sonra yenidən cəhd edin.';
  return 'Xəta baş verdi.';
}

type RequestOptions = {
  params?: QueryParams;
  body?: unknown;
  signal?: AbortSignal;
  headers?: Record<string, string>;
};

async function request<T>(method: string, path: string, opts: RequestOptions = {}, retried = false): Promise<T> {
  const isForm = typeof FormData !== 'undefined' && opts.body instanceof FormData;
  const headers: Record<string, string> = { Accept: 'application/json', ...opts.headers };
  let body: BodyInit | undefined;
  if (opts.body !== undefined) {
    if (isForm) body = opts.body as FormData;
    else {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(opts.body);
    }
  }

  let res: Response;
  try {
    res = await fetch(buildUrl(path, opts.params), {
      method,
      headers,
      body,
      credentials: 'include',
      signal: opts.signal,
      cache: 'no-store',
    });
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') throw e;
    throw new ApiError(0, 'Serverə qoşulmaq mümkün olmadı.');
  }

  const normalized = path.replace(/^\/?(api\/)?/, '/').split('?')[0];
  if (res.status === 401 && !retried && !NO_REFRESH.some((p) => normalized.startsWith(p))) {
    const ok = await refreshSession();
    if (ok) return request<T>(method, path, opts, true);
  }

  const data = await parseBody(res);
  if (!res.ok) throw new ApiError(res.status, extractMessage(data, res.status), data);
  return data as T;
}

export const api = {
  get: <T>(path: string, params?: QueryParams, init?: { signal?: AbortSignal }) =>
    request<T>('GET', path, { params, signal: init?.signal }),
  post: <T>(path: string, body?: unknown, init?: { params?: QueryParams; signal?: AbortSignal }) =>
    request<T>('POST', path, { body, ...init }),
  patch: <T>(path: string, body?: unknown, init?: { params?: QueryParams }) =>
    request<T>('PATCH', path, { body, ...init }),
  put: <T>(path: string, body?: unknown, init?: { params?: QueryParams }) =>
    request<T>('PUT', path, { body, ...init }),
  del: <T>(path: string, params?: QueryParams) => request<T>('DELETE', path, { params }),
  upload: <T>(path: string, form: FormData) => request<T>('POST', path, { body: form }),
};

export default api;
