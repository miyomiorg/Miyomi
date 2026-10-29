import type { Context } from 'hono';
import type { AppEnv } from './http.ts';

/**
 * True only for local development without a Turnstile secret
 * (`wrangler dev` on localhost). Everywhere else — production, and preview
 * deployments, which do not inherit secrets but share the production D1 —
 * a missing secret FAILS CLOSED instead of silently skipping the check.
 */
export function turnstileSkippedLocally(c: Context<AppEnv>): boolean {
  if (c.env.TURNSTILE_SECRET_KEY) return false;
  const host = new URL(c.req.url).hostname;
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
}

/** Verify a Turnstile token with Cloudflare's siteverify endpoint. */
export async function verifyTurnstile(c: Context<AppEnv>, token: string | undefined): Promise<boolean> {
  if (!token) return false;
  if (turnstileSkippedLocally(c)) return true;
  const secret = c.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.error('[turnstile] TURNSTILE_SECRET_KEY is not configured — rejecting');
    return false;
  }

  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token, remoteip: c.req.header('cf-connecting-ip') ?? '' }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { success: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
