import { asc } from 'drizzle-orm';
import { Hono } from 'hono';
import { createDb } from '../../lib/db.ts';
import { fail, ok, type AppEnv } from '../../lib/http.ts';
import { faqs } from '../../db/schema.ts';

export const faqsRouter = new Hono<AppEnv>();

/** GET /api/faqs — all FAQs in display order */
faqsRouter.get('/', async (c) => {
  try {
    const db = createDb(c.env.DB);
    const rows = await db.select().from(faqs).orderBy(asc(faqs.orderIndex));
    return ok(c, rows);
  } catch (error) {
    console.error('[faqs] list failed:', error);
    return fail(c, 500, 'Failed to fetch FAQs');
  }
});
