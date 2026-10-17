import { eq, inArray } from 'drizzle-orm';
import type { createDb } from './db.ts';
import {
  appGroupMemberships,
  apps,
  extensionGroupMemberships,
  extensions,
} from '../db/schema.ts';

type Db = ReturnType<typeof createDb>;

/**
 * Ports of `src/utils/compatSync.ts` read helpers.
 *
 * Unified compatibility = the entity's own `compatible_with` list, plus all
 * entities that share a compatibility group, plus any entity whose
 * `compatible_with` references this one by name/slug/id.
 */
export async function getUnifiedCompatibleExtensionsForApp(db: Db, appId: string): Promise<string[]> {
  const result = new Set<string>();

  const [app] = await db
    .select({ name: apps.name, slug: apps.slug, compatibleWith: apps.compatibleWith })
    .from(apps)
    .where(eq(apps.id, appId))
    .limit(1);

  for (const name of app?.compatibleWith ?? []) {
    if (typeof name === 'string' && name.trim()) result.add(name.trim());
  }

  // Extensions sharing one of this app's compatibility groups
  const groupRows = await db
    .select({ groupId: appGroupMemberships.groupId })
    .from(appGroupMemberships)
    .where(eq(appGroupMemberships.appId, appId));
  const groupIds = [...new Set(groupRows.map((r) => r.groupId))];
  if (groupIds.length) {
    const memberRows = await db
      .select({ extensionId: extensionGroupMemberships.extensionId })
      .from(extensionGroupMemberships)
      .where(inArray(extensionGroupMemberships.groupId, groupIds));
    const extIds = [...new Set(memberRows.map((r) => r.extensionId))];
    if (extIds.length) {
      const rows = await db
        .select({ name: extensions.name })
        .from(extensions)
        .where(inArray(extensions.id, extIds));
      for (const row of rows) if (row.name) result.add(row.name.trim());
    }
  }

  // Reverse links: extensions whose compatible_with references this app
  const allExts = await db
    .select({ name: extensions.name, compatibleWith: extensions.compatibleWith })
    .from(extensions);
  for (const ext of allExts) {
    const matches = (ext.compatibleWith ?? []).some((item) => {
      if (typeof item !== 'string') return false;
      const lower = item.toLowerCase();
      return (
        (!!app?.name && lower === app.name.toLowerCase()) ||
        (!!app?.slug && lower === app.slug.toLowerCase()) ||
        item === appId
      );
    });
    if (matches && ext.name) result.add(ext.name.trim());
  }

  return [...result];
}

export async function getUnifiedCompatibleAppsForExtension(db: Db, extId: string): Promise<string[]> {
  const result = new Set<string>();

  const [ext] = await db
    .select({ name: extensions.name, slug: extensions.slug, compatibleWith: extensions.compatibleWith })
    .from(extensions)
    .where(eq(extensions.id, extId))
    .limit(1);

  for (const name of ext?.compatibleWith ?? []) {
    if (typeof name === 'string' && name.trim()) result.add(name.trim());
  }

  const groupRows = await db
    .select({ groupId: extensionGroupMemberships.groupId })
    .from(extensionGroupMemberships)
    .where(eq(extensionGroupMemberships.extensionId, extId));
  const groupIds = [...new Set(groupRows.map((r) => r.groupId))];
  if (groupIds.length) {
    const memberRows = await db
      .select({ appId: appGroupMemberships.appId })
      .from(appGroupMemberships)
      .where(inArray(appGroupMemberships.groupId, groupIds));
    const appIds = [...new Set(memberRows.map((r) => r.appId))];
    if (appIds.length) {
      const rows = await db.select({ name: apps.name }).from(apps).where(inArray(apps.id, appIds));
      for (const row of rows) if (row.name) result.add(row.name.trim());
    }
  }

  const allApps = await db
    .select({ name: apps.name, compatibleWith: apps.compatibleWith })
    .from(apps);
  for (const app of allApps) {
    const matches = (app.compatibleWith ?? []).some((item) => {
      if (typeof item !== 'string') return false;
      const lower = item.toLowerCase();
      return (
        (!!ext?.name && lower === ext.name.toLowerCase()) ||
        (!!ext?.slug && lower === ext.slug.toLowerCase()) ||
        item === extId
      );
    });
    if (matches && app.name) result.add(app.name.trim());
  }

  return [...result];
}
