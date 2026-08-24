# Database Schema & Regression Prevention Rules

## 1. Zero Direct Ad-Hoc Database Payloads
- **Never construct ad-hoc object literals for `supabase.from('apps')` or `supabase.from('extensions')` insert/update operations directly inside UI pages.**
- Always use the centralized sanitizers from `src/utils/approvalUtils.ts`:
  - `prepareAppDbPayload(data, isUpdate)`
  - `prepareExtensionDbPayload(data, isUpdate)`
  - `approveSubmissionRecord(sub, editedData)`
  - `approveEditSuggestionRecord(suggestion, editedData)`
- Any new database field added to `apps` or `extensions` MUST be added to `VALID_APP_COLUMNS` or `VALID_EXTENSION_COLUMNS` in `src/utils/approvalUtils.ts` and validated against `src/integrations/supabase/types.ts`.

## 2. Table-Specific Column Whitelist
- **Apps table**: Columns include `name, slug, description, short_description, author, category, version, status, platforms, tags, content_types, compatible_with, repo_url, download_url, website_url, discord_url, icon_url, icon_color, accent_color, fork_of, upstream_url, social_urls, tutorials, download_count, likes_count, last_release_date, og_image_url, seo_title, seo_description, metadata`.
  - Do NOT send `language`, `install_urls`, `submitter_notes`, `git_provider`, `dev_status`, or `_selectedGroupIds` as root columns.
  - Package non-column fields into `metadata` (`metadata.git_provider`, `metadata.dev_status`).
- **Extensions table**: Columns include `name, slug, description, short_description, author, category, language, status, platforms, tags, types, compatible_with, repo_url, source_url, website_url, discord_url, icon_url, icon_color, accent_color, auto_url, manual_url, region, info, social_urls, tutorials, download_count, likes_count, last_updated, og_image_url, seo_title, seo_description, metadata`.
  - `install_urls` MUST be saved into `metadata.install_urls` and sync `auto_url` / `manual_url`.
- **Rejection Notes Column**:
  - `submissions` table uses `admin_notes` (plural).
  - `public_edit_suggestions` and `reports` use `admin_note` (singular).

## 3. Git & Repository Boundaries
- **NEVER track or commit the `supabase/` folder to Git.** It is hosted separately and is `.gitignore`d.
- Keep all repository changes strictly focused on the requested bug or feature.

## 4. Pre-Commit Validation Checklist
Before committing any changes:
1. `npx tsc --noEmit` must pass with 0 errors.
2. Form diffs (`getDiff`) must treat `null`, `undefined`, `""`, and `[]` as equivalent empty states so untouched fields do not show false "Before: (empty)" badges.
3. Compatibility group associations must be updated additively without wiping manual selections.
