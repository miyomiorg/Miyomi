import type { Context } from 'hono';
import type { AppEnv } from './http.ts';

/**
 * Verify a Turnstile token with Cloudflare's siteverify endpoint.
 *
 * Dev-friendly: when TURNSTILE_SECRET_KEY is not configured the check
 * is skipped (so local development works without a Turnstile setup).
 */
export async function verifyTurnstile(c: Context<AppEnv>, token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const secret = c.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // not configured — skip

  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { success: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
