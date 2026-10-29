/**
 * Server-side input hygiene for content written to D1.
 */

// Schemes that execute script or read local data when used as an href/src.
const DANGEROUS_SCHEMES = /^(javascript|vbscript|data|file|blob):/;

/**
 * Link fields legitimately hold http(s) URLs, app deep links (tachiyomi:,
 * paperback:, …), shorthands like `gh:owner/repo`, scheme-less hosts and
 * relative paths — so this blocks dangerous schemes instead of allow-listing.
 * Browsers ignore whitespace/control characters inside a scheme
 * (`java\tscript:`), so those are stripped before checking.
 * Returns the trimmed value, or null when empty/dangerous.
 */
export function safeLink(value: unknown, maxLength = 2048): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength) return null;
  // eslint-disable-next-line no-control-regex
  const normalized = trimmed.replace(/[\u0000-\u0020\u007f-\u009f]/g, '').toLowerCase();
  if (DANGEROUS_SCHEMES.test(normalized)) return null;
  // HTML-entity-encoded colon (`javascript&colon;` / `&#58;`) is only
  // meaningful when rendered as HTML; reject it outright in link fields.
  if (/&(colon|#0*58|#x0*3a);?/i.test(normalized)) return null;
  return trimmed;
}

/** safeLink over an array, dropping unsafe/empty entries. */
export function safeLinks(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return values.map((v) => safeLink(v)).filter((v): v is string => v !== null);
}

/**
 * Fields a public submitter may never set: moderation state, engagement
 * counters, routing (slug), SEO/OG overrides and timestamps. Both snake_case
 * (form payloads) and camelCase spellings are covered.
 */
const PRIVILEGED_FIELDS = new Set([
  'id', 'status', 'slug',
  'likes_count', 'likesCount', 'download_count', 'downloadCount', 'views',
  'seo_title', 'seoTitle', 'seo_description', 'seoDescription', 'og_image_url', 'ogImageUrl',
  'moderator_note', 'moderatorNote', 'note_severity', 'noteSeverity', 'notice_sticky', 'noticeSticky',
  'is_pinned', 'isPinned', 'created_at', 'createdAt', 'updated_at', 'updatedAt',
  'published_at', 'publishedAt', 'reviewed_by', 'reviewedBy', 'reviewed_at', 'reviewedAt',
]);

/** Metadata keys a submitter may provide (everything else is dropped). */
const SUBMITTER_METADATA_KEYS = new Set([
  'install_urls', 'installUrls', 'git_provider', 'gitProvider', 'dev_status', 'devStatus',
]);

/**
 * Strip privileged fields from a public submission / edit-suggestion
 * payload. Applied when the payload is stored AND again when an admin
 * approves stored data without editing it (covers rows saved earlier).
 */
export function stripSubmitterPrivileged(data: unknown): Record<string, unknown> {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (PRIVILEGED_FIELDS.has(key)) continue;
    if (key === 'metadata') {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        const meta = Object.fromEntries(
          Object.entries(value as Record<string, unknown>).filter(([k]) => SUBMITTER_METADATA_KEYS.has(k)),
        );
        if (Object.keys(meta).length > 0) out.metadata = meta;
      }
      continue;
    }
    out[key] = value;
  }
  return out;
}

/** Trimmed string capped at `max` chars, or null. */
export function clampText(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}
