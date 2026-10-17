import type { Context } from 'hono';
import type { Bindings } from '../env';
import type { Role } from './auth.ts';
import type { ModeratorPermission } from './auth.ts';

/**
 * Shared Hono env: Cloudflare bindings + per-request auth context
 * (populated by the auth middleware).
 */
export type AppEnv = {
  Bindings: Bindings;
  Variables: {
    adminId?: string;
    adminEmail?: string;
    role?: Role | null;
    permissions?: ModeratorPermission[];
  };
};

type Ctx = Context<AppEnv>;
type StatusCodeParam = Parameters<Ctx['status']>[0];

/** UUIDv4 shape (accepts legacy Supabase ids and slugs that look like ids) */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: string): boolean => UUID_RE.test(v);

/** Uniform error payload (API contract): { success: false, error } */
export function fail(c: Ctx, status: number, error: string) {
  c.status(status as StatusCodeParam);
  return c.json({ success: false, error });
}

/** Uniform success payload (API contract): { success: true, data } */
export function ok<T>(c: Ctx, data: T, status: number = 200) {
  c.status(status as StatusCodeParam);
  return c.json({ success: true, data });
}

/** Best-effort client IP (Cloudflare-proxied, then standard headers) */
export function clientIp(c: Ctx): string {
  return (
    c.req.header('cf-connecting-ip') ||
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

/** Parse limit/offset query params with sane bounds */
export function pagination(c: Ctx, maxLimit = 100): { limit: number; offset: number } {
  const limit = Math.min(Math.max(parseInt(c.req.query('limit') || '50', 10) || 50, 1), maxLimit);
  const offset = Math.max(parseInt(c.req.query('offset') || '0', 10) || 0, 0);
  return { limit, offset };
}

/** Current time as ISO-8601 UTC (matches the schema's timestamp convention) */
export const isoNow = () => new Date().toISOString();

// Re-exported so route files have a single import source for guards.
// (Safe despite the import cycle: auth.ts only touches http.ts exports at
// request time, never during module evaluation.)
export {
  requireAdmin,
  requireMinRole,
  requireResource,
  requireSuperAdmin,
  resolveSession,
} from './auth.ts';
