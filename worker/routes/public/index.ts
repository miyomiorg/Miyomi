import { Hono } from 'hono';
import type { AppEnv } from '../../lib/http.ts';
import { appsRouter } from './apps.ts';
import { extensionsRouter } from './extensions.ts';
import { guidesRouter } from './guides.ts';
import { blogRouter } from './blog.ts';
import { faqsRouter } from './faqs.ts';
import { miscRouter } from './misc.ts';
import { likesRouter } from './likes.ts';
import { submitRouter } from './submit.ts';
import { statsRouter } from './stats.ts';

/**
 * Public (unauthenticated) API — mounted at /api.
 * All responses: { success, data } or { success: false, error }.
 */
export const publicRouter = new Hono<AppEnv>();

publicRouter.route('/apps', appsRouter);
publicRouter.route('/extensions', extensionsRouter);
publicRouter.route('/guides', guidesRouter);
publicRouter.route('/blog', blogRouter);
publicRouter.route('/faqs', faqsRouter);
publicRouter.route('/likes', likesRouter);
publicRouter.route('/', miscRouter); // settings, notices, themes, donations, groups, contributors
publicRouter.route('/', submitRouter); // feedback, reports, submissions
publicRouter.route('/stats', statsRouter);
