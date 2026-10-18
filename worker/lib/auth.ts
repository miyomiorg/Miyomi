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

async function totpEncryptionKey(sessionSecret: string): Promise<CryptoKey> {
  const digest = new Uint8Array(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(sessionSecret)),
  );
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ]);
}

/** <iv.b64url>.<ciphertext.b64url> */
export async function encryptTotpSecret(plain: string, sessionSecret: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      await totpEncryptionKey(sessionSecret),
      new TextEncoder().encode(plain),
    ),
  );
  return `${bufToB64Url(iv)}.${bufToB64Url(ct)}`;
}

/** null when the stored value cannot be decrypted. */
export async function decryptTotpSecret(stored: string, sessionSecret: string): Promise<string | null> {
  try {
    const [ivPart, ctPart] = stored.split('.');
    if (!ivPart || !ctPart) return null;
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: b64UrlToBytes(ivPart) },
      await totpEncryptionKey(sessionSecret),
      b64UrlToBytes(ctPart),
    );
    return new TextDecoder().decode(plain);
  } catch {
    return null;
  }
}

// ── Session tokens (JWT HS256, Web Crypto) ────────────────────────

async function hmacSign(keyBytes: Uint8Array, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
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
  const s = await hmacSign(new TextEncoder().encode(secret), `${h}.${p}`);
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
}

export async function verifySession(
  token: string,
  secret: string,
): Promise<SessionPayload | null> {
  try {
    const [h, p, s] = token.split('.');
    if (!h || !p || !s) return null;
    const expected = await hmacSign(new TextEncoder().encode(secret), `${h}.${p}`);
    if (expected !== s) return null;
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
export async function loadRole(adminId: string, db: ReturnType<typeof createDb>): Promise<Role | null> {
  const rows = await db.select().from(userRoles).where(eq(userRoles.userId, adminId));
  if (rows.some((r) => r.role === 'super_admin')) return 'super_admin';
  if (rows.some((r) => r.role === 'admin')) return 'admin';
  if (rows.some((r) => r.role === 'moderator')) return 'moderator';
  return null;
}

export async function loadPermissions(adminId: string, db: ReturnType<typeof createDb>): Promise<ModeratorPermission[]> {
  const rows = await db.select().from(moderatorPermissions).where(eq(moderatorPermissions.userId, adminId));
  return rows.map((r) => ({
    resource: r.resource,
    can_read: r.canRead,
    can_write: r.canWrite,
    can_delete: r.canDelete,
  }));
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
    if (payload) {
      const db = createDb(c.env.DB);
      const [admin] = await db.select().from(admins).where(eq(admins.id, payload.sub)).limit(1);
      if (admin && admin.isActive) {
        const role = await loadRole(admin.id, db);
        c.set('adminId', admin.id);
        c.set('adminEmail', admin.email);
        c.set('hasTotp', Boolean(admin.totpSecret));
        c.set('role', role);
        if (role === 'moderator') c.set('permissions', await loadPermissions(admin.id, db));
      }
    }
  }
  await next();
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
