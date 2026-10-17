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
import type { createDb } from '../../lib/db.ts';

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

  const repoUrl = typeof data.repoUrl === 'string' ? data.repoUrl : typeof data.url === 'string' ? (data.url as string) : null;
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

  const socialUrls = Array.isArray(data.socialUrls)
    ? (data.socialUrls as unknown[]).filter((u): u is string => typeof u === 'string' && u.trim() !== '')
    : [];
  const discordUrl = (typeof data.discordUrl === 'string' && data.discordUrl) || socialUrls[0] || null;

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
    downloadUrl: typeof data.downloadUrl === 'string' ? data.downloadUrl : null,
    websiteUrl: typeof data.websiteUrl === 'string' ? data.websiteUrl : null,
    discordUrl,
    iconUrl: typeof data.iconUrl === 'string' ? data.iconUrl : null,
    iconColor: typeof data.iconColor === 'string' ? data.iconColor : null,
    accentColor: typeof data.accentColor === 'string' ? data.accentColor : null,
    forkOf:
      typeof data.forkOf === 'string'
        ? data.forkOf
        : typeof data.parentAppSlug === 'string'
          ? (data.parentAppSlug as string)
          : null,
    upstreamUrl: typeof data.upstreamUrl === 'string' ? data.upstreamUrl : null,
    socialUrls: socialUrls.length ? socialUrls : null,
    tutorials: Array.isArray(data.tutorials) ? data.tutorials : null,
    downloadCount: typeof data.downloadCount === 'number' ? data.downloadCount : 0,
    likesCount: typeof data.likesCount === 'number' ? data.likesCount : 0,
    lastReleaseDate: typeof data.lastReleaseDate === 'string' ? data.lastReleaseDate : null,
    ogImageUrl: typeof data.ogImageUrl === 'string' ? data.ogImageUrl : null,
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

  const repoUrl = typeof data.repoUrl === 'string' ? data.repoUrl : null;
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
      typeof (u as { url?: unknown }).url === 'string' &&
      ((u as { url: string }).url.trim() !== ''),
  );
  const firstAuto = validInstallUrls.find((u) => u.type === 'auto');
  const firstCopy = validInstallUrls.find((u) => u.type === 'copy');
  const autoUrl = (typeof data.autoUrl === 'string' && data.autoUrl) || firstAuto?.url || null;
  const manualUrl = (typeof data.manualUrl === 'string' && data.manualUrl) || firstCopy?.url || null;

  const existingMeta =
    typeof data.metadata === 'object' && data.metadata !== null ? (data.metadata as Record<string, unknown>) : {};
  const cleanMetadata: Record<string, unknown> = { ...existingMeta };
  if (validInstallUrls.length > 0) cleanMetadata.install_urls = validInstallUrls;
  if (gitProvider) cleanMetadata.git_provider = gitProvider;
  if (devStatus) cleanMetadata.dev_status = devStatus;

  const socialUrls = Array.isArray(data.socialUrls)
    ? (data.socialUrls as unknown[]).filter((u): u is string => typeof u === 'string' && u.trim() !== '')
    : [];
  const discordUrl = (typeof data.discordUrl === 'string' && data.discordUrl) || socialUrls[0] || null;

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
    sourceUrl: typeof data.sourceUrl === 'string' ? data.sourceUrl : null,
    websiteUrl: typeof data.websiteUrl === 'string' ? data.websiteUrl : null,
    discordUrl,
    iconUrl: typeof data.iconUrl === 'string' ? data.iconUrl : null,
    iconColor: typeof data.iconColor === 'string' ? data.iconColor : null,
    accentColor: typeof data.accentColor === 'string' ? data.accentColor : null,
    autoUrl,
    manualUrl,
    region: typeof data.region === 'string' ? data.region : null,
    info: typeof data.info === 'string' ? data.info : null,
    socialUrls: socialUrls.length ? socialUrls : null,
    tutorials: Array.isArray(data.tutorials) ? data.tutorials : null,
    downloadCount: typeof data.downloadCount === 'number' ? data.downloadCount : 0,
    likesCount: typeof data.likesCount === 'number' ? data.likesCount : 0,
    lastUpdated: typeof data.lastUpdated === 'string' ? data.lastUpdated : null,
    ogImageUrl: typeof data.ogImageUrl === 'string' ? data.ogImageUrl : null,
    seoTitle: typeof data.seoTitle === 'string' ? data.seoTitle : null,
    seoDescription: typeof data.seoDescription === 'string' ? data.seoDescription : null,
    metadata: Object.keys(cleanMetadata).length > 0 ? cleanMetadata : null,
  };
  return { payload, groupIds, manualCompat };
}

// ── Group & compatibility sync (port of src/utils/compatSync.ts) ──

/** Rebuild group memberships for an app (port of compatSync.setAppGroups). */
export async function setAppGroups(db: Db, appId: string, groupIds: string[]): Promise<void> {
  await db.delete(appGroupMemberships).where(eq(appGroupMemberships.appId, appId));
  if (groupIds.length > 0) {
    await db.insert(appGroupMemberships).values(groupIds.map((groupId) => ({ appId, groupId })));
  }
}

/** Port of compatSync.setExtensionGroups */
export async function setExtensionGroups(db: Db, extId: string, groupIds: string[]): Promise<void> {
  await db.delete(extensionGroupMemberships).where(eq(extensionGroupMemberships.extensionId, extId));
  if (groupIds.length > 0) {
    await db.insert(extensionGroupMemberships).values(groupIds.map((groupId) => ({ extensionId: extId, groupId })));
  }
}

async function getExtensionsFromGroups(db: Db, groupIds: string[]): Promise<string[]> {
  if (!groupIds.length) return [];
  const rows = await db
    .select()
    .from(extensionGroupMemberships)
    .where(inArray(extensionGroupMemberships.groupId, groupIds));
  const extIds = [...new Set(rows.map((r) => r.extensionId))];
  if (!extIds.length) return [];
  const exts = await db.select({ name: extensions.name }).from(extensions).where(inArray(extensions.id, extIds));
  return exts.map((e) => e.name).filter((n): n is string => Boolean(n));
}

async function getAppsFromGroups(db: Db, groupIds: string[]): Promise<string[]> {
  if (!groupIds.length) return [];
  const rows = await db
    .select()
    .from(appGroupMemberships)
    .where(inArray(appGroupMemberships.groupId, groupIds));
  const appIds = [...new Set(rows.map((r) => r.appId))];
  if (!appIds.length) return [];
  const found = await db.select({ name: apps.name }).from(apps).where(inArray(apps.id, appIds));
  return found.map((a) => a.name).filter((n): n is string => Boolean(n));
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
  const groupExtensions = await getExtensionsFromGroups(db, groupIds);
  const finalCompatWith = [...new Set([...(manualExtensions || []), ...groupExtensions])].filter(Boolean);
  await db.update(apps).set({ compatibleWith: finalCompatWith }).where(eq(apps.id, appId));

  const [appRow] = await db.select({ slug: apps.slug }).from(apps).where(eq(apps.id, appId)).limit(1);
  const appSlug = appRow?.slug || '';
  const allExts = await db
    .select({ id: extensions.id, name: extensions.name, slug: extensions.slug, compatibleWith: extensions.compatibleWith })
    .from(extensions);
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
      await db.update(extensions).set({ compatibleWith: [...current, appName] }).where(eq(extensions.id, ext.id));
    } else if (!isLinked && hasAppName) {
      const updated = current.filter(
        (a) =>
          a.toLowerCase() !== appName.toLowerCase() &&
          (appSlug ? a.toLowerCase() !== appSlug.toLowerCase() : true) &&
          a !== appId,
      );
      await db.update(extensions).set({ compatibleWith: updated }).where(eq(extensions.id, ext.id));
    }
  }
}

/** Port of compatSync.syncExtensionCompatibility */
export async function syncExtensionCompatibility(
  db: Db,
  extId: string,
  extName: string,
  groupIds: string[],
  manualApps: string[],
): Promise<void> {
  const groupApps = await getAppsFromGroups(db, groupIds);
  const finalCompatWith = [...new Set([...(manualApps || []), ...groupApps])].filter(Boolean);
  await db.update(extensions).set({ compatibleWith: finalCompatWith }).where(eq(extensions.id, extId));

  const [extRow] = await db.select({ slug: extensions.slug }).from(extensions).where(eq(extensions.id, extId)).limit(1);
  const extSlug = extRow?.slug || '';
  const allApps = await db
    .select({ id: apps.id, name: apps.name, slug: apps.slug, compatibleWith: apps.compatibleWith })
    .from(apps);
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
      await db.update(apps).set({ compatibleWith: [...current, extName] }).where(eq(apps.id, app.id));
    } else if (!isLinked && hasExtName) {
      const updated = current.filter(
        (x) =>
          x.toLowerCase() !== extName.toLowerCase() &&
          (extSlug ? x.toLowerCase() !== extSlug.toLowerCase() : true) &&
          x !== extId,
      );
      await db.update(apps).set({ compatibleWith: updated }).where(eq(apps.id, app.id));
    }
  }
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
  if (table === 'app') {
    await db.delete(appGroupMemberships).where(eq(appGroupMemberships.appId, id));
  } else if (table === 'extension') {
    await db.delete(extensionGroupMemberships).where(eq(extensionGroupMemberships.extensionId, id));
  }
  if (table === 'app' || table === 'extension') {
    await db
      .delete(likes)
      .where(and(eq(likes.itemId, id), eq(likes.itemType, table === 'app' ? 'app' : 'extension')));
  }
  await db.delete(t as unknown as typeof apps).where(eq((t as typeof apps).id, id));
}
