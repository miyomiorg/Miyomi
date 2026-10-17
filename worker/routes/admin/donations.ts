import { desc, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { createDb } from '../../lib/db.ts';
import { fail, isoNow, ok, pagination, requireAdmin, requireResource, type AppEnv } from '../../lib/http.ts';
import { donations } from '../../db/schema.ts';

export const donationsRouter = new Hono<AppEnv>();

/** GET /admin/donations — all donations, newest first */
donationsRouter.get('/', requireAdmin(), requireResource('donations', 'read'), async (c) => {
  try {
    const db = createDb(c.env.DB);
    const { limit, offset } = pagination(c, 200);
    const rows = await db
      .select()
      .from(donations)
      .orderBy(desc(donations.createdAt))
      .limit(limit)
      .offset(offset);
    return ok(c, rows);
  } catch (error) {
    console.error('[donations] list failed:', error);
    return fail(c, 500, 'Failed to fetch donations');
  }
});

/** POST /admin/donations — add a donation */
donationsRouter.post('/', requireAdmin(), requireResource('donations', 'write'), async (c) => {
  try {
    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
    if (typeof body?.donorName !== 'string' || !body.donorName.trim()) {
      return fail(c, 400, 'donorName is required');
    }
    const db = createDb(c.env.DB);
    const id = crypto.randomUUID();
    await db.insert(donations).values({
      id,
      donorName: body.donorName,
      message: typeof body.message === 'string' ? body.message : null,
      amount: typeof body.amount === 'number' ? body.amount : null,
      currency: typeof body.currency === 'string' ? body.currency : null,
      date: typeof body.date === 'string' ? body.date : null,
      paymentMethod: typeof body.paymentMethod === 'string' ? body.paymentMethod : null,
      isPublic: body.isPublic === true,
      showAmount: body.showAmount === true,
      createdAt: isoNow(),
      updatedAt: isoNow(),
    });
    return ok(c, { id }, 201);
  } catch (error) {
    console.error('[donations] create failed:', error);
    return fail(c, 500, 'Failed to add donation');
  }
});

/** PUT /admin/donations/:id — edit */
donationsRouter.put('/:id', requireAdmin(), requireResource('donations', 'write'), async (c) => {
  try {
    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return fail(c, 400, 'JSON body required');
    const db = createDb(c.env.DB);
    const values: Record<string, unknown> = { updatedAt: isoNow() };
    for (const key of ['donorName', 'message', 'amount', 'currency', 'date', 'paymentMethod', 'isPublic', 'showAmount'] as const) {
      if (body[key] !== undefined) values[key] = body[key];
    }
    await db.update(donations).set(values as never).where(eq(donations.id, c.req.param('id')));
    return ok(c, null);
  } catch (error) {
    console.error('[donations] update failed:', error);
    return fail(c, 500, 'Failed to update donation');
  }
});

/** PATCH /admin/donations/:id/public { isPublic } — toggle visibility */
donationsRouter.patch('/:id/public', requireAdmin(), requireResource('donations', 'write'), async (c) => {
  try {
    const body = (await c.req.json().catch(() => null)) as { isPublic?: boolean } | null;
    if (typeof body?.isPublic !== 'boolean') return fail(c, 400, 'isPublic boolean is required');
    const db = createDb(c.env.DB);
    await db
      .update(donations)
      .set({ isPublic: body.isPublic, updatedAt: isoNow() })
      .where(eq(donations.id, c.req.param('id')));
    return ok(c, null);
  } catch (error) {
    console.error('[donations] toggle failed:', error);
    return fail(c, 500, 'Failed to toggle donation visibility');
  }
});

/** DELETE /admin/donations/:id */
donationsRouter.delete('/:id', requireAdmin(), requireResource('donations', 'delete'), async (c) => {
  try {
    const db = createDb(c.env.DB);
    await db.delete(donations).where(eq(donations.id, c.req.param('id')));
    return ok(c, null);
  } catch (error) {
    console.error('[donations] delete failed:', error);
    return fail(c, 500, 'Failed to delete donation');
  }
});
