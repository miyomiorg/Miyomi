import { and, eq, sql } from 'drizzle-orm';
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
 * approved entities that share a compatibility group, plus any approved entity
 * whose `compatible_with` references this one by name/slug/id.
 *
 * Everything runs as ONE D1 batch: group members via a join on the group_id
 * indexes, and reverse links via json_each in SQL instead of scanning the
 * whole opposite table in JS.
 */

/** `compatible_with` as a json_each source that tolerates NULL / malformed JSON. */
const safeJsonArray = (column: unknown) =>
  sql`(CASE WHEN json_valid(${column}) THEN ${column} ELSE '[]' END)`;

export async function getUnifiedCompatibleExtensionsForApp(db: Db, appId: string): Promise<string[]> {
  const agm = appGroupMemberships;
  const egm = extensionGroupMemberships;
  const [[app], groupRows, reverseRows] = await db.batch([
    db.select({ compatibleWith: apps.compatibleWith }).from(apps).where(eq(apps.id, appId)).limit(1),
    db
      .selectDistinct({ name: extensions.name })
      .from(agm)
      .innerJoin(egm, eq(egm.groupId, agm.groupId))
      .innerJoin(extensions, eq(extensions.id, egm.extensionId))
      .where(and(eq(agm.appId, appId), eq(extensions.status, 'approved'))),
    db
      .select({ name: extensions.name })
      .from(extensions)
      .where(and(
        eq(extensions.status, 'approved'),
        sql`EXISTS (SELECT 1 FROM json_each(${safeJsonArray(extensions.compatibleWith)}) j
          WHERE j.value = ${appId}
             OR lower(j.value) IN (SELECT lower(name) FROM apps WHERE id = ${appId}
                                   UNION SELECT lower(slug) FROM apps WHERE id = ${appId} AND slug IS NOT NULL))`,
      )),
  ]);
  return collect(app?.compatibleWith, groupRows, reverseRows);
}

export async function getUnifiedCompatibleAppsForExtension(db: Db, extId: string): Promise<string[]> {
  const agm = appGroupMemberships;
  const egm = extensionGroupMemberships;
  const [[ext], groupRows, reverseRows] = await db.batch([
    db.select({ compatibleWith: extensions.compatibleWith }).from(extensions).where(eq(extensions.id, extId)).limit(1),
    db
      .selectDistinct({ name: apps.name })
      .from(egm)
      .innerJoin(agm, eq(agm.groupId, egm.groupId))
      .innerJoin(apps, eq(apps.id, agm.appId))
      .where(and(eq(egm.extensionId, extId), eq(apps.status, 'approved'))),
    db
      .select({ name: apps.name })
      .from(apps)
      .where(and(
        eq(apps.status, 'approved'),
        sql`EXISTS (SELECT 1 FROM json_each(${safeJsonArray(apps.compatibleWith)}) j
          WHERE j.value = ${extId}
             OR lower(j.value) IN (SELECT lower(name) FROM extensions WHERE id = ${extId}
                                   UNION SELECT lower(slug) FROM extensions WHERE id = ${extId} AND slug IS NOT NULL))`,
      )),
  ]);
  return collect(ext?.compatibleWith, groupRows, reverseRows);
}

function collect(
  own: string[] | null | undefined,
  ...lists: Array<Array<{ name: string | null }>>
): string[] {
  const result = new Set<string>();
  for (const name of own ?? []) {
    if (typeof name === 'string' && name.trim()) result.add(name.trim());
  }
  for (const list of lists) for (const row of list) if (row.name) result.add(row.name.trim());
  return [...result];
}
