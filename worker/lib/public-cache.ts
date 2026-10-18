import type { MiddlewareHandler } from 'hono';
import type { AppEnv } from './http.ts';

// Explicit allow-list: never cache admin, fingerprint-specific likes, writes,
// or blog detail GETs (which increment views). Unknown routes opt out.
function policy(path: string): { ttl: number; query: string[] } | null {
  if (/^\/api\/(apps|extensions)(\/[^/]+(\/compatible)?)?$/.test(path)) return { ttl: 60, query: [] };
  if (/^\/api\/guides(\/[^/]+)?$/.test(path)) return { ttl: 60, query: ['category'] };
  if (path === '/api/faqs') return { ttl: 60, query: [] };
  if (path === '/api/donations') return { ttl: 60, query: ['limit', 'offset'] };
  if (/^\/api\/(blog|settings\/public|notices|themes|donation-settings|groups|contributors)$/.test(path)) {
    return { ttl: 60, query: [] };
  }
  if (path === '/api/stats') return { ttl: 3600, query: [] };
  if (path === '/sitemap.xml') return { ttl: 300, query: [] };
  if (/^\/(software|extensions|guides|blog)\/[^/]+$/.test(path)) return { ttl: 60, query: [] };
  return null;
}

/** Cache hits return before D1 runs. Cache storage is local to each CF location. */
export const publicCache: MiddlewareHandler<AppEnv> = async (c, next) => {
  const config = policy(c.req.path);
  if (c.req.method !== 'GET' || !config || typeof caches === 'undefined') return next();

  // Editors see current data immediately; never share authenticated responses.
  if (c.req.header('authorization') || /(?:^|;\s*)miyomi_session=/.test(c.req.header('cookie') ?? '')) {
    await next();
    c.header('Cache-Control', 'private, no-store');
    return;
  }

  const url = new URL(c.req.url);
  const params = new URLSearchParams(url.search);
  url.search = '';
  for (const name of config.query) {
    const value = params.get(name);
    if (value !== null) url.searchParams.set(name, value);
  }
  // Version the cache namespace when response contracts change.
  url.searchParams.set('__public_cache', 'v1');
  const key = new Request(url.toString());
  const cache = caches.default;
  try {
    const hit = await cache.match(key);
    if (hit) {
      c.res = new Response(hit.body, hit);
      c.header('Cache-Control', 'public, max-age=0, must-revalidate');
      c.header('X-Cache', 'HIT');
      return;
    }
  } catch (error) {
    console.error('[cache] read failed:', error);
  }

  await next();
  if (c.res.status !== 200 || c.res.headers.has('Set-Cookie') ||
      /private|no-store/i.test(c.res.headers.get('Cache-Control') ?? '')) return;

  const stored = new Response(c.res.clone().body, c.res);
  stored.headers.set('Cache-Control', `public, max-age=${config.ttl}`);
  // Hono retains the current caller's CORS headers when assigning a cached response.
  stored.headers.delete('Access-Control-Allow-Origin');
  stored.headers.delete('Access-Control-Allow-Credentials');
  stored.headers.delete('Vary');
  c.header('Cache-Control', 'public, max-age=0, must-revalidate');
  c.header('X-Cache', 'MISS');
  c.executionCtx.waitUntil(cache.put(key, stored).catch((error) => {
    console.error('[cache] write failed:', error);
  }));
};
