import { and, asc, eq, or } from 'drizzle-orm';
import { Hono } from 'hono';
import { createDb } from '../../lib/db.ts';
import { getUnifiedCompatibleAppsForExtension } from '../../lib/compat.ts';
import { fail, isUuid, ok, type AppEnv } from '../../lib/http.ts';
import { extensions } from '../../db/schema.ts';

export const extensionsRouter = new Hono<AppEnv>();

/** GET /api/extensions — approved extensions, ordered by name */
extensionsRouter.get('/', async (c) => {
  try {
    const db = createDb(c.env.DB);
    const rows = await db
      .select()
      .from(extensions)
      .where(eq(extensions.status, 'approved'))
      .orderBy(asc(extensions.name));
    return ok(c, rows);
  } catch (error) {
    console.error('[extensions] list failed:', error);
    return fail(c, 500, 'Failed to fetch extensions');
  }
});

/** GET /api/extensions/:idOrSlug/compatible — unified compatible app names */
extensionsRouter.get('/:idOrSlug/compatible', async (c) => {
  try {
    const db = createDb(c.env.DB);
    const ref = c.req.param('idOrSlug');
    const cond = isUuid(ref)
      ? or(eq(extensions.id, ref), eq(extensions.slug, ref))
      : eq(extensions.slug, ref);
    const [row] = await db
      .select({ id: extensions.id })
      .from(extensions)
      .where(and(eq(extensions.status, 'approved'), cond))
      .limit(1);
    if (!row) return fail(c, 404, 'Extension not found');
    return ok(c, await getUnifiedCompatibleAppsForExtension(db, row.id));
  } catch (error) {
    console.error('[extensions] compatible failed:', error);
    return fail(c, 500, 'Failed to fetch compatible apps');
  }
});

/** GET /api/extensions/:idOrSlug — one approved extension (by slug or uuid) */
extensionsRouter.get('/:idOrSlug', async (c) => {
  try {
    const db = createDb(c.env.DB);
    const ref = c.req.param('idOrSlug');
    const cond = isUuid(ref)
      ? or(eq(extensions.id, ref), eq(extensions.slug, ref))
      : eq(extensions.slug, ref);
    const [row] = await db
      .select()
      .from(extensions)
      .where(and(eq(extensions.status, 'approved'), cond))
      .limit(1);
    if (!row) return fail(c, 404, 'Extension not found');
    return ok(c, row);
  } catch (error) {
    console.error('[extensions] get failed:', error);
    return fail(c, 500, 'Failed to fetch extension');
  }
});
