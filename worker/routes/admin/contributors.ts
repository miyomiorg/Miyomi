import { asc, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { createDb } from '../../lib/db.ts';
import { fail, isoNow, ok, requireAdmin, requireResource, type AppEnv } from '../../lib/http.ts';
import { contributors } from '../../db/schema.ts';

export const contributorsRouter = new Hono<AppEnv>();

/** GET /admin/contributors */
contributorsRouter.get('/', requireAdmin(), requireResource('contributors', 'read'), async (c) => {
  try {
    const rows = await createDb(c.env.DB)
      .select()
      .from(contributors)
      .orderBy(asc(contributors.name));
    return ok(c, rows);
  } catch (error) {
    console.error('[contributors] list failed:', error);
    return fail(c, 500, 'Failed to fetch contributors');
  }
});

/** POST /admin/contributors — manual add */
contributorsRouter.post('/', requireAdmin(), requireResource('contributors', 'write'), async (c) => {
  try {
    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
    if (typeof body?.name !== 'string' || !body.name.trim()) return fail(c, 400, 'name is required');
    const db = createDb(c.env.DB);
    const id = crypto.randomUUID();
    await db.insert(contributors).values({
      id,
      name: body.name,
      email: typeof body.email === 'string' ? body.email : null,
      contact: typeof body.contact === 'string' ? body.contact : null,
      contributions: Array.isArray(body.contributions) ? body.contributions : [],
      createdAt: isoNow(),
    });
    return ok(c, { id }, 201);
  } catch (error) {
    console.error('[contributors] create failed:', error);
    return fail(c, 500, 'Failed to add contributor');
  }
});

/** PUT /admin/contributors/:id — edit name/email/contact */
contributorsRouter.put('/:id', requireAdmin(), requireResource('contributors', 'write'), async (c) => {
  try {
    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return fail(c, 400, 'JSON body required');
    const db = createDb(c.env.DB);
    const values: Record<string, unknown> = {};
    if (typeof body.name === 'string' && body.name.trim()) values.name = body.name;
    if (body.email !== undefined) values.email = typeof body.email === 'string' && body.email ? body.email : null;
    if (body.contact !== undefined) values.contact = typeof body.contact === 'string' && body.contact ? body.contact : null;
    if (Object.keys(values).length === 0) return fail(c, 400, 'No valid fields to update');
    await db.update(contributors).set(values as never).where(eq(contributors.id, c.req.param('id')));
    return ok(c, null);
  } catch (error) {
    console.error('[contributors] update failed:', error);
    return fail(c, 500, 'Failed to update contributor');
  }
});

/** DELETE /admin/contributors/:id */
contributorsRouter.delete('/:id', requireAdmin(), requireResource('contributors', 'delete'), async (c) => {
  try {
    const db = createDb(c.env.DB);
    await db.delete(contributors).where(eq(contributors.id, c.req.param('id')));
    return ok(c, null);
  } catch (error) {
    console.error('[contributors] delete failed:', error);
    return fail(c, 500, 'Failed to delete contributor');
  }
});
