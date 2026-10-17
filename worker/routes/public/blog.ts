import { and, asc, desc, eq, or, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { createDb } from '../../lib/db.ts';
import { fail, isUuid, ok, type AppEnv } from '../../lib/http.ts';
import { blogPosts } from '../../db/schema.ts';

export const blogRouter = new Hono<AppEnv>();

/**
 * GET /api/blog — published posts, most recent first.
 * ?pinned=1 puts pinned posts first (pinned, then date desc).
 */
blogRouter.get('/', async (c) => {
  try {
    const db = createDb(c.env.DB);
    const rows = await db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.status, 'published'))
      .orderBy(sql`is_pinned DESC`, desc(blogPosts.publishedAt), desc(blogPosts.createdAt));
    return ok(c, rows);
  } catch (error) {
    console.error('[blog] list failed:', error);
    return fail(c, 500, 'Failed to fetch blog posts');
  }
});

/** GET /api/blog/:idOrSlug — one published post; increments the view counter */
blogRouter.get('/:idOrSlug', async (c) => {
  try {
    const db = createDb(c.env.DB);
    const ref = c.req.param('idOrSlug');
    const cond = isUuid(ref) ? or(eq(blogPosts.id, ref), eq(blogPosts.slug, ref)) : eq(blogPosts.slug, ref);
    const [row] = await db
      .select()
      .from(blogPosts)
      .where(and(eq(blogPosts.status, 'published'), cond))
      .limit(1);
    if (!row) return fail(c, 404, 'Blog post not found');

    // Port of the Postgres increment_blog_view() RPC
    await db
      .update(blogPosts)
      .set({ views: sql`(COALESCE(${blogPosts.views}, 0) + 1)` })
      .where(eq(blogPosts.id, row.id));
    row.views = (row.views ?? 0) + 1;

    return ok(c, row);
  } catch (error) {
    console.error('[blog] get failed:', error);
    return fail(c, 500, 'Failed to fetch blog post');
  }
});
