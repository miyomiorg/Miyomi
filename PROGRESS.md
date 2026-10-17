# PROGRESS.md — Miyomi migration status

> Continuity notes for the next session. Keep this file current when you finish a
> chunk of work. Dates are ISO; "today" reflects the last update.

**Last updated:** 2026-10-17
**Goal:** Migrate Miyomi off Supabase Cloud → Cloudflare Workers (Hono) + D1
(Drizzle), with a fetch-based frontend.

---

## Phase status

| Phase | Scope | Status |
|---|---|---|
| 1 | Worker + Hono scaffolding, bindings, scripts | ✅ Done |
| 2 | Drizzle schema + migrations; restore backup into local D1 | ✅ Done |
| 3 | Public + admin Hono routes, guards, rate limiting, cron | ✅ Done |
| 4 | Frontend refactor: remove Supabase client, typed fetch services | ✅ Done |
| 5 | Legacy cleanup + docs + agent guardrails | ✅ Done |
| 6 | Launch readiness: cron, import tooling, frontend checks | ✅ Local implementation + verification complete |
| 7 | Production D1 import, secrets, deployment + domain cutover | ✅ Done & live on miyomi.app (commit pending) |

---

## What is done

### Backend (`worker/`)
- Hono routers: `routes/public/*`, `routes/admin/*`, `routes/pages/*` (SEO + sitemap),
  mounted from `worker/index.ts` with a JSON `404` fallback for unknown `/api/*`.
- Drizzle schema (`worker/db/schema.ts`) with 27 tables; migrations in
  `worker/db/drizzle/`. Backup restored into **local** D1; all 27 table row counts verified.
- Auth: password-only admin login (bcrypt/pbkdf2 hashes preserved from backup),
  JWT session (`SESSION_SECRET`, cookie or `Authorization: Bearer`).
- Guards + rate limiting (`worker/lib/rate-limit.ts`), cron cleanup
  (`worker/lib/cron.ts`, registered on the default Worker export), Turnstile
  verification (`worker/lib/turnstile.ts`).
- Compatibility-group read helpers ported to `worker/lib/compat.ts`
  (`GET /api/apps/:idOrSlug/compatible`, `/api/extensions/:idOrSlug/compatible`).
- Empty-list guard, duplicate-check (`GET /api/submissions/check`), edit suggestions
  (`POST /api/edit-suggestions`), Telegram test (`POST /admin/settings/telegram-test`).
- Server-side content sanitizers in `worker/routes/admin/content.ts`
  (`prepareAppPayload` / `prepareExtensionPayload`).
- **Likes fully ported**: `POST /api/likes` now *toggles* (insert+increment /
  delete+decrement) and `GET /api/likes/registry` returns the bulk
  `{ [itemId]: { count, loved } }` map the SPA needs.

### Frontend (`src/`)
- **Admin analytics page added** (`/admin/analytics`, sidebar → Analytics,
  admin+ only): Cloudflare zone analytics via GraphQL (`GET /admin/analytics?days=7|14|30`).
  Cloudflare-style visuals with recharts — KPI cards (requests, page views,
  bandwidth, cached, encrypted, threats), traffic area chart, requests by
  country, browsers pie, device types + OS (adaptive ≈7d), top pages, and threat
  pathing. Sources: `httpRequests1dGroups` (totals/series + countryMap/
  browserMap/threatPathingMap + `uniq.uniques` for **unique visitors**) and
  `httpRequestsAdaptiveGroups` (pages/devices/OS). Verified with real data (132k requests/7d) incl. a browser render check;
  `npm run verify:analytics` covers the endpoint (env-gated on local creds).
- **Two-factor authentication (TOTP) added — one-way and mandatory.** Password
  login keeps its `2fa_required` code step for enrolled accounts. Accounts
  without 2FA get a session but are redirected to Settings, where a router-wide
  gate (worker middleware, skips `/auth/*`) blocks every other admin section
  with 403 until enrolment completes. Settings shows only the 2FA card until
  then. Once enabled, 2FA **cannot be disabled** — only "Reset code" (re-enrol
  with password confirm). Lost-authenticator recovery = CLI password reset,
  which also clears the stored secret. Secrets are AES-GCM encrypted with a key
  derived from `SESSION_SECRET`; `worker/lib/totp.ts` is Web-Crypto RFC 6238.
  Covered by: `verify:2fa` (15/15 circuit: gate, enrolment, staged relogin,
  one-step login, no-disable), `verify:worker` (53/53, enrols local admin),
  `verify-content-api`, and browser E2E (redirect → lock → enrol → relogin).
- `src/services/api/*` typed fetch client (envelope + snake_case adapter). No Supabase
  client anywhere in `src/`.
- All public pages, admin pages, and shared components migrated to the API
  (submissions, reports, feedback, likes, donations, themes, notices, contributors,
  compat groups, users/admins, settings, logs, sessions, blog, guides, FAQs).
- `LikeContext` migrated from the Supabase `like` edge function to `likesApi`.
- Vite dev proxy: `/api` → `http://localhost:8787`.
- Fixed admin Likes navigation crash: aggregate stats opt out of top-level
  snake-casing with `http.get(..., { preserveKeys: true })`, preserving `byType`,
  `byBrowser`, `byOS`, and `byDeviceType`. Database row adaptation is unchanged.
- Fixed admin dashboard emptiness: the dashboard is an aggregate DTO whose
  top-level `recentApps`/`recentExtensions` keys were snake_cased by the adapter
  (`recent_apps`/…), crashing the page's activity block. `dashboardApi.get` now
  uses `preserveKeys` — counts/activity/contributors all render. Regression tests
  in `src/services/api/{likes,dashboard}.test.ts` (5 assertions) lock the contract.
- **Fixed production admin login:** Node-generated `pbkdf2-sha256` hashes did not
  verify under production workerd (silent mismatch, no error). `hashPassword`
  now uses **bcrypt** (bcryptjs, pure JS — identical in Node/workerd); pbkdf2
  verification kept only for legacy hashes. Live login verified (`tasu` → 200,
  super_admin). Turnstile widget recreated for the Worker:
  site key `0x4AAAAAAFZcAacXgE2d12i8` (old Supabase-era widget is now unused).

### Cleanup (Phase 5)
- Removed top-level `functions/` (legacy Cloudflare *Pages* Functions) — superseded by
  `worker/routes/pages/*` and `worker/routes/public/stats.ts`.
- Removed legacy scripts: `scripts/migrateGroups.ts`, `scripts/update-app-meta.mjs`,
  `scripts/sync-donations.js`, and the `.github/workflows/update-downloads.yml`
  workflow (it called a dead Supabase function).
- Open-source cleanup: removed `scripts/backup-db.mjs` / `scripts/restore-db.mjs`
  and the `@supabase/supabase-js` dependency (last Supabase runtime artifacts);
  deleted the legacy Pages routing file `public/_routes.json` and the local
  `supabase/` project folder (functions/migrations CLI repo); renamed
  `src/integrations/supabase/types.ts` → `src/types/db.ts` and
  `src/services/supabaseDataService.ts` → `apiDataService.ts`. Git history audit:
  no Cloudflare credentials ever committed; old Supabase keys exist in history
  (public anon keys + service-role reference) → neutralized by deleting the
  retired Supabase project.
- Removed `public/donations.json` (unused; donations come from the API).
- Ported the build-time OG fetcher (`scripts/og/fetchOgData.mjs`) from Supabase to the
  Worker API (`/api/apps|extensions|guides`). OG generation is now best-effort
  (warns + skips if the API is unreachable) instead of hard-failing the build.
- `package.json`: removed the Supabase `prebuild`/`sync-donations`; `seed:local` no
  longer wipes data (it only adds the dev admin); added `db:seed:synthetic` for the
  throwaway dataset (`scripts/seed-synthetic.sql`).
- Removed legacy Supabase vars from `wrangler.toml` and `worker/env.d.ts`.
- Redacted leaked `CLOUDFLARE_ACCOUNT_ID` / `CLOUDFLARE_D1_TOKEN` from `.env.example`.
- Dropped the unused **R2** binding (no route ever used `BUCKET`). Media, if ever
  needed, uses the external self-hosted **Google Drive CDN** — client kept in
  `worker/lib/cdn.ts`, documented in DEVELOPERS.md → "Media / CDN".
- Docs: rewrote `DEVELOPERS.md`, added `AGENTS.md` + this file, rewrote
  `.agents/rules/database-schema-and-regression-prevention.md`.

---

## What remains

### Phase 6 — completed locally
- Worker default export now contains `fetch` and `scheduled`. `verify:cron`
  executes the registered handler against isolated SQLite and verifies retention
  of recent rejected records and old pending/approved records.
- Importer resolves paths relative to the script, accepts `--export-dir` and
  `--out-dir`, requires all 27 CSVs plus `auth_users.csv`, and validates column
  counts, quoted-field closure, JSON, and maximum SQL row size before writing.
  Empty tables replace stale SQL; the combined import uses only the current run.
  A `manifest.json` records all table counts. Seven regression tests pass.
- Regenerated the real export into a temporary directory and loaded it into
  isolated SQLite: all **13,611 rows across 27 tables** match the previous import,
  including auth links and password hashes; foreign-key checks pass. Original
  `.wrangler/export/sql/ALL.sql` and migrated local D1 were not replaced.
- Added missing React 18 type packages and Vitest. Both frontend and Worker
  typechecks now pass. Corrected form-state/JSON types, admin sidebar auth fields,
  About-page stats envelope/reduce typing, and invalid `divideColor` styles.
- **Development builds skip OG generation:** `npm run build` runs Vite only.
  Use `npm run build:release` explicitly when preparing the production release.
- Browser checks passed: public listings/search/details, admin login + cookie
  restoration, and public submission → admin publish → public detail page.
  Disposable content was deleted afterward. Playwright was a temporary external
  verification tool, not added to project dependencies.
- Browser tests used Cloudflare's public Turnstile **test site key**. Separately,
  the Worker's verification helper passed accept/reject checks against the actual
  Cloudflare Siteverify endpoint using documented test secrets. Production keys
  and production-hostname verification remain part of Phase 7.

### Phase 7 — production rollout (in progress)
1. ✅ Wrangler authenticated (OAuth, `tasu.legend@gmail.com`; Workers/D1 write scopes).
2. ✅ Confirmed target `miyomi-db` (`0d70949a-…`); backup snapshot saved to
   `.wrangler/prod-d1-backup-2026-10-17.sql`. Applied `0000_supabase_schema.sql`
   and imported the validated data. Verified: apps 138, extensions 49, guides 27,
   likes 7,629, rate_limits 4,049; legacy `votes` table (1,687 rows) preserved;
   3 admins with bcrypt hashes and correct roles; **0 FK violations**.
3. ✅ Set Worker secrets `SESSION_SECRET` (fresh) + `TURNSTILE_SECRET_KEY`.
   The real Turnstile secret was obtained by rotating widget
   `0x4AAAAAACd-NdaHLXAncMhD` via API (`.env` only held the public test secret);
   the new secret was pushed to the Worker. Note: this invalidated the old
   secret, so the old Pages site's captcha flows are broken until cutover.
4. ✅ `npm run build:release` with the real site key baked in and `OG_API_URL` =
   local Worker (208 OG images). Deployed to `https://miyomi.misfits.workers.dev`;
   cron trigger registered (`0 */12 * * *`).
5. ✅ **Live `https://miyomi.app` — domain cutover DONE** (user completed the
   dashboard steps). Domain verification 9/9: Worker JSON health, 136 apps, SEO
   tags, sitemap, SPA shell, canonical, OG images, auth guards, captcha gate.
   OG images now regenerate from the live API. `miyomi.misfits.workers.dev`
   remains active too; both hostnames are allowed on the new Turnstile widget
   (`0x4AAAAAAFZcAacXgE2d12i8`).
   ⚠️ `CF_API_TOKEN` set by user; `/api/stats` returns real data (226k visitors).
6. ✅ **Launch audit for adapter-contract bugs done:** verified every endpoint's
   emission shape vs. adapter vs. consumer key access (public + admin). Fixed:
   dashboard aggregation keys (`preserveKeys`), likes-stats aggregation keys.
   Confirmed consistent: submissions/duplicate check, reports `target_name`,
   groups `app_ids`/`extension_ids`, users `session_count`/permissions,
   logs/sessions nested `admins`, donations pagination, settings, themes/notices/
   faqs, auth session DTOs, likes flows, public content rows, `/api/stats` shape.
   Added `scripts/restore-og.mjs` + `.og-cache` so a plain `npm run build`
   (which empties `dist/`) can never strip deployed OG images again.
7. ⏳ Review and commit the migration source and docs (still modified/untracked).

> **No R2 bucket is required.** Miyomi hosts no media (content is scraped from
> source). If uploads are ever needed, use the external Google Drive CDN via
> `worker/lib/cdn.ts` — see DEVELOPERS.md → "Media / CDN".

### Optional / follow-ups
- **Config consolidated to one source**: non-secret config lives in
  `wrangler.toml [vars]` (now incl. `CF_ZONE_ID` + `VITE_DISABLE_TURNSTILE`);
  Vite and the OG generator read `[vars]` from `wrangler.toml`. Secrets live
  only in `wrangler secret`. `.env` is now local tooling only (Drizzle creds).
  Local dev disables the widget with `VITE_DISABLE_TURNSTILE=true`.
- Configure Telegram settings (`telegram_bot_token`, `telegram_chat_ids`) if
  wanted. Only the admin test-message endpoint is implemented; automatic
  submission/report/feedback notifications still need wiring. An `.env`
  `TELEGRAM_BOT_TOKEN` alone is not consumed by this Worker.
- Port the GitHub metadata updater (the deleted `update-app-meta` workflow) to the
  Worker + a GitHub Action if that feature is still wanted.
- Reduce the initial frontend bundle (currently ~1.94 MB JS, ~552 KB gzip) and
  add deployment CI if wanted.

---

## Local dev quickstart

```bash
npm run d1:migrate:local     # apply migrations to local D1
npm run seed:local           # add dev admin, keeps migrated data
npm run dev:worker           # Worker on :8787 (ONLY ONE instance)
npm run dev                  # Vite SPA on :8080
npm run verify:worker        # end-to-end API checks
```

Local dev admin: `admin@miyomi.local` / `MiomiLocal123!`
(`.dev.vars` holds a local `SESSION_SECRET`; gitignored.)

Environment files: `.env` (Vite, gitignored), `.dev.vars` (Worker secrets, gitignored),
`.env.example` (template). The production data backup
`db_cluster-16-10-2026@09-13-15.backup` is now gitignored via `*.backup`.

---

## Verification (2026-10-17 readiness audit)

- `npx tsc -p tsconfig.worker.json` → 0 errors.
- `npx tsc -p tsconfig.app.json` → 0 errors (React 18 types installed).
- `npm run smoke:worker` → 5/5 passed (mocked D1; SEO intentionally falls back
  after a mock query error, so this alone does not prove D1-backed SEO).
- `npm run verify:worker` → **50 passed, 0 failed**, against migrated local D1.
- `scripts/verify-content-api.mjs` → PASS (content API end-to-end).
- `npm run test:import` → 7 passed; real-data parity check → all 27 tables match.
- `npm run verify:cron` → registered default handler retention checks pass.
- Browser verification → public browsing/search/detail pages, login, session
  restoration, and submission/approval passed without uncaught page errors.
- Likes regression: 3 API contract tests pass; the built UI on :8787 passes
  Feedbacks → Likes navigation and reload, with totals, type cards, breakdown
  filters, and table rows verified. The reported `assets/assets/fonts/*.woff2`
  request is absent from source/build and was not reproduced in clean Chrome.
- Cloudflare Siteverify test credentials → accept, reject, and missing-token
  paths pass. Local API suites still run without a Turnstile server secret.
- `npm run build` → succeeds, **no OG generation** (user's development preference).
  Earlier audit generated all 208 OG images from the local API; defer regeneration
  to `build:release`. Default live API still returns HTML before cutover.
- `npx wrangler deploy --dry-run` → successful bundle (480.41 KiB / 93.97 KiB gzip).
  This does not validate remote credentials, secrets, or cron registration.
- `npx wrangler whoami` → not authenticated. Separately, the existing D1 token
  successfully read remote database metadata/schema through the Cloudflare API.
- Remote inspection was read-only; no remote migration, import, or deploy performed.
- Earlier session verified edit-suggestion lifecycle and unknown API JSON 404s.

---

## Known gaps & gotchas

- **workerd/D1**: bound `LIKE`/`GLOB` patterns must be ≤ ~50 chars; search input is
  clamped to 48 (`worker/routes/admin/content-crud.ts` `searchCond`).
- **One `wrangler dev` at a time** — two instances on the same local D1 cause
  `SQLITE_BUSY`.
- **API adapter**: `src/services/api/http.ts` snake_cases top-level row keys (and
  `items` arrays) but leaves nested objects untouched → worker joins must emit
  snake_case keys inside nested objects. Aggregate DTOs that retain camelCase
  (currently LikesStats) explicitly opt out with `preserveKeys: true`.
- **React types:** keep `@types/react` / `@types/react-dom` aligned with the
  React 18 runtime. Frontend typechecking is now clean; preserve this baseline.
- **Turnstile skips verification when its server secret is missing.** Local
  `.dev.vars` currently only configures `SESSION_SECRET`. A secret in `.env`
  alone is not a deployed Worker secret. Verify production configuration explicitly.
- **Rate limiter fails open**; some writes use casts rather than full runtime
  validation.
- Git history retains old Supabase keys (anon/publishable are public by design;
  a service-role reference appeared in a legacy `functions/` commit). No
  Cloudflare credentials were ever committed. Delete the retired Supabase
  project to neutralize the historical keys.

---

## Reference

- Bindings (`wrangler.toml`): D1 `DB` = `miyomi-db`
  (`0d70949a-e439-41fc-a0a1-78b99d17b9af`); `ASSETS` = `./dist`; cron `0 */12 * * *`.
- Public API 404 fallback, envelope, and route map: `worker/index.ts`,
  `worker/routes/index.ts`.
- Typed API surface: `src/services/api/index.ts`.
