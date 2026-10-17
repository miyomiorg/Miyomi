import { Hono } from 'hono';
import type { AppEnv } from '../lib/http.ts';
import { ok, fail } from '../lib/http.ts';

export const healthRouter = new Hono<AppEnv>();

/**
 * GET /api/health — liveness probe.
 * Verifies the Hono app, bindings and D1 are all reachable.
 */
healthRouter.get('/', async (c) => {
  try {
    // Verify the D1 binding is reachable.
    await c.env.DB.prepare('SELECT 1 AS ok').run();

    return ok(c, {
      status: 'ok',
      service: 'miyomi-api',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[health] D1 check failed:', error);
    return fail(c, 500, 'Health check failed: database unavailable');
  }
});
