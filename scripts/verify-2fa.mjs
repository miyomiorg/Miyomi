/**
 * End-to-end 2FA circuit against the LOCAL worker (uses the real auth flow).
 *
 *   npm run verify:2fa
 *
 * Covers: unconfigured login → session with totpEnabled=false; the admin
 * section gate (403 until enrolled); enrolment (enroll → verify with computed
 * code); gate opens; subsequent password login returns the '2fa_required'
 * stage and /login/complete works; one-step login with totpCode works;
 * wrong codes are rejected; and — by design — /2fa/disable is GONE (404),
 * so 2FA can never be disabled once enabled.
 *
 * Leaves the local admin un-enrolled again for other suites.
 */
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { totpCode } from '../worker/lib/totp.ts';

const base = process.env.WORKER_URL || 'http://127.0.0.1:8787';
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(new URL(base).hostname), 'Use a local Worker — these checks must never run against production');
const EMAIL = process.env.ADMIN_EMAIL || 'admin@miyomi.local';
const PASSWORD = process.env.ADMIN_PASSWORD || 'MiomiLocal123!';

const resetLocalTotp = () => {
  const safeEmail = EMAIL.replace(/'/g, "''");
  execSync(
    `npx wrangler d1 execute miyomi-db --local --command "UPDATE admins SET totp_secret = NULL, totp_last_step = NULL WHERE email = '${safeEmail}'; DELETE FROM rate_limits WHERE endpoint IN ('totp-fail', '/api/admin/auth/login', '/api/admin/auth/login/complete');"`,
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

const checks = [];
const check = (name, ok) => { checks.push([name, ok]); console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}`); };

resetLocalTotp();

// 1. Unconfigured login → full session with totpEnabled=false.
const login = await post('/api/admin/auth/login', { email: EMAIL, password: PASSWORD });
assert.equal(login.status, 200, JSON.stringify(await login.clone().json()));
const loginBody = await login.json();
check('unconfigured admin logs in with a session cookie', /miyomi_session=[^;]+/.test(login.headers.get('set-cookie') ?? ''));
check('session token is never returned in the body', !('token' in (loginBody.data ?? {})));
check('session reports totpEnabled=false', loginBody.data?.admin?.totpEnabled === false);
let cookie = login.headers.get('set-cookie').split(';')[0];

// 2. Admin sections are gated until enrolled (403, not 401).
const gated = await get('/api/admin/apps', cookie);
check('admin section gated before 2FA enrolment (403)', gated.status === 403);

const me0 = await get('/api/admin/auth/me', cookie);
check('/me still reachable before enrolment', me0.status === 200);

// 3. Enrol via the settings flow (enroll → verify with computed code + password).
const enroll = await post('/api/admin/auth/2fa/enroll', undefined, cookie);
assert.equal(enroll.status, 200, 'enroll start');
const enrollBody = await enroll.json();
const secret = enrollBody.data.setup.secret;
assert.ok(secret && typeof secret === 'string' && secret.length >= 32, 'secret issued');

const badVerify = await post('/api/admin/auth/2fa/enroll/verify', {
  enrollToken: enrollBody.data.enrollToken,
  code: '000000',
  currentPassword: PASSWORD,
}, cookie);
check('enrolment rejects a wrong code', badVerify.status === 401);

const verify = await post('/api/admin/auth/2fa/enroll/verify', {
  enrollToken: enrollBody.data.enrollToken,
  code: await totpCode(secret),
  currentPassword: PASSWORD,
}, cookie);
check('enrolment completes with a valid code', verify.status === 200 && (await verify.json()).data?.enabled === true);
// Enrolment revokes older sessions and re-issues the caller's cookie.
const oldCookie = cookie;
const reissued = verify.headers.get('set-cookie');
check('enrolment re-issues the current session cookie', Boolean(reissued));
if (reissued) cookie = reissued.split(';')[0];
check('pre-enrolment session is revoked', (await get('/api/admin/auth/me', oldCookie)).status === 401);

const me1 = await get('/api/admin/auth/me', cookie);
check('/me reports totpEnabled=true after enrolment', (await me1.json()).data?.admin?.totpEnabled === true);

const open = await get('/api/admin/apps', cookie);
check('admin section opens after enrolment', open.status === 200);

// 4. Subsequent password login → staged 2fa_required → /login/complete works.
const relogin = await post('/api/admin/auth/login', { email: EMAIL, password: PASSWORD });
const reloginBody = await relogin.json();
check('configured login requires the 2FA stage', reloginBody.data?.loginStage === '2fa_required');

// The pending 2FA ticket must never work as a session (C1 regression).
const bearerPending = await fetch(base + '/api/admin/auth/me', {
  headers: { authorization: `Bearer ${reloginBody.data.pendingToken}` },
});
check('pending 2FA token is rejected as a session', bearerPending.status === 401);
const bearerApps = await fetch(base + '/api/admin/apps', {
  headers: { authorization: `Bearer ${reloginBody.data.pendingToken}` },
});
check('pending 2FA token cannot reach admin sections', bearerApps.status === 401);

// The enrolment code's step was consumed; use the next step (accepted by the ±1 window).
const STEP = 30_000;
const nextStepCode = () => totpCode(secret, Date.now() + STEP);

const wrongComplete = await post('/api/admin/auth/login/complete', {
  pendingToken: reloginBody.data.pendingToken,
  code: '000000',
});
check('login/complete rejects a wrong code', wrongComplete.status === 401);

const completeCode = await nextStepCode();
const complete = await post('/api/admin/auth/login/complete', {
  pendingToken: reloginBody.data.pendingToken,
  code: completeCode,
});
check('login/complete issues the session', complete.status === 200);
const cookie2 = complete.headers.get('set-cookie').split(';')[0];
const me2 = await get('/api/admin/auth/me', cookie2);
check('completed session is authenticated', me2.status === 200);

// Replaying the same code must fail.
const replay = await post('/api/admin/auth/login', { email: EMAIL, password: PASSWORD, totpCode: completeCode });
check('a used TOTP code cannot be replayed', replay.status === 401);

// 5. One-step login with totpCode in the password call — wait for a fresh step.
await new Promise((r) => setTimeout(r, STEP - (Date.now() % STEP) + 500));
const oneStep = await post('/api/admin/auth/login', { email: EMAIL, password: PASSWORD, totpCode: await nextStepCode() });
check('one-step login (password + totpCode) issues a session', oneStep.status === 200 && /miyomi_session=/.test(oneStep.headers.get('set-cookie') ?? ''));

// 6. 2FA can never be disabled: the endpoint no longer exists.
const disable = await post('/api/admin/auth/2fa/disable', { currentPassword: PASSWORD }, cookie);
check('2FA cannot be disabled (endpoint removed → 404)', disable.status === 404);

// 7. Wrong totpCode at the password step is rejected.
const wrongOneStep = await post('/api/admin/auth/login', { email: EMAIL, password: PASSWORD, totpCode: '000000' });
check('wrong one-step totpCode → 401', wrongOneStep.status === 401);

resetLocalTotp();
const failed = checks.filter(([, ok]) => !ok).length;
console.log(`\n2FA CIRCUIT: ${checks.length - failed}/${checks.length} passed`);
process.exit(failed ? 1 : 0);