import { and, asc, eq, or } from 'drizzle-orm';
import { Hono } from 'hono';
import { createDb } from '../../lib/db.ts';
import { getUnifiedCompatibleExtensionsForApp } from '../../lib/compat.ts';
import { fail, isUuid, ok, type AppEnv } from '../../lib/http.ts';
import { apps } from '../../db/schema.ts';

export const appsRouter = new Hono<AppEnv>();

/** GET /api/apps — approved apps, ordered by name */
appsRouter.get('/', async (c) => {
  try {
    const db = createDb(c.env.DB);
    const rows = await db.select().from(apps).where(eq(apps.status, 'approved')).orderBy(asc(apps.name));
    // Moderator notes are admin/moderator-only — never expose them publicly.
    return ok(c, rows.map(({ moderatorNote, noteSeverity, ...rest }) => rest));
  } catch (error) {
    console.error('[apps] list failed:', error);
    return fail(c, 500, 'Failed to fetch apps');
  }
});

/** GET /api/apps/:idOrSlug/compatible — unified compatible extension names */
appsRouter.get('/:idOrSlug/compatible', async (c) => {
  try {
    const db = createDb(c.env.DB);
    const ref = c.req.param('idOrSlug');
    const cond = isUuid(ref) ? or(eq(apps.id, ref), eq(apps.slug, ref)) : eq(apps.slug, ref);
    const [row] = await db
      .select({ id: apps.id })
      .from(apps)
      .where(and(eq(apps.status, 'approved'), cond))
      .limit(1);
    if (!row) return fail(c, 404, 'App not found');
    return ok(c, await getUnifiedCompatibleExtensionsForApp(db, row.id));
  } catch (error) {
    console.error('[apps] compatible failed:', error);
    return fail(c, 500, 'Failed to fetch compatible extensions');
  }
});

/** GET /api/apps/:idOrSlug — one approved app (by slug or uuid) */
appsRouter.get('/:idOrSlug', async (c) => {
  try {
    const db = createDb(c.env.DB);
    const ref = c.req.param('idOrSlug');
    const cond = isUuid(ref) ? or(eq(apps.id, ref), eq(apps.slug, ref)) : eq(apps.slug, ref);
    const [row] = await db
      .select()
      .from(apps)
      .where(and(eq(apps.status, 'approved'), cond))
      .limit(1);
    if (!row) return fail(c, 404, 'App not found');
    const { moderatorNote, noteSeverity, ...publicRow } = row;
    return ok(c, publicRow);
  } catch (error) {
    console.error('[apps] get failed:', error);
    return fail(c, 500, 'Failed to fetch app');
  }
});
