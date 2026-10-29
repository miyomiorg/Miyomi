# Tasks

Legend: `[ ]` todo · `[x]` done · `[-]` skipped

## Phase 1 — Critical security
- [x] C1 Reject scoped (2FA/enroll) tokens as sessions — `worker/lib/auth.ts`
- [x] H1 Rate limit `/login` + `/login/complete` (20/10min/IP); per-admin TOTP failure lock (5/15min); TOTP replay rejected via `admins.totp_last_step`
- [x] H2 Safe JSON-LD escaping (`safeJsonForScript`); `$`-safe template replace — `worker/routes/pages/seo.ts`
- [x] H3 Project contributor columns (no email/contact) — `worker/routes/public/misc.ts`
- [x] H4 Session revocation via `admins.session_version` (password change/reset, 2FA enrol, deactivate, new `POST /auth/logout-all`); token no longer in login body
- [x] L Constant-time signature verify (`crypto.subtle.verify`); `totpSecret` stripped from users list; dummy bcrypt for unknown emails; `clientIp` trusts only `CF-Connecting-IP`; self-demote/deactivate blocked
- Migration: `0007_powerful_slayback.sql`

## Phase 2 — Database optimization
- [x] Indexes (`0008_clever_riptide.sql`): membership `group_id`, `(status,name)`, `updated_at`, `lower(name)`/`lower(repo_url)`, submissions/pes `(status,created_at)`, admin_sessions/admin_logs `(admin_id,created_at)` — verified with EXPLAIN QUERY PLAN
- [x] Guides list projection (no bodies); positive public-status filter (`lib/visibility.ts`)
- [x] `/submissions/check`: one batch, SQL `json_extract` filter, rate limit, notes only for rejected
- [x] Blog detail read-only + edge-cached; `POST /api/blog/:slug/view` beacon (once per session); list reading time computed in SQL
- [x] Like toggle: 2 round trips (was 6), `changes()`-guarded atomic counter, input caps
- [x] Session resolution: one batch (admin+role+perms), cached HMAC key, `/me` reuses it
- [x] Admin compatibility/group sync: batched writes; empty-insert crash fixed
- [x] `/admin/users` session counts via GROUP BY
- [x] Cron: isolated jobs + retention for admin_sessions (90d), login attempts (90d), bot logs (30d)
- [x] SEO handler column projection + cached template; sitemap batched, escaped, date-safe, TTL 1h
- [x] Donations hide amount/payment method; likes registry status filter; `/compatible` one batch + approved-only
- [x] Dashboard: one batch, likes total from counters; admin list rows+count batched; settings flags single query

### Phase 1–2 verification
- `tsc` worker + app: 0 errors
- `verify:2fa` 21/21 (new: pending-token-as-session rejected, replay rejected, old session revoked on enrol)
- `verify:worker` 54/54 · `verify:cron` · `verify:approval` · `verify-query-cache` · `verify-cache-races` · `test:import` 7/7
- Live D1 spot checks: case-insensitive duplicate check via index, `/compatible` via `json_each`, 4 concurrent like toggles → counter matches rows
- Pre-existing, unrelated: `scripts/supporters-leaderboard.test.ts` expects heading "Top Supporters" (component text changed earlier)
- Data note: local `likes` has ~1,067 orphan rows for deleted items; dashboard total now = sum of public counters

### Deploy steps (Phase 1–2)
1. `npm run d1:migrate:remote` (0007 + 0008 — additive columns + index swaps, safe online)
2. `npm run deploy:worker`
3. Existing admin sessions stay valid (no `ver` claim = version 0)

## Phase 3 — Security hardening
- [x] Submitter field filter (`lib/sanitize.ts → stripSubmitterPrivileged`): counters, slug, status, SEO/OG, moderation fields, timestamps and unknown metadata keys dropped at submit time AND when approving stored data
- [x] Link hygiene (`safeLink`): blocks javascript:/data:/vbscript:/file:/blob: (incl. obfuscated forms) on every URL field, social/install/tutorial links, guide/blog images. Deny-list on purpose — real data uses app schemes, `gh:` shorthand, scheme-less hosts and relative paths
- [x] Shared frontend sanitizer `src/lib/sanitize.ts`: guide notice now sanitized; iframe host check exact/subdomain (`evilyoutube.com` blocked, https only); `<style>` removed from guides/FAQ (none in data; blog keeps it); `rel=noopener` on new-tab links; guide HTML memoized
- [x] Field length caps on all public writes; like inputs capped (Phase 2)
- [x] Body limits: 256 KB public, 2 MB admin (413)
- [x] Security headers on all Worker responses + `public/_headers` for direct assets: CSP (no inline script — theme bootstrap moved to `/theme-init.js`), HSTS, X-Frame-Options/frame-ancestors, nosniff, Referrer-Policy, Permissions-Policy
- [x] Turnstile fails closed when the secret is missing, except on localhost (previews no longer bypass CAPTCHA)
- [x] CSRF guard on admin writes (Sec-Fetch-Site/Origin; covers JSON + text/plain + body-less POSTs); admin CORS restricted to site/ALLOWED_ORIGINS (public API stays open, no credentials)
- [x] Audit log: single-entry delete super-admin only; deletes/clears are themselves logged; log payload caps
- [x] 2FA secret encryption key separated from session key (HKDF, `v2.` format); legacy values still decrypt
- [x] New suite `npm run verify:security` (17 checks, incl. the 3 Phase-2 regressions)

### Phase 3 verification
- tsc worker + app: 0 errors · `verify:security` 17/17 · `verify:2fa` 21/21 · `verify:worker` 54/54 · cache/approval/cron/import suites pass
- Browser (built bundle on local Worker): 12 pages incl. guide with YouTube embed, blog with `<style>`, admin login with Turnstile → **0 CSP violations**
- Pre-existing, unrelated: supporters-leaderboard heading test; `/api/stats` 500 locally (no CF token); `useCachedImage` CORS noise (Phase 5)

## Phase 4 — Edge / caching
- [x] `public/_headers`: `/assets/*` 1 year immutable; `/og/*` 1 day, `/icons/*` 1 week (+SWR); `sw.js`/`theme-init.js` no-cache
- [x] `not_found_handling = "single-page-application"` + `run_worker_first` (API, sitemap, SEO pages only): client routes (`/admin/*`, unknown paths) are served at the edge with no Worker invocation; Worker SPA double-fetch removed
- [x] ETag on cached public responses + `304 Not Modified` (verified live: 208 KB app list → 0-byte revalidation)
- [x] 404s cached 30s (bot slug probes no longer hit D1); 5xx still never cached
- [x] Cache key bookkeeping: expired-key sweep only when the map is large (was a full walk per request)
- [x] Service worker v2: old caches dropped, entry cap (120), no cache lookups for never-cached requests, failed navigations not stored as the shell
- [-] Smart Placement — **deliberately not enabled**: it would move the Worker (and its Cache API) away from the visitor's edge, adding a hop to every cache hit, while most public traffic is served from cache. Revisit only if admin/write latency matters.
- [-] D1 read replication + Sessions API — optional future step (public reads are now mostly edge-cached; needs a `withSession` variant of `createDb` and dashboard enablement)

### Phase 4 verification
- `verify-query-cache` (new: 404 TTL + expiry, ETag/304) · `verify-cache-races` · `verify:security` · `verify:2fa` 21/21 · `verify:worker` 54/54 · approval/cron/import pass
- Live: header/routing matrix checked with curl; browser check of `/`, `/admin/login`, unknown route, app + guide detail → correct pages, SW v2 active, no CSP/asset errors
- Deploy note: `wrangler.toml` `run_worker_first` list must stay in sync with `seoRouter` routes

## Phase 5 — Frontend performance & mobile
- [x] Code splitting: every page except Home is a lazy chunk; admin area is its own chunk with per-page chunks (`src/AdminApp.tsx`, `src/lib/lazyPage.ts` with one-time reload on stale chunks after deploys); likely-next pages prefetched on idle (skipped on Save-Data/2G); React in a long-lived `react` chunk; build target es2020
- [x] **First load: 799 KB → 248 KB gzipped (−69%)** — JS 2,426 KB → 750 KB raw, CSS 633 KB → 193 KB
- [x] iOS: `viewport-fit=cover`; navbar + main padded with `safe-area-inset-top`; `min-h-dvh`/`80dvh`; light/dark `theme-color`; favicon links
- [x] Theme flash fixed: removed App's stray `localStorage.theme` effect; ThemeProvider initialises synchronously; no full-page transition on first apply; seasonal engine moved to its own key (`miyomi-seasonal-mode`) — dark/light users no longer silently lose seasonal themes; provider value memoized
- [x] `useCachedImage` removed (double downloads + CORS failures + unbounded Cache Storage, now deleted on startup); all logos `loading="lazy"` + `decoding="async"` + dimensions
- [x] Lists: deferred search + prebuilt lowercase index; likes only re-sort when sorting by "Loved"; memoized cards with stable callbacks; `content-visibility: auto` on cards; CSS hover/press instead of per-card `motion.div`; cards keyboard-focusable
- [x] Dead weight: removed `@fingerprintjs/fingerprintjs`, `ua-parser-js`, `marked`, `react-day-picker`, `vaul`, `input-otp`, `react-resizable-panels`, `react-hook-form`, `remark-stringify`, `@types/dompurify` + 5 unused shadcn files + unused `GitHubReleaseNotes`; build-only packages moved to devDependencies; `*` versions pinned; `framer-motion` imports → `motion/react`
- [x] flag-icons: full stylesheet replaced by a code→URL map; only rendered flags are downloaded
- [x] Mobile: lighter navbar/bottom-nav blur, closed menu drawer has no blur/compositing, home blur blobs desktop-only, phone mascot glow via radial gradient; 16px inputs (no iOS zoom); larger touch targets (navbar, drawer close, card details); passive rAF-throttled scroll listeners (navbar, guide ToC); wide guide tables scroll horizontally
- [x] No `/admin/auth/me` probe for anonymous visitors (session hint)
- [x] Latent bugs: rules-of-hooks fixes (ParticleEffect, NavbarParticles, useSeasonalAsset); embla `select` listener cleanup; components no longer defined inside render (SearchModal `ResultIcon`, DetailActions `ActionButton`); dynamic Tailwind class in GitHubReleaseMeta fixed
- [-] GitHub calls from browser (kept by decision)

### Phase 5 verification
- tsc app/worker: 0 errors · vitest 39/40 (only the pre-existing supporters heading test) · production build OK
- Browser (built bundle, local Worker, fresh cache): home, software, app detail, extensions, guide, FAQ, admin → correct pages, no horizontal overflow, 136/137 software logos lazy, **0 logo CORS errors (was dozens), 0 CSP errors, no `/me` probe on public pages**, editor/charts chunks never loaded outside their admin pages

## Follow-ups (done)
- [x] **LazyMotion**: all 23 components import `m` (aliased as `motion`, so JSX is unchanged); `<LazyMotion strict>` loads `domMax` as its own chunk after first paint (`src/lib/motionFeatures.ts`). Main chunk 162 → 138 KB gz; **first load 248 → 224 KB gz (−72% vs the original 799 KB)**
- [x] **Canvas backgrounds** (4 status backgrounds + navbar particles) run on `src/lib/canvasLoop.ts`: paused while off-screen (IntersectionObserver) and in hidden tabs, capped at 60 fps (navbar particles no longer run 2× fast on 120 Hz screens)
- [x] **`GET /api/counts`** (`{ apps, extensions, guides }`, one batched query set, edge-cached): the home page no longer downloads every app/extension/guide list for three numbers
- [x] **Cards are real links** via a stretched-link `CardLink` (title `<a href>` + overlay; like/details buttons above it): crawlable, middle-click/Ctrl+click open a new tab, native keyboard focus, SPA navigation + scroll restore unchanged. Fixed invalid `<button>`-inside-`<button>` in `AppListCard`; list cards also moved off per-card `motion` and memoized
- [x] **Supporters test** updated to the intentional "Supporters" heading (commit d7f64c6); motion mocks in two tests export `m` too → **vitest 40/40**

### Follow-up verification
- tsc app/worker 0 errors · vitest 40/40 · `verify:worker` 54/54 · `verify:2fa` 21/21 · security/cache/races/approval/cron pass · `verify-query-cache` covers `/api/counts`
- Browser (fresh cache): home requests only `/api/counts` (no list downloads) and shows 136+/48+/24+; motion chunk loads; 136 card links with real hrefs; like click doesn't navigate; card click navigates in-app without a reload; detail canvas renders; 0 CSP/console errors

### Remaining ideas
- D1 read replication / Sessions API (Phase 4 note)
- Local dev tip: if `wrangler dev` crashes with `SQLITE_BUSY`, an orphaned `wrangler` node process is still running (it respawns `workerd`) — stop the node process, not just `workerd`
