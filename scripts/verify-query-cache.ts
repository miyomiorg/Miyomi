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
  const write = (body: unknown) => ({ method: 'PUT', headers: { ...auth.headers, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const profile = { name: 'Writer', role: 'Editor', avatar: 'https://example.test/avatar.png' };
  assert.equal((await request('/api/admin/author-profile', write(profile))).response.status, 200);
  assert.deepEqual((await (await request('/api/admin/author-profile', auth)).response.json()).data, profile);
  const publicSettings = (await (await request('/api/settings/public')).response.json()).data;
  assert.equal(publicSettings['author-profile:admin'], undefined, 'saved profiles must remain private');
  const created = await request('/api/admin/blog', { ...write({ title: 'Snapshot', slug: 'snapshot', content: 'body', contentFormat: 'html', status: 'published', authorName: profile.name, authorRole: profile.role, authorAvatarUrl: profile.avatar }), method: 'POST' });
  assert.equal(created.response.status, 201);
  await request('/api/admin/author-profile', write({ ...profile, name: 'Changed' }));
  assert.equal(sqlite.prepare("SELECT author_name FROM blog_posts WHERE slug = 'snapshot'").get()?.author_name, 'Writer');
  sqlite.exec(`INSERT INTO extensions (id, name, slug, status) VALUES ('repo', 'Repo', 'repo', 'approved');
    INSERT INTO admins (id, email, totp_secret) VALUES ('mod', 'mod@example.test', 'enrolled');
    INSERT INTO user_roles (id, user_id, role) VALUES ('mod-role', 'mod', 'moderator');`);
  assert.equal((await request('/api/admin/extensions/repo/note', write({ note: 'Needs review', severity: 'warning' }))).response.status, 200);
  const publicRepo = (await (await request('/api/extensions/repo')).response.json()).data;
  assert.equal(publicRepo.moderatorNote, undefined, 'moderator notes must not be exposed publicly');
  const adminExtList = (await (await request('/api/admin/extensions', auth)).response.json()).data;
  assert.equal(adminExtList.items.find((e: any) => e.id === 'repo')?.moderatorNote, 'Needs review');
  assert.equal((await request('/api/admin/extensions/repo/note', { method: 'PUT', body: JSON.stringify({ note: 'Forged', severity: 'info' }) })).response.status, 401);
  const modToken = await signSession({ sub: 'mod' }, env.SESSION_SECRET, 60);
  const modWrite = { ...write({ note: 'Updated by moderator', severity: 'danger' }), headers: { 'Content-Type': 'application/json', Cookie: `miyomi_session=${modToken}` } };
  assert.equal((await request('/api/admin/extensions/repo/note', modWrite)).response.status, 403);
  assert.deepEqual((await (await request('/api/admin/author-profile', { headers: modWrite.headers })).response.json()).data, { name: '', role: '', avatar: '' });
  sqlite.exec("INSERT INTO moderator_permissions (id, user_id, resource, can_read, can_write, can_delete) VALUES ('perm', 'mod', 'extensions', 1, 1, 0)");
  assert.equal((await request('/api/admin/extensions/repo/note', modWrite)).response.status, 200);
  assert.equal((await request('/api/admin/extensions/repo/note', write({ note: '', severity: 'warning' }))).response.status, 200);
  assert.equal(sqlite.prepare("SELECT moderator_note FROM extensions WHERE id = 'repo'").get()?.moderator_note, null);
  // App notes use the same route under /admin/apps/:id/note.
  assert.equal((await request('/api/admin/apps/app/note', write({ note: 'App review needed', severity: 'danger' }))).response.status, 200);
  assert.equal((await (await request('/api/apps/app')).response.json()).data.moderatorNote, undefined, 'moderator notes must not be exposed publicly');
  const adminAppList = (await (await request('/api/admin/apps', auth)).response.json()).data;
  assert.equal(adminAppList.items.find((a: any) => a.id === 'app')?.moderatorNote, 'App review needed');
  assert.equal((await request('/api/admin/apps/app/note', write({ note: '', severity: 'warning' }))).response.status, 200);
  assert.equal(sqlite.prepare("SELECT moderator_note FROM apps WHERE id = 'app'").get()?.moderator_note, null);
  sqlite.exec("UPDATE admins SET totp_secret = NULL WHERE id = 'admin'");
  assert.equal((await request('/api/admin/settings', auth)).response.status, 403, '2FA changes take effect on next request');

  const plan = sqlite.prepare('EXPLAIN QUERY PLAN SELECT item_id FROM likes WHERE device_fingerprint = ?').all('fixture');
  assert.match(JSON.stringify(plan), /COVERING INDEX idx_likes_fingerprint_item/);
  console.log('PASS: cache hits use zero D1 queries; expiry, filters, CORS, auth/likes isolation, view counts, rate limits, 2FA and fingerprint index verified');
} finally {
  sqlite.close();
  Reflect.deleteProperty(globalThis, 'caches');
}
