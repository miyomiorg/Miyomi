import { and, desc, eq, getTableColumns, or, sql } from 'drizzle-orm';
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
    // Cards need reading time, not every article body (hundreds of KB): the
    // word count is estimated in SQL so bodies never leave D1: words ≈ number
    // of spaces/newlines + 1 (markup inflates it slightly).
    const { content: _content, ...cardColumns } = getTableColumns(blogPosts);
    const rows = await db
      .select({
        ...cardColumns,
        words: sql<number>`(length(${blogPosts.content}) - length(replace(replace(${blogPosts.content}, ' ', ''), char(10), '')) + 1)`,
      })
      .from(blogPosts)
      .where(eq(blogPosts.status, 'published'))
      .orderBy(sql`is_pinned DESC`, desc(blogPosts.publishedAt), desc(blogPosts.createdAt));
    return ok(c, rows.map(({ words, ...post }) => ({
      ...post,
      // Rows created before the counter existed can have NULL views; keep the
      // public shape numeric so cards can always format it.
      views: post.views ?? 0,
      isPinned: post.isPinned ?? false,
      readingMinutes: Math.max(1, Math.ceil((Number(words) || 0) / 200)),
    })));
  } catch (error) {
    console.error('[blog] list failed:', error);
    return fail(c, 500, 'Failed to fetch blog posts');
  }
});

const postCond = (ref: string) =>
  and(eq(blogPosts.status, 'published'), isUuid(ref) ? or(eq(blogPosts.id, ref), eq(blogPosts.slug, ref)) : eq(blogPosts.slug, ref));

/**
 * GET /api/blog/:idOrSlug — one published post. Read-only so it can be
 * edge-cached and served by read replicas; views are counted separately via
 * POST /api/blog/:idOrSlug/view.
 */
blogRouter.get('/:idOrSlug', async (c) => {
  try {
    const db = createDb(c.env.DB);
    const [row] = await db.select().from(blogPosts).where(postCond(c.req.param('idOrSlug'))).limit(1);
    if (!row) return fail(c, 404, 'Blog post not found');
    return ok(c, { ...row, views: row.views ?? 0 });
  } catch (error) {
    console.error('[blog] get failed:', error);
    return fail(c, 500, 'Failed to fetch blog post');
  }
});

/** POST /api/blog/:idOrSlug/view — count one view (the SPA sends it once per session per post). */
blogRouter.post('/:idOrSlug/view', async (c) => {
  try {
    const ref = c.req.param('idOrSlug');
    if (ref.length > 200) return fail(c, 400, 'Invalid post reference');
    const db = createDb(c.env.DB);
    const [row] = await db
      .update(blogPosts)
      .set({ views: sql`(COALESCE(${blogPosts.views}, 0) + 1)` })
      .where(postCond(ref))
      .returning({ views: blogPosts.views });
    if (!row) return fail(c, 404, 'Blog post not found');
    return ok(c, { views: row.views ?? 0 });
  } catch (error) {
    console.error('[blog] view failed:', error);
    return fail(c, 500, 'Failed to record view');
  }
});
