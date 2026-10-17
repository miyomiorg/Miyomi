/// <reference types="@cloudflare/workers-types" />
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Bindings } from './env';
import type { AppEnv } from './lib/http.ts';
import { apiRouter } from './routes/index.ts';
import { seoRouter } from './routes/pages/seo.ts';
import { sitemapRouter } from './routes/pages/sitemap.ts';
import { runCronJobs } from './lib/cron.ts';

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
 * and need no CORS on the production site. CORS is configured for
 * external/preview callers via the ALLOWED_ORIGINS var.
 */
export const app = new Hono<AppEnv>();

// ── CORS ────────────────────────────────────────────────────────────
app.use(
  '/api/*',
  cors({
    origin: (origin, c) => {
      const allowed = (c.env.ALLOWED_ORIGINS ?? '')
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean);
      // No allow-list configured → open (dev-friendly).
      // With ALLOWED_ORIGINS set, only listed origins are echoed back;
      // anything else gets the canonical site URL, which browsers reject.
      if (origin && (allowed.length === 0 || allowed.includes(origin))) {
        return origin;
      }
      return c.env.SITE_URL;
    },
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86_400,
  }),
);

// ── API ─────────────────────────────────────────────────────────────
app.route('/api', apiRouter);

// Unknown API paths must not fall through to the SPA shell — answer with
// the standard JSON error envelope so the fetch client can surface it.
app.all('/api/*', (c) => c.json({ success: false, error: 'Not found' }, 404));

// ── SEO-processed page routes + sitemap ─────────────────────────────
app.route('/', sitemapRouter);
app.route('/', seoRouter);

// ── Static assets + SPA fallback ────────────────────────────────────
app.all('*', async (c) => {
  const assets = c.env.ASSETS;
  const res = await assets.fetch(c.req.raw);

  // SPA fallback: unknown routes that don't look like real files get
  // the SPA shell (index.html), mirroring the old Pages behaviour.
  if (res.status === 404 && !/\.[a-z0-9]+$/i.test(c.req.path)) {
    const fallback = new Request(new URL('/index.html', c.req.url));
    return assets.fetch(fallback);
  }
  return res;
});

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
