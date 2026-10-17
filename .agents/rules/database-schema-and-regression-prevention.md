# Database Schema & Regression Prevention Rules

> This file previously described the Supabase/`approvalUtils.ts` era. That code is
> **deleted**. These rules reflect the current Cloudflare D1 + Drizzle architecture.

## 1. Source of truth

- The Drizzle schema in **`worker/db/schema.ts`** is the single source of truth for
  columns. Migrations live in `worker/db/drizzle/`.
- Frontend row types come from **`src/types/db.ts`**
  (`Tables<'...'>`) — **types only**. There is no Supabase client in `src`.
- Adding/removing a column means updating `worker/db/schema.ts`, generating a
  migration (`npm run db:generate`), applying it (`npm run d1:migrate:local`), and
  mirroring the type in `src/types/db.ts`.

## 2. Never write content rows from the client

- The SPA **must not** construct DB payloads. All content writes go through the
  Worker API (`src/services/api/*` → `worker/routes/admin/*`).
- Server-side sanitizers (porter of the old `approvalUtils`) live in
  **`worker/routes/admin/content.ts`**:
  - `prepareAppPayload(raw, isUpdate)`
  - `prepareExtensionPayload(raw, isUpdate)`
- Any new `apps`/`extensions` field MUST be added to the relevant `prepare*` function
  *and* to `worker/db/schema.ts`. Do not rely on `...raw` spreads (mass assignment).

## 3. Table-specific column rules

- **apps**: `name, slug, description, short_description, author, category, version,
  status, platforms, tags, content_types, compatible_with, repo_url, download_url,
  website_url, discord_url, icon_url, icon_color, accent_color, fork_of, upstream_url,
  social_urls, tutorials, download_count, likes_count, last_release_date, og_image_url,
  seo_title, seo_description, metadata`.
  - Do NOT send `language`, `install_urls`, `submitter_notes`, `git_provider`,
    `dev_status`, or `_selectedGroupIds` as root columns.
  - Package non-column fields into `metadata` (`metadata.git_provider`,
    `metadata.dev_status`).
- **extensions**: `name, slug, description, short_description, author, category,
  language, status, platforms, tags, types, compatible_with, repo_url, source_url,
  website_url, discord_url, icon_url, icon_color, accent_color, auto_url, manual_url,
  region, info, social_urls, tutorials, download_count, likes_count, last_updated,
  og_image_url, seo_title, seo_description, metadata`.
  - `install_urls` MUST be stored in `metadata.install_urls` and mirrored to
    `auto_url` / `manual_url`.
- **Rejection notes**: `submissions` uses `admin_notes` (plural);
  `public_edit_suggestions` and `reports` use `admin_note` (singular).

## 4. API contract

- Every `/api/*` response uses `{ success: true, data }` or `{ success: false, error }`.
- List endpoints return `{ items, total }`; the SPA page-walks with `collectPages`.
- `src/services/api/http.ts` snake_cases **top-level** keys of each row (recursing
  into arrays and `items`), leaving nested objects (JSON columns) untouched.
  - Worker joins must therefore emit **snake_case keys inside nested objects**.
  - Top-level arrays (e.g. `permissions`) keep their literal element casing.

## 5. D1 / workerd gotchas

- Bound `LIKE`/`GLOB` patterns must be ≤ ~50 chars. Clamp user search input (see
  `searchCond` in `worker/routes/admin/content-crud.ts`).
- Only run **one** `wrangler dev` at a time; concurrent instances sharing the local
  D1 file cause `SQLITE_BUSY`.

## 6. Git & repository boundaries

- **Never re-introduce a `supabase/` project folder or Supabase docs/CLI
  artifacts** — the previous backend (and its nested git repo) was deleted during
  the Workers + D1 migration.
- Never commit `.env`, `.dev.vars`, or `*.backup` (real production data).
- Keep commits focused on the requested change.

## 7. Pre-commit validation

1. `npx tsc -p tsconfig.worker.json` → 0 errors.
2. `npx tsc -p tsconfig.app.json` → 0 errors (React 18 type packages are installed).
3. `npm run build` succeeds.
4. `npm run verify:worker` passes against a running local Worker.
