import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { Hono } from 'hono';
import { app } from '../worker/index.ts';
import { rateLimit } from '../worker/lib/rate-limit.ts';
import { signSession } from '../worker/lib/auth.ts';
import type { Bindings } from '../worker/env';

// Execute real Drizzle SQL against disposable SQLite and count statements.
const sqlite = new DatabaseSync(':memory:');
let queries = 0;
let now = Date.now();
const entries = new Map<string, { response: Response; expires: number }>();
Object.defineProperty(globalThis, 'caches', { configurable: true, value: { default: {
  async match(key: Request) {
    const entry = entries.get(key.url);
    return entry && entry.expires > now ? entry.response.clone() : undefined;
  },
  async put(key: Request, response: Response) {
    const ttl = Number(response.headers.get('Cache-Control')?.match(/max-age=(\d+)/)?.[1]);
    entries.set(key.url, { response: new Response(await response.text(), response), expires: now + ttl * 1000 });
  },
} } });
const env = {
  SITE_URL: 'https://miyomi.test', SESSION_SECRET: 'test-only-session-secret',
  ASSETS: { fetch: async () => new Response('<html><head></head></html>') },
  DB: { prepare(sql: string) { return { bind(...params: Array<string | number | null>) {
    return {
      async raw() { queries++; return sqlite.prepare(sql).all(...params).map(row => Object.values(row)); },
      async all() { queries++; return { results: sqlite.prepare(sql).all(...params) }; },
      async run() { queries++; return { success: true, meta: sqlite.prepare(sql).run(...params) }; },
    };
  } }; } },
} as unknown as Bindings;

async function request(path: string, init?: RequestInit, router = app) {
  const pending: Promise<unknown>[] = [];
  const before = queries;
  const response = await router.request(`https://miyomi.test${path}`, init, env, {
    waitUntil: (task: Promise<unknown>) => pending.push(task), passThroughOnException() {},
  } as unknown as ExecutionContext);
  await Promise.all(pending);
  return { response, queries: queries - before };
}

try {
  const migrations = new URL('../worker/db/drizzle/', import.meta.url);
  for (const file of readdirSync(migrations).filter(f => f.endsWith('.sql')).sort()) {
    sqlite.exec(readFileSync(new URL(file, migrations), 'utf8'));
  }
  sqlite.exec(`
    INSERT INTO apps (id, name, slug, status) VALUES ('app', 'App', 'app', 'approved');
    INSERT INTO guides (id, title, slug, status, category, content_format) VALUES ('guide', 'Guide', 'guide', 'published', 'setup', 'markdown');
    INSERT INTO blog_posts (id, title, slug, status, content, content_format, category) VALUES ('post', 'Post', 'post', 'published', 'Content', 'markdown', 'news');
    INSERT INTO admins (id, email, totp_secret) VALUES ('admin', 'test@example.test', 'enrolled');
    INSERT INTO user_roles (id, user_id, role) VALUES ('role', 'admin', 'super_admin');
  `);

  let result = await request('/api/apps', { headers: { Origin: 'https://first.test' } });
  assert.equal(result.queries, 1);
  assert.equal(result.response.headers.get('X-Cache'), 'MISS');
  result = await request('/api/apps?utm_source=test', { headers: { Origin: 'https://second.test' } });
  assert.equal(result.queries, 0);
  assert.equal(result.response.headers.get('X-Cache'), 'HIT');
  assert.equal(result.response.headers.get('Access-Control-Allow-Origin'), 'https://second.test');
  assert.equal((await result.response.json()).data[0].id, 'app');
  now += 61_000;
  assert.equal((await request('/api/apps')).queries, 1, 'expired entries must query again');
  assert.equal((await request('/api/apps', { headers: { Cookie: 'miyomi_session=editor' } })).queries, 1);
  assert.equal((await request('/api/apps', { headers: { Authorization: 'Bearer editor' } })).queries, 1);

  await request('/api/guides?category=setup');
  result = await request('/api/guides?category=other');
  assert.equal(result.queries, 1, 'filters must have independent cache keys');
  assert.deepEqual((await result.response.json()).data, []);
  assert.equal((await request('/api/guides?category=setup&utm_source=test')).queries, 0);
  for (let i = 0; i < 2; i++) {
    result = await request('/api/apps/missing');
    assert.equal(result.response.status, 404);
    assert.equal(result.queries, 1, 'errors must not be cached');
  }
  assert.equal((await request('/sitemap.xml')).queries, 4);
  assert.equal((await request('/sitemap.xml?utm_source=test')).queries, 0);
  assert.equal((await request('/software/app')).queries, 1);
  assert.equal((await request('/software/app')).queries, 0);
  assert.equal((await request('/api/likes/registry?fingerprint=first')).queries, 3);
  assert.equal((await request('/api/likes/registry?fingerprint=second')).queries, 3);
  for (let views = 1; views <= 2; views++) {
    result = await request('/api/blog/post');
    assert.equal(result.queries, 1);
    assert.equal((await result.response.json()).data.views, views);
  }

  const limiter = new Hono().post('/limited', rateLimit(3600, 2), c => c.json({ ok: true }));
  for (const status of [200, 200, 429, 429]) {
    result = await request('/limited', { method: 'POST' }, limiter as typeof app);
    assert.equal(result.response.status, status);
    assert.equal(result.queries, 1);
  }
  assert.equal(sqlite.prepare('SELECT request_count FROM rate_limits').get()?.request_count, 2);

  const token = await signSession({ sub: 'admin' }, env.SESSION_SECRET, 60);
  const auth = { headers: { Cookie: `miyomi_session=${token}` } };
  result = await request('/api/admin/settings', auth);
  assert.equal(result.response.status, 200);
  assert.equal(result.queries, 3, 'one admin read + role + settings; no duplicate 2FA read');
  sqlite.exec("UPDATE admins SET totp_secret = NULL WHERE id = 'admin'");
  assert.equal((await request('/api/admin/settings', auth)).response.status, 403, '2FA changes take effect on next request');

  const plan = sqlite.prepare('EXPLAIN QUERY PLAN SELECT item_id FROM likes WHERE device_fingerprint = ?').all('fixture');
  assert.match(JSON.stringify(plan), /COVERING INDEX idx_likes_fingerprint_item/);
  console.log('PASS: cache hits use zero D1 queries; expiry, filters, CORS, auth/likes isolation, view counts, rate limits, 2FA and fingerprint index verified');
} finally {
  sqlite.close();
  Reflect.deleteProperty(globalThis, 'caches');
}
