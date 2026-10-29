/// <reference types="@cloudflare/workers-types" />
import { Hono, type Context } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { cors } from 'hono/cors';
import { csrfGuard, isTrustedOrigin, securityHeaders } from './lib/security.ts';
import type { Bindings } from './env';
import type { AppEnv } from './lib/http.ts';
import { apiRouter } from './routes/index.ts';
import { seoRouter } from './routes/pages/seo.ts';
import { sitemapRouter } from './routes/pages/sitemap.ts';
import { runCronJobs } from './lib/cron.ts';
import { publicCache } from './lib/public-cache.ts';

/**
 * Miyomi API + page Worker (Hono).
 *
 * Route map:
 *   /api/*   → API (public + admin, see ./routes)
 *   /sitemap.xml → XML sitemap (D1-backed)
 *   SEO page routes (/software/:slug, /blog/:slug, …) → index.html with
 *      injected per-route meta/OG/JSON-LD tags
 *   everything else → static assets (Vite build) with SPA fallback
 *
 * The SPA is served from the same Worker, so /api calls are same-origin
 * and need no CORS on the production site. Extra admin origins (e.g. a
 * staging frontend) can be allowed via the ALLOWED_ORIGINS var.
 */
export const app = new Hono<AppEnv>();

// ── Security headers (all responses) ────────────────────────────────
app.use('*', securityHeaders);

// ── CORS ────────────────────────────────────────────────────────────
// Public API: open to any origin (read-only directory data, no credentials).
// Admin API: only the site itself, SITE_URL and ALLOWED_ORIGINS.
app.use(
  '/api/*',
  cors({
    origin: (origin, c) => {
      if (!origin) return null;
      if (c.req.path.startsWith('/api/admin/')) return isTrustedOrigin(origin, c) ? origin : null;
      return origin;
    },
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86_400,
  }),
);

// ── Request body limits ─────────────────────────────────────────────
// Admin editors save full guide/blog HTML; public writes are small (guide
// submissions are the largest, capped again per field in submit.ts).
const tooLarge = (c: Context<AppEnv>) => c.json({ success: false, error: 'Request body too large' }, 413);
app.use('/api/admin/*', bodyLimit({ maxSize: 2 * 1024 * 1024, onError: tooLarge }));
app.use('/api/*', async (c, next) => {
  if (c.req.path.startsWith('/api/admin/')) return next();
  return bodyLimit({ maxSize: 256 * 1024, onError: tooLarge })(c, next);
});

// ── CSRF (state-changing admin requests) ────────────────────────────
app.use('/api/admin/*', csrfGuard);

// ── API ─────────────────────────────────────────────────────────────
app.use('*', publicCache);
app.route('/api', apiRouter);

// Unknown API paths must not fall through to the SPA shell — answer with
// the standard JSON error envelope so the fetch client can surface it.
app.all('/api/*', (c) => c.json({ success: false, error: 'Not found' }, 404));

// ── SEO-processed page routes + sitemap ─────────────────────────────
app.route('/', sitemapRouter);
app.route('/', seoRouter);

// ── Static assets ───────────────────────────────────────────────────
// Only reached for run_worker_first paths that no route above handled
// (e.g. a trailing-slash variant). The assets binding applies
// `not_found_handling = "single-page-application"`, so unknown client
// routes come back as the SPA shell in one fetch.
app.all('*', (c) => c.env.ASSETS.fetch(c.req.raw));

/**
 * Cloudflare Cron Trigger (see `triggers` in wrangler.toml) —
 * scheduled maintenance jobs (rate-limit & stale record cleanup).
 */
export async function scheduled(_event: ScheduledEvent, env: Bindings): Promise<void> {
  await runCronJobs(env);
}

export default {
  fetch: app.fetch,
  scheduled,
} satisfies ExportedHandler<Bindings>;
