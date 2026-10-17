import { Hono } from 'hono';
import type { AppEnv } from '../lib/http.ts';
import { healthRouter } from './health.ts';
import { publicRouter } from './public/index.ts';
import { adminRouter } from './admin/index.ts';

/**
 * Top-level API router — mounted at /api by worker/index.ts.
 *
 *   /api/health       liveness probe
 *   /api/apps, /api/extensions, /api/guides, /api/blog, /api/faqs,
 *   /api/likes, /api/settings/public, /api/notices, /api/themes,
 *   /api/donations, /api/donation-settings, /api/groups,
 *   /api/contributors, /api/stats, /api/feedback, /api/reports,
 *   /api/submissions  public (unauthenticated)
 *   /api/admin/*      admin (session-guarded; /api/admin/auth public)
 */
export const apiRouter = new Hono<AppEnv>();

apiRouter.route('/health', healthRouter);
apiRouter.route('/admin', adminRouter);
apiRouter.route('/', publicRouter);
