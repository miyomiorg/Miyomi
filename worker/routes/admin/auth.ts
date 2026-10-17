import { count, eq } from 'drizzle-orm';
import { Hono, type Context } from 'hono';
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SEC,
  SESSION_SHORT_AGE_SEC,
  decryptTotpSecret,
  encryptTotpSecret,
  hashPassword,
  loadPermissions,
  loadRole,
  requireAdmin,
  signSession,
  verifyPassword,
  verifySession,
  type Role,
} from '../../lib/auth.ts';
import { generateTotpSecret, otpauthUrl, verifyTotp } from '../../lib/totp.ts';
import { createDb } from '../../lib/db.ts';
import { verifyTurnstile } from '../../lib/turnstile.ts';
import { clientIp, fail, isoNow, ok, type AppEnv } from '../../lib/http.ts';
import {
  adminLogs,
  adminSessions,
  admins,
  unauthorizedLoginAttempts,
  userRoles,
} from '../../db/schema.ts';

/**
 * Admin auth — mounted at /api/admin/auth (public: login/logout;
 * protected: me/change-password/sessions).
 *
 * Ports the Supabase Auth usage in the admin panel:
 *  signInWithPassword → POST /login
 *  auth.getUser       → GET /me
 *  auth.updateUser    → POST /change-password
 *  useSessionTracker  → POST /sessions
 *  user_roles.has_role → role in /login + /me responses
 */
export const authRouter = new Hono<AppEnv>();

function setSessionCookie(c: Context<AppEnv>, token: string, maxAgeSec: number) {
  c.header(
    'Set-Cookie',
    `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}; Secure`,
  );
}

function clearSessionCookie(c: Context<AppEnv>) {
  c.header(
    'Set-Cookie',
    `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure`,
  );
}

/** Record a failed login attempt (port of unauthorized_login_attempts writes) */
async function recordFailedAttempt(c: Context<AppEnv>, email: string | null, device: Record<string, unknown>) {
  try {
    const db = createDb(c.env.DB);
    await db.insert(unauthorizedLoginAttempts).values({
      id: crypto.randomUUID(),
      authProvider: 'password',
      email,
      ipAddress: clientIp(c),
      userAgent: c.req.header('user-agent') ?? null,
      os: typeof device.os === 'string' ? device.os : null,
      osVersion: typeof device.osVersion === 'string' ? device.osVersion : null,
      browser: typeof device.browser === 'string' ? device.browser : null,
      browserVersion: typeof device.browserVersion === 'string' ? device.browserVersion : null,
      deviceType: typeof device.deviceType === 'string' ? device.deviceType : null,
      deviceModel: typeof device.deviceModel === 'string' ? device.deviceModel : null,
      deviceVendor: typeof device.deviceVendor === 'string' ? device.deviceVendor : null,
      deviceFingerprint: typeof device.fingerprint === 'string' ? device.fingerprint : null,
      city: typeof device.city === 'string' ? device.city : null,
      country: typeof device.country === 'string' ? device.country : null,
    });
  } catch (error) {
    console.error('[auth] failed to record attempt:', error);
  }
}

/**
 * POST /login { email, password, remember?, device?, totpCode? }
 *
 * Password-first, then TOTP:
 *  - password wrong                        → 401 (records attempt)
 *  - 2FA configured, correct totpCode      → full session
 *  - 2FA configured, totpCode missing      → { loginStage: '2fa_required', pendingToken }
 *  - 2FA configured, totpCode wrong        → 401 'Invalid authentication code'
 *  - 2FA NOT configured                    → session issued with totpEnabled:false;
 *                                            the SPA redirects to the 2FA setup in
 *                                            Settings and all other admin endpoints
 *                                            stay gated until enrolment completes.
 * Finish the staged code check with POST /login/complete.
 *
 * First-admin claim (port of claim_super_admin + system_has_super_admin):
 * if no super admin exists yet, the first successful login becomes one.
 */

/** Public account shape — never exposes password_hash or totp_secret. */
function publicAdmin(a: {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  totpSecret: string | null;
}) {
  return {
    id: a.id,
    email: a.email,
    displayName: a.displayName,
    avatarUrl: a.avatarUrl,
    isActive: a.isActive,
    totpEnabled: Boolean(a.totpSecret),
  };
}

/** Sign the session cookie, record session + login log, return the login payload. */
async function issueSession(
  c: Context<AppEnv>,
  admin: typeof admins.$inferSelect,
  role: Role,
  remember: boolean,
  device: Record<string, unknown>,
  secret: string,
) {
  const db = createDb(c.env.DB);
  const token = await signSession(
    { sub: admin.id, email: admin.email },
    secret,
    remember ? SESSION_MAX_AGE_SEC : SESSION_SHORT_AGE_SEC,
  );
  setSessionCookie(c, token, remember ? SESSION_MAX_AGE_SEC : SESSION_SHORT_AGE_SEC);

  // Port of useSessionTracker: record the session with device details
  await db.insert(adminSessions).values({
    id: crypto.randomUUID(),
    adminId: admin.id,
    sessionType: remember ? 'persistent' : 'temporary',
    ipAddress: clientIp(c),
    userAgent: c.req.header('user-agent') ?? null,
    os: typeof device.os === 'string' ? device.os : null,
    osVersion: typeof device.osVersion === 'string' ? device.osVersion : null,
    browser: typeof device.browser === 'string' ? device.browser : null,
    browserVersion: typeof device.browserVersion === 'string' ? device.browserVersion : null,
    deviceType: typeof device.deviceType === 'string' ? device.deviceType : null,
    deviceModel: typeof device.deviceModel === 'string' ? device.deviceModel : null,
    deviceVendor: typeof device.deviceVendor === 'string' ? device.deviceVendor : null,
    deviceFingerprint: typeof device.fingerprint === 'string' ? device.fingerprint : null,
    city: typeof device.city === 'string' ? device.city : null,
    country: typeof device.country === 'string' ? device.country : null,
  });

  await db.insert(adminLogs).values({
    id: crypto.randomUUID(),
    action: 'auth.login',
    resourceType: 'auth',
    resourceId: admin.id,
    adminId: admin.id,
    details: { email: admin.email, role },
    createdAt: isoNow(),
  });

  const permissions = role === 'moderator' ? await loadPermissions(admin.id, db) : [];
  return ok(c, {
    admin: publicAdmin(admin),
    role,
    permissions,
    token,
  });
}

authRouter.post('/login', async (c) => {
  try {
    const secret = c.env.SESSION_SECRET;
    if (!secret) return fail(c, 500, 'SESSION_SECRET is not configured');

    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body?.password === 'string' ? body.password : '';
    if (!email || !password) return fail(c, 400, 'email and password are required');
    if (c.env.TURNSTILE_SECRET_KEY && !(await verifyTurnstile(c, typeof body?.turnstileToken === 'string' ? body.turnstileToken : undefined))) {
      return fail(c, 400, 'Please complete the CAPTCHA check');
    }

    const device = (typeof body.device === 'object' && body.device !== null ? body.device : {}) as Record<string, unknown>;
    const db = createDb(c.env.DB);

    const [admin] = await db.select().from(admins).where(eq(admins.email, email)).limit(1);
    if (!admin || !admin.passwordHash || !(await verifyPassword(password, admin.passwordHash))) {
      await recordFailedAttempt(c, email, device);
      return fail(c, 401, 'Invalid email or password');
    }
    if (!admin.isActive) {
      await recordFailedAttempt(c, email, device);
      return fail(c, 403, 'This account has been disabled');
    }

    let role = await loadRole(admin.id, db);
    if (!role) {
      // claim_super_admin port: first-ever admin becomes super admin
      const [sc] = await db
        .select({ n: count() })
        .from(userRoles)
        .where(eq(userRoles.role, 'super_admin'))
        .limit(1);
      if ((sc?.n ?? 0) === 0) {
        await db.insert(userRoles).values({
          id: crypto.randomUUID(),
          userId: admin.id,
          role: 'super_admin',
        });
        role = 'super_admin';
      }
    }
    if (!role) return fail(c, 403, 'No admin role has been assigned to this account');

    const remember = body?.remember === true;
    const totpCode = typeof body?.totpCode === 'string' ? body.totpCode.trim() : '';

    const configured = admin.totpSecret ? await decryptTotpSecret(admin.totpSecret, secret) : null;
    if (configured) {
      // Always require the second factor; a correct code completes login in one step.
      if (totpCode && (await verifyTotp(configured, totpCode))) {
        return await issueSession(c, admin, role, remember, device, secret);
      }
      if (!totpCode) {
        const pending = await signSession(
          { sub: admin.id, email: admin.email, scope: 'login-2fa' },
          secret,
          600,
        );
        return ok(c, { loginStage: '2fa_required', pendingToken: pending });
      }
      return fail(c, 401, 'Invalid authentication code');
    }

    // First login without 2FA: issue the session now. The SPA redirects to the
    // 2FA setup in Settings; every other admin endpoint stays gated until enrolled.
    return await issueSession(c, admin, role, remember, device, secret);
  } catch (error) {
    console.error('[auth] login failed:', error);
    return fail(c, 500, 'Login failed');
  }
});

/** POST /logout — clear the session cookie */
authRouter.post('/logout', (c) => {
  clearSessionCookie(c);
  return ok(c, null);
});

/**
 * POST /login/complete { pendingToken, code, remember?, device? }
 * Finishes a staged login (needs the 6-digit TOTP code).
 *  - scope 'login-2fa' → verifies against the stored secret
 *  - scope 'setup-2fa' → verifies against the pending secret and enables 2FA
 */
authRouter.post('/login/complete', async (c) => {
  try {
    const secret = c.env.SESSION_SECRET;
    if (!secret) return fail(c, 500, 'SESSION_SECRET is not configured');

    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
    const pendingToken = typeof body?.pendingToken === 'string' ? body.pendingToken : '';
    const code = typeof body?.code === 'string' ? body.code.trim() : '';
    const remember = body?.remember === true;
    if (!pendingToken || !/^\d{6}$/.test(code)) {
      return fail(c, 400, 'pendingToken and a 6-digit code are required');
    }

    const payload = await verifySession(pendingToken, secret);
    if (!payload || payload.scope !== 'login-2fa') {
      return fail(c, 401, '2FA session expired — please log in again');
    }

    const db = createDb(c.env.DB);
    const [admin] = await db.select().from(admins).where(eq(admins.id, payload.sub)).limit(1);
    if (!admin || !admin.isActive) return fail(c, 403, 'This account has been disabled');

    const configured = admin.totpSecret ? await decryptTotpSecret(admin.totpSecret, secret) : null;
    if (!configured || !(await verifyTotp(configured, code))) {
      return fail(c, 401, 'Invalid authentication code');
    }

    const role = await loadRole(admin.id, db);
    if (!role) return fail(c, 403, 'No admin role has been assigned to this account');
    const device = (typeof body.device === 'object' && body.device !== null ? body.device : {}) as Record<string, unknown>;
    return await issueSession(c, admin, role, remember, device, secret);
  } catch (error) {
    console.error('[auth] login/complete failed:', error);
    return fail(c, 500, 'Failed to complete login');
  }
});

/**
 * POST /2fa/enroll — start (re)enrolment for the CURRENT admin.
 * Returns an enrollment ticket + the secret/otpauth URL for QR display.
 */
authRouter.post('/2fa/enroll', requireAdmin(), async (c) => {
  try {
    const secret = c.env.SESSION_SECRET;
    if (!secret) return fail(c, 500, 'SESSION_SECRET is not configured');
    const adminId = c.get('adminId')!;
    const email = c.get('adminEmail')!;
    const fresh = generateTotpSecret();
    const token = await signSession(
      { sub: adminId, email, scope: 'enroll-2fa', totpSecret: fresh },
      secret,
      600,
    );
    return ok(c, { enrollToken: token, setup: { secret: fresh, otpauthUrl: otpauthUrl(fresh, email) } });
  } catch (error) {
    console.error('[auth] 2fa enroll failed:', error);
    return fail(c, 500, 'Failed to start 2FA setup');
  }
});

/** POST /2fa/enroll/verify { enrollToken, code, currentPassword } */
authRouter.post('/2fa/enroll/verify', requireAdmin(), async (c) => {
  try {
    const secret = c.env.SESSION_SECRET;
    if (!secret) return fail(c, 500, 'SESSION_SECRET is not configured');
    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
    const token = typeof body?.enrollToken === 'string' ? body.enrollToken : '';
    const code = typeof body?.code === 'string' ? body.code.trim() : '';
    const currentPassword = typeof body?.currentPassword === 'string' ? body.currentPassword : '';
    if (!token || !/^\d{6}$/.test(code) || !currentPassword) {
      return fail(c, 400, 'enrollToken, code, and currentPassword are required');
    }

    const payload = await verifySession(token, secret);
    if (!payload || payload.scope !== 'enroll-2fa' || payload.sub !== c.get('adminId')) {
      return fail(c, 401, '2FA setup expired — try again');
    }

    const db = createDb(c.env.DB);
    const [admin] = await db.select().from(admins).where(eq(admins.id, payload.sub)).limit(1);
    if (!admin || !admin.passwordHash || !(await verifyPassword(currentPassword, admin.passwordHash))) {
      return fail(c, 401, 'Current password is incorrect');
    }
    const fresh = typeof payload.totpSecret === 'string' ? payload.totpSecret : '';
    if (!fresh || !(await verifyTotp(fresh, code))) {
      return fail(c, 401, 'Invalid authentication code');
    }

    await db
      .update(admins)
      .set({ totpSecret: await encryptTotpSecret(fresh, secret), updatedAt: isoNow() })
      .where(eq(admins.id, admin.id));
    await db.insert(adminLogs).values({
      id: crypto.randomUUID(),
      action: 'auth.enable_2fa',
      resourceType: 'auth',
      resourceId: admin.id,
      adminId: admin.id,
      details: { email: admin.email },
      createdAt: isoNow(),
    });
    return ok(c, { enabled: true });
  } catch (error) {
    console.error('[auth] 2fa enroll verify failed:', error);
    return fail(c, 500, 'Failed to verify 2FA setup');
  }
});

/** GET /me — current admin session (port of auth.getUser + has_role) */
authRouter.get('/me', requireAdmin(), async (c) => {
  try {
    const db = createDb(c.env.DB);
    const [admin] = await db.select().from(admins).where(eq(admins.id, c.get('adminId')!)).limit(1);
    if (!admin || !admin.isActive) return fail(c, 401, 'Session expired or account disabled');
    const role = c.get('role') ?? (await loadRole(admin.id, db));
    const permissions = role === 'moderator' ? await loadPermissions(admin.id, db) : [];
    return ok(c, {
      admin: publicAdmin(admin),
      role,
      permissions,
    });
  } catch (error) {
    console.error('[auth] me failed:', error);
    return fail(c, 500, 'Failed to load session');
  }
});

/** POST /change-password { currentPassword, newPassword } */
authRouter.post('/change-password', requireAdmin(), async (c) => {
  try {
    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
    const current = typeof body?.currentPassword === 'string' ? body.currentPassword : '';
    const next = typeof body?.newPassword === 'string' ? body.newPassword : '';
    if (!current || next.length < 8) {
      return fail(c, 400, 'currentPassword and newPassword (min 8 chars) are required');
    }

    const db = createDb(c.env.DB);
    const [admin] = await db.select().from(admins).where(eq(admins.id, c.get('adminId')!)).limit(1);
    if (!admin?.passwordHash || !(await verifyPassword(current, admin.passwordHash))) {
      return fail(c, 401, 'Current password is incorrect');
    }

    const hash = await hashPassword(next);
    await db
      .update(admins)
      .set({ passwordHash: hash, updatedAt: isoNow() })
      .where(eq(admins.id, admin.id));

    await db.insert(adminLogs).values({
      id: crypto.randomUUID(),
      action: 'auth.change_password',
      resourceType: 'admin',
      resourceId: admin.id,
      adminId: admin.id,
      createdAt: isoNow(),
    });
    return ok(c, null);
  } catch (error) {
    console.error('[auth] change-password failed:', error);
    return fail(c, 500, 'Failed to change password');
  }
});

/**
 * POST /sessions — record an admin page-session (port of useSessionTracker,
 * which previously wrote admin_sessions client-side on every admin load).
 */
authRouter.post('/sessions', requireAdmin(), async (c) => {
  try {
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const device = (typeof body.device === 'object' && body.device !== null ? body.device : {}) as Record<string, unknown>;
    const db = createDb(c.env.DB);
    await db.insert(adminSessions).values({
      id: crypto.randomUUID(),
      adminId: c.get('adminId')!,
      sessionType: 'page',
      ipAddress: clientIp(c),
      userAgent: c.req.header('user-agent') ?? null,
      os: typeof device.os === 'string' ? device.os : null,
      browser: typeof device.browser === 'string' ? device.browser : null,
      deviceType: typeof device.deviceType === 'string' ? device.deviceType : null,
      deviceFingerprint: typeof device.fingerprint === 'string' ? device.fingerprint : null,
    });
    return ok(c, null);
  } catch (error) {
    console.error('[auth] session record failed:', error);
    return fail(c, 500, 'Failed to record session');
  }
});
