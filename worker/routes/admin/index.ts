import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import type { AppEnv } from '../../lib/http.ts';
import { fail } from '../../lib/http.ts';
import { resolveSession, requireAdmin } from '../../lib/auth.ts';
import { createDb } from '../../lib/db.ts';
import { admins } from '../../db/schema.ts';
import { authRouter } from './auth.ts';
import { dashboardRouter } from './dashboard.ts';
import { submissionsRouter } from './submissions.ts';
import { makeContentRouter } from './content-crud.ts';
import { reviewsRouter } from './reviews.ts';
import { settingsRouter } from './settings.ts';
import { donationsRouter } from './donations.ts';
import { contributorsRouter } from './contributors.ts';
import { groupsRouter } from './groups.ts';
import { usersRouter } from './users.ts';
import { adminExtraRouter } from './extra.ts';
import { analyticsRouter } from './analytics.ts';

/**
 * Admin API — mounted at /api/admin.
 *
 * Route order matters: /auth (login is public) is mounted BEFORE the
 * global requireAdmin() guard, so only it bypasses authentication.
 * The 2FA gate below additionally blocks every non-auth section until the
 * session owner has enrolled an authenticator (2FA is one-way: no disable).
 */
export const adminRouter = new Hono<AppEnv>();

// Resolve sessions for every /api/admin request (populates c.get('adminId'|'role'|...))
adminRouter.use('*', resolveSession);

// Public auth endpoints (login/logout, staged 2FA completion, enrolment).
// Everything under /auth self-guards; the 2FA gate below skips /auth entirely
// so unenrolled admins can still call /me and the /auth/2fa/* enrolment flow.
adminRouter.route('/auth', authRouter);

// Everything else requires an admin session
adminRouter.use('*', requireAdmin());

// Everything outside /auth additionally requires an enrolled 2FA authenticator.
adminRouter.use('*', async (c, next) => {
  if (c.req.path.startsWith('/auth/')) return next();
  try {
    const db = createDb(c.env.DB);
    const [admin] = await db.select().from(admins).where(eq(admins.id, c.get('adminId')!)).limit(1);
    if (!admin?.totpSecret) {
      return fail(c, 403, 'Two-factor authentication is required before using this section');
    }
  } catch (error) {
    console.error('[2fa] gate check failed:', error);
    return fail(c, 500, 'Failed to verify two-factor status');
  }
  await next();
});

adminRouter.route('/dashboard', dashboardRouter);
adminRouter.route('/submissions', submissionsRouter);
adminRouter.route('/apps', makeContentRouter('apps'));
adminRouter.route('/extensions', makeContentRouter('extensions'));
adminRouter.route('/guides', makeContentRouter('guides'));
adminRouter.route('/blog', makeContentRouter('blog'));
adminRouter.route('/', reviewsRouter); // /reports /feedback /suggestions
adminRouter.route('/', settingsRouter); // /settings /donation-settings
adminRouter.route('/donations', donationsRouter);
adminRouter.route('/contributors', contributorsRouter);
adminRouter.route('/groups', groupsRouter);
adminRouter.route('/users', usersRouter);
adminRouter.route('/analytics', analyticsRouter);
adminRouter.route('/', adminExtraRouter); // /faqs /themes /notices /logs /sessions /bot-logs /likes
