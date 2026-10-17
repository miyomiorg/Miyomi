import { and, asc, eq, ne, or, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { createDb } from '../../lib/db.ts';
import { fail, isUuid, ok, pagination, type AppEnv } from '../../lib/http.ts';
import { guides } from '../../db/schema.ts';

export const guidesRouter = new Hono<AppEnv>();

/**
 * GET /api/guides — published guides (status != draft), ordered by
 * category then title. Optional ?category= filter.
 */
guidesRouter.get('/', async (c) => {
  try {
    const db = createDb(c.env.DB);
    const category = c.req.query('category');
    const conds = [ne(guides.status, 'draft')];
    if (category) conds.push(eq(guides.category, category));
    const rows = await db
      .select()
      .from(guides)
      .where(conds.length === 1 ? conds[0] : and(...conds))
      .orderBy(asc(guides.category), asc(guides.title));
    return ok(c, rows);
  } catch (error) {
    console.error('[guides] list failed:', error);
    return fail(c, 500, 'Failed to fetch guides');
  }
});

/** GET /api/guides/:idOrSlug — one guide (by slug or uuid) */
guidesRouter.get('/:idOrSlug', async (c) => {
  try {
    const db = createDb(c.env.DB);
    const ref = c.req.param('idOrSlug');
    const cond = isUuid(ref) ? or(eq(guides.id, ref), eq(guides.slug, ref)) : eq(guides.slug, ref);
    const [row] = await db
      .select()
      .from(guides)
      .where(and(ne(guides.status, 'draft'), cond))
      .limit(1);
    if (!row) return fail(c, 404, 'Guide not found');
    return ok(c, row);
  } catch (error) {
    console.error('[guides] get failed:', error);
    return fail(c, 500, 'Failed to fetch guide');
  }
});
