/// <reference types="@cloudflare/workers-types" />

/**
 * Cloudflare Worker bindings for this project (see wrangler.toml).
 *
 * Secrets (set via `npx wrangler secret put <NAME>`):
 *   SESSION_SECRET        — HS256 key for admin session JWTs (≥32 random chars)
 *   TURNSTILE_SECRET_KEY  — Cloudflare Turnstile server secret
 *   CF_API_TOKEN / CF_ZONE_ID — Cloudflare GraphQL analytics (/api/stats)
 *   CDN_API_KEY           — optional; bearer token for the external media CDN
 */
export interface Bindings {
  /** D1 SQLite database */
  DB: D1Database;
  /** Static assets — the Vite build output */
  ASSETS: Fetcher;

  /** Canonical public URL of the site, e.g. https://miyomi.app */
  SITE_URL: string;
  /** Comma-separated extra origins allowed by CORS (optional) */
  ALLOWED_ORIGINS?: string;
  /** Turnstile public site key (exposed to the SPA) */
  VITE_TURNSTILE_SITE_KEY?: string;

  // ── Secrets ──
  SESSION_SECRET?: string;
  TURNSTILE_SECRET_KEY?: string;
  CF_API_TOKEN?: string;
  CF_ZONE_ID?: string;
  /** Optional Cloudflare zone tag (falls back to CF_ZONE_ID) */
  CF_ZONE_TAG?: string;

  // ── Optional media CDN (self-hosted Google Drive CDN) ──
  // Only needed if media uploads are ever enabled; Miyomi normally
  // scrapes content from source and hosts no media itself.
  /** CDN base URL, e.g. https://cdn-bevore.misfits.workers.dev */
  CDN_BASE_URL?: string;
  /** Bearer token for the CDN upload API */
  CDN_API_KEY?: string;
}
