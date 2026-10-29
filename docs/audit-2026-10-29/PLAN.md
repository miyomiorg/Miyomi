# Audit remediation plan — 2026-10-29

Source: full security / performance / mobile audit of the Worker (Hono + D1)
and the React SPA. Task status lives in [`TASKS.md`](TASKS.md).

Out of scope by decision: browser-side GitHub API calls (footer commit,
release downloads) — kept intentionally (FOSS / community-powered display).

## Phases

1. **Critical security** — 2FA bypass, login brute force, JSON-LD XSS,
   contributor PII leak, session revocation.
2. **Database optimization** — missing indexes, column projections, batching
   sequential queries, cacheable blog reads, cron retention.
3. **Security hardening (medium)** — submission allow-list, URL scheme
   validation, notice sanitizing, like abuse, body limits, headers, Turnstile
   fail-closed.
4. **Edge / caching** — `_headers`, SPA asset handling, ETags, 404 caching,
   Smart Placement.
5. **Frontend performance & mobile** — route code splitting, viewport/safe
   area, theme flash, image loading, list rendering, dead deps, touch targets.

## Verification per phase

- `npx tsc -p tsconfig.worker.json` and `npx tsc -p tsconfig.app.json` → 0 errors
- `npm run db:generate` → `npm run d1:migrate:local` for schema changes
- `npm run verify:2fa`, `npm run verify:cron`, `npm run test:import` where relevant
- `npm run build` for frontend phases
