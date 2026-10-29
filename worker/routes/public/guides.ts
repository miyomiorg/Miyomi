import { and, asc, eq, getTableColumns, or } from 'drizzle-orm';
import { Hono } from 'hono';
import { createDb } from '../../lib/db.ts';
import { fail, isUuid, ok, type AppEnv } from '../../lib/http.ts';
import { guideIsPublic } from '../../lib/visibility.ts';
import { guides } from '../../db/schema.ts';

export const guidesRouter = new Hono<AppEnv>();

// The list never ships guide bodies; GET /:idOrSlug returns the full row.
const { content: _content, contentHtml: _contentHtml, ...listColumns } = getTableColumns(guides);

/**
 * GET /api/guides — public guides (published/approved), ordered by
 * category then title. Optional ?category= filter.
 */
guidesRouter.get('/', async (c) => {
  try {
    const db = createDb(c.env.DB);
    const category = c.req.query('category')?.slice(0, 100);
    const conds = [guideIsPublic()];
    if (category) conds.push(eq(guides.category, category));
    const rows = await db
      .select(listColumns)
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
      .where(and(guideIsPublic(), cond))
      .limit(1);
    if (!row) return fail(c, 404, 'Guide not found');
    return ok(c, row);
  } catch (error) {
    console.error('[guides] get failed:', error);
    return fail(c, 500, 'Failed to fetch guide');
  }
});
