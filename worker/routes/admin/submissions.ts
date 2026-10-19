import { and, desc, eq, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { createDb } from '../../lib/db.ts';
import { fail, isoNow, ok, pagination, requireAdmin, requireResource, type AppEnv } from '../../lib/http.ts';
import { adminLogs, apps, extensions, guides, submissions } from '../../db/schema.ts';
import {
  generateSlug,
  prepareAppPayload,
  prepareExtensionPayload,
  setAppGroups,
  setExtensionGroups,
  snakeToCamel,
  syncAppCompatibility,
  syncExtensionCompatibility,
  upsertContributor,
} from './content.ts';

export const submissionsRouter = new Hono<AppEnv>();

/** GET /admin/submissions?status=&type= — pending first, newest within status */
submissionsRouter.get('/', requireAdmin(), requireResource('submissions', 'read'), async (c) => {
  try {
    const db = createDb(c.env.DB);
    const { limit, offset } = pagination(c, 200);
    const conds = [];
    if (c.req.query('status')) conds.push(eq(submissions.status, c.req.query('status')!));
    if (c.req.query('type')) conds.push(eq(submissions.submissionType, c.req.query('type')!));
    const where = conds.length ? and(...conds) : undefined;
    const [rows, counts] = await Promise.all([
      db
        .select()
        .from(submissions)
        .where(where)
        .orderBy(desc(submissions.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: sql<number>`count(*)` }).from(submissions).where(where).limit(1),
    ]);
    return ok(c, { items: rows, total: counts[0]?.total ?? rows.length });
  } catch (error) {
    console.error('[submissions] list failed:', error);
    return fail(c, 500, 'Failed to fetch submissions');
  }
});

/** GET /admin/submissions/:id */
submissionsRouter.get('/:id', requireAdmin(), requireResource('submissions', 'read'), async (c) => {
  try {
    const db = createDb(c.env.DB);
    const [row] = await db.select().from(submissions).where(eq(submissions.id, c.req.param('id'))).limit(1);
    if (!row) return fail(c, 404, 'Submission not found');
    return ok(c, row);
  } catch (error) {
    console.error('[submissions] get failed:', error);
    return fail(c, 500, 'Failed to fetch submission');
  }
});

/**
 * POST /admin/submissions/:id/approve { editedData? }
 * Port of approvalUtils.approveSubmissionRecord:
 *  - guide → insert guides row (slug-conflict retry with suffix)
 *  - app/extension → prepared insert + group sync + compatibility sync
 *  - upsert contributor profile
 *  - remove the submission
 */
submissionsRouter.post('/:id/approve', requireAdmin(), requireResource('submissions', 'write'), async (c) => {
  try {
    const id = c.req.param('id');
    const body = (await c.req.json().catch(() => ({}))) as { editedData?: Record<string, unknown> };
    const db = createDb(c.env.DB);
    const [sub] = await db.select().from(submissions).where(eq(submissions.id, id)).limit(1);
    if (!sub) return fail(c, 404, 'Submission not found');

    // Submission payloads arrive in snake_case; the prepare* helpers read camelCase.
    const raw: Record<string, unknown> =
      (body.editedData as Record<string, unknown>) ?? (sub.submittedData as Record<string, unknown>) ?? {};
    const data = snakeToCamel(raw);
    const adminId = c.get('adminId')!;

    async function log(action: string, details: Record<string, unknown>) {
      await db.insert(adminLogs).values({
        id: crypto.randomUUID(),
        action,
        resourceType: 'submission',
        resourceId: id,
        resourceName: String(data.name ?? data.title ?? ''),
        adminId,
        details,
        createdAt: isoNow(),
      });
    }

    if (sub.submissionType === 'guide') {
      const title = typeof data.title === 'string' ? data.title : '';
      if (!title) return fail(c, 400, 'Guide title is required');
      let slug = generateSlug(title);
      for (let attempt = 0; ; attempt++) {
        try {
          await db.insert(guides).values({
            id: crypto.randomUUID(),
            title,
            slug,
            category: typeof data.category === 'string' ? data.category : 'General',
            description: typeof data.description === 'string' ? data.description : null,
            content: typeof data.content === 'string' ? data.content : '',
            author: sub.author || (typeof data.author === 'string' ? data.author : 'Community'),
            status: 'published',
            contentFormat: typeof data.contentFormat === 'string' ? data.contentFormat : 'markdown',
            createdAt: isoNow(),
            updatedAt: isoNow(),
          });
          break;
        } catch {
          // slug conflict (23505 in Postgres) → retry with suffix, as in the original
          if (attempt === 0) slug = `${slug}-${Math.floor(Math.random() * 10000)}`;
          else throw new Error('Could not allocate a free guide slug');
        }
      }
      await db.delete(submissions).where(eq(submissions.id, id));
      await log('submission.approve_guide', { slug });
      return ok(c, { targetTable: 'guides', name: title });
    }

    if (sub.submissionType !== 'app' && sub.submissionType !== 'extension') {
      return fail(c, 400, `Unknown submission type: ${sub.submissionType}`);
    }
    const isApp = sub.submissionType === 'app';
    const name = typeof data.name === 'string' ? data.name : '';
    if (!name) return fail(c, 400, 'Name is required');

    const { payload, groupIds, manualCompat } = isApp
      ? prepareAppPayload(data, false)
      : prepareExtensionPayload(data, false);

    const newId = crypto.randomUUID();
    (payload as Record<string, unknown>).id = newId;
    (payload as Record<string, unknown>).createdAt = isoNow();
    (payload as Record<string, unknown>).updatedAt = isoNow();

    try {
      if (isApp) await db.insert(apps).values(payload as never);
      else await db.insert(extensions).values(payload as never);
    } catch (err) {
      const msg = String((err as Error)?.message ?? err);
      if (msg.includes('UNIQUE') || msg.includes('uq_')) {
        return fail(c, 409, `Slug conflict: '${payload.slug}' already exists`);
      }
      throw err;
    }

    if (isApp) {
      await setAppGroups(db, newId, groupIds);
      await syncAppCompatibility(db, newId, name, groupIds, manualCompat);
    } else {
      await setExtensionGroups(db, newId, groupIds);
      await syncExtensionCompatibility(db, newId, name, groupIds, manualCompat);
    }

    await upsertContributor(
      db,
      sub.submitterName,
      sub.submitterEmail,
      sub.submitterContact,
      { type: sub.submissionType, id: newId, name },
    ).catch((err) => console.error('[submissions] contributor upsert failed:', err));

    await db.delete(submissions).where(eq(submissions.id, id));
    await log(isApp ? 'submission.approve_app' : 'submission.approve_extension', { id: newId });
    return ok(c, { targetTable: isApp ? 'apps' : 'extensions', targetId: newId, name });
  } catch (error) {
    console.error('[submissions] approve failed:', error);
    return fail(c, 500, 'Failed to approve submission');
  }
});

/** POST /admin/submissions/:id/reject { adminNotes? } */
submissionsRouter.post('/:id/reject', requireAdmin(), requireResource('submissions', 'write'), async (c) => {
  try {
    const id = c.req.param('id');
    const body = (await c.req.json().catch(() => ({}))) as { adminNotes?: string };
    const db = createDb(c.env.DB);
    await db
      .update(submissions)
      .set({
        status: 'rejected',
        adminNotes: body.adminNotes ?? null,
        reviewedBy: c.get('adminId')!,
        reviewedAt: isoNow(),
        updatedAt: isoNow(),
      })
      .where(eq(submissions.id, id));
    return ok(c, null);
  } catch (error) {
    console.error('[submissions] reject failed:', error);
    return fail(c, 500, 'Failed to reject submission');
  }
});

/** PATCH /admin/submissions/:id — edit submitted data before approval */
submissionsRouter.patch('/:id', requireAdmin(), requireResource('submissions', 'write'), async (c) => {
  try {
    const id = c.req.param('id');
    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return fail(c, 400, 'Body required');
    const db = createDb(c.env.DB);
    const [existing] = await db.select().from(submissions).where(eq(submissions.id, id)).limit(1);
    if (!existing) return fail(c, 404, 'Submission not found');
    await db.update(submissions).set({
      submittedData: typeof body.submittedData === 'object' && body.submittedData !== null ? (body.submittedData as object) : existing.submittedData,
      author: typeof body.author === 'string' ? body.author : existing.author,
      status: typeof body.status === 'string' ? body.status : existing.status,
      updatedAt: isoNow(),
    }).where(eq(submissions.id, id));
    return ok(c, null);
  } catch (error) {
    console.error('[submissions] patch failed:', error);
    return fail(c, 500, 'Failed to update submission');
  }
});

/** DELETE /admin/submissions/:id */
submissionsRouter.delete('/:id', requireAdmin(), requireResource('submissions', 'delete'), async (c) => {
  try {
    const db = createDb(c.env.DB);
    await db.delete(submissions).where(eq(submissions.id, c.req.param('id')));
    return ok(c, null);
  } catch (error) {
    console.error('[submissions] delete failed:', error);
    return fail(c, 500, 'Failed to delete submission');
  }
});

/** DELETE /admin/submissions?status=pending|approved|rejected|all — bulk clear */
submissionsRouter.delete('/', requireAdmin(), requireResource('submissions', 'delete'), async (c) => {
  try {
    const db = createDb(c.env.DB);
    const status = c.req.query('status');
    if (status && status !== 'all') {
      await db.delete(submissions).where(eq(submissions.status, status));
    } else {
      await db.delete(submissions);
    }
    return ok(c, null);
  } catch (error) {
    console.error('[submissions] bulk delete failed:', error);
    return fail(c, 500, 'Failed to clear submissions');
  }
});
