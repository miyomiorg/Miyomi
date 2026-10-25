/**
 * Typed fetch client for the Miyomi Hono API (same-origin).
 *
 * Every endpoint answers with the uniform envelope:
 *   { success: true, data: T }      or      { success: false, error: string }
 *
 * The Drizzle layer keys rows by camelCase property names; the frontend's
 * existing `Tables<'...'>` types (and all admin pages) use snake_case. This
 * layer therefore snake_cases the *top-level* keys of the data payload
 * (recursing into `items`/`top` arrays, but leaving nested objects — JSON/JSONB
 * columns — untouched). Aggregate responses can opt out with `preserveKeys`.
 */

import { CacheManager } from '@/utils/cache';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface Envelope<T> {
  success: boolean;
  data?: T;
  error?: string;
}

const BASE = '/api';

/** camelCase → snake_case (top-level keys only). */
function snakeify(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(snakeify);
  }
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      // convert key; leave the value untouched (nested objects are JSON columns)
      out[k.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`)] =
        (k === 'items' || k === 'top') && Array.isArray(v) ? v.map(snakeify) : v;
    }
    return out;
  }
  return value;
}

async function request<T>(path: string, init?: RequestInit, preserveKeys = false): Promise<T> {
  const res = await fetch(BASE + path, {
    credentials: 'same-origin',
    ...init,
  });

  let body: Envelope<unknown> | null = null;
  try {
    body = (await res.json()) as Envelope<unknown>;
  } catch {
    // non-JSON response (should not happen for /api)
  }

  if (!res.ok || !body || body.success !== true) {
    throw new ApiError(res.status, body?.error || `Request failed (${res.status})`);
  }
  if (path.startsWith('/admin/') && init?.method && !['GET', 'HEAD'].includes(init.method)) CacheManager.invalidate();
  return (preserveKeys ? body.data : snakeify(body.data)) as T;
}

const jsonInit = (method: string, body?: unknown): RequestInit => ({
  method,
  headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
  body: body === undefined ? undefined : JSON.stringify(body),
});

export const http = {
  get: <T>(path: string, options?: { preserveKeys?: boolean }) => request<T>(path, undefined, options?.preserveKeys),
  post: <T>(path: string, body?: unknown, options?: { preserveKeys?: boolean }) =>
    request<T>(path, jsonInit('POST', body), options?.preserveKeys),
  put: <T>(path: string, body?: unknown, options?: { preserveKeys?: boolean }) =>
    request<T>(path, jsonInit('PUT', body), options?.preserveKeys),
  patch: <T>(path: string, body?: unknown, options?: { preserveKeys?: boolean }) =>
    request<T>(path, jsonInit('PATCH', body), options?.preserveKeys),
  delete: <T>(path: string, options?: { preserveKeys?: boolean }) =>
    request<T>(path, { method: 'DELETE' }, options?.preserveKeys),
};
