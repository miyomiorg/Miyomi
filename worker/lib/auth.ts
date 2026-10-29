import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import type { Context, MiddlewareHandler } from 'hono';
import { createDb } from './db.ts';
import { fail, type AppEnv } from './http.ts';
import { admins, moderatorPermissions, userRoles } from '../db/schema.ts';

export type Role = 'super_admin' | 'admin' | 'moderator';
export interface ModeratorPermission {
  resource: string;
  can_read: boolean;
  can_write: boolean;
  can_delete: boolean;
}

export const SESSION_COOKIE = 'miyomi_session';
export const SESSION_MAX_AGE_SEC = 7 * 24 * 60 * 60; // 7 days (matches VITE_REMEMBER_SESSION docs)
export const SESSION_SHORT_AGE_SEC = 24 * 60 * 60; // 24h when remember=false
// ── Base64url helpers (Web standard) ──────────────────────────────

function bufToB64Url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64UrlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  const bin = atob(pad);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// ── Password hashing ───────────────────────────────────────────────
// NEW hashes use bcrypt (bcryptjs, pure JS) so they verify identically
// in Node (scripts) and workerd (production). Node-generated PBKDF2
// hashes proved incompatible with production workerd
// (btoa/salt round-trip discrepancy), so PBKDF2 is only still verified
// for legacy hashes (see verifyPassword below).

/**
 * Hash a password (bcrypt, cost 10). Stored format: $2a$/$2b$...
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  // bcrypt hashes ported from Supabase auth.users at cutover ($2a$/$2b$/$2y$)
  if (stored.startsWith('$2')) {
    try {
      return await bcrypt.compare(password, stored);
    } catch {
      return false;
    }
  }
  try {
    const [scheme, iterationsRaw, saltB64, hashB64] = stored.split('$');
    if (scheme !== 'pbkdf2-sha256') return false;
    const iterations = parseInt(iterationsRaw, 10);
    if (!Number.isFinite(iterations) || iterations < 10_000) return false;

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveBits'],
    );
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', hash: 'SHA-256', salt: b64UrlToBytes(saltB64), iterations },
      keyMaterial,
      256,
    );
    const expected = b64UrlToBytes(hashB64);
    const actual = new Uint8Array(bits);
    if (expected.length !== actual.length) return false;
    // Constant-time compare
    let diff = 0;
    for (let i = 0; i < expected.length; i++) diff |= expected[i] ^ actual[i];
    return diff === 0;
  } catch {
    return false;
  }
}

// ── TOTP secret encryption (AES-GCM keyed on SESSION_SECRET) ───────
// Stored secrets are never readable from the DB directly. If decryption
// fails (SESSION_SECRET rotated), the account is treated as unconfigured
// and re-enrols at next login.

/** Legacy (v1) key: SHA-256(SESSION_SECRET) — only used to decrypt old values. */
async function legacyTotpKey(sessionSecret: string): Promise<CryptoKey> {
  const digest = new Uint8Array(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(sessionSecret)),
  );
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['decrypt']);
}

/**
 * v2 key: HKDF-SHA256 derived from SESSION_SECRET with a purpose label, so
 * the AES key is cryptographically separate from the session HMAC key.
 */
async function totpKeyV2(sessionSecret: string): Promise<CryptoKey> {
  const ikm = await crypto.subtle.importKey('raw', new TextEncoder().encode(sessionSecret), 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: new TextEncoder().encode('miyomi'), info: new TextEncoder().encode('totp-secret-encryption-v2') },
    ikm,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/** v2.<iv.b64url>.<ciphertext.b64url> */
export async function encryptTotpSecret(plain: string, sessionSecret: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      await totpKeyV2(sessionSecret),
      new TextEncoder().encode(plain),
    ),
  );
  return `v2.${bufToB64Url(iv)}.${bufToB64Url(ct)}`;
}

/** null when the stored value cannot be decrypted. Reads v2 and legacy v1 values. */
export async function decryptTotpSecret(stored: string, sessionSecret: string): Promise<string | null> {
  try {
    const parts = stored.split('.');
    const isV2 = parts.length === 3 && parts[0] === 'v2';
    const [ivPart, ctPart] = isV2 ? parts.slice(1) : parts;
    if (!ivPart || !ctPart) return null;
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: b64UrlToBytes(ivPart) },
      isV2 ? await totpKeyV2(sessionSecret) : await legacyTotpKey(sessionSecret),
      b64UrlToBytes(ctPart),
    );
    return new TextDecoder().decode(plain);
  } catch {
    return null;
  }
}

// ── Session tokens (JWT HS256, Web Crypto) ────────────────────────

// Imported HMAC keys are cached per isolate (keyed by secret) so session
// verification does not re-import the key on every request.
const hmacKeys = new Map<string, Promise<CryptoKey>>();
function hmacKey(secret: string): Promise<CryptoKey> {
  let key = hmacKeys.get(secret);
  if (!key) {
    key = crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify'],
    );
    key.catch(() => hmacKeys.delete(secret));
    hmacKeys.set(secret, key);
  }
  return key;
}

async function hmacSign(secret: string, data: string): Promise<string> {
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret), new TextEncoder().encode(data));
  return bufToB64Url(new Uint8Array(sig));
}

export async function signSession(
  claims: Record<string, unknown>,
  secret: string,
  maxAgeSec: number,
): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const nowSec = Math.floor(Date.now() / 1000);
  const payload = { ...claims, iat: nowSec, exp: nowSec + maxAgeSec };
  const h = bufToB64Url(new TextEncoder().encode(JSON.stringify(header)));
  const p = bufToB64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const s = await hmacSign(secret, `${h}.${p}`);
  return `${h}.${p}.${s}`;
}

export interface SessionPayload {
  sub: string;
  email?: string;
  exp: number;
  iat?: number;
  /** Pending 2FA ticket scope: 'login-2fa' | 'setup-2fa' | 'enroll-2fa' */
  scope?: string;
  /** Plaintext TOTP secret for setup/enroll tickets only (short TTL). */
  totpSecret?: string;
  /** admins.session_version at issue time; a mismatch revokes the session. */
  ver?: number;
}

export async function verifySession(
  token: string,
  secret: string,
): Promise<SessionPayload | null> {
  try {
    const [h, p, s] = token.split('.');
    if (!h || !p || !s) return null;
    // crypto.subtle.verify compares in constant time.
    const valid = await crypto.subtle.verify(
      'HMAC',
      await hmacKey(secret),
      b64UrlToBytes(s),
      new TextEncoder().encode(`${h}.${p}`),
    );
    if (!valid) return null;
    const payload = JSON.parse(
      new TextDecoder().decode(b64UrlToBytes(p)),
    ) as SessionPayload;
    if (typeof payload.sub !== 'string' || !Number.isFinite(payload.exp)) return null;
    if (payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

// ── Role resolution ───────────────────────────────────────────────

/** Load the effective role for an admin (super_admin > admin > moderator). */
function pickRole(roles: string[]): Role | null {
  if (roles.includes('super_admin')) return 'super_admin';
  if (roles.includes('admin')) return 'admin';
  if (roles.includes('moderator')) return 'moderator';
  return null;
}

function toPermission(r: typeof moderatorPermissions.$inferSelect): ModeratorPermission {
  return {
    resource: r.resource,
    can_read: r.canRead,
    can_write: r.canWrite,
    can_delete: r.canDelete,
  };
}

export async function loadRole(adminId: string, db: ReturnType<typeof createDb>): Promise<Role | null> {
  const rows = await db.select({ role: userRoles.role }).from(userRoles).where(eq(userRoles.userId, adminId));
  return pickRole(rows.map((r) => r.role));
}

export async function loadPermissions(adminId: string, db: ReturnType<typeof createDb>): Promise<ModeratorPermission[]> {
  const rows = await db.select().from(moderatorPermissions).where(eq(moderatorPermissions.userId, adminId));
  return rows.map(toPermission);
}

// ── Middleware ────────────────────────────────────────────────────

function extractToken(c: Context): string | null {
  const bearer = c.req.header('authorization')?.replace(/^Bearer\s+/i, '');
  if (bearer) return bearer;
  const cookieHeader = c.req.header('cookie') || '';
  const match = cookieHeader.match(new RegExp(`(?:^|; )${SESSION_COOKIE}=([^;]+)`));
  return match ? match[1] : null;
}

/**
 * Resolve the admin session (cookie or Bearer token) and populate
 * c.get('adminId' | 'adminEmail' | 'role' | 'permissions').
 * Does NOT reject — use requireAdmin() for enforcement.
 */
export const resolveSession: MiddlewareHandler<AppEnv> = async (c, next) => {
  const secret = c.env.SESSION_SECRET;
  const token = extractToken(c);
  if (secret && token) {
    const payload = await verifySession(token, secret);
    // Scoped tokens (pending 2FA / enrolment tickets) are never sessions.
    if (payload && !payload.scope) {
      const db = createDb(c.env.DB);
      const [adminRows, roleRows, permRows] = await db.batch([
        db.select().from(admins).where(eq(admins.id, payload.sub)).limit(1),
        db.select({ role: userRoles.role }).from(userRoles).where(eq(userRoles.userId, payload.sub)),
        db.select().from(moderatorPermissions).where(eq(moderatorPermissions.userId, payload.sub)),
      ]);
      const admin = adminRows[0];
      if (admin && admin.isActive && (payload.ver ?? 0) === (admin.sessionVersion ?? 0)) {
        const role = pickRole(roleRows.map((r) => r.role));
        c.set('adminId', admin.id);
        c.set('adminEmail', admin.email);
        c.set('hasTotp', Boolean(admin.totpSecret));
        c.set('role', role);
        c.set('sessionExp', payload.exp);
        c.set('admin', admin);
        if (role === 'moderator') c.set('permissions', permRows.map(toPermission));
      }
    }
  }
  await next();
}

/** Re-sign the current session after a session_version bump so the caller stays logged in. */
export async function reissueCurrentSession(
  c: Context<AppEnv>,
  admin: { id: string; email: string },
  version: number,
): Promise<void> {
  const secret = c.env.SESSION_SECRET;
  const exp = c.get('sessionExp');
  if (!secret || !exp) return;
  const remaining = exp - Math.floor(Date.now() / 1000);
  if (remaining <= 0) return;
  const token = await signSession({ sub: admin.id, email: admin.email, ver: version }, secret, remaining);
  c.header(
    'Set-Cookie',
    `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${remaining}; Secure`,
  );
}

/** 401 unless a valid admin session exists. */
export function requireAdmin(): MiddlewareHandler {
  return async (c, next) => {
    if (!c.get('adminId')) {
      return fail(c, 401, 'Authentication required');
    }
    await next();
  };
}

/** 403 unless the session is a super admin. */
export function requireSuperAdmin(): MiddlewareHandler {
  return async (c, next) => {
    if (c.get('role') !== 'super_admin') {
      return fail(c, 403, 'Super admin privileges required');
    }
    await next();
  };
}

const ROLE_RANK: Record<Role, number> = { super_admin: 3, admin: 2, moderator: 1 };

/** 403 unless the session role meets the minimum rank (super > admin > moderator). */
export function requireMinRole(min: Role): MiddlewareHandler {
  return async (c, next) => {
    const role = c.get('role');
    if (!role || ROLE_RANK[role] < ROLE_RANK[min]) {
      return fail(c, 403, 'Insufficient privileges');
    }
    await next();
  };
}

/**
 * 403 unless the session may perform `action` on `resource`.
 * super_admin/admin pass; moderator needs the matching can_* flag.
 */
export function requireResource(resource: string | string[], action: 'read' | 'write' | 'delete'): MiddlewareHandler {
  return async (c, next) => {
    const role = c.get('role');
    if (role === 'super_admin' || role === 'admin') return next();
    if (role === 'moderator') {
      const perms = c.get('permissions') || [];
      const resources = Array.isArray(resource) ? resource : [resource];
      const allowed = perms.some(p => resources.includes(p.resource) &&
        (action === 'read' ? p.can_read : action === 'write' ? p.can_write : p.can_delete));
      if (!allowed) return fail(c, 403, 'Insufficient privileges for this resource');
      return next();
    }
    return fail(c, 403, 'Insufficient privileges');
  };
}
