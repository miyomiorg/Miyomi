# Developer Guide — Miyomi

Miyomi is a community-run directory for discovering Anime, Manga, and Light Novel **apps**, **extensions**, and **guides**. It does not host content — it organizes and presents public tools in a clean, searchable way.

For a list of changes across versions, see [CHANGELOG.md](CHANGELOG.md).
For current project status and what's left to do, see [PROGRESS.md](PROGRESS.md).
If you are an AI agent, read [AGENTS.md](AGENTS.md) first.

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, TypeScript, Vite |
| **Styling** | Tailwind CSS 4 |
| **UI Components** | Radix UI primitives, shadcn-style components |
| **Rich Text** | TipTap editor (admin) |
| **API** | [Hono](https://hono.dev) on Cloudflare Workers (`worker/`) |
| **Database** | Cloudflare D1 (SQLite) via [Drizzle ORM](https://orm.drizzle.team) |
| **Media (optional)** | Self-hosted Google Drive CDN — no R2/S3 (see [Media / CDN](#-media--cdn)) |
| **Auth** | Password-only admin login, JWT session cookie (`SESSION_SECRET`) |
| **Hosting** | Cloudflare Workers (single Worker serves API + SPA + SEO) |
| **CAPTCHA** | Cloudflare Turnstile |
| **SEO** | Edge-rendered meta/OG tags + `/sitemap.xml` from the Worker |
| **Animations** | Motion (framer-motion) |

> The project migrated off Supabase. There is **no** `@supabase/supabase-js`
> anywhere in the codebase or the frontend bundle.

---

## 📁 Project Structure

```
Miyomi/
├── worker/                     # Cloudflare Worker (API + SEO + assets)
│   ├── index.ts                # Entry: mounts /api, SEO, sitemap, ASSETS
│   ├── env.d.ts                # Worker bindings (DB, ASSETS, secrets)
│   ├── db/
│   │   ├── schema.ts           # Drizzle schema — the source of truth
│   │   └── drizzle/            # Generated SQL migrations + journal
│   ├── lib/                    # auth, http envelope, rate-limit, cron, compat, cdn
│   └── routes/
│       ├── public/             # Unauthenticated /api/* (apps, guides, likes…)
│       ├── admin/              # Session-guarded /api/admin/*
│       └── pages/              # SEO-injected HTML + sitemap.xml
├── src/                        # React SPA
│   ├── components/             # UI (admin/, forms/, ui/, backgrounds/)
│   ├── context/                # React contexts (likes)
│   ├── hooks/                  # Data hooks (fetch the API)
│   ├── integrations/           # (removed — see src/types/db.ts)
│   ├── types/                  # generated row types (db.ts) — types only
│   ├── pages/                  # Route pages (admin/ = dashboard)
│   ├── services/api/           # Typed fetch client for the Hono API
│   └── utils/                  # Helpers
├── scripts/                    # Build + maintenance + verification scripts
├── drizzle.config.ts           # Drizzle Kit config
├── wrangler.toml               # Worker, D1, ASSETS bindings
└── vite.config.ts              # Dev proxy: /api → http://localhost:8787
```

---

## 🔄 Architecture

A **single Cloudflare Worker** serves everything:

```
Browser ──/api/*──▶ Worker (Hono) ──Drizzle──▶ D1 (SQLite)
        ──/*─────▶ Worker ──▶ ASSETS (Vite build) with SEO tags injected
```

- **API**: Hono routers under `worker/routes/`. Every response uses the envelope
  `{ success: true, data }` or `{ success: false, error }`.
- **Content lists** paginate as `{ items, total }`; the SPA unwraps via `collectPages`.
- **SEO**: `worker/routes/pages/seo.ts` injects per-route meta/OG/JSON-LD into
  `dist/index.html`; `sitemap.ts` renders `/sitemap.xml`. Both query D1 directly.
- **Assets**: `wrangler.toml` `[assets]` points at `./dist` via the `ASSETS` binding.
- **Frontend data**: all calls go through `src/services/api/*` (typed `fetch`), never
  a database SDK.

### Key hooks

| Hook | Purpose |
|---|---|
| `useApp` / `useExtension` | Single item details |
| `useGlobalSearch` | Search across apps + extensions |
| `useAuth` / `useAdmin` | Admin session + role |
| `useDonations` | Donation data |
| `useBlogPosts` / `useBlogPost` | Blog content |
| `useGitHubRelease` / `useGitHubLastCommit` | GitHub metadata |
| `useThemeEngine` | Dynamic theme system |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js 22.18+** (native TypeScript execution and SQLite verification scripts)
- A [Cloudflare](https://cloudflare.com) account (Workers, D1, Turnstile)
- Optional: the production DB backup for realistic local data

### 1. Install

```bash
git clone https://github.com/miyomiorg/Miyomi.git
cd Miyomi
npm install
```

### 2. Configuration — ONE place

All Miyomi configuration lives in **Cloudflare**, not in scattered dotfiles:

| What | Where |
|---|---|
| Non-secret config (`SITE_URL`, `VITE_TURNSTILE_SITE_KEY`, `CF_ZONE_ID`, …) | `wrangler.toml` → `[vars]` |
| Secrets (`SESSION_SECRET`, `TURNSTILE_SECRET_KEY`, `CF_API_TOKEN`) | `npx wrangler secret put <NAME>` (production) |

The frontend build (`vite.config.ts`) and the OG generator read `[vars]` from
`wrangler.toml`, so there is no separate `.env` for `VITE_*` keys and they can
never drift from the Worker's runtime config.

- `wrangler secret put --local <NAME>` writes local-dev secrets into `.dev.vars`
  (used by `npm run dev:worker`); it is gitignored.
- `.env` is **local developer tooling only** — Drizzle Kit's `db:studio`/`db:push`
  credentials (`CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_D1_TOKEN`) and legacy
  Supabase migration scripts. It is not used at runtime or for the build.

# Secrets in use:
#   npx wrangler secret put SESSION_SECRET          # ≥32 char JWT signing key
#   npx wrangler secret put TURNSTILE_SECRET_KEY    # matches VITE_TURNSTILE_SITE_KEY
#   npx wrangler secret put CF_API_TOKEN            # Cloudflare API token (Analytics:Read + Zone:Read) for /api/stats
#   npx wrangler secret put TELEGRAM_BOT_TOKEN      # @BotFather bot token for admin notifications
#
# Global Telegram chat ids live in wrangler.toml [vars] → TELEGRAM_CHAT_IDS
# (comma-separated). Each admin can additionally set their own chat id in
# Settings → Telegram Notifications; it is appended to the global list.

`CF_ZONE_ID` (the `miyomi.app` zone id) is **not** a secret — it already lives in
`wrangler.toml [vars]`. A `CF_API_TOKEN` is created in the Cloudflare dashboard
(My Profile → API Tokens) with **Analytics: Read** and **Zone: Read** on
`miyomi.app`, then set with the command above.

### 3. Database (local D1)

```bash
npm run d1:migrate:local     # apply Drizzle migrations to the local D1
npm run seed:local           # add a local dev admin (does NOT wipe data)
npm run db:seed:synthetic    # ⚠️ wipes local data, inserts throwaway samples
```

Local dev login (after `seed:local`): `admin@miyomi.local` / `MiomiLocal123!`

### 4. Run

```bash
npm run dev:worker   # Worker + D1 on http://localhost:8787
npm run dev          # Vite SPA on http://localhost:8080 (proxies /api → :8787)
```

> Local dev reads the production Turnstile site key from `wrangler.toml`, which
> does not work on `localhost`. Skip the widget while developing:
>
> ```powershell
> $env:VITE_DISABLE_TURNSTILE = 'true'
> npm run dev
> ```
>
> The local Worker has no `TURNSTILE_SECRET_KEY`, so it skips verification.

> ⚠️ Run **one** `wrangler dev` at a time — two instances sharing the local D1 file
> cause `SQLITE_BUSY`.

### 5. Verify & Build

```bash
npm run verify:worker        # end-to-end API checks against the local Worker
npm run verify:2fa           # staged-login / enrolment / gate circuit
npm run verify:analytics     # admin analytics endpoint (needs CF creds in .dev.vars)
npm run test:import          # isolated importer regression tests (no real data)
npm run verify:cron          # isolated scheduled-cleanup retention checks
npm run build                # Vite build only; skips OG images during development
npm run build:release        # release preparation: Vite + OG image generation
npm run deploy:worker        # wrangler deploy
```

Before deploying: `npx tsc -p tsconfig.worker.json` and `npx tsc -p tsconfig.app.json`
should pass, and `npm run build` should succeed.

### 6. Secrets for production

```bash
npx wrangler secret put SESSION_SECRET
npx wrangler secret put TURNSTILE_SECRET_KEY
npx wrangler secret put CF_API_TOKEN
```

`CF_ZONE_ID` and the Turnstile site key are non-secret and live in
`wrangler.toml [vars]`.

### Admin CLI (production-capable)

Two CLI tools **intentionally** write to the production D1 database and require
`wrangler login` (or `CLOUDFLARE_API_TOKEN`):

- `node scripts/create-admin.mjs <email> <password>` — create a new super admin
- `node scripts/reset-admin-password.mjs <email>` — reset a password and clear
  that account's two-factor secret (lost-authenticator recovery)

Both escape their SQL string inputs and run only single INSERT/UPDATE
statements. The verification suites (`verify-*`) are pinned to localhost and
refuse to run against any other host.

---

## ☁️ Deployment

For the current launch blockers and ordered production cutover tasks, see
[PROGRESS.md → What remains](PROGRESS.md#what-remains). The remote D1 database
exists, but its Miyomi schema/data have not been imported yet.

Single Worker deployment (after database and secrets are configured):

1. `npm run build:release` (produces `dist/` incl. OG images)
2. `npm run deploy:worker` (`wrangler deploy`)

Before the domain serves the new API, build OG images using the local migrated
Worker. In PowerShell, with one `npm run dev:worker` instance running:

```powershell
$env:OG_API_URL = 'http://127.0.0.1:8787'
npm run build:release
```

`VITE_TURNSTILE_SITE_KEY` must be available to Vite at build time; a Wrangler
runtime variable alone does not configure the frontend bundle. Attach the
production custom domain to the Worker after verifying the deployment URL.

Regular `npm run dev` and `npm run build` do not generate OG images. Use
`build:release` for a release, or `og:generate` to regenerate images explicitly.

`wrangler.toml` binds:

- `DB` → D1 database `miyomi-db`
- `ASSETS` → `./dist`

There is **no R2 binding**. Miyomi scrapes content from source and hosts no
media itself; see [Media / CDN](#-media--cdn).

---

## 🖼️ Media / CDN

Miyomi does **not** store media. Icons/OG images are scraped from each item's own
source (GitHub etc.), and social images are generated at build time into
`dist/og/**`, served by the Worker through `ASSETS`. There is **no R2 bucket**.

A self-hosted media CDN is available **if uploads are ever needed**:

- **Host:** `https://cdn-bevore.misfits.workers.dev`
- **What it is:** a personal Google Drive → Cloudflare Worker proxy (built by
  `tas33n`) with an upload API and dashboard.
- **Client:** [`worker/lib/cdn.ts`](worker/lib/cdn.ts) — `cdnUpload()`,
  `cdnFileUrl()`, `cdnConfigured()`.
- **Config (optional):** `CDN_BASE_URL` + `CDN_API_KEY`
  (`npx wrangler secret put CDN_API_KEY`). When unset the client is dormant.

### Upload API

```bash
curl -X POST https://cdn-bevore.misfits.workers.dev/api/files \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@image.jpg" \
  -F 'metadata={"name":"image.jpg"}'
```

Response:

```json
{
  "status": "success",
  "data": {
    "kind": "drive#file",
    "id": "1yjInKBrrl0swNMXAWK5gOMn538zR2NMw",
    "name": "SaveSora_video_1762868282102.mp4",
    "mimeType": "video/mp4",
    "rawUrl": "https://cdn-bevore.misfits.workers.dev/files/1yjInKBrrl0swNMXAWK5gOMn538zR2NMw"
  }
}
```

Store `data.rawUrl` in `apps.icon_url` / `og_image_url` (or `metadata`) and render
it directly.

> Delete/list endpoints are **not** documented in this repo — confirm them from the
> CDN's own API docs before using them.

---

## 🗃️ Database

Drizzle schema: `worker/db/schema.ts`. Migrations: `worker/db/drizzle/`
(`npm run db:generate` after schema changes, then `npm run d1:migrate:local`).

Main table groups:

- **Content:** `apps`, `extensions`, `guides`, `faqs`, `blog_posts`
- **Community:** `submissions`, `public_edit_suggestions`, `likes`, `reports`, `feedbacks`
- **Admin:** `admins`, `user_roles`, `moderator_permissions`, `admin_logs`, `admin_sessions`, `unauthorized_login_attempts`, `bot_attack_logs`
- **Config:** `notices`, `themes`, `settings`, `donations`, `donation_settings`, `compatibility_groups`
- **Joins:** `app_group_memberships`, `extension_group_memberships`, `contributors`, `rate_limits`

### Preparing the D1 data import

After exporting the restored Postgres backup as headerless CSVs, run:

```bash
node scripts/migrate-supabase-to-d1.mjs
# Optional explicit paths (including paths with spaces):
node scripts/migrate-supabase-to-d1.mjs --export-dir "path/to/csv" --out-dir "path/to/sql"
```

The default input is `.wrangler/export/`, resolved relative to the repository,
and the default output is its `sql/` subdirectory. All 27 table CSVs and
`auth_users.csv` must exist; export empty tables as empty files. The script only
generates SQL and a row-count `manifest.json`; it does not apply changes to D1.
It validates inputs before replacing output and rebuilds empty-table SQL to
prevent stale data from leaking into `ALL.sql`.

Use `npm run test:import` to verify the importer against disposable fixtures.
`scripts/restore-db.mjs` is the legacy Supabase restore tool, not a D1 importer.

---

## 📨 Submission Flow

1. User submits via `/contribute` (Basic/Advanced) or `/submit-guide`.
2. Turnstile token is verified server-side (`POST /api/submissions`).
3. Row lands in `submissions` with status `pending`.
4. Admin reviews in `/admin` (edit if needed) and approves or rejects.
5. On approval the server writes the content row, syncs compatibility groups, and
   records the contributor.

---

## 🔒 Security Notes

- Never expose `SESSION_SECRET` or other server secrets to the client bundle.
- Admin routes require a valid session (cookie or `Authorization: Bearer`).
- **Two-factor authentication (TOTP) is mandatory and one-way.** Password-first
  staged login: enrolled accounts always need the authenticator code (`/admin/auth/
  login` + `/admin/auth/login/complete`). Accounts without 2FA log in but are
  redirected to Settings, where a router-wide gate blocks every other admin API
  section until enrolment finishes. Once enabled it **cannot be disabled** —
  only reset (re-enrol) from Settings → Two-Factor Authentication with a password
  confirm. Secrets are stored AES-GCM-encrypted (`SESSION_SECRET`-derived key).
  Lost-authenticator recovery = CLI password reset (`admin:reset-password` +
  `admin:create`), which also clears the stored 2FA secret.
- Turnstile protects public write endpoints; keep it enabled in production.
- IP addresses are stored as SHA-256 hashes, not raw values.
- `.env`, `.dev.vars`, and `*.backup` must never be committed.

---

Miyomi is built by our team and shaped by community feedback. Keep changes clean,
readable, and maintainable. ❤️
