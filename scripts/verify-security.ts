import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { app } from '../worker/index.ts';
import { signSession, decryptTotpSecret, encryptTotpSecret } from '../worker/lib/auth.ts';
import { CONTENT_SECURITY_POLICY } from '../worker/lib/security.ts';
import { safeLink, stripSubmitterPrivileged } from '../worker/lib/sanitize.ts';
import type { Bindings } from '../worker/env';

/**
 * Security + regression checks (audit 2026-10-29, phases 2–3) against the
 * real Worker app and disposable SQLite. No local D1 data is touched.
 *
 *   node scripts/verify-security.ts
 */
const sqlite = new DatabaseSync(':memory:');
Object.defineProperty(globalThis, 'caches', { configurable: true, value: { default: {
  async match() { return undefined; }, async put() {}, async delete() { return true; },
} } });
const env = {
  SITE_URL: 'https://miyomi.test', SESSION_SECRET: 'test-only-session-secret',
  ASSETS: { fetch: async () => new Response('<html><head><!--SEO_START--><!--SEO_END--></head></html>', { headers: { 'Content-Type': 'text/html' } }) },
  DB: {
    prepare(sql: string) { return { bind(...params: Array<string | number | null>) { return {
      async raw() { return sqlite.prepare(sql).all(...params).map(row => Object.values(row as object)); },
      async all() { return { results: sqlite.prepare(sql).all(...params) }; },
      async run() { return { success: true, meta: sqlite.prepare(sql).run(...params) }; },
    }; } }; },
    async batch(statements: Array<{ all(): Promise<{ results: unknown[] }> }>) {
      sqlite.exec('BEGIN');
      try { const out = []; for (const s of statements) out.push(await s.all()); sqlite.exec('COMMIT'); return out; }
      catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    },
  },
} as unknown as Bindings;

const request = (path: string, init?: RequestInit) =>
  app.request(`https://miyomi.test${path}`, init, env, { waitUntil() {}, passThroughOnException() {} } as unknown as ExecutionContext);

let passed = 0;
const check = async (name: string, fn: () => Promise<void> | void) => {
  await fn();
  passed++;
  console.log(`  PASS  ${name}`);
};

try {
  const migrations = new URL('../worker/db/drizzle/', import.meta.url);
  for (const file of readdirSync(migrations).filter(f => f.endsWith('.sql')).sort()) {
    sqlite.exec(readFileSync(new URL(file, migrations), 'utf8'));
  }
  sqlite.exec(`
    INSERT INTO apps (id, name, slug, status, updated_at) VALUES ('app-1', 'App', 'app', 'approved', 'not-a-date');
    INSERT INTO extensions (id, name, slug, status) VALUES ('ext-1', 'Ext', 'ext', 'approved');
    INSERT INTO guides (id, title, slug, status, category, content_format) VALUES
      ('g-pub', 'Public', 'public-guide', 'published', 'setup', 'markdown'),
      ('g-pend', 'Pending', 'pending-guide', 'pending', 'setup', 'markdown'),
      ('g-arch', 'Archived', 'archived-guide', 'archived', 'setup', 'markdown');
    INSERT INTO compatibility_groups (id, name) VALUES ('grp', 'Group');
    INSERT INTO app_group_memberships (app_id, group_id) VALUES ('app-1', 'grp');
    INSERT INTO admins (id, email, totp_secret) VALUES ('admin', 'admin@example.test', 'enrolled');
    INSERT INTO user_roles (id, user_id, role) VALUES ('r1', 'admin', 'super_admin');
    INSERT INTO admins (id, email, totp_secret) VALUES ('adm2', 'admin2@example.test', 'enrolled');
    INSERT INTO user_roles (id, user_id, role) VALUES ('r2', 'adm2', 'admin');
  `);
  const token = await signSession({ sub: 'admin' }, env.SESSION_SECRET, 600);
  const cookie = `miyomi_session=${token}`;
  const json = { 'Content-Type': 'application/json' };

  console.log('\n== Regressions from phase 2 ==');
  await check('saving a group with an UNCHANGED member list succeeds', async () => {
    const res = await request('/api/admin/groups/grp', {
      method: 'PUT', headers: { ...json, Cookie: cookie }, body: JSON.stringify({ appIds: ['app-1'], extensionIds: [] }),
    });
    assert.equal(res.status, 200, await res.clone().text());
    assert.equal(sqlite.prepare("SELECT count(*) n FROM app_group_memberships WHERE group_id='grp'").get()?.n, 1);
  });
  await check('group save ignores unknown ids instead of failing on the FK', async () => {
    const res = await request('/api/admin/groups/grp', {
      method: 'PUT', headers: { ...json, Cookie: cookie }, body: JSON.stringify({ appIds: ['app-1', 'missing-app'] }),
    });
    assert.equal(res.status, 200);
  });
  await check('a malformed updated_at does not break /sitemap.xml', async () => {
    const res = await request('/sitemap.xml');
    assert.equal(res.status, 200);
    assert.match(await res.text(), /\/software\/app<\/loc>/);
  });
  await check('non-public guide statuses are hidden (list, detail, SEO)', async () => {
    const list = (await (await request('/api/guides')).json()).data as Array<{ slug: string }>;
    assert.deepEqual(list.map(g => g.slug), ['public-guide']);
    assert.equal((await request('/api/guides/pending-guide')).status, 404);
    assert.equal((await request('/api/guides/archived-guide')).status, 404);
    assert.equal((await request('/guides/pending-guide')).status, 404);
  });

  console.log('\n== Headers / CORS / CSRF / limits ==');
  await check('security headers on API responses', async () => {
    const res = await request('/api/apps');
    assert.equal(res.headers.get('X-Content-Type-Options'), 'nosniff');
    assert.equal(res.headers.get('X-Frame-Options'), 'DENY');
    assert.match(res.headers.get('Strict-Transport-Security') ?? '', /max-age=31536000/);
  });
  await check('CSP on HTML pages, frame-ancestors none, no inline scripts allowed', async () => {
    const res = await request('/software/app');
    const csp = res.headers.get('Content-Security-Policy') ?? '';
    assert.match(csp, /frame-ancestors 'none'/);
    assert.doesNotMatch(csp, /script-src[^;]*'unsafe-inline'/);
  });
  await check('public/_headers CSP matches worker/lib/security.ts', () => {
    const headersFile = readFileSync(new URL('../public/_headers', import.meta.url), 'utf8');
    const line = headersFile.split('\n').find(l => l.trim().startsWith('Content-Security-Policy:'));
    assert.equal(line?.trim().slice('Content-Security-Policy:'.length).trim(), CONTENT_SECURITY_POLICY);
  });
  await check('admin API CORS does not echo untrusted origins; public API stays open', async () => {
    const admin = await request('/api/admin/auth/me', { headers: { Origin: 'https://evil.test' } });
    assert.equal(admin.headers.get('Access-Control-Allow-Origin'), null);
    const pub = await request('/api/apps', { headers: { Origin: 'https://third-party.test' } });
    assert.equal(pub.headers.get('Access-Control-Allow-Origin'), 'https://third-party.test');
  });
  await check('cross-site admin write is blocked (CSRF), same-origin allowed', async () => {
    const body = JSON.stringify({ value: true });
    const evil = await request('/api/admin/settings/csrf_probe', {
      method: 'PUT', headers: { ...json, Cookie: cookie, Origin: 'https://evil.test', 'Sec-Fetch-Site': 'cross-site' }, body,
    });
    assert.equal(evil.status, 403);
    const formPost = await request('/api/admin/settings/csrf_probe', {
      method: 'PUT', headers: { 'Content-Type': 'text/plain', Cookie: cookie, Origin: 'https://evil.test' }, body,
    });
    assert.equal(formPost.status, 403, 'text/plain "simple request" CSRF must be blocked too');
    const same = await request('/api/admin/settings/csrf_probe', {
      method: 'PUT', headers: { ...json, Cookie: cookie, Origin: 'https://miyomi.test', 'Sec-Fetch-Site': 'same-origin' }, body,
    });
    assert.equal(same.status, 200);
  });
  await check('oversized public request bodies are rejected (413)', async () => {
    const res = await request('/api/feedback', {
      method: 'POST', headers: { ...json, 'Content-Length': String(300 * 1024) }, body: 'x'.repeat(300 * 1024),
    });
    assert.equal(res.status, 413);
  });
  await check('Turnstile fails closed when the secret is missing (non-local host)', async () => {
    const res = await request('/api/feedback', { method: 'POST', headers: json, body: JSON.stringify({ message: 'hi', token: 'fake' }) });
    assert.equal(res.status, 400);
    const login = await request('/api/admin/auth/login', { method: 'POST', headers: json, body: JSON.stringify({ email: 'admin@example.test', password: 'x' }) });
    assert.equal(login.status, 400, 'login must demand the CAPTCHA when Turnstile is not configured');
  });
  await check('only super admins can delete audit log entries; deletions are logged', async () => {
    sqlite.exec("INSERT INTO admin_logs (id, action, resource_type) VALUES ('log-1', 'x', 'y')");
    const adminToken = await signSession({ sub: 'adm2' }, env.SESSION_SECRET, 600);
    const denied = await request('/api/admin/logs/log-1', { method: 'DELETE', headers: { Cookie: `miyomi_session=${adminToken}` } });
    assert.equal(denied.status, 403);
    const allowed = await request('/api/admin/logs/log-1', { method: 'DELETE', headers: { Cookie: cookie } });
    assert.equal(allowed.status, 200);
    assert.equal(sqlite.prepare("SELECT count(*) n FROM admin_logs WHERE action='logs.delete' AND resource_id='log-1'").get()?.n, 1);
  });

  console.log('\n== Content hygiene ==');
  await check('dangerous link schemes are rejected, legitimate forms kept', () => {
    for (const bad of ['javascript:alert(1)', ' JavaScript:alert(1)', 'java\tscript:alert(1)', 'data:text/html,x', 'vbscript:x', 'javascript&colon;alert(1)']) {
      assert.equal(safeLink(bad), null, bad);
    }
    for (const good of ['https://github.com/x/y', 'tachiyomi://add-repo?url=x', 'gh:owner/repo', 'github.com/org', '/software/kotatsu', 'paperback:']) {
      assert.equal(safeLink(good), good, good);
    }
  });
  await check('admin writes strip javascript: links', async () => {
    const res = await request('/api/admin/apps', {
      method: 'POST', headers: { ...json, Cookie: cookie },
      body: JSON.stringify({ name: 'Xss App', downloadUrl: 'javascript:alert(1)', websiteUrl: 'https://ok.test' }),
    });
    assert.equal(res.status, 201);
    const row = sqlite.prepare("SELECT download_url, website_url FROM apps WHERE name='Xss App'").get();
    assert.equal(row?.download_url, null);
    assert.equal(row?.website_url, 'https://ok.test');
  });
  await check('submitters cannot set counters, slug, status, SEO or arbitrary metadata', () => {
    const out = stripSubmitterPrivileged({
      name: 'A', likes_count: 9999, downloadCount: 5, slug: 'hijack', status: 'approved', seo_title: 'x',
      metadata: { install_urls: [{ url: 'https://x' }], evil: true },
    });
    assert.deepEqual(out, { name: 'A', metadata: { install_urls: [{ url: 'https://x' }] } });
  });
  await check('approving a stored submission re-strips privileged fields', async () => {
    sqlite.prepare("INSERT INTO submissions (id, submission_type, status, submitted_data) VALUES ('sub-1', 'app', 'pending', ?)")
      .run(JSON.stringify({ name: 'Old Sub', likes_count: 5000, slug: 'chosen-slug' }));
    const res = await request('/api/admin/submissions/sub-1/approve', { method: 'POST', headers: { ...json, Cookie: cookie }, body: '{}' });
    assert.equal(res.status, 200, await res.clone().text());
    const row = sqlite.prepare("SELECT slug, likes_count FROM apps WHERE name='Old Sub'").get();
    assert.equal(row?.likes_count, 0);
    assert.equal(row?.slug, 'old-sub');
  });
  await check('2FA secrets: new v2 (HKDF) encryption round-trips; legacy values still decrypt', async () => {
    const v2 = await encryptTotpSecret('JBSWY3DPEHPK3PXP', env.SESSION_SECRET!);
    assert.match(v2, /^v2\./);
    assert.equal(await decryptTotpSecret(v2, env.SESSION_SECRET!), 'JBSWY3DPEHPK3PXP');
    // Legacy v1 = AES-GCM keyed by SHA-256(secret), format <iv>.<ct>
    const keyBytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(env.SESSION_SECRET!)));
    const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt']);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode('LEGACYSECRET')));
    const b64 = (b: Uint8Array) => Buffer.from(b).toString('base64url');
    assert.equal(await decryptTotpSecret(`${b64(iv)}.${b64(ct)}`, env.SESSION_SECRET!), 'LEGACYSECRET');
  });

  console.log(`\nSECURITY SUITE: ${passed} passed`);
} finally {
  sqlite.close();
  Reflect.deleteProperty(globalThis, 'caches');
}
