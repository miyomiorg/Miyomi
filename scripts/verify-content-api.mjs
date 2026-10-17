import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import ts from 'typescript';

// Exercise the real frontend adapter against local Worker/D1, with disposable rows.
const base = process.env.WORKER_URL || 'http://127.0.0.1:8787';
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(new URL(base).hostname), 'Use a local Worker');
async function loadTs(path) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
  });
  return import(`data:text/javascript;base64,${Buffer.from(`${outputText}\n//# sourceURL=${path}`).toString('base64')}`);
}
const { http } = await loadTs('../src/services/api/http.ts');
const { contentPayload } = await loadTs('../src/services/api/contentPayload.ts');
const { totpCode } = await loadTs('../worker/lib/totp.ts');
const nativeFetch = globalThis.fetch;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'MiomiLocal123!';
const login = await nativeFetch(`${base}/api/admin/auth/login`, {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email: process.env.ADMIN_EMAIL || 'admin@miyomi.local', password: ADMIN_PASSWORD }),
});
assert.equal(login.status, 200, 'Local admin login (2FA circuit is covered by verify-2fa)');
const cookie = login.headers.get('set-cookie').split(';')[0];

// The admin section gate requires an enrolled authenticator — enrol now.
const enroll = await nativeFetch(`${base}/api/admin/auth/2fa/enroll`, {
  method: 'POST', headers: { 'content-type': 'application/json', cookie },
});
assert.equal(enroll.status, 200, '2FA enrolment start');
const enrollBody = await enroll.json();
const verify2fa = await nativeFetch(`${base}/api/admin/auth/2fa/enroll/verify`, {
  method: 'POST', headers: { 'content-type': 'application/json', cookie },
  body: JSON.stringify({
    enrollToken: enrollBody.data.enrollToken,
    code: await totpCode(enrollBody.data.setup.secret),
    currentPassword: ADMIN_PASSWORD,
  }),
});
assert.equal(verify2fa.status, 200, '2FA enrolment verify');
globalThis.fetch = (url, init = {}) => nativeFetch(new URL(url, base), {
  ...init, headers: { ...init.headers, cookie },
});
const cleanup = [];
const suffix = crypto.randomUUID();
try {
  for (const kind of ['apps', 'extensions']) {
    const root = `/admin/${kind}`;
    const name = `Migration check ${kind} ${suffix}`;
    const payload = contentPayload({ name, slug: `check-${kind}-${suffix}`, status: 'pending', short_description: 'Original', compatible_with: [], metadata: { shortDescription: 'Keep casing', install_urls: [{ url: 'https://example.com/repo', type: 'copy' }] }, seo_title: 'Keep SEO' }, []);
    const { id } = await http.post(root, payload);
    cleanup.push(`${root}/${id}`);
    let row = await http.get(`${root}/${id}`);
    assert.equal(row.status, 'pending', `${kind}: create respects status`);
    assert.equal(row.short_description, 'Original');
    await http.put(`${root}/${id}`, { shortDescription: 'Updated', slug: `updated-${kind}-${suffix}` });
    row = await http.get(`${root}/${id}`);
    assert.equal(row.name, name, `${kind}: partial update preserves name`);
    assert.equal(row.seo_title, 'Keep SEO');
    assert.equal(row.metadata.shortDescription, 'Keep casing');
    assert.equal(row.short_description, 'Updated');
    assert.equal(row.slug, `updated-${kind}-${suffix}`);
    const page = await http.get(`${root}?search=${encodeURIComponent(name)}&limit=1`);
    assert.equal(page.items[0].short_description, 'Updated', 'Paginated rows adapted');
    console.log(`PASS: ${kind} create, edit, metadata preservation, pagination`);
  }
  for (const kind of ['guides', 'blog']) {
    const root = `/admin/${kind}`;
    const { id } = await http.post(root, { title: `Check ${suffix}`, slug: `check-${kind}-${suffix}`, status: 'draft', content: '<p>First</p>', contentMode: 'html', contentFormat: 'html', isPinned: true, authorId: 'migration-test', seoTitle: 'SEO' });
    cleanup.push(`${root}/${id}`);
    let row = await http.get(`${root}/${id}`);
    assert.equal(row.seo_title, 'SEO');
    if (kind === 'blog') {
      assert.equal(row.is_pinned, true);
      assert.equal(row.author_id, 'migration-test');
    } else assert.equal(row.content_mode, 'html');
    await http.put(`${root}/${id}`, { content: '<p>Second</p>', isPinned: false, authorId: null });
    row = await http.get(`${root}/${id}`);
    assert.equal(row.content, '<p>Second</p>');
    if (kind === 'blog') { assert.equal(row.is_pinned, false); assert.equal(row.author_id, null); }
    console.log(`PASS: ${kind} create and edit fields`);
  }
  const { id } = await http.post('/admin/faqs', { question: `Check ${suffix}`, answer: '**Markdown**', contentFormat: 'markdown', orderIndex: 42 });
  cleanup.push(`/admin/faqs/${id}`);
  await http.put(`/admin/faqs/${id}`, { answer: '<p>HTML</p>', contentFormat: 'html', orderIndex: 43 });
  const faq = (await http.get('/admin/faqs')).find(row => row.id === id);
  assert.equal(faq.content_format, 'html');
  assert.equal(faq.order_index, 43);
  assert.equal(faq.answer, '<p>HTML</p>');
  console.log('PASS: FAQ format and display-order persistence');
} finally {
  for (const path of cleanup.reverse()) await http.delete(path);
  await http.post('/admin/auth/logout');
  // 2FA is one-way — reset the stored secret for the next run via D1 directly.
  execSync(
    `npx wrangler d1 execute miyomi-db --local --command "UPDATE admins SET totp_secret = NULL WHERE email = '${process.env.ADMIN_EMAIL || 'admin@miyomi.local'}';"`,
    { stdio: 'ignore' },
  );
  globalThis.fetch = nativeFetch;
}
console.log('PASS: disposable content rows deleted');
