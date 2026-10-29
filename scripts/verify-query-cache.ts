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
  async delete(key: Request) { return entries.delete(key.url); },
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
  } }; },
  // D1 batch: sequential statements in one transaction (each still counts as a statement).
  async batch(statements: Array<{ all(): Promise<{ results: unknown[] }> }>) {
    sqlite.exec('BEGIN');
    try {
      const out = [];
      for (const s of statements) out.push(await s.all());
      sqlite.exec('COMMIT');
      return out;
    } catch (error) { sqlite.exec('ROLLBACK'); throw error; }
  } },
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
  entries.clear();
  const burstBefore = queries;
  const burst = await Promise.all(Array.from({ length: 20 }, () => request('/api/apps')));
  console.log(`Concurrent cold app-list requests: ${queries - burstBefore} SQL statements for 20 requests`);
  assert.equal(queries - burstBefore, 1, 'concurrent cold misses should share one handler');
  assert.ok(burst.every(r => r.response.status === 200));
  now += 61_000;
  const expiredBefore = queries;
  await Promise.all(Array.from({ length: 20 }, (_, i) => request('/api/apps', { headers: { Origin: `https://caller-${i}.test` } }).then(r => {
    assert.equal(r.response.headers.get('Access-Control-Allow-Origin'), `https://caller-${i}.test`);
  })));
  assert.equal(queries - expiredBefore, 1, 'expired-cache bursts must also coalesce');
  assert.equal((await request('/api/apps', { headers: { Cookie: 'miyomi_session=editor' } })).queries, 1);
  assert.equal((await request('/api/apps', { headers: { Authorization: 'Bearer editor' } })).queries, 1);

  await request('/api/guides?category=setup');
  result = await request('/api/guides?category=other');
  assert.equal(result.queries, 1, 'filters must have independent cache keys');
  assert.deepEqual((await result.response.json()).data, []);
  assert.equal((await request('/api/guides?category=setup&utm_source=test')).queries, 0);
  // Missing slugs are cached briefly (bot probes stop costing D1 lookups).
  result = await request('/api/apps/missing');
  assert.equal(result.response.status, 404);
  assert.equal(result.queries, 1);
  result = await request('/api/apps/missing');
  assert.equal(result.response.status, 404, 'cached 404 keeps its status');
  assert.equal(result.queries, 0, '404s are cached for a short window');
  now += 31_000;
  assert.equal((await request('/api/apps/missing')).queries, 1, '404 cache expires after ~30s');

  // ETag revalidation: unchanged data answers 304 with no body and no D1 work.
  entries.clear();
  const fresh = await request('/api/apps');
  const etag = fresh.response.headers.get('ETag');
  assert.match(etag ?? '', /^"[0-9a-f]{24}"$/);
  const revalidated = await request('/api/apps', { headers: { 'If-None-Match': etag! } });
  assert.equal(revalidated.response.status, 304);
  assert.equal(revalidated.queries, 0);
  assert.equal(await revalidated.response.text(), '');
  const stale = await request('/api/apps', { headers: { 'If-None-Match': '"0000"' } });
  assert.equal(stale.response.status, 200, 'a different ETag gets the full body');
  assert.equal((await request('/sitemap.xml')).queries, 4);
  assert.equal((await request('/sitemap.xml?utm_source=test')).queries, 0);
  assert.equal((await request('/software/app')).queries, 1);
  assert.equal((await request('/software/app')).queries, 0);
  assert.equal((await request('/api/likes/registry?fingerprint=first')).queries, 3);
  assert.equal((await request('/api/likes/registry?fingerprint=second')).queries, 3);
  sqlite.exec(`INSERT INTO likes (id, item_id, item_type, device_fingerprint) VALUES ('like-a', 'app', 'app', 'first');`);
  const countsBefore = queries;
  await Promise.all(Array.from({ length: 20 }, () => request('/api/likes/counts')));
  assert.equal(queries - countsBefore, 2, '20 public count requests need only two table reads');
  assert.equal((await request('/api/likes/counts')).queries, 0);
  for (const fingerprint of ['first', 'second']) {
    const mine = await request(`/api/likes/mine?fingerprint=${fingerprint}`);
    assert.equal(mine.queries, 1, 'only the indexed personal lookup is per visitor');
    assert.equal(mine.response.headers.get('Cache-Control'), 'private, no-store');
    assert.equal(mine.response.headers.get('X-Cache'), null);
    assert.deepEqual((await mine.response.json()).data, fingerprint === 'first' ? ['app'] : []);
  }
  const blogList = (await (await request('/api/blog')).response.json()).data;
  assert.equal(blogList[0].content, undefined, 'list must not download article bodies');
  assert.equal(blogList[0].readingMinutes, 1);
  // Home page counts: three COUNTs in one batch, then edge-cached.
  result = await request('/api/counts');
  assert.equal(result.queries, 3);
  assert.deepEqual((await result.response.json()).data, { apps: 1, extensions: 0, guides: 1 });
  assert.equal((await request('/api/counts')).queries, 0, 'counts are edge-cached');

  // Blog detail is a cacheable read; views are counted by the POST beacon.
  result = await request('/api/blog/post');
  assert.equal(result.queries, 1);
  assert.equal((await result.response.json()).data.views, 0);
  assert.equal((await request('/api/blog/post')).queries, 0, 'blog detail cache hit uses zero D1 queries');
  for (let views = 1; views <= 2; views++) {
    result = await request('/api/blog/post/view', { method: 'POST' });
    assert.equal(result.queries, 1);
    assert.equal((await result.response.json()).data.views, views);
  }
  assert.equal(sqlite.prepare("SELECT views FROM blog_posts WHERE id = 'post'").get()?.views, 2);

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
  assert.equal(result.queries, 4, 'one batched session read (admin + role + perms) + settings; no duplicate 2FA read');
  const write = (body: unknown) => ({ method: 'PUT', headers: { ...auth.headers, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  // Prime BOTH list and detail before writes, then verify invalidation.
  await request('/api/apps');
  await request('/api/apps/app');
  assert.equal((await request('/api/admin/apps/app/note', write({ note: 'Fresh notice', severity: 'info' }))).response.status, 200);
  assert.equal((await (await request('/api/apps/app')).response.json()).data.moderatorNote, 'Fresh notice');
  assert.equal((await (await request('/api/apps')).response.json()).data[0].moderatorNote, 'Fresh notice');
  assert.equal((await request('/api/apps')).queries, 0, 'updated responses are reusable');
  // Failed/unauthorized writes must not evict good public data.
  assert.equal((await request('/api/admin/apps/app/note', { method: 'PUT', body: '{}' })).response.status, 401);
  assert.equal((await request('/api/apps')).queries, 0);

  for (let i = 0; i < 55; i++) sqlite.prepare('INSERT INTO donations (id, donor_name, is_public, amount) VALUES (?, ?, 1, 1)').run(`donor-${i}`, `Donor ${i}`);
  sqlite.exec("INSERT INTO donations (id, donor_name, is_public) VALUES ('private-donor', 'Private', 0)");
  const donors = (await (await request('/api/donations?limit=200&offset=0')).response.json()).data;
  assert.equal(donors.length, 55);
  assert.ok(donors.every((d: any) => d.id !== 'private-donor'));

  const leaderboard = await request('/api/donations/leaderboard?limit=3');
  assert.equal(leaderboard.queries, 2, 'one aggregate page + one summary query');
  const leaderboardPage = (await leaderboard.response.json()).data;
  assert.equal(leaderboardPage.total, 55);
  assert.equal(leaderboardPage.totalRaisedUsd, 55);
  assert.equal(leaderboardPage.top.length, 3);
  assert.deepEqual(leaderboardPage.top.map((item: any) => item.rank), [1, 2, 3]);
  assert.equal(leaderboardPage.items.length, 3);
  assert.ok(leaderboardPage.items.every((item: any) => item.rank === null), 'recent entries are not ranked');
  assert.equal(leaderboardPage.top[0].totalUsd, null, 'hidden per-donor amounts must not be returned');
  assert.equal(leaderboardPage.top[0].amountHidden, true);
  assert.ok(leaderboardPage.nextCursor, 'more supporters should produce a cursor');
  assert.equal((await request('/api/donations/leaderboard?limit=3')).queries, 0, 'leaderboard cache hit must use zero D1 queries');

  const nextPage = await request(`/api/donations/leaderboard?limit=3&cursor=${encodeURIComponent(leaderboardPage.nextCursor)}`);
  assert.equal(nextPage.queries, 2);
  const nextPageBody = (await nextPage.response.json()).data;
  assert.equal(nextPageBody.top.length, 0, 'later pages must not repeat the podium');
  assert.equal(nextPageBody.items.length, 3);
  const seenKeys = new Set([...leaderboardPage.top, ...leaderboardPage.items, ...nextPageBody.items].map((item: any) => item.key));
  assert.equal(seenKeys.size, 9, 'cursor pagination must not duplicate supporters');

  const added = await request('/api/admin/donations', { ...write({ donorName: 'New donor', amount: 3, isPublic: true, showAmount: true }), method: 'POST' });
  assert.equal(added.response.status, 201);
  assert.equal((await (await request('/api/donations?limit=200')).response.json()).data.length, 56);

  const refreshedLeaderboard = await request('/api/donations/leaderboard?limit=3');
  assert.equal(refreshedLeaderboard.queries, 2, 'admin donation writes invalidate the leaderboard cache');
  const refreshedPage = (await refreshedLeaderboard.response.json()).data;
  assert.equal(refreshedPage.total, 56);
  assert.equal(refreshedPage.totalRaisedUsd, 58);
  assert.equal(refreshedPage.top[0].displayName, 'New donor');
  assert.equal(refreshedPage.top[0].totalUsd, 3);
  assert.equal(refreshedPage.top[0].rank, 1);

  sqlite.exec(`INSERT INTO donations (id, donor_name, is_public, amount, show_amount) VALUES
    ('anon-a', 'Anonymous', 1, 5, 1),
    ('anon-b', 'Anonymous', 1, 7, 1),
    ('hidden-name', 'Private Tester', 1, 100, 0);`);
  const edgePage = (await (await request('/api/donations/leaderboard?limit=50')).response.json()).data;
  const allEdgeItems = [...edgePage.top, ...edgePage.items];
  const anonymous = allEdgeItems.filter((item: any) => item.displayName === 'Anonymous');
  assert.equal(anonymous.length, 2, 'generic anonymous donations must remain separate supporters');
  assert.deepEqual(anonymous.map((item: any) => item.totalUsd).sort((a: number, b: number) => a - b), [5, 7]);
  const hiddenSupporter = allEdgeItems.find((item: any) => item.displayName === 'Private Tester');
  assert.equal(hiddenSupporter.rank, 1);
  assert.equal(hiddenSupporter.amountHidden, true);
  assert.equal(hiddenSupporter.totalUsd, null, 'a hidden supporter total must not leak through the API');
  sqlite.exec("DELETE FROM donations WHERE id IN ('anon-a', 'anon-b', 'hidden-name');");

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
  assert.equal((await request('/api/admin/extensions/repo/note', write({ note: 'Needs review', severity: 'warning', sticky: true }))).response.status, 200);
  const publicRepo = (await (await request('/api/extensions/repo')).response.json()).data;
  assert.equal(publicRepo.moderatorNote, 'Needs review', 'public note should be visible on the public API');
  assert.equal(publicRepo.noticeSticky, true, 'sticky flag should persist on the note');
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
  assert.equal((await (await request('/api/apps/app')).response.json()).data.moderatorNote, 'App review needed', 'public note should be visible on the public API');
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
