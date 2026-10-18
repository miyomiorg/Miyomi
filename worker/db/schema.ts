/**
 * Drizzle ORM schema — Cloudflare D1 (SQLite).
 *
 * Single source of truth for the database schema. Migrated 1:1 from the
 * Supabase (Postgres) public schema (see src/types/db.ts).
 *
 * ── Type mapping (Postgres → SQLite) ────────────────────────────────
 *   uuid / text        →  text
 *   jsonb / json       →  text stored as JSON (drizzle `{ mode: 'json' }`
 *                          auto JSON.parse/stringify — "text-as-json")
 *   text[] (arrays)    →  text stored as JSON array
 *   timestamptz        →  text, ISO-8601 UTC strings.
 *                          (Kept as text so Supabase data can be copied
 *                           over without any transformation.)
 *   boolean            →  integer (0/1) via { mode: 'boolean' }
 *   integer/numeric    →  integer / real
 *   enum (app_role)    →  text with allowed values
 *
 * ── Conventions ─────────────────────────────────────────────────────
 *   - `id` PKs are UUIDv4, generated app-side with crypto.randomUUID()
 *     (Web Crypto — no native deps). Always set explicitly in service
 *     code before insert.
 *   - created_at/updated_at default to the current UTC time via a SQLite
 *     expression, but service code should still set them explicitly.
 *   - `user_id`-style columns referenced Supabase auth.users in Postgres;
 *     in D1 they are plain text (auth moves into the Hono API in Step 3).
 *   - Indexes marked "(assumed)" are best-practice guesses — the
 *     generated Supabase types don't include index metadata. Verify
 *     against the Supabase dashboard before the production cutover.
 *
 * ── NOT migrated to D1 (Postgres-only, handled in Step 3) ──────────
 *   - RLS policies            → Hono auth/middleware in the API layer
 *   - DB functions            → Hono service logic
 *       claim_super_admin, has_role, is_admin, system_has_super_admin,
 *       increment_blog_view, get_likes_stats,
 *       cleanup_expired_rate_limits, cleanup_old_rejected, clear_admin_data
 *       (the two cleanup_* functions can become a Cloudflare Cron Trigger)
 *   - View user_likes_summary → not used by the frontend; becomes a
 *       service-layer query over `likes`
 *
 * ── Workflow ────────────────────────────────────────────────────────
 *   1. Edit this file
 *   2. npm run db:generate           → SQL migrations in ./drizzle/
 *   3. npm run d1:migrate:remote     → apply to production D1
 *      (needs `wrangler login`; alternatively `npm run db:migrate`
 *       via the drizzle-kit d1-http API token)
 *   4. npm run d1:migrate:local      → apply to the local dev DB
 */
import { relations, sql } from 'drizzle-orm';
import {
  integer,
  index,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

// ── Column helpers ──────────────────────────────────────────────────

/** Current time as ISO-8601 UTC, e.g. 2026-10-17T06:50:31.123Z */
const nowIso = sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`;

/** NOT NULL ISO-8601 timestamp with DB default (Postgres timestamptz w/ default) */
const ts = (name: string) => text(name).notNull().default(nowIso);
/** Nullable ISO-8601 timestamp (Postgres nullable timestamptz) */
const tsN = (name: string) => text(name);
/** NOT NULL JSON (jsonb) */
const json = (name: string) => text(name, { mode: 'json' }).notNull();
/** Nullable JSON (jsonb) */
const jsonN = (name: string) => text(name, { mode: 'json' });
/** Nullable string[] (Postgres text[] → JSON array) — nullable by default */
const arrN = (name: string) =>
  text(name, { mode: 'json' }).$type<string[] | null>();

// ── Tables ──────────────────────────────────────────────────────────

export const admins = sqliteTable(
  'admins',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull(),
    /**
     * Password hash — either:
     *   - bcrypt ($2a$/$2b$/$2y$...) ported from Supabase auth.users at
     *     cutover (verified with bcryptjs), or
     *   - pbkdf2-sha256$<iterations>$<salt>$<hash> created by this Worker.
     */
    passwordHash: text('password_hash'),
    /**
     * TOTP two-factor secret (AES-GCM encrypted with a key derived from
     * SESSION_SECRET). NULL = 2FA not configured. See worker/lib/auth.ts
     * (encryptSecret/decryptSecret) and worker/lib/totp.ts.
     */
    totpSecret: text('totp_secret'),
    /**
     * Optional personal Telegram chat id — notifications are delivered to the
     * global TELEGRAM_CHAT_IDS plus every admin's chat id (appended).
     */
    telegramChatId: text('telegram_chat_id'),
    /** Legacy Supabase auth user id (app-level link, not a DB FK in D1) */
    userId: text('user_id'),
    displayName: text('display_name'),
    avatarUrl: text('avatar_url'),
    isActive: integer('is_active', { mode: 'boolean' })
      .notNull()
      .default(true),
    createdAt: ts('created_at'),
    updatedAt: ts('updated_at'),
  },
  // email is the login identifier — assume unique in Postgres
  (t) => [uniqueIndex('uq_admins_email').on(t.email)],
);
export const adminSessions = sqliteTable(
  'admin_sessions',
  {
    id: text('id').primaryKey(),
    adminId: text('admin_id')
      .notNull()
      .references(() => admins.id, { onDelete: 'cascade' }),
    sessionType: text('session_type').notNull(),
    ipAddress: text('ip_address'),
    os: text('os'),
    osVersion: text('os_version'),
    browser: text('browser'),
    browserVersion: text('browser_version'),
    deviceType: text('device_type'),
    deviceModel: text('device_model'),
    deviceVendor: text('device_vendor'),
    userAgent: text('user_agent'),
    deviceFingerprint: text('device_fingerprint'),
    city: text('city'),
    country: text('country'),
    createdAt: ts('created_at'),
  },
  (t) => [index('idx_admin_sessions_admin_id').on(t.adminId)],
);

export const adminLogs = sqliteTable(
  'admin_logs',
  {
    id: text('id').primaryKey(),
    action: text('action').notNull(),
    resourceType: text('resource_type').notNull(),
    resourceId: text('resource_id'),
    resourceName: text('resource_name'),
    adminId: text('admin_id').references(() => admins.id, {
      onDelete: 'set null',
    }),
    details: jsonN('details'),
    createdAt: tsN('created_at'),
  },
  (t) => [
    index('idx_admin_logs_admin_id').on(t.adminId),
    index('idx_admin_logs_created_at').on(t.createdAt),
  ],
);

export const apps = sqliteTable(
  'apps',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    slug: text('slug'),
    description: text('description'),
    shortDescription: text('short_description'),
    author: text('author'),
    category: text('category'),
    /** pending | approved | rejected | ... (service layer) */
    status: text('status').notNull(),
    version: text('version'),
    platforms: arrN('platforms'),
    contentTypes: arrN('content_types'),
    tags: arrN('tags'),
    compatibleWith: arrN('compatible_with'),
    iconUrl: text('icon_url'),
    iconColor: text('icon_color'),
    accentColor: text('accent_color'),
    ogImageUrl: text('og_image_url'),
    downloadUrl: text('download_url'),
    repoUrl: text('repo_url'),
    websiteUrl: text('website_url'),
    discordUrl: text('discord_url'),
    upstreamUrl: text('upstream_url'),
    forkOf: text('fork_of'),
    metadata: jsonN('metadata'),
    socialUrls: jsonN('social_urls'),
    tutorials: jsonN('tutorials'),
    seoTitle: text('seo_title'),
    seoDescription: text('seo_description'),
    downloadCount: integer('download_count'),
    likesCount: integer('likes_count'),
    lastReleaseDate: tsN('last_release_date'),
    createdAt: ts('created_at'),
    updatedAt: ts('updated_at'),
  },
  (t) => [
    // Confirmed from the production DDL: UNIQUE (slug) — apps_legacy_id_key
    // (SQLite, like Postgres, allows multiple NULLs in a unique index)
    uniqueIndex('uq_apps_slug').on(t.slug),
    index('idx_apps_status').on(t.status),
    index('idx_apps_name').on(t.name),
    index('idx_apps_category').on(t.category),
  ],
);

export const extensions = sqliteTable(
  'extensions',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    moderatorNote: text('moderator_note'),
    noteSeverity: text('note_severity'),
    slug: text('slug'),
    description: text('description'),
    shortDescription: text('short_description'),
    author: text('author'),
    category: text('category'),
    status: text('status').notNull(),
    info: text('info'),
    language: text('language'),
    region: text('region'),
    autoUrl: text('auto_url'),
    manualUrl: text('manual_url'),
    sourceUrl: text('source_url'),
    repoUrl: text('repo_url'),
    websiteUrl: text('website_url'),
    discordUrl: text('discord_url'),
    platforms: arrN('platforms'),
    types: arrN('types'),
    tags: arrN('tags'),
    compatibleWith: arrN('compatible_with'),
    iconUrl: text('icon_url'),
    iconColor: text('icon_color'),
    accentColor: text('accent_color'),
    ogImageUrl: text('og_image_url'),
    metadata: jsonN('metadata'),
    socialUrls: jsonN('social_urls'),
    tutorials: jsonN('tutorials'),
    seoTitle: text('seo_title'),
    seoDescription: text('seo_description'),
    downloadCount: integer('download_count'),
    likesCount: integer('likes_count'),
    lastUpdated: tsN('last_updated'),
    createdAt: ts('created_at'),
    updatedAt: ts('updated_at'),
  },
  (t) => [
    uniqueIndex('uq_extensions_slug').on(t.slug), // (assumed)
    index('idx_extensions_status').on(t.status),
    index('idx_extensions_name').on(t.name),
  ],
);

export const guides = sqliteTable(
  'guides',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    slug: text('slug'),
    description: text('description'),
    content: text('content'),
    contentHtml: text('content_html'),
    contentFormat: text('content_format').notNull(),
    contentMode: text('content_mode'),
    templateVersion: text('template_version'),
    author: text('author'),
    authorName: text('author_name'),
    authorAvatarUrl: text('author_avatar_url'),
    category: text('category'),
    relatedApps: arrN('related_apps'),
    relatedExtensions: arrN('related_extensions'),
    tags: arrN('tags'),
    metadata: jsonN('metadata'),
    ogImageUrl: text('og_image_url'),
    seoTitle: text('seo_title'),
    seoDescription: text('seo_description'),
    status: text('status').notNull(),
    publishedAt: tsN('published_at'),
    createdAt: ts('created_at'),
    updatedAt: ts('updated_at'),
  },
  (t) => [
    uniqueIndex('uq_guides_slug').on(t.slug), // (assumed)
    index('idx_guides_status').on(t.status),
    index('idx_guides_published_at').on(t.publishedAt),
  ],
);

export const blogPosts = sqliteTable(
  'blog_posts',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    slug: text('slug').notNull(),
    excerpt: text('excerpt'),
    content: text('content').notNull(),
    contentFormat: text('content_format').notNull(),
    category: text('category').notNull(),
    status: text('status').notNull(),
    tags: arrN('tags'),
    /** Supabase auth user id (not a D1 FK) */
    authorId: text('author_id'),
    authorName: text('author_name'),
    authorRole: text('author_role'),
    authorAvatarUrl: text('author_avatar_url'),
    thumbnailUrl: text('thumbnail_url'),
    thumbnailAlt: text('thumbnail_alt'),
    ogImageUrl: text('og_image_url'),
    seoTitle: text('seo_title'),
    seoDescription: text('seo_description'),
    isPinned: integer('is_pinned', { mode: 'boolean' }),
    views: integer('views'),
    publishedAt: tsN('published_at'),
    createdAt: ts('created_at'),
    updatedAt: ts('updated_at'),
  },
  (t) => [
    uniqueIndex('uq_blog_posts_slug').on(t.slug), // (assumed)
    index('idx_blog_posts_status').on(t.status),
    index('idx_blog_posts_published_at').on(t.publishedAt),
    index('idx_blog_posts_category').on(t.category),
  ],
);

export const faqs = sqliteTable(
  'faqs',
  {
    id: text('id').primaryKey(),
    question: text('question').notNull(),
    answer: text('answer').notNull(),
    category: text('category'),
    contentFormat: text('content_format'),
    legacyId: text('legacy_id'),
    orderIndex: integer('order_index').notNull().default(0),
    tags: arrN('tags'),
    createdAt: ts('created_at'),
    updatedAt: ts('updated_at'),
  },
  (t) => [
    index('idx_faqs_category').on(t.category), // (assumed)
    index('idx_faqs_order_index').on(t.orderIndex), // (assumed)
  ],
);

export const compatibilityGroups = sqliteTable(
  'compatibility_groups',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    color: text('color').default('#6366F1'),
    iconUrl: text('icon_url'),
    createdAt: ts('created_at'),
    updatedAt: ts('updated_at'),
  },
  // Confirmed: compatibility_groups_name_key UNIQUE (name)
  (t) => [uniqueIndex('uq_groups_name').on(t.name)],
);

export const appGroupMemberships = sqliteTable(
  'app_group_memberships',
  {
    appId: text('app_id')
      .notNull()
      .references(() => apps.id, { onDelete: 'cascade' }),
    groupId: text('group_id')
      .notNull()
      .references(() => compatibilityGroups.id, { onDelete: 'cascade' }),
  },
  (t) => [
    primaryKey({ columns: [t.appId, t.groupId] }), // confirmed: upsert onConflict 'app_id,group_id'
  ],
);

export const extensionGroupMemberships = sqliteTable(
  'extension_group_memberships',
  {
    extensionId: text('extension_id')
      .notNull()
      .references(() => extensions.id, { onDelete: 'cascade' }),
    groupId: text('group_id')
      .notNull()
      .references(() => compatibilityGroups.id, { onDelete: 'cascade' }),
  },
  (t) => [
    primaryKey({ columns: [t.extensionId, t.groupId] }),
  ],
);

export const likes = sqliteTable(
  'likes',
  {
    id: text('id').primaryKey(),
    itemId: text('item_id').notNull(),
    /** 'app' | 'extension' (service layer) */
    itemType: text('item_type').notNull().default('app'),
    deviceFingerprint: text('device_fingerprint').notNull(),
    anonymousId: text('anonymous_id'),
    browser: text('browser'),
    browserVersion: text('browser_version'),
    deviceModel: text('device_model'),
    deviceType: text('device_type'),
    deviceVendor: text('device_vendor'),
    fingerprintMethod: text('fingerprint_method'),
    ipAddress: text('ip_address'),
    ipHash: text('ip_hash'),
    language: text('language'),
    os: text('os'),
    osVersion: text('os_version'),
    referrer: text('referrer'),
    screenResolution: text('screen_resolution'),
    timezone: text('timezone'),
    userAgent: text('user_agent'),
    userAgentHash: text('user_agent_hash'),
    likedAt: ts('liked_at'),
  },
  (t) => [
    // Confirmed from the production DDL: votes_item_id_device_fingerprint_key
    // UNIQUE (item_id, device_fingerprint) — note: item_type is NOT in the key
    uniqueIndex('uq_likes_item_fingerprint').on(t.itemId, t.deviceFingerprint),
    index('idx_likes_item_lookup').on(t.itemId, t.itemType),
    index('idx_likes_fingerprint_item').on(t.deviceFingerprint, t.itemId),
    index('idx_likes_liked_at').on(t.likedAt),
  ],
);

export const reports = sqliteTable(
  'reports',
  {
    id: text('id').primaryKey(),
    reason: text('reason').notNull(),
    targetType: text('target_type').notNull(),
    targetId: text('target_id'),
    status: text('status').notNull(),
    message: text('message'),
    pageUrl: text('page_url'),
    reporterName: text('reporter_name'),
    reporterContact: text('reporter_contact'),
    reporterUserId: text('reporter_user_id'),
    anonymousId: text('anonymous_id'),
    deviceFingerprint: text('device_fingerprint'),
    deviceType: text('device_type'),
    ipAddress: text('ip_address'),
    os: text('os'),
    browser: text('browser'),
    language: text('language'),
    screenResolution: text('screen_resolution'),
    timezone: text('timezone'),
    reviewedBy: text('reviewed_by'),
    reviewedAt: tsN('reviewed_at'),
    adminNote: text('admin_note'),
    createdAt: ts('created_at'),
    updatedAt: ts('updated_at'),
  },
  (t) => [
    index('idx_reports_status').on(t.status), // (assumed)
    index('idx_reports_target').on(t.targetType, t.targetId), // (assumed)
    index('idx_reports_created_at').on(t.createdAt),
  ],
);

export const feedbacks = sqliteTable(
  'feedbacks',
  {
    id: text('id').primaryKey(),
    message: text('message').notNull(),
    status: text('status').notNull(),
    feedbackType: text('feedback_type'),
    pageUrl: text('page_url'),
    userId: text('user_id'),
    userName: text('user_name'),
    userContact: text('user_contact'),
    reviewedBy: text('reviewed_by'),
    reviewedAt: tsN('reviewed_at'),
    adminNote: text('admin_note'),
    createdAt: ts('created_at'),
    updatedAt: ts('updated_at'),
  },
  (t) => [
    index('idx_feedbacks_status').on(t.status), // (assumed)
    index('idx_feedbacks_created_at').on(t.createdAt),
  ],
);

export const submissions = sqliteTable(
  'submissions',
  {
    id: text('id').primaryKey(),
    submissionType: text('submission_type').notNull(),
    status: text('status').notNull(),
    submittedData: json('submitted_data'),
    author: text('author'),
    submitterName: text('submitter_name'),
    submitterEmail: text('submitter_email'),
    submitterContact: text('submitter_contact'),
    submitterUserId: text('submitter_user_id'),
    duplicateCheckResults: jsonN('duplicate_check_results'),
    recaptchaScore: real('recaptcha_score'),
    adminNotes: text('admin_notes'),
    reviewedBy: text('reviewed_by'),
    reviewedAt: tsN('reviewed_at'),
    createdAt: ts('created_at'),
    updatedAt: ts('updated_at'),
  },
  (t) => [
    index('idx_submissions_status').on(t.status),
    index('idx_submissions_type').on(t.submissionType), // (assumed)
    index('idx_submissions_created_at').on(t.createdAt),
  ],
);

export const publicEditSuggestions = sqliteTable(
  'public_edit_suggestions',
  {
    id: text('id').primaryKey(),
    targetType: text('target_type').notNull(),
    targetId: text('target_id').notNull(),
    submittedData: json('submitted_data'),
    originalDataSnapshot: json('original_data_snapshot'),
    approvedData: jsonN('approved_data'),
    status: text('status').notNull(),
    submitterName: text('submitter_name'),
    submitterContact: text('submitter_contact'),
    submitterUserId: text('submitter_user_id'),
    reviewedBy: text('reviewed_by'),
    reviewedAt: tsN('reviewed_at'),
    adminNote: text('admin_note'),
    createdAt: ts('created_at'),
    updatedAt: ts('updated_at'),
  },
  (t) => [
    index('idx_pes_status').on(t.status),
    index('idx_pes_target').on(t.targetType, t.targetId), // (assumed)
  ],
);

export const rateLimits = sqliteTable(
  'rate_limits',
  {
    id: text('id').primaryKey(),
    endpoint: text('endpoint').notNull(),
    ipAddress: text('ip_address').notNull(),
    windowStart: ts('window_start'),
    requestCount: integer('request_count').notNull().default(0),
    createdAt: ts('created_at'),
  },
  (t) => [
    // Dedup key for upsert-style rate limiting — (assumed)
    uniqueIndex('uq_rate_limits_key').on(t.ipAddress, t.endpoint, t.windowStart),
    index('idx_rate_limits_created_at').on(t.createdAt),
  ],
);

// Postgres DDL: `key` IS the primary key (no id column).
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: json('value'),
  category: text('category'),
  description: text('description'),
  isSensitive: integer('is_sensitive', { mode: 'boolean' })
    .notNull()
    .default(false),
  updatedBy: text('updated_by'),
  updatedAt: ts('updated_at'),
});

export const donationSettings = sqliteTable('donation_settings', {
  key: text('key').primaryKey(),
  value: json('value'),
  updatedAt: tsN('updated_at'),
});

export const donations = sqliteTable(
  'donations',
  {
    id: text('id').primaryKey(),
    donorName: text('donor_name').notNull(),
    message: text('message'),
    amount: real('amount'),
    currency: text('currency'),
    /** YYYY-MM-DD */
    date: tsN('date'),
    paymentMethod: text('payment_method'),
    isPublic: integer('is_public', { mode: 'boolean' }),
    showAmount: integer('show_amount', { mode: 'boolean' }),
    createdAt: tsN('created_at'),
    updatedAt: tsN('updated_at'),
  },
  (t) => [index('idx_donations_created_at').on(t.createdAt)],
);

export const themes = sqliteTable(
  'themes',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    isActive: integer('is_active', { mode: 'boolean' })
      .notNull()
      .default(false),
    isSeasonal: integer('is_seasonal', { mode: 'boolean' })
      .notNull()
      .default(false),
    activeFrom: tsN('active_from'),
    activeTo: tsN('active_to'),
    previewImage: text('preview_image'),
    assets: jsonN('assets'),
    cssVariables: jsonN('css_variables'),
    particleConfig: jsonN('particle_config'),
    createdAt: ts('created_at'),
    updatedAt: ts('updated_at'),
  },
  (t) => [uniqueIndex('uq_themes_slug').on(t.slug)],
);

export const notices = sqliteTable(
  'notices',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    message: text('message').notNull(),
    type: text('type').notNull(),
    priority: integer('priority').notNull().default(0),
    active: integer('active', { mode: 'boolean' }).notNull().default(true),
    dismissible: integer('dismissible', { mode: 'boolean' })
      .notNull()
      .default(true),
    createdBy: text('created_by'),
    startDate: tsN('start_date'),
    endDate: tsN('end_date'),
    createdAt: ts('created_at'),
    updatedAt: ts('updated_at'),
  },
  (t) => [
    index('idx_notices_active').on(t.active), // (assumed)
    index('idx_notices_priority').on(t.priority),
  ],
);

export const unauthorizedLoginAttempts = sqliteTable(
  'unauthorized_login_attempts',
  {
    id: text('id').primaryKey(),
    authProvider: text('auth_provider').notNull(),
    email: text('email'),
    browser: text('browser'),
    browserVersion: text('browser_version'),
    city: text('city'),
    country: text('country'),
    deviceFingerprint: text('device_fingerprint'),
    deviceModel: text('device_model'),
    deviceType: text('device_type'),
    deviceVendor: text('device_vendor'),
    ipAddress: text('ip_address'),
    os: text('os'),
    osVersion: text('os_version'),
    userAgent: text('user_agent'),
    createdAt: ts('created_at'),
  },
  (t) => [
    index('idx_ula_created_at').on(t.createdAt),
    index('idx_ula_ip_address').on(t.ipAddress), // (assumed)
  ],
);

export const botAttackLogs = sqliteTable(
  'bot_attack_logs',
  {
    id: text('id').primaryKey(),
    reason: text('reason').notNull(),
    country: text('country'),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    headersDump: jsonN('headers_dump'),
    createdAt: ts('created_at'),
  },
  (t) => [index('idx_bot_attack_logs_created_at').on(t.createdAt)],
);

export const userRoles = sqliteTable(
  'user_roles',
  {
    id: text('id').primaryKey(),
    /** Supabase auth user id (not a D1 FK) */
    userId: text('user_id').notNull(),
    // The Postgres enum also contains 'moderator' (stale generated types
    // only listed two; the admin UI checks has_role('moderator'))
    role: text('role', { enum: ['super_admin', 'admin', 'moderator'] }).notNull(),
  },
  (t) => [
    uniqueIndex('uq_user_roles_user_role').on(t.userId, t.role), // (assumed)
  ],
);

/**
 * Contributor profiles (used by the submission-approval flow).
 * Not present in the generated Supabase types — inferred from
 * src/utils/contributors.ts.
 */
export const contributors = sqliteTable('contributors', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email'),
  contact: text('contact'),
  /** Array of { type: 'app' | 'extension', id, name } */
  contributions: text('contributions', { mode: 'json' }).$type<
    Array<{ type: 'app' | 'extension'; id: string; name: string }>
  >(),
  // NOTE: the Postgres table has no updated_at column
  createdAt: tsN('created_at'),
});

/**
 * Per-resource permissions for the 'moderator' role.
 * Not present in the generated Supabase types — inferred from
 * src/hooks/useAdmin.ts.
 */
export const moderatorPermissions = sqliteTable(
  'moderator_permissions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    resource: text('resource').notNull(),
    canRead: integer('can_read', { mode: 'boolean' }).notNull().default(true),
    canWrite: integer('can_write', { mode: 'boolean' }).notNull().default(false),
    canDelete: integer('can_delete', { mode: 'boolean' }).notNull().default(false),
    grantedBy: text('granted_by'),
    createdAt: tsN('created_at'),
  },
  (t) => [uniqueIndex('uq_mod_perms_user_resource').on(t.userId, t.resource)],
);

// ── Relations (for Drizzle relational queries) ──────────────────────
// drizzle-orm 0.45+: per-table Relations instances
// (rel.one / rel.many are scoped to the source table).

export const adminsRelations = relations(admins, (rel) => ({
  adminLogs: rel.many(adminLogs),
  adminSessions: rel.many(adminSessions),
}));

export const adminLogsRelations = relations(adminLogs, (rel) => ({
  admin: rel.one(admins, {
    fields: [adminLogs.adminId],
    references: [admins.id],
  }),
}));

export const adminSessionsRelations = relations(adminSessions, (rel) => ({
  admin: rel.one(admins, {
    fields: [adminSessions.adminId],
    references: [admins.id],
  }),
}));

export const appsRelations = relations(apps, (rel) => ({
  groupMemberships: rel.many(appGroupMemberships),
}));

export const extensionsRelations = relations(extensions, (rel) => ({
  groupMemberships: rel.many(extensionGroupMemberships),
}));

export const compatibilityGroupsRelations = relations(compatibilityGroups, (rel) => ({
  appMemberships: rel.many(appGroupMemberships),
  extensionMemberships: rel.many(extensionGroupMemberships),
}));

