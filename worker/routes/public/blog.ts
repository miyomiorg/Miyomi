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
    // Cards need reading time, not every article body (hundreds of KB).
    return ok(c, rows.map(({ content, ...post }) => ({
      ...post,
      // Rows created before the counter existed can have NULL views; keep the
      // public shape numeric so cards can always format it.
      views: post.views ?? 0,
      isPinned: post.isPinned ?? false,
      readingMinutes: Math.max(1, Math.ceil((content || '').replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length / 200)),
    })));
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
    // UPDATE RETURNING preserves per-request views with one D1 statement.
    const [row] = await db
      .update(blogPosts)
      .set({ views: sql`(COALESCE(${blogPosts.views}, 0) + 1)` })
      .where(eq(blogPosts.id, db.select({ id: blogPosts.id }).from(blogPosts)
        .where(and(eq(blogPosts.status, 'published'), cond)).limit(1)))
      .returning();
    if (!row) return fail(c, 404, 'Blog post not found');

    return ok(c, row);
  } catch (error) {
    console.error('[blog] get failed:', error);
    return fail(c, 500, 'Failed to fetch blog post');
  }
});
