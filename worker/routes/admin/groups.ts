import { and, asc, eq, inArray, notInArray } from 'drizzle-orm';
import { Hono } from 'hono';
import { createDb, runBatch } from '../../lib/db.ts';
import { fail, isoNow, ok, requireAdmin, requireResource, type AppEnv } from '../../lib/http.ts';
import {
  appGroupMemberships,
  apps,
  compatibilityGroups,
  extensionGroupMemberships,
  extensions,
} from '../../db/schema.ts';

export const groupsRouter = new Hono<AppEnv>();

/**
 * GET /admin/groups — groups with member ids (ports of
 * AdminCompatGroupsPage group + membership reads).
 */
groupsRouter.get('/', requireAdmin(), requireResource(['apps', 'extensions'], 'read'), async (c) => {
  try {
    const db = createDb(c.env.DB);
    const [groups, appRows, extRows] = await db.batch([
      db.select().from(compatibilityGroups).orderBy(asc(compatibilityGroups.name)),
      db.select().from(appGroupMemberships),
      db.select().from(extensionGroupMemberships),
    ]);
    const appMap = new Map<string, string[]>();
    const extMap = new Map<string, string[]>();
    for (const r of appRows) {
      appMap.set(r.groupId, [...(appMap.get(r.groupId) ?? []), r.appId]);
    }
    for (const r of extRows) {
      extMap.set(r.groupId, [...(extMap.get(r.groupId) ?? []), r.extensionId]);
    }
    return ok(
      c,
      groups.map((g) => ({
        ...g,
        appIds: appMap.get(g.id) ?? [],
        extensionIds: extMap.get(g.id) ?? [],
      })),
    );
  } catch (error) {
    console.error('[groups] list failed:', error);
    return fail(c, 500, 'Failed to fetch groups');
  }
});

/** POST /admin/groups — create */
groupsRouter.post('/', requireAdmin(), requireResource('apps', 'write'), async (c) => {
  try {
    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
    if (typeof body?.name !== 'string' || !body.name.trim()) return fail(c, 400, 'name is required');
    const db = createDb(c.env.DB);
    const id = crypto.randomUUID();
    await db.insert(compatibilityGroups).values({
      id,
      name: body.name,
      description: typeof body.description === 'string' ? body.description : null,
      color: typeof body.color === 'string' ? body.color : null,
      iconUrl: typeof body.iconUrl === 'string' ? body.iconUrl : null,
      createdAt: isoNow(),
      updatedAt: isoNow(),
    });
    return ok(c, { id }, 201);
  } catch (error) {
    console.error('[groups] create failed:', error);
    return fail(c, 500, 'Failed to create group');
  }
});

/**
 * PUT /admin/groups/:id — edit the group and rebuild its memberships
 * (ports of AdminCompatGroupsPage save flow, incl. compatibility resync).
 * Body: { name?, description?, color?, iconUrl?, appIds?: string[], extensionIds?: string[] }
 */
groupsRouter.put('/:id', requireAdmin(), requireResource('apps', 'write'), async (c) => {
  try {
    const id = c.req.param('id');
    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return fail(c, 400, 'JSON body required');
    const db = createDb(c.env.DB);
    const [existing] = await db.select().from(compatibilityGroups).where(eq(compatibilityGroups.id, id)).limit(1);
    if (!existing) return fail(c, 404, 'Group not found');

    await db
      .update(compatibilityGroups)
      .set({
        name: typeof body.name === 'string' ? body.name : existing.name,
        description: typeof body.description === 'string' ? body.description : existing.description,
        color: typeof body.color === 'string' ? body.color : existing.color,
        iconUrl: typeof body.iconUrl === 'string' ? body.iconUrl : existing.iconUrl,
        updatedAt: isoNow(),
      })
      .where(eq(compatibilityGroups.id, id));

    // Rebuild memberships when provided (full-list replace semantics)
    if (Array.isArray(body.appIds)) {
      await replaceGroupAppMembers(db, id, body.appIds);
    }
    if (Array.isArray(body.extensionIds)) {
      await replaceGroupExtMembers(db, id, body.extensionIds);
    }
    return ok(c, null);
  } catch (error) {
    console.error('[groups] update failed:', error);
    return fail(c, 500, 'Failed to update group');
  }
});

/**
 * Replace the group's app membership with the full given list, then
 * additively merge the group's extension names into each app's
 * compatible_with (port of AdminCompatGroupsPage save behaviour).
 */
const cleanIds = (ids: unknown[]) =>
  [...new Set(ids.filter((v): v is string => typeof v === 'string' && v.length > 0))];

async function replaceGroupAppMembers(db: ReturnType<typeof createDb>, groupId: string, appIds: unknown[]) {
  const ids = cleanIds(appIds);
  const egm = extensionGroupMemberships;
  // Reads: the group's extension names + the target apps (one round trip).
  const [extRows, appRows] = await db.batch([
    db.selectDistinct({ name: extensions.name }).from(egm)
      .innerJoin(extensions, eq(extensions.id, egm.extensionId)).where(eq(egm.groupId, groupId)),
    db.select({ id: apps.id, compatibleWith: apps.compatibleWith }).from(apps).where(inArray(apps.id, ids)),
  ]);
  const extNames = extRows.map((e) => e.name).filter(Boolean);
  const now = isoNow();

  // Writes: replace membership + additive compatibility merge (one transaction).
  await runBatch(db, [
    db.delete(appGroupMemberships).where(and(
      eq(appGroupMemberships.groupId, groupId),
      ids.length ? notInArray(appGroupMemberships.appId, ids) : undefined,
    )),
    ...(appRows.length
      ? [db.insert(appGroupMemberships).values(appRows.map((a) => ({ appId: a.id, groupId }))).onConflictDoNothing()]
      : []),
    ...appRows.map((app) =>
      db.update(apps)
        .set({ compatibleWith: [...new Set([...(app.compatibleWith ?? []), ...extNames])].filter(Boolean), updatedAt: now })
        .where(eq(apps.id, app.id)),
    ),
  ]);
}

/** Same, for the extension side of the group. */
async function replaceGroupExtMembers(db: ReturnType<typeof createDb>, groupId: string, extIds: unknown[]) {
  const ids = cleanIds(extIds);
  const agm = appGroupMemberships;
  const [appRows, extRows] = await db.batch([
    db.selectDistinct({ name: apps.name }).from(agm)
      .innerJoin(apps, eq(apps.id, agm.appId)).where(eq(agm.groupId, groupId)),
    db.select({ id: extensions.id, compatibleWith: extensions.compatibleWith }).from(extensions).where(inArray(extensions.id, ids)),
  ]);
  const appNames = appRows.map((a) => a.name).filter(Boolean);
  const now = isoNow();

  await runBatch(db, [
    db.delete(extensionGroupMemberships).where(and(
      eq(extensionGroupMemberships.groupId, groupId),
      ids.length ? notInArray(extensionGroupMemberships.extensionId, ids) : undefined,
    )),
    ...(extRows.length
      ? [db.insert(extensionGroupMemberships).values(extRows.map((e) => ({ extensionId: e.id, groupId }))).onConflictDoNothing()]
      : []),
    ...extRows.map((ext) =>
      db.update(extensions)
        .set({ compatibleWith: [...new Set([...(ext.compatibleWith ?? []), ...appNames])].filter(Boolean), updatedAt: now })
        .where(eq(extensions.id, ext.id)),
    ),
  ]);
}

/** DELETE /admin/groups/:id (memberships cascade via FK) */
groupsRouter.delete('/:id', requireAdmin(), requireResource('apps', 'delete'), async (c) => {
  try {
    const db = createDb(c.env.DB);
    await db.delete(compatibilityGroups).where(eq(compatibilityGroups.id, c.req.param('id')));
    return ok(c, null);
  } catch (error) {
    console.error('[groups] delete failed:', error);
    return fail(c, 500, 'Failed to delete group');
  }
});
