import type { MiddlewareHandler } from 'hono';
import type { AppEnv } from './http.ts';

// Explicit allow-list: never cache admin, fingerprint-specific likes or
// writes. Unknown routes opt out.
function policy(path: string): { ttl: number; query: string[] } | null {
  if (path === '/api/likes/counts') return { ttl: 60, query: [] };
  if (/^\/api\/(apps|extensions)(\/[^/]+(\/compatible)?)?$/.test(path)) return { ttl: 60, query: [] };
  if (/^\/api\/guides(\/[^/]+)?$/.test(path)) return { ttl: 60, query: ['category'] };
  // Blog detail is read-only (views are counted by POST .../view).
  if (/^\/api\/blog\/[^/]+$/.test(path)) return { ttl: 60, query: [] };
  if (path === '/api/faqs') return { ttl: 60, query: [] };
  // Ranked aggregates are cached briefly; successful admin writes invalidate
  // public entries in the current isolate, and other locations refresh on TTL.
  if (path === '/api/donations/leaderboard') return { ttl: 60, query: ['limit', 'cursor'] };
  // The raw donation list changes via the admin panel and must show new donors
  // immediately, so it is intentionally excluded from edge caching.
  if (/^\/api\/(blog|settings\/public|notices|themes|donation-settings|groups|contributors|counts)$/.test(path)) {
    return { ttl: 60, query: [] };
  }
  if (path === '/api/stats') return { ttl: 3600, query: [] };
  if (path === '/sitemap.xml') return { ttl: 3600, query: [] };
  if (/^\/(software|extensions|guides|blog)\/[^/]+$/.test(path)) return { ttl: 60, query: [] };
  return null;
}

// Missing slugs (bots probing /software/<random>) are cached briefly so they
// stop costing a D1 lookup each, while a newly created item appears within
// this window everywhere (immediately in the isolate that wrote it).
const NOT_FOUND_TTL = 30;

/** Strong ETag from the body bytes (SHA-1 is fine for change detection). */
async function etagFor(body: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-1', new TextEncoder().encode(body)));
  let hex = '';
  for (let i = 0; i < 12; i++) hex += digest[i].toString(16).padStart(2, '0');
  return `"${hex}"`;
}

/** If-None-Match matches → a body-less 304 (browser revalidation costs bytes, not D1). */
function notModified(ifNoneMatch: string | undefined, etag: string | null): Response | null {
  if (!ifNoneMatch || !etag) return null;
  const tags = ifNoneMatch.split(',').map((t) => t.trim().replace(/^W\//, ''));
  if (!tags.includes(etag) && !tags.includes('*')) return null;
  return new Response(null, { status: 304, headers: { ETag: etag, 'Cache-Control': 'public, max-age=0, must-revalidate' } });
}

type Snapshot = { body: string; headers: [string, string][]; status: number };
type Flight = { generation: number; task: Promise<Snapshot | null> };
// Only in-flight work lives in memory; response storage remains the existing Cache API.
// These maps coordinate one isolate, not all Cloudflare locations/isolates.
const scopes = new WeakMap<object, { generation: number; flights: Map<string, Flight>; keys: Map<string, number> }>();
function scopeFor(db: object) {
  let scope = scopes.get(db);
  if (!scope) {
    scope = { generation: 0, flights: new Map(), keys: new Map() };
    scopes.set(db, scope);
  }
  return scope;
}

/** Cache hits return before D1 runs. All other locations retain the bounded TTL. */
export const publicCache: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (typeof caches === 'undefined') return next();
  const cache = caches.default;
  const scope = scopeFor(c.env.DB);
  if (c.req.path.startsWith('/api/admin/') && !['GET', 'HEAD', 'OPTIONS'].includes(c.req.method)) {
    await next();
    if (c.res.ok) {
      scope.generation++;
      const keys = [...scope.keys.keys()];
      scope.keys.clear();
      // Await deletion so a subsequent read in this isolate cannot see an old entry.
      await Promise.all(keys.map(url => cache.delete(new Request(url)).catch(() => false)));
    }
    c.header('Cache-Control', 'private, no-store');
    return;
  }
  const config = policy(c.req.path);
  if (c.req.method !== 'GET' || !config) {
    await next();
    if (c.req.path.startsWith('/api/')) c.header('Cache-Control', 'private, no-store');
    return;
  }

  // Never share authenticated responses. Browser data caches are managed separately.
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
  url.searchParams.set('__public_cache', 'v9');
  const key = new Request(url.toString());
  const generation = scope.generation;
  // Expired-key sweep only when the map grows (not a full walk per request).
  if (scope.keys.size >= 1024) {
    const now = Date.now();
    for (const [url, expires] of scope.keys) if (expires <= now) scope.keys.delete(url);
    if (scope.keys.size >= 2048) scope.keys.delete(scope.keys.keys().next().value!);
  }
  scope.keys.set(key.url, Date.now() + config.ttl * 1000);
  const ifNoneMatch = c.req.header('if-none-match');
  try {
    const hit = await cache.match(key);
    if (hit && generation === scope.generation) {
      const unchanged = notModified(ifNoneMatch, hit.headers.get('ETag'));
      if (unchanged) {
        c.res = unchanged;
        c.header('X-Cache', 'HIT');
        return;
      }
      c.res = new Response(hit.body, hit);
      c.header('Cache-Control', 'public, max-age=0, must-revalidate');
      c.header('X-Cache', 'HIT');
      return;
    }
  } catch (error) {
    console.error('[cache] read failed:', error);
  }

  const existing = scope.flights.get(key.url);
  if (existing && existing.generation === scope.generation) {
    const shared = await existing.task;
    if (shared && existing.generation === scope.generation) {
      c.res = new Response(shared.body, { status: shared.status, headers: shared.headers });
      c.header('Cache-Control', 'public, max-age=0, must-revalidate');
      c.header('X-Cache', 'COALESCED');
      return;
    }
    // Failures/private responses are never shared, even with waiting callers.
    await next();
    c.header('Cache-Control', 'private, no-store');
    return;
  }

  let finish!: (snapshot: Snapshot | null) => void;
  const flight: Flight = { generation: scope.generation, task: new Promise(resolve => { finish = resolve; }) };
  scope.flights.set(key.url, flight);
  try {
    await next();
    const status = c.res.status;
    if ((status !== 200 && status !== 404) || c.res.headers.has('Set-Cookie') ||
        /private|no-store/i.test(c.res.headers.get('Cache-Control') ?? '') ||
        (c.res.headers.get('Vary') ?? '').split(',').some(v => v.trim() && v.trim().toLowerCase() !== 'origin')) return;

    const body = await c.res.clone().text();
    const etag = status === 200 ? await etagFor(body) : null;
    const headers = new Headers(c.res.headers);
    headers.set('Cache-Control', `public, max-age=${status === 200 ? config.ttl : Math.min(config.ttl, NOT_FOUND_TTL)}`);
    headers.delete('Access-Control-Allow-Origin');
    headers.delete('Access-Control-Allow-Credentials');
    headers.delete('Vary');
    if (etag) headers.set('ETag', etag);
    const snapshot: Snapshot = { body, headers: [...headers.entries()], status };
    if (flight.generation !== scope.generation) return;
    try {
      await cache.put(key, new Response(snapshot.body, { status, headers }));
      // A write may have completed while cache.put was pending.
      if (flight.generation !== scope.generation) { await cache.delete(key); return; }
    } catch (error) { console.error('[cache] write failed:', error); }
    if (etag) {
      const unchanged = notModified(ifNoneMatch, etag);
      if (unchanged) c.res = unchanged;
      else c.header('ETag', etag);
    }
    c.header('Cache-Control', 'public, max-age=0, must-revalidate');
    c.header('X-Cache', 'MISS');
    finish(snapshot);
  } finally {
    finish(null);
    if (scope.flights.get(key.url) === flight) scope.flights.delete(key.url);
  }
};
