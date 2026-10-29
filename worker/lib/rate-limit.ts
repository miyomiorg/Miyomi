import { and, eq, lt, sql } from 'drizzle-orm';
import type { MiddlewareHandler } from 'hono';
import { createDb } from './db.ts';
import { clientIp, fail, type AppEnv } from './http.ts';
import { rateLimits } from '../db/schema.ts';

/**
 * D1-backed fixed-window rate limiter (port of the Supabase
 * `rate_limits` + `cleanup_expired_rate_limits` behaviour).
 *
 * Key: (ip, endpoint, windowStart). windowStart is the top of the
 * current window so the key is stable within it.
 *
 * Fails OPEN on database errors — availability wins over throttling.
 */
export function rateLimit(windowSec: number, max: number): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    try {
      const admitted = await consumeLimit(c.env.DB, clientIp(c), c.req.path, windowSec, max);
      if (!admitted) {
        return fail(c, 429, 'Too many requests. Please try again later.');
      }
    } catch (error) {
      // Fail open; log for observability.
      console.error('[rate-limit] error (failing open):', error);
    }
    await next();
  };
}

/**
 * Count one hit against an arbitrary (subject, bucket) key in the current
 * fixed window. Returns false once `max` hits are reached. Throws on DB
 * errors so callers decide whether to fail open or closed.
 */
export async function consumeLimit(
  d1: Parameters<typeof createDb>[0],
  subject: string,
  bucket: string,
  windowSec: number,
  max: number,
): Promise<boolean> {
  const windowStart = new Date(
    Math.floor(Date.now() / (windowSec * 1000)) * windowSec * 1000,
  ).toISOString();
  const db = createDb(d1);
  // Atomic admission: one statement instead of SELECT + INSERT/UPDATE.
  // At the limit the conditional upsert returns no row and writes nothing.
  const [admitted] = await db.insert(rateLimits).values({
    id: crypto.randomUUID(), endpoint: bucket, ipAddress: subject, windowStart, requestCount: 1,
  }).onConflictDoUpdate({
    target: [rateLimits.ipAddress, rateLimits.endpoint, rateLimits.windowStart],
    set: { requestCount: sql`${rateLimits.requestCount} + 1` },
    setWhere: lt(rateLimits.requestCount, max),
  }).returning({ count: rateLimits.requestCount });
  return Boolean(admitted);
}

/** Read-only check: has (subject, bucket) already reached `max` in the current window? */
export async function isLimited(
  d1: Parameters<typeof createDb>[0],
  subject: string,
  bucket: string,
  windowSec: number,
  max: number,
): Promise<boolean> {
  const windowStart = new Date(
    Math.floor(Date.now() / (windowSec * 1000)) * windowSec * 1000,
  ).toISOString();
  const db = createDb(d1);
  const [row] = await db
    .select({ n: rateLimits.requestCount })
    .from(rateLimits)
    .where(and(eq(rateLimits.ipAddress, subject), eq(rateLimits.endpoint, bucket), eq(rateLimits.windowStart, windowStart)))
    .limit(1);
  return (row?.n ?? 0) >= max;
}
