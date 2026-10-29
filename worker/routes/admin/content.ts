import { and, eq, inArray, or, sql } from 'drizzle-orm';
import {
  appGroupMemberships,
  apps,
  blogPosts,
  contributors,
  extensionGroupMemberships,
  extensions,
  guides,
  likes,
} from '../../db/schema.ts';
import type { BatchItem } from 'drizzle-orm/batch';
import { runBatch, type createDb } from '../../lib/db.ts';
import { safeLink, safeLinks } from '../../lib/sanitize.ts';

type Db = ReturnType<typeof createDb>;

/** Port of src/utils/approvalUtils.ts → generateSlug */
export function generateSlug(name: string): string {
  return (name || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s.-]/g, '')
    .replace(/[\s]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Convert snake_case object keys to camelCase — mirrors the frontend
 * `contentPayload` adapter so form/submission payloads (which use snake_case)
 * can be passed straight into prepareAppPayload / prepareExtensionPayload
 * (which read camelCase). JSON column values are left untouched.
 */
export function snakeToCamel(obj: Record<string, unknown> | null | undefined): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj ?? {})) {
    if (key === '_selectedGroupIds') { out.selectedGroupIds = value; continue; }
    if (key === '_selectedGroupNames') { out.selectedGroupNames = value; continue; }
    out[key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())] = value;
  }
  return out;
}

/** Port of src/utils/gitProviders.ts → detectGitProvider */
export function detectGitProvider(url?: string): string {
  if (!url) return 'Other';
  const u = url.toLowerCase();
  if (u.includes('github.com')) return 'GitHub';
  if (u.includes('gitlab.com')) return 'GitLab';
  if (u.includes('codeberg.org')) return 'Codeberg';
  if (u.includes('bitbucket.org')) return 'Bitbucket';
  if (u.includes('gitea')) return 'Gitea';
  if (u.includes('forgejo')) return 'Forgejo';
  return 'Other';
}

/** Keep tutorial entries whose url is a safe link; other fields pass through. */
function sanitizeTutorials(value: unknown): unknown[] | null {
  if (!Array.isArray(value)) return null;
  return value.filter(
    (t) => typeof t === 'object' && t !== null && (!('url' in t) || safeLink((t as { url?: unknown }).url) !== null),
  );
}

// ── Payload preparation (camelCase in → drizzle insert values out) ─

interface Prepared {
  payload: Record<string, unknown>;
  groupIds: string[];
  manualCompat: string[];
}

/**
 * Port of approvalUtils.prepareAppDbPayload (camelCase body → apps row).
 * `isUpdate` keeps an existing slug when none is supplied.
 */
export function prepareAppPayload(raw: Record<string, unknown>, isUpdate = false): Prepared {
  const data = raw ?? {};
  const groupIds: string[] = Array.isArray(data.selectedGroupIds) ? (data.selectedGroupIds as string[]) : [];
  const manualCompat: string[] = Array.isArray(data.compatibleWith) ? (data.compatibleWith as string[]) : [];

  const repoUrl = safeLink(data.repoUrl) ?? safeLink(data.url);
  const gitProvider =
    typeof data.gitProvider === 'string' ? data.gitProvider : repoUrl ? detectGitProvider(repoUrl).toLowerCase() : null;
  const devStatus =
    typeof data.developmentStatus === 'string'
      ? data.developmentStatus
      : typeof data.devStatus === 'string'
        ? (data.devStatus as string)
        : null;

  const existingMeta =
    typeof data.metadata === 'object' && data.metadata !== null ? (data.metadata as Record<string, unknown>) : {};
  const cleanMetadata: Record<string, unknown> = { ...existingMeta };
  if (gitProvider) cleanMetadata.git_provider = gitProvider;
  if (devStatus) cleanMetadata.dev_status = devStatus;

  const socialUrls = safeLinks(data.socialUrls);
  const discordUrl = safeLink(data.discordUrl) || socialUrls[0] || null;

  const payload: Record<string, unknown> = {
    name: typeof data.name === 'string' ? data.name : null,
    slug:
      typeof data.slug === 'string' && data.slug
        ? data.slug
        : isUpdate
          ? undefined
          : generateSlug(String(data.name ?? '')) || null,
    shortDescription: typeof data.shortDescription === 'string' ? data.shortDescription : null,
    description: typeof data.description === 'string' ? data.description : null,
    author: typeof data.author === 'string' ? data.author : null,
    category: typeof data.category === 'string' ? data.category : null,
    version: typeof data.version === 'string' ? data.version : null,
    status: isUpdate ? (typeof data.status === 'string' ? data.status : 'approved') : 'approved',
    platforms: Array.isArray(data.platforms) && (data.platforms as unknown[]).length ? data.platforms : null,
    tags: Array.isArray(data.tags) && (data.tags as unknown[]).length ? data.tags : null,
    contentTypes:
      Array.isArray(data.contentTypes) && (data.contentTypes as unknown[]).length
        ? data.contentTypes
        : Array.isArray(data.types) && (data.types as unknown[]).length
          ? data.types
          : null,
    compatibleWith: manualCompat.length ? manualCompat : null,
    repoUrl,
    downloadUrl: safeLink(data.downloadUrl),
    websiteUrl: safeLink(data.websiteUrl),
    discordUrl,
    iconUrl: safeLink(data.iconUrl),
    iconColor: typeof data.iconColor === 'string' ? data.iconColor : null,
    accentColor: typeof data.accentColor === 'string' ? data.accentColor : null,
    forkOf:
      typeof data.forkOf === 'string'
        ? data.forkOf
        : typeof data.parentAppSlug === 'string'
          ? (data.parentAppSlug as string)
          : null,
    upstreamUrl: safeLink(data.upstreamUrl),
    socialUrls: socialUrls.length ? socialUrls : null,
    tutorials: sanitizeTutorials(data.tutorials),
    downloadCount: typeof data.downloadCount === 'number' ? data.downloadCount : 0,
    likesCount: typeof data.likesCount === 'number' ? data.likesCount : 0,
    lastReleaseDate: typeof data.lastReleaseDate === 'string' ? data.lastReleaseDate : null,
    ogImageUrl: safeLink(data.ogImageUrl),
    seoTitle: typeof data.seoTitle === 'string' ? data.seoTitle : null,
    seoDescription: typeof data.seoDescription === 'string' ? data.seoDescription : null,
    metadata: Object.keys(cleanMetadata).length > 0 ? cleanMetadata : null,
  };
  return { payload, groupIds, manualCompat };
}

/** Port of approvalUtils.prepareExtensionDbPayload (camelCase body → extensions row) */
export function prepareExtensionPayload(raw: Record<string, unknown>, isUpdate = false): Prepared {
  const data = raw ?? {};
  const groupIds: string[] = Array.isArray(data.selectedGroupIds) ? (data.selectedGroupIds as string[]) : [];
  const manualCompat: string[] = Array.isArray(data.compatibleWith) ? (data.compatibleWith as string[]) : [];

  const repoUrl = safeLink(data.repoUrl);
  const gitProvider =
    typeof data.gitProvider === 'string' ? data.gitProvider : repoUrl ? detectGitProvider(repoUrl).toLowerCase() : null;
  const devStatus =
    typeof data.developmentStatus === 'string'
      ? data.developmentStatus
      : typeof data.devStatus === 'string'
        ? (data.devStatus as string)
        : null;

  const rawInstallUrls: unknown[] = Array.isArray(data.installUrls)
    ? data.installUrls
    : Array.isArray((data.metadata as Record<string, unknown>)?.installUrls)
      ? ((data.metadata as Record<string, unknown>).installUrls as unknown[])
      : [];
  const validInstallUrls = rawInstallUrls.filter(
    (u): u is { url: string; type?: string } =>
      typeof u === 'object' &&
      u !== null &&
      safeLink((u as { url?: unknown }).url) !== null,
  );
  const firstAuto = validInstallUrls.find((u) => u.type === 'auto');
  const firstCopy = validInstallUrls.find((u) => u.type === 'copy');
  const autoUrl = safeLink(data.autoUrl) || firstAuto?.url || null;
  const manualUrl = safeLink(data.manualUrl) || firstCopy?.url || null;

  const existingMeta =
    typeof data.metadata === 'object' && data.metadata !== null ? (data.metadata as Record<string, unknown>) : {};
  const cleanMetadata: Record<string, unknown> = { ...existingMeta };
  if (validInstallUrls.length > 0) cleanMetadata.install_urls = validInstallUrls;
  if (gitProvider) cleanMetadata.git_provider = gitProvider;
  if (devStatus) cleanMetadata.dev_status = devStatus;

  const socialUrls = safeLinks(data.socialUrls);
  const discordUrl = safeLink(data.discordUrl) || socialUrls[0] || null;

  const payload: Record<string, unknown> = {
    name: typeof data.name === 'string' ? data.name : null,
    slug:
      typeof data.slug === 'string' && data.slug
        ? data.slug
        : isUpdate
          ? undefined
          : generateSlug(String(data.name ?? '')) || null,
    shortDescription: typeof data.shortDescription === 'string' ? data.shortDescription : null,
    description: typeof data.description === 'string' ? data.description : null,
    author: typeof data.author === 'string' ? data.author : null,
    category: typeof data.category === 'string' ? data.category : null,
    language: typeof data.language === 'string' ? data.language : null,
    status: isUpdate ? (typeof data.status === 'string' ? data.status : 'approved') : 'approved',
    platforms: Array.isArray(data.platforms) && (data.platforms as unknown[]).length ? data.platforms : null,
    tags: Array.isArray(data.tags) && (data.tags as unknown[]).length ? data.tags : null,
    types:
      Array.isArray(data.types) && (data.types as unknown[]).length
        ? data.types
        : Array.isArray(data.contentTypes) && (data.contentTypes as unknown[]).length
          ? data.contentTypes
          : null,
    compatibleWith: manualCompat.length ? manualCompat : null,
    repoUrl,
    sourceUrl: safeLink(data.sourceUrl),
    websiteUrl: safeLink(data.websiteUrl),
    discordUrl,
    iconUrl: safeLink(data.iconUrl),
    iconColor: typeof data.iconColor === 'string' ? data.iconColor : null,
    accentColor: typeof data.accentColor === 'string' ? data.accentColor : null,
    autoUrl,
    manualUrl,
    region: typeof data.region === 'string' ? data.region : null,
    info: typeof data.info === 'string' ? data.info : null,
    socialUrls: socialUrls.length ? socialUrls : null,
    tutorials: sanitizeTutorials(data.tutorials),
    downloadCount: typeof data.downloadCount === 'number' ? data.downloadCount : 0,
    likesCount: typeof data.likesCount === 'number' ? data.likesCount : 0,
    lastUpdated: typeof data.lastUpdated === 'string' ? data.lastUpdated : null,
    ogImageUrl: safeLink(data.ogImageUrl),
    seoTitle: typeof data.seoTitle === 'string' ? data.seoTitle : null,
    seoDescription: typeof data.seoDescription === 'string' ? data.seoDescription : null,
    metadata: Object.keys(cleanMetadata).length > 0 ? cleanMetadata : null,
  };
  return { payload, groupIds, manualCompat };
}

// ── Group & compatibility sync (port of src/utils/compatSync.ts) ──

/** Rebuild group memberships for an app (port of compatSync.setAppGroups). */
export async function setAppGroups(db: Db, appId: string, groupIds: string[]): Promise<void> {
  const unique = [...new Set(groupIds)];
  await runBatch(db, [
    db.delete(appGroupMemberships).where(eq(appGroupMemberships.appId, appId)),
    ...(unique.length > 0 ? [db.insert(appGroupMemberships).values(unique.map((groupId) => ({ appId, groupId })))] : []),
  ]);
}

/** Port of compatSync.setExtensionGroups */
export async function setExtensionGroups(db: Db, extId: string, groupIds: string[]): Promise<void> {
  const unique = [...new Set(groupIds)];
  await runBatch(db, [
    db.delete(extensionGroupMemberships).where(eq(extensionGroupMemberships.extensionId, extId)),
    ...(unique.length > 0
      ? [db.insert(extensionGroupMemberships).values(unique.map((groupId) => ({ extensionId: extId, groupId })))]
      : []),
  ]);
}

// Single join per lookup (uses the group_id membership indexes).
async function getExtensionsFromGroups(db: Db, groupIds: string[]): Promise<string[]> {
  if (!groupIds.length) return [];
  const rows = await db
    .selectDistinct({ name: extensions.name })
    .from(extensionGroupMemberships)
    .innerJoin(extensions, eq(extensions.id, extensionGroupMemberships.extensionId))
    .where(inArray(extensionGroupMemberships.groupId, groupIds));
  return rows.map((e) => e.name).filter((n): n is string => Boolean(n));
}

async function getAppsFromGroups(db: Db, groupIds: string[]): Promise<string[]> {
  if (!groupIds.length) return [];
  const rows = await db
    .selectDistinct({ name: apps.name })
    .from(appGroupMemberships)
    .innerJoin(apps, eq(apps.id, appGroupMemberships.appId))
    .where(inArray(appGroupMemberships.groupId, groupIds));
  return rows.map((a) => a.name).filter((n): n is string => Boolean(n));
}

/**
 * Port of compatSync.syncAppCompatibility — bidirectional compatible_with
 * sync for an app (manual picks + group members + reverse links).
 */
export async function syncAppCompatibility(
  db: Db,
  appId: string,
  appName: string,
  groupIds: string[],
  manualExtensions: string[],
): Promise<void> {
  const [groupExtensions, [[appRow], allExts]] = await Promise.all([
    getExtensionsFromGroups(db, groupIds),
    db.batch([
      db.select({ slug: apps.slug }).from(apps).where(eq(apps.id, appId)).limit(1),
      db.select({ id: extensions.id, name: extensions.name, slug: extensions.slug, compatibleWith: extensions.compatibleWith })
        .from(extensions),
    ]),
  ]);
  const finalCompatWith = [...new Set([...(manualExtensions || []), ...groupExtensions])].filter(Boolean);
  const appSlug = appRow?.slug || '';
  // All writes go out as one batch (one round trip, one transaction).
  const writes: BatchItem<'sqlite'>[] = [
    db.update(apps).set({ compatibleWith: finalCompatWith }).where(eq(apps.id, appId)),
  ];
  for (const ext of allExts) {
    const current: string[] = ext.compatibleWith || [];
    const isLinked = finalCompatWith.some(
      (e) =>
        e.toLowerCase() === ext.name.toLowerCase() ||
        (ext.slug ? e.toLowerCase() === ext.slug.toLowerCase() : false) ||
        e === ext.id,
    );
    const hasAppName = current.some(
      (a) =>
        a.toLowerCase() === appName.toLowerCase() ||
        (appSlug ? a.toLowerCase() === appSlug.toLowerCase() : false) ||
        a === appId,
    );
    if (isLinked && !hasAppName) {
      writes.push(db.update(extensions).set({ compatibleWith: [...current, appName] }).where(eq(extensions.id, ext.id)));
    } else if (!isLinked && hasAppName) {
      const updated = current.filter(
        (a) =>
          a.toLowerCase() !== appName.toLowerCase() &&
          (appSlug ? a.toLowerCase() !== appSlug.toLowerCase() : true) &&
          a !== appId,
      );
      writes.push(db.update(extensions).set({ compatibleWith: updated }).where(eq(extensions.id, ext.id)));
    }
  }
  await runBatch(db, writes);
}

/** Port of compatSync.syncExtensionCompatibility */
export async function syncExtensionCompatibility(
  db: Db,
  extId: string,
  extName: string,
  groupIds: string[],
  manualApps: string[],
): Promise<void> {
  const [groupApps, [[extRow], allApps]] = await Promise.all([
    getAppsFromGroups(db, groupIds),
    db.batch([
      db.select({ slug: extensions.slug }).from(extensions).where(eq(extensions.id, extId)).limit(1),
      db.select({ id: apps.id, name: apps.name, slug: apps.slug, compatibleWith: apps.compatibleWith }).from(apps),
    ]),
  ]);
  const finalCompatWith = [...new Set([...(manualApps || []), ...groupApps])].filter(Boolean);
  const extSlug = extRow?.slug || '';
  const writes: BatchItem<'sqlite'>[] = [
    db.update(extensions).set({ compatibleWith: finalCompatWith }).where(eq(extensions.id, extId)),
  ];
  for (const app of allApps) {
    const current: string[] = app.compatibleWith || [];
    const isLinked = finalCompatWith.some(
      (e) =>
        e.toLowerCase() === app.name.toLowerCase() ||
        (app.slug ? e.toLowerCase() === app.slug.toLowerCase() : false) ||
        e === app.id,
    );
    const hasExtName = current.some(
      (x) =>
        x.toLowerCase() === extName.toLowerCase() ||
        (extSlug ? x.toLowerCase() === extSlug.toLowerCase() : false) ||
        x === extId,
    );
    if (isLinked && !hasExtName) {
      writes.push(db.update(apps).set({ compatibleWith: [...current, extName] }).where(eq(apps.id, app.id)));
    } else if (!isLinked && hasExtName) {
      const updated = current.filter(
        (x) =>
          x.toLowerCase() !== extName.toLowerCase() &&
          (extSlug ? x.toLowerCase() !== extSlug.toLowerCase() : true) &&
          x !== extId,
      );
      writes.push(db.update(apps).set({ compatibleWith: updated }).where(eq(apps.id, app.id)));
    }
  }
  await runBatch(db, writes);
}

/**
 * Port of utils/contributors.upsertContributor — find-or-create a
 * contributor profile and append a contribution.
 */
export async function upsertContributor(
  db: Db,
  submitterName: string | null,
  submitterEmail: string | null,
  submitterContact: string | null,
  contribution: { type: 'app' | 'extension'; id: string; name: string },
): Promise<string | null> {
  if (!submitterName) return null;
  type Contribution = { type: 'app' | 'extension'; id: string; name: string };

  let existing = null;
  if (submitterEmail) {
    const rows = await db
      .select()
      .from(contributors)
      .where(sql`lower(${contributors.email}) = lower(${submitterEmail})`)
      .limit(1);
    existing = rows[0] ?? null;
  }
  if (!existing) {
    const rows = await db
      .select()
      .from(contributors)
      .where(sql`lower(${contributors.name}) = lower(${submitterName})`)
      .limit(1);
    existing = rows[0] ?? null;
  }

  if (existing) {
    const current: Contribution[] = existing.contributions ?? [];
    if (!current.some((x) => x.type === contribution.type && x.id === contribution.id)) {
      await db
        .update(contributors)
        .set({ contributions: [...current, contribution] })
        .where(eq(contributors.id, existing.id));
    }
    return existing.id;
  }

  const id = crypto.randomUUID();
  await db.insert(contributors).values({
    id,
    name: submitterName,
    email: submitterEmail,
    contact: submitterContact,
    contributions: [contribution],
  });
  return id;
}

// ── Shared lookups ────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Find a content row by slug-or-id, ignoring status (admin lookups). */
export async function findContentItem(
  db: Db,
  table: 'app' | 'extension' | 'guide' | 'blog',
  ref: string,
): Promise<unknown> {
  const isUuid = UUID_RE.test(ref);
  const t = table === 'app' ? apps : table === 'extension' ? extensions : table === 'guide' ? guides : blogPosts;
  const cond = isUuid ? or(eq(t.id, ref), eq(t.slug, ref)) : eq(t.slug, ref);
  const [row] = await db.select().from(t).where(cond as never).limit(1);
  return row;
}

/** Apply a status change to any content table. */
export async function setContentStatus(db: Db, table: 'app' | 'extension' | 'guide' | 'blog', id: string, status: string): Promise<void> {
  const t = table === 'app' ? apps : table === 'extension' ? extensions : table === 'guide' ? guides : blogPosts;
  await db.update(t as unknown as typeof apps).set({ status, updatedAt: new Date().toISOString() }).where(eq((t as typeof apps).id, id));
}

/**
 * Delete a content item plus everything that references it
 * (memberships + likes). Use after the FK-less references are cleaned.
 */
export async function deleteContentItem(
  db: Db,
  table: 'app' | 'extension' | 'guide' | 'blog',
  id: string,
): Promise<void> {
  const t = table === 'app' ? apps : table === 'extension' ? extensions : table === 'guide' ? guides : blogPosts;
  const ops: BatchItem<'sqlite'>[] = [];
  if (table === 'app') {
    ops.push(db.delete(appGroupMemberships).where(eq(appGroupMemberships.appId, id)));
  } else if (table === 'extension') {
    ops.push(db.delete(extensionGroupMemberships).where(eq(extensionGroupMemberships.extensionId, id)));
  }
  if (table === 'app' || table === 'extension') {
    ops.push(db
      .delete(likes)
      .where(and(eq(likes.itemId, id), eq(likes.itemType, table === 'app' ? 'app' : 'extension'))));
  }
  ops.push(db.delete(t as unknown as typeof apps).where(eq((t as typeof apps).id, id)));
  await runBatch(db, ops);
}
