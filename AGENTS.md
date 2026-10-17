# AGENTS.md — Instructions for AI coding agents

Miyomi is a directory site for manga/anime apps, extensions, and guides.
The stack is **React + Vite (frontend)** and **Cloudflare Workers + Hono + D1
(Drizzle) (backend)**. Media, if ever needed, goes to an external self-hosted
CDN — **not** R2/S3.

Read this file before making changes. Also read:
- [`PROGRESS.md`](PROGRESS.md) — current status, what's done, what's left, known gaps.
- [`DEVELOPERS.md`](DEVELOPERS.md) — setup, architecture, deployment.
- [`.agents/rules/database-schema-and-regression-prevention.md`](.agents/rules/database-schema-and-regression-prevention.md) — DB/data rules.

---

## Non-negotiable stack rules

- **Backend = Cloudflare Worker** (`worker/`) using **Hono**. No Express, Fastify, Next, etc.
- **ORM = Drizzle** against **D1 (SQLite)**. No Prisma, no raw Postgres.
- **Frontend data = typed `fetch`** via `src/services/api/*`. There is **no** database
  SDK in the frontend. Never re-introduce `@supabase/supabase-js` into `src/`.
- **No storage binding.** Miyomi scrapes content from source and hosts no media.
  Do **not** add R2/S3. If uploads are ever needed, use the external self-hosted
  CDN via `worker/lib/cdn.ts` (`CDN_BASE_URL` + `CDN_API_KEY`); see DEVELOPERS.md
  → "Media / CDN".
- Prefer **Web Standard APIs and Web Crypto** (V8 isolates). No Node built-ins in
  `worker/`.
- `src/types/db.ts` holds the generated row types (`Tables<'...'>`), migrated
  from Supabase. There is no Supabase client or SDK anywhere in `src/`.
- Never use secrets in the client bundle. Server secrets live in `wrangler secret`
  / `.dev.vars`.
- **One config source:** non-secret config goes in `wrangler.toml` → `[vars]`;
  secrets via `wrangler secret put`. The frontend build (Vite) and OG generator
  read `[vars]` from `wrangler.toml` — do not duplicate `VITE_*`/`SITE_URL` in
  `.env`. `.env` is local tooling only (Drizzle Kit creds, legacy migration).

## Repository map (where things live)

- `worker/index.ts` — Worker entry; mounts `/api`, SEO HTML, `/sitemap.xml`, ASSETS.
- `worker/routes/public/*` — unauthenticated `/api/*`.
- `worker/routes/admin/*` — session-guarded `/api/admin/*`.
- `worker/routes/pages/*` — SEO tag injection + sitemap.
- `worker/db/schema.ts` — **schema source of truth**; migrations in `worker/db/drizzle/`.
- `worker/lib/http.ts` — `ok`/`fail` envelope, `isoNow`, `pagination`, guards.
- `worker/lib/auth.ts` — sessions, bcrypt passwords, AES-GCM 2FA secret crypto.
- `worker/lib/totp.ts` — RFC 6238 TOTP (Web Crypto; QR codes render client-side).
- `worker/lib/cdn.ts` — optional client for the external self-hosted media CDN.
- `src/services/api/index.ts` — the typed API surface (one fn per endpoint).
- `src/services/api/http.ts` — fetch client + snake_case adapter (**core contract**).
- `src/services/api/types.ts` — shared response types (`Page`, `LikesStats`, …).
- `scripts/verify-worker.ps1`, `scripts/verify-content-api.mjs` — verification harnesses.

## API conventions

- Envelope: `{ success: true, data }` / `{ success: false, error: "..." }`.
- Wrap every route handler in `try/catch` and return `fail(c, status, message)`.
- List endpoints return `{ items, total }`; the frontend walks pages with `collectPages`.
- Drizzle emits **camelCase**; `http.ts` snake_cases top-level row keys (and `items`
  arrays) but leaves nested objects alone → **emit snake_case inside nested joins**.

## Data conventions

- New/changed columns: edit `worker/db/schema.ts` → `npm run db:generate` →
  `npm run d1:migrate:local` → mirror the type in `src/types/db.ts`.
- Content writes must go through `worker/routes/admin/content.ts`
  (`prepareAppPayload` / `prepareExtensionPayload`). Never spread `...raw` into D1.
- Keep `metadata` JSON for non-column fields (`git_provider`, `dev_status`,
  `install_urls`).
- Bound `LIKE`/`GLOB` patterns ≤ ~50 chars (workerd limit). Clamp user search input.

## Common commands

```bash
npm run dev:worker        # Worker + D1 on :8787  (run ONLY ONE at a time)
npm run dev               # Vite SPA on :8080, proxies /api → :8787
npm run d1:migrate:local  # apply migrations to local D1
npm run seed:local        # add local dev admin (does NOT wipe data)
npm run db:seed:synthetic # WARNING: wipes local data, inserts samples
npm run verify:worker     # end-to-end API checks
npm run test:import       # importer regression tests with disposable fixtures
npm run verify:cron       # scheduled-cleanup checks against isolated SQLite
npm run build             # Vite build only (development verification)
npm run build:release     # Vite build + OG images (release preparation)
npm run deploy:worker     # wrangler deploy
npx tsc -p tsconfig.worker.json    # worker typecheck (must be 0 errors)
npx tsc -p tsconfig.app.json       # frontend typecheck (must be 0 errors)
```

Local dev admin: `admin@miyomi.local` / `MiomiLocal123!`.

---

## Do NOT (common mistakes that cause regressions)

- Do NOT reintroduce Supabase in the frontend or backend runtime.
- Do NOT add client-side DB writes / reintroduce `approvalUtils`, `compatSync`,
  `contributors` utils — that logic is server-side in `worker/`.
- Do NOT add a new ORM, web framework, or storage SDK.
- Do NOT assume a column exists — **check `worker/db/schema.ts` first**. Read it
  instead of guessing.
- The old Supabase codebase (`supabase/` project folder and Cloudflare Pages
  `functions/`) has been removed. Keep it that way — do not re-introduce a
  Supabase client, Pages Functions, or the legacy edge-function patterns.
- Do NOT edit generated files: `worker/db/drizzle/*.sql`, `dist/`, `.wrangler/`.
- Do NOT commit `.env`, `.dev.vars`, `*.backup`, or real credentials.
- Do NOT run two `wrangler dev` instances (causes `SQLITE_BUSY`).
- Keep React type packages aligned with React 18; do NOT change runtime behavior
  just to suppress type errors.

## When unsure

1. Read `worker/db/schema.ts` for the data shape.
2. Read `src/services/api/index.ts` for the intended API surface.
3. Check `PROGRESS.md` "Known gaps" before assuming something is implemented.
4. Prefer the smallest change that matches surrounding patterns.
