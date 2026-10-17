import { and, asc, eq, inArray } from 'drizzle-orm';
import { Hono } from 'hono';
import { createDb } from '../../lib/db.ts';
import { fail, isoNow, ok, requireAdmin, requireResource, type AppEnv } from '../../lib/http.ts';
import {
  appGroupMemberships,
  compatibilityGroups,
  extensionGroupMemberships,
} from '../../db/schema.ts';

export const groupsRouter = new Hono<AppEnv>();

/**
 * GET /admin/groups — groups with member ids (ports of
 * AdminCompatGroupsPage group + membership reads).
 */
groupsRouter.get('/', requireAdmin(), requireResource(['apps', 'extensions'], 'read'), async (c) => {
  try {
    const db = createDb(c.env.DB);
    const groups = await db.select().from(compatibilityGroups).orderBy(asc(compatibilityGroups.name));
    const appRows = await db.select().from(appGroupMemberships);
    const extRows = await db.select().from(extensionGroupMemberships);
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
      await replaceGroupAppMembers(db, id, body.appIds as string[]);
    }
    if (Array.isArray(body.extensionIds)) {
      await replaceGroupExtMembers(db, id, body.extensionIds as string[]);
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
async function replaceGroupAppMembers(db: ReturnType<typeof createDb>, groupId: string, appIds: string[]) {
  const { apps, extensions } = await import('../../db/schema.ts');
  const wanted = new Set(appIds);

  // Remove memberships for apps that are no longer in the group
  const current = await db.select().from(appGroupMemberships).where(eq(appGroupMemberships.groupId, groupId));
  for (const r of current.filter((x) => !wanted.has(x.appId))) {
    await db
      .delete(appGroupMemberships)
      .where(and(eq(appGroupMemberships.groupId, groupId), eq(appGroupMemberships.appId, r.appId)));
  }
  // Add the new ones
  const have = new Set(current.map((r) => r.appId));
  await db.insert(appGroupMemberships).values(
    appIds.filter((appId) => !have.has(appId)).map((appId) => ({ appId, groupId })),
  );

  // Additive compatibility merge for every app in the group now
  const groupExts = await db.select({ name: extensions.name }).from(extensions).where(
    inArray(extensions.id, (await db.select().from(extensionGroupMemberships).where(eq(extensionGroupMemberships.groupId, groupId))).map((r) => r.extensionId)),
  );
  const extNames = groupExts.map((e) => e.name).filter(Boolean);
  for (const appId of appIds) {
    const [app] = await db.select({ id: apps.id, compatibleWith: apps.compatibleWith }).from(apps).where(eq(apps.id, appId)).limit(1);
    if (!app) continue;
    const merged = [...new Set([...(app.compatibleWith ?? []), ...extNames])].filter(Boolean);
    await db.update(apps).set({ compatibleWith: merged, updatedAt: isoNow() }).where(eq(apps.id, appId));
  }
}

/** Same, for the extension side of the group. */
async function replaceGroupExtMembers(db: ReturnType<typeof createDb>, groupId: string, extIds: string[]) {
  const { apps, extensions } = await import('../../db/schema.ts');
  const wanted = new Set(extIds);

  const current = await db
    .select()
    .from(extensionGroupMemberships)
    .where(eq(extensionGroupMemberships.groupId, groupId));
  for (const r of current.filter((x) => !wanted.has(x.extensionId))) {
    await db
      .delete(extensionGroupMemberships)
      .where(and(eq(extensionGroupMemberships.groupId, groupId), eq(extensionGroupMemberships.extensionId, r.extensionId)));
  }
  const have = new Set(current.map((r) => r.extensionId));
  await db.insert(extensionGroupMemberships).values(
    extIds.filter((extensionId) => !have.has(extensionId)).map((extensionId) => ({ extensionId, groupId })),
  );

  const groupApps = await db.select({ name: apps.name }).from(apps).where(
    inArray(apps.id, (await db.select().from(appGroupMemberships).where(eq(appGroupMemberships.groupId, groupId))).map((r) => r.appId)),
  );
  const appNames = groupApps.map((a) => a.name).filter(Boolean);
  for (const extId of extIds) {
    const [ext] = await db
      .select({ id: extensions.id, compatibleWith: extensions.compatibleWith })
      .from(extensions)
      .where(eq(extensions.id, extId))
      .limit(1);
    if (!ext) continue;
    const merged = [...new Set([...(ext.compatibleWith ?? []), ...appNames])].filter(Boolean);
    await db
      .update(extensions)
      .set({ compatibleWith: merged, updatedAt: isoNow() })
      .where(eq(extensions.id, extId));
  }
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
