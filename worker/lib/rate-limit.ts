import { and, eq } from 'drizzle-orm';
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
      const key = and(
        eq(rateLimits.ipAddress, ip),
        eq(rateLimits.endpoint, endpoint),
        eq(rateLimits.windowStart, windowStart),
      );

      const [existing] = await db
        .select({ count: rateLimits.requestCount })
        .from(rateLimits)
        .where(key)
        .limit(1);
      const current = existing?.count ?? 0;

      if (current >= max) {
        return fail(c, 429, 'Too many requests. Please try again later.');
      }

      if (current === 0) {
        await db.insert(rateLimits).values({
          id: crypto.randomUUID(),
          endpoint,
          ipAddress: ip,
          windowStart,
          requestCount: 1,
        });
      } else {
        await db.update(rateLimits).set({ requestCount: current + 1 }).where(key);
      }
    } catch (error) {
      // Fail open; log for observability.
      console.error('[rate-limit] error (failing open):', error);
    }
    await next();
  };
}
