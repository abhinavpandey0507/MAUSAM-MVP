/**
 * Centralized HTTP client for the MAUSAM backend.
 *
 * - One place to configure the API base URL (`VITE_API_BASE_URL`), defaulting to
 *   same-origin `/api` (Vite dev proxy / FastAPI serving the built client).
 * - Always sends cookies (`credentials: 'include'`) so the httpOnly session JWT
 *   works, and additionally attaches an in-memory Bearer token when present.
 * - Per-request timeout + uniform error handling (`ApiError`).
 *
 * The token is intentionally kept ONLY in memory (never localStorage) so a
 * stolen/again-injected script cannot exfiltrate a long-lived credential.
 */

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').trim().replace(/\/+$/, '');

function toUrl(path: string): string {
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

let memoryToken: string | null = null;

export function setAuthToken(token: string | null): void {
  memoryToken = token;
}

export function getAuthToken(): string | null {
  return memoryToken;
}

export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(message: string, status = 0, detail = '') {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail || message;
  }

  get isAuthError(): boolean {
    return this.status === 401 || this.status === 403;
  }
}

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  timeoutMs?: number;
  auth?: boolean;
  signal?: AbortSignal;
}

interface ApiBody<T> {
  ok?: boolean;
  data?: T;
  error?: string;
  detail?: string;
}

export async function apiRequest<T = unknown>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { method = 'GET', body, timeoutMs = 15000, auth = true, signal } = options;

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  if (signal) {
    signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth && memoryToken) headers.Authorization = `Bearer ${memoryToken}`;

  try {
    const res = await fetch(toUrl(path), {
      method,
      headers,
      credentials: 'include',
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal
    });

    const text = await res.text();
    let parsed: ApiBody<T> | null = null;
    if (text) {
      try {
        parsed = JSON.parse(text) as ApiBody<T>;
      } catch {
        parsed = null;
      }
    }

    if (!res.ok) {
      const msg = parsed?.detail || parsed?.error || `Request failed (${res.status})`;
      throw new ApiError(msg, res.status, parsed?.detail || '');
    }
    if (parsed && parsed.ok === false) {
      throw new ApiError(parsed.error || parsed.detail || 'Request failed', res.status);
    }
    return (parsed ?? ({} as ApiBody<T>)) as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if ((err as Error).name === 'AbortError') {
      throw new ApiError('The request timed out. Please try again.', 408);
    }
    throw new ApiError('Could not reach the MAUSAM backend. Is the server running?', 0);
  } finally {
    window.clearTimeout(timer);
  }
}
