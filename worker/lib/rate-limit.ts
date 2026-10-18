import { lt, sql } from 'drizzle-orm';
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
      const ip = clientIp(c);
      const endpoint = c.req.path;
      const windowStart = new Date(
        Math.floor(Date.now() / (windowSec * 1000)) * windowSec * 1000,
      ).toISOString();
      const db = createDb(c.env.DB);
      // Atomic admission: one statement instead of SELECT + INSERT/UPDATE.
      // At the limit the conditional upsert returns no row and writes nothing.
      const [admitted] = await db.insert(rateLimits).values({
        id: crypto.randomUUID(), endpoint, ipAddress: ip, windowStart, requestCount: 1,
      }).onConflictDoUpdate({
        target: [rateLimits.ipAddress, rateLimits.endpoint, rateLimits.windowStart],
        set: { requestCount: sql`${rateLimits.requestCount} + 1` },
        setWhere: lt(rateLimits.requestCount, max),
      }).returning({ count: rateLimits.requestCount });

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
