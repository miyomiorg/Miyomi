/**
 * End-to-end check of GET /admin/analytics against the LOCAL worker.
 *
 *   npm run verify:analytics
 *
 * The local worker needs CF_API_TOKEN + CF_ZONE_ID in .dev.vars to reach the
 * Cloudflare GraphQL API; when they are missing the endpoint returns the
 * documented 500 and this script exits cleanly with a SKIP (so the suite stays
 * green on machines without analytics credentials).
 */
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { totpCode } from '../worker/lib/totp.ts';

const base = process.env.WORKER_URL || 'http://127.0.0.1:8787';
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(new URL(base).hostname), 'Use a local Worker — these checks must never run against production');
const EMAIL = process.env.ADMIN_EMAIL || 'admin@miyomi.local';
const PASSWORD = process.env.ADMIN_PASSWORD || 'MiomiLocal123!';

const resetTotp = () => {
  const safeEmail = EMAIL.replace(/'/g, "''");
  execSync(
    `npx wrangler d1 execute miyomi-db --local --command "UPDATE admins SET totp_secret = NULL WHERE email = '${safeEmail}';"`,
    { stdio: 'ignore' },
  );
};
const post = (path, body, cookie) =>
  fetch(base + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const get = (path, cookie) => fetch(base + path, { headers: { cookie } });

resetTotp();

// Log in (unconfigured → session) and enrol 2FA to open the admin gate.
const login = await post('/api/admin/auth/login', { email: EMAIL, password: PASSWORD });
assert.equal(login.status, 200, 'login');
const cookie = login.headers.get('set-cookie').split(';')[0];
const enroll = await post('/api/admin/auth/2fa/enroll', undefined, cookie);
assert.equal(enroll.status, 200, 'enroll');
const enrollBody = await enroll.json();
const verify = await post('/api/admin/auth/2fa/enroll/verify', {
  enrollToken: enrollBody.data.enrollToken,
  code: await totpCode(enrollBody.data.setup.secret),
  currentPassword: PASSWORD,
}, cookie);
assert.equal(verify.status, 200, '2fa verify');

const res = await get('/api/admin/analytics?days=7', cookie);
const body = await res.json().catch(() => null);
if (res.status === 500 && /credentials not configured/i.test(body?.error ?? '')) {
  console.log('SKIP: local worker has no CF_API_TOKEN/CF_ZONE_ID — add them to .dev.vars to run this check.');
  resetTotp();
  process.exit(0);
}
assert.equal(res.status, 200, `analytics ${res.status}: ${JSON.stringify(body).slice(0, 200)}`);
const d = body.data;
assert.ok(Array.isArray(d.series) && d.series.length > 0, 'daily series present');
assert.ok(typeof d.totals.uniques === 'number' && d.totals.uniques > 0, 'totals.uniques > 0');
assert.ok(typeof d.series[0].uniques === 'number', 'series includes per-day uniques');
assert.ok(typeof d.totals.requests === 'number' && d.totals.requests > 0, 'totals.requests > 0');
assert.ok(typeof d.totals.pageViews === 'number', 'pageViews present');
assert.ok(Array.isArray(d.countries) && d.countries.length > 0, 'country breakdown present');
assert.ok(Array.isArray(d.browsers), 'browser breakdown present');
assert.ok(Array.isArray(d.adaptive.pages) && Array.isArray(d.adaptive.devices) && Array.isArray(d.adaptive.oss), 'adaptive breakdowns present');
console.log('PASS: analytics totals =', JSON.stringify({
  requests: d.totals.requests, pageViews: d.totals.pageViews,
  countries: d.countries.length, browsers: d.browsers.length,
  pages: d.adaptive.pages.length, devices: d.adaptive.devices.length,
}));
resetTotp();
console.log('PASS: analytics endpoint returns mapped Cloudflare zone data');