import assert from 'node:assert/strict';
import { Hono } from 'hono';
import { publicCache } from '../worker/lib/public-cache.ts';
import type { AppEnv } from '../worker/lib/http.ts';

function gate() {
  let release!: () => void;
  const task = new Promise<void>(resolve => { release = resolve; });
  return { task, release };
}
const entries = new Map<string, Response>();
let putGate: ReturnType<typeof gate> | null = null;
let putStarted = gate();
Object.defineProperty(globalThis, 'caches', { configurable: true, value: { default: {
  async match(key: Request) { return entries.get(key.url)?.clone(); },
  async put(key: Request, response: Response) {
    const wait = putGate;
    putGate = null;
    putStarted.release();
    if (wait) await wait.task;
    entries.set(key.url, new Response(await response.text(), response));
  },
  async delete(key: Request) { return entries.delete(key.url); },
} } });

const app = new Hono<AppEnv>();
app.use('*', publicCache);
let value = 'old';
let calls = 0;
let readGate: ReturnType<typeof gate> | null = null;
let readStarted = gate();
app.get('/api/apps', async c => {
  calls++;
  const snapshot = c.req.header('authorization') || c.req.header('cookie') || value;
  const wait = readGate;
  readGate = null;
  readStarted.release();
  if (wait) await wait.task;
  return c.text(snapshot);
});
app.put('/api/admin/apps/a', c => { value = 'new'; return c.text('saved'); });
app.get('/api/apps/private', c => {
  calls++;
  c.header('Set-Cookie', `personal=${calls}`);
  return c.text(`private-${calls}`);
});
app.get('/api/apps/vary', c => { calls++; c.header('Vary', '*'); return c.text('variable'); });
app.get('/api/apps/no-store', c => { calls++; c.header('Cache-Control', 'private, no-store'); return c.text(`secret-${calls}`); });
let fail = true;
app.get('/api/apps/failure', c => { calls++; return c.text(fail ? 'failed' : 'recovered', fail ? 500 : 200); });
const env = { DB: {} } as AppEnv['Bindings'];
const request = (path = '/api/apps', init?: RequestInit) => app.request(`https://test.invalid${path}`, init, env);

try {
  // Authenticated readers must not join an anonymous flight or populate its cache.
  readGate = gate();
  let unblock = readGate;
  let leader = request();
  await readStarted.task;
  const cookie = await request('/api/apps', { headers: { Cookie: 'miyomi_session=abc' } });
  const bearer = await request('/api/apps', { headers: { Authorization: 'Bearer abc' } });
  assert.equal(cookie.headers.get('Cache-Control'), 'private, no-store');
  assert.equal(bearer.headers.get('Cache-Control'), 'private, no-store');
  assert.equal(await cookie.text(), 'miyomi_session=abc');
  assert.equal(await bearer.text(), 'Bearer abc');
  assert.equal(calls, 3);
  assert.equal(entries.size, 0);
  unblock.release(); await leader;
  assert.equal(await (await request()).text(), 'old', 'anonymous cache must not contain authenticated content');

  // A read started BEFORE a successful write must not refill the cache afterward.
  entries.clear(); readStarted = gate(); readGate = gate(); unblock = readGate;
  leader = request(); await readStarted.task;
  await request('/api/admin/apps/a', { method: 'PUT' });
  assert.equal(await (await request()).text(), 'new');
  unblock.release(); await leader;
  assert.equal(await (await request()).text(), 'new');

  // Same race, but the old cache.put itself is still outstanding during the write.
  entries.clear(); value = 'old'; putStarted = gate(); putGate = gate(); unblock = putGate;
  leader = request(); await putStarted.task;
  await request('/api/admin/apps/a', { method: 'PUT' });
  unblock.release(); await leader;
  assert.equal(await (await request()).text(), 'new');

  for (const path of ['/api/apps/private', '/api/apps/no-store', '/api/apps/vary', '/api/apps/failure']) {
    const before = calls;
    const responses = await Promise.all(Array.from({ length: 5 }, () => request(path)));
    assert.equal(calls - before, 5, 'private/vary/error responses are never shared');
    assert.ok(responses.every(r => r.headers.get('X-Cache') !== 'HIT'));
    if (path.endsWith('private')) assert.equal(new Set(await Promise.all(responses.map(r => r.text()))).size, 5);
  }
  fail = false;
  assert.equal(await (await request('/api/apps/failure')).text(), 'recovered');
  assert.equal((await request('/api/apps/failure')).headers.get('X-Cache'), 'HIT');
  console.log('PASS: auth flight isolation; Set-Cookie/Vary/error exclusion; error recovery; write-vs-read and write-vs-cache.put invalidation races');
} finally { Reflect.deleteProperty(globalThis, 'caches'); }
