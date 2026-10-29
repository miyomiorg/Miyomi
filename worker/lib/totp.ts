/**
 * RFC 6238 TOTP (Google Authenticator compatible) — Web Crypto only.
 *
 * - 6 digits, 30s period, SHA-1 HMAC, ±1 step tolerance on verify.
 * - Secrets are base32 (RFC 4648, no padding).
 * Unauthenticated flow note: HMAC-SHA1 in `crypto.subtle` is
 * deterministic across Node and workerd, so codes computed here verify
 * identically in production.
 */

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/** Fresh 160-bit secret as unpadded base32. */
export function generateTotpSecret(bytes = 20): string {
  const raw = new Uint8Array(bytes);
  crypto.getRandomValues(raw);
  let bits = '';
  for (const byte of raw) bits += byte.toString(2).padStart(8, '0');
  let out = '';
  for (let i = 0; i + 5 <= bits.length; i += 5) {
    out += B32[parseInt(bits.slice(i, i + 5), 2)];
  }
  return out;
}

/** RFC 4648 base32 → bytes (tolerates lowercase, padding, spaces, dashes). */
export function base32Decode(input: string): Uint8Array {
  const clean = input
    .toUpperCase()
    .replace(/=+$/g, '')
    .replace(/[^A-Z2-7]/g, '');
  const out: number[] = [];
  let bits = 0;
  let value = 0;
  for (const ch of clean) {
    const idx = B32.indexOf(ch);
    if (idx < 0) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}

/** Current 6-digit TOTP for `secret` at the given epoch ms. */
export async function totpCode(secret: string, forMs: number = Date.now()): Promise<string> {
  const key = base32Decode(secret);
  let counter = Math.floor(forMs / 30_000);
  const msg = new Uint8Array(8); // 64-bit big-endian counter
  for (let i = 7; i >= 0; i--) {
    msg[i] = counter % 256;
    counter = Math.floor(counter / 256);
  }
  const hmacKey = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', hmacKey, msg));
  const offset = sig[sig.length - 1] & 0x0f;
  const code =
    (((sig[offset] & 0x7f) << 24) | (sig[offset + 1] << 16) | (sig[offset + 2] << 8) | sig[offset + 3]) % 1_000_000;
  return code.toString().padStart(6, '0');
}

/** Verify a 6-digit code with ±`window` step tolerance (default ±1). */
export async function verifyTotp(secret: string, code: string, window = 1): Promise<boolean> {
  return (await matchTotpStep(secret, code, window)) !== null;
}

/**
 * Like verifyTotp, but returns the matched 30s time step (or null) so callers
 * can reject replays of an already-used step.
 */
export async function matchTotpStep(secret: string, code: string, window = 1): Promise<number | null> {
  if (!/^\d{6}$/.test(code)) return null;
  const now = Date.now();
  for (let step = -window; step <= window; step++) {
    const at = now + step * 30_000;
    if ((await totpCode(secret, at)) === code) return Math.floor(at / 30_000);
  }
  return null;
}

/** otpauth:// URI for authenticator apps (with QR rendering). */
export function otpauthUrl(secret: string, account: string, issuer = 'Miyomi'): string {
  return (
    `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}` +
    `?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`
  );
}