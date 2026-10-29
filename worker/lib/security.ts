import type { Context, MiddlewareHandler } from 'hono';
import { fail, type AppEnv } from './http.ts';

/**
 * Content-Security-Policy for HTML documents.
 * KEEP IN SYNC with `public/_headers`, which applies the same headers to
 * static files served directly by the assets layer (bypassing the Worker).
 *
 * - script-src: own bundle + Cloudflare Turnstile / Web Analytics. No inline
 *   scripts (the theme bootstrap lives in /theme-init.js).
 * - style-src 'unsafe-inline': sanitized rich content and blog posts carry
 *   style attributes / <style> blocks.
 * - img/connect/frame https:: logos and embeds come from arbitrary https
 *   hosts; HTML content is sanitized client-side (src/lib/sanitize.ts).
 */
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' https://challenges.cloudflare.com https://static.cloudflareinsights.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https:",
  "frame-src https:",
  "worker-src 'self'",
  "manifest-src 'self'",
  "media-src 'self' https:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
].join('; ');

const COMMON_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
};

/** Adds security headers to every response the Worker returns. */
export const securityHeaders: MiddlewareHandler<AppEnv> = async (c, next) => {
  await next();
  // Responses from ASSETS.fetch / caches have immutable headers — re-wrap once.
  let res = c.res;
  try {
    res.headers.set('X-Content-Type-Options', 'nosniff');
  } catch {
    res = new Response(res.body, res);
  }
  for (const [name, value] of Object.entries(COMMON_HEADERS)) res.headers.set(name, value);
  if ((res.headers.get('Content-Type') ?? '').includes('text/html')) {
    res.headers.set('Content-Security-Policy', CONTENT_SECURITY_POLICY);
  }
  c.res = res;
};

/** Origins allowed to call the admin API from a browser. */
export function isTrustedOrigin(origin: string, c: Context<AppEnv>): boolean {
  if (origin === new URL(c.req.url).origin) return true;
  if (c.env.SITE_URL && origin === c.env.SITE_URL.replace(/\/$/, '')) return true;
  return (c.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
    .includes(origin);
}

/**
 * CSRF guard for state-changing admin requests. Browsers always send
 * `Sec-Fetch-Site` and/or `Origin` on cross-site POSTs, so a request is
 * accepted when it is same-origin, comes from a trusted origin, or carries
 * neither header (a non-browser client — no ambient cookie risk).
 * Unlike hono/csrf this also covers JSON bodies and body-less POSTs.
 */
export const csrfGuard: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (/^(GET|HEAD|OPTIONS)$/.test(c.req.method)) return next();
  const site = c.req.header('sec-fetch-site');
  const origin = c.req.header('origin');
  if (site === 'same-origin') return next();
  if (origin && isTrustedOrigin(origin, c)) return next();
  if (!site && !origin) return next();
  return fail(c, 403, 'Cross-site request blocked');
};
