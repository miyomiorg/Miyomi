import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { createDb } from '../../lib/db.ts';
import { stripSubmitterPrivileged } from '../../lib/sanitize.ts';
import { fail, isoNow, ok, pagination, requireAdmin, requireResource, requireSuperAdmin, type AppEnv } from '../../lib/http.ts';
import {
  apps,
  extensions,
  feedbacks,
  guides,
  publicEditSuggestions,
  reports,
} from '../../db/schema.ts';
import {
  findContentItem,
  prepareAppPayload,
  prepareExtensionPayload,
  setAppGroups,
  setExtensionGroups,
  snakeToCamel,
  syncAppCompatibility,
  syncExtensionCompatibility,
} from './content.ts';

export const reviewsRouter = new Hono<AppEnv>();

// â”€â”€ Reports (content reports from the public ReportModal) â”€â”€â”€â”€â”€â”€â”€â”€

reviewsRouter.get('/reports', requireAdmin(), requireResource('reports', 'read'), async (c) => {
  try {
    const db = createDb(c.env.DB);
    const { limit, offset } = pagination(c, 200);
    const conds = [];
    if (c.req.query('status')) conds.push(eq(reports.status, c.req.query('status')!));
    const where = conds.length ? and(...conds) : undefined;
    const [rows, counts] = await Promise.all([
      db.select().from(reports).where(where).orderBy(desc(reports.createdAt)).limit(limit).offset(offset),
      db.select({ total: sql<number>`count(*)` }).from(reports).where(where).limit(1),
    ]);

    // Resolve polymorphic target names so the client doesn't have to.
    const appIds = [...new Set(rows.filter((r) => r.targetType === 'app').map((r) => r.targetId))];
    const extIds = [...new Set(rows.filter((r) => r.targetType === 'extension').map((r) => r.targetId))];
    const nameMap = new Map<string, string>();
    if (appIds.length) {
      (await db.select({ id: apps.id, name: apps.name }).from(apps).where(inArray(apps.id, appIds)))
        .forEach((a) => nameMap.set(a.id, a.name));
    }
    if (extIds.length) {
      (await db.select({ id: extensions.id, name: extensions.name }).from(extensions).where(inArray(extensions.id, extIds)))
        .forEach((e) => nameMap.set(e.id, e.name));
    }

    return ok(c, {
      items: rows.map((r) => ({ ...r, target_name: nameMap.get(r.targetId) || 'Unknown Target' })),
      total: counts[0]?.total ?? rows.length,
    });
  } catch (error) {
    console.error('[reports] list failed:', error);
    return fail(c, 500, 'Failed to fetch reports');
  }
});

/** PATCH /admin/reports/:id { status: 'approved' | 'rejected' | 'resolved', adminNote? } */
reviewsRouter.patch('/reports/:id', requireAdmin(), requireResource('reports', 'write'), async (c) => {
  try {
    const id = c.req.param('id');
    const body = (await c.req.json().catch(() => null)) as { status?: string; adminNote?: string } | null;
    if (!body?.status) return fail(c, 400, 'status is required');
    const db = createDb(c.env.DB);
    await db
      .update(reports)
      .set({
        status: body.status,
        adminNote: body.adminNote ?? null,
        reviewedBy: c.get('adminId')!,
        reviewedAt: isoNow(),
        updatedAt: isoNow(),
      })
      .where(eq(reports.id, id));
    return ok(c, null);
  } catch (error) {
    console.error('[reports] patch failed:', error);
    return fail(c, 500, 'Failed to update report');
  }
});

reviewsRouter.delete('/reports/:id', requireAdmin(), requireResource('reports', 'delete'), async (c) => {
  try {
    const db = createDb(c.env.DB);
    await db.delete(reports).where(eq(reports.id, c.req.param('id')));
    return ok(c, null);
  } catch (error) {
    console.error('[reports] delete failed:', error);
    return fail(c, 500, 'Failed to delete report');
  }
});

// â”€â”€ Feedback â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

reviewsRouter.get('/feedback', requireAdmin(), requireResource('feedbacks', 'read'), async (c) => {
  try {
    const db = createDb(c.env.DB);
    const { limit, offset } = pagination(c, 200);
    const conds = [];
    if (c.req.query('status')) conds.push(eq(feedbacks.status, c.req.query('status')!));
    const where = conds.length ? and(...conds) : undefined;
    const [rows, counts] = await Promise.all([
      db.select().from(feedbacks).where(where).orderBy(desc(feedbacks.createdAt)).limit(limit).offset(offset),
      db.select({ total: sql<number>`count(*)` }).from(feedbacks).where(where).limit(1),
    ]);
    return ok(c, { items: rows, total: counts[0]?.total ?? rows.length });
  } catch (error) {
    console.error('[feedback] list failed:', error);
    return fail(c, 500, 'Failed to fetch feedback');
  }
});

/** DELETE /admin/feedback — clear all feedback (super admin only) */
reviewsRouter.delete('/feedback', requireAdmin(), requireSuperAdmin(), async (c) => {
  try {
    await createDb(c.env.DB).delete(feedbacks);
    return ok(c, null);
  } catch (error) {
    console.error('[feedback] clear failed:', error);
    return fail(c, 500, 'Failed to clear feedback');
  }
});

reviewsRouter.patch('/feedback/:id', requireAdmin(), requireResource('feedbacks', 'write'), async (c) => {
  try {
    const id = c.req.param('id');
    const body = (await c.req.json().catch(() => null)) as { status?: string; adminNote?: string } | null;
    if (!body?.status) return fail(c, 400, 'status is required');
    const db = createDb(c.env.DB);
    await db
      .update(feedbacks)
      .set({
        status: body.status,
        adminNote: body.adminNote ?? null,
        reviewedBy: c.get('adminId')!,
        reviewedAt: isoNow(),
        updatedAt: isoNow(),
      })
      .where(eq(feedbacks.id, id));
    return ok(c, null);
  } catch (error) {
    console.error('[feedback] patch failed:', error);
    return fail(c, 500, 'Failed to update feedback');
  }
});

reviewsRouter.delete('/feedback/:id', requireAdmin(), requireResource('feedbacks', 'delete'), async (c) => {
  try {
    const db = createDb(c.env.DB);
    await db.delete(feedbacks).where(eq(feedbacks.id, c.req.param('id')));
    return ok(c, null);
  } catch (error) {
    console.error('[feedback] delete failed:', error);
    return fail(c, 500, 'Failed to delete feedback');
  }
});

// â”€â”€ Public edit suggestions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

reviewsRouter.get('/suggestions', requireAdmin(), requireResource('edit_suggestions', 'read'), async (c) => {
  try {
    const db = createDb(c.env.DB);
    const { limit, offset } = pagination(c, 200);
    const conds = [];
    if (c.req.query('status')) conds.push(eq(publicEditSuggestions.status, c.req.query('status')!));
    if (c.req.query('targetType')) conds.push(eq(publicEditSuggestions.targetType, c.req.query('targetType')!));
    const where = conds.length ? and(...conds) : undefined;
    const [rows, counts] = await Promise.all([
      db.select().from(publicEditSuggestions).where(where).orderBy(desc(publicEditSuggestions.createdAt)).limit(limit).offset(offset),
      db.select({ total: sql<number>`count(*)` }).from(publicEditSuggestions).where(where).limit(1),
    ]);
    return ok(c, { items: rows, total: counts[0]?.total ?? rows.length });
  } catch (error) {
    console.error('[suggestions] list failed:', error);
    return fail(c, 500, 'Failed to fetch edit suggestions');
  }
});

/** GET /admin/suggestions/:id */
reviewsRouter.get('/suggestions/:id', requireAdmin(), requireResource('edit_suggestions', 'read'), async (c) => {
  try {
    const db = createDb(c.env.DB);
    const [row] = await db
      .select()
      .from(publicEditSuggestions)
      .where(eq(publicEditSuggestions.id, c.req.param('id')))
      .limit(1);
    if (!row) return fail(c, 404, 'Edit suggestion not found');
    return ok(c, row);
  } catch (error) {
    console.error('[suggestions] get failed:', error);
    return fail(c, 500, 'Failed to fetch edit suggestion');
  }
});

/**
 * POST /admin/suggestions/:id/approve { editedData? }
 * Port of approvalUtils.approveEditSuggestionRecord: applies the
 * (optionally edited) data to the live entity, preserves counters,
 * syncs groups/compat, and removes the suggestion.
 */
reviewsRouter.post('/suggestions/:id/approve', requireAdmin(), requireResource('edit_suggestions', 'write'), async (c) => {
  try {
    const id = c.req.param('id');
    const body = (await c.req.json().catch(() => ({}))) as { editedData?: Record<string, unknown> };
    const db = createDb(c.env.DB);
    const [s] = await db.select().from(publicEditSuggestions).where(eq(publicEditSuggestions.id, id)).limit(1);
    if (!s) return fail(c, 404, 'Suggestion not found');

    // Form/suggestion payloads arrive in snake_case; the prepare* helpers read
    // camelCase. Convert once so no field is silently dropped on approval.
    // Stored public data is re-stripped of privileged fields; admin edits are trusted.
    const raw: Record<string, unknown> =
      (body.editedData as Record<string, unknown>) ?? stripSubmitterPrivileged(s.submittedData);
    const data = snakeToCamel(raw);

    if (s.targetType === 'guide') {
      const values: Record<string, unknown> = {
        title: data.title,
        category: data.category,
        description: data.description ?? null,
        content: data.content,
        author: data.author ?? null,
        updatedAt: isoNow(),
      };
      if (data.slug) values.slug = data.slug;
      await db.update(guides).set(values as never).where(eq(guides.id, s.targetId));
      await db.delete(publicEditSuggestions).where(eq(publicEditSuggestions.id, id));
      return ok(c, { targetTable: 'guides', name: data.title ?? 'Guide' });
    }

    const isApp = s.targetType === 'app';
    const table = isApp ? apps : extensions;

    // Load the live record as the source of truth for fields the edit does not
    // touch, so an approval that changes only one field never wipes the rest
    // (logos, links, counters, descriptions, …).
    const [live] = await db.select().from(table).where(eq(table.id, s.targetId)).limit(1);
    if (!live) return fail(c, 404, 'Target item not found');

    const merged: Record<string, unknown> = {
      ...(live as Record<string, unknown>),
      ...data,
      // Engagement counters and status are never editable via a public edit —
      // always keep the live values so likes/downloads/approval never reset.
      status: live.status,
      likesCount: live.likesCount,
      downloadCount: live.downloadCount,
    };
    // Preserve undeclared metadata keys (git_provider, dev_status, …) that the
    // edit form itself never sends, while still applying install_urls changes.
    if (data.metadata && live.metadata) {
      merged.metadata = { ...(live.metadata as Record<string, unknown>), ...(data.metadata as Record<string, unknown>) };
    }

    const { payload, groupIds, manualCompat } = isApp
      ? prepareAppPayload(merged, true)
      : prepareExtensionPayload(merged, true);

    await db.update(table).set({ ...(payload as object), updatedAt: isoNow() }).where(eq(table.id, s.targetId));

    if (groupIds.length > 0 || manualCompat.length > 0) {
      const name = (payload.name as string) ?? (data.name as string) ?? '';
      if (isApp) {
        await setAppGroups(db, s.targetId, groupIds);
        await syncAppCompatibility(db, s.targetId, name, groupIds, manualCompat);
      } else {
        await setExtensionGroups(db, s.targetId, groupIds);
        await syncExtensionCompatibility(db, s.targetId, name, groupIds, manualCompat);
      }
    }

    await db.delete(publicEditSuggestions).where(eq(publicEditSuggestions.id, id));
    return ok(c, { targetTable: isApp ? 'apps' : 'extensions', name: payload.name ?? data.name ?? 'item' });
  } catch (error) {
    console.error('[suggestions] approve failed:', error);
    return fail(c, 500, 'Failed to approve suggestion');
  }
});

/** POST /admin/suggestions/:id/reject { adminNote? } */
reviewsRouter.post('/suggestions/:id/reject', requireAdmin(), requireResource('edit_suggestions', 'write'), async (c) => {
  try {
    const id = c.req.param('id');
    const body = (await c.req.json().catch(() => ({}))) as { adminNote?: string } | null;
    const db = createDb(c.env.DB);
    await db
      .update(publicEditSuggestions)
      .set({
        status: 'rejected',
        adminNote: body?.adminNote ?? null,
        reviewedBy: c.get('adminId')!,
        reviewedAt: isoNow(),
        updatedAt: isoNow(),
      })
      .where(eq(publicEditSuggestions.id, id));
    return ok(c, null);
  } catch (error) {
    console.error('[suggestions] reject failed:', error);
    return fail(c, 500, 'Failed to reject suggestion');
  }
});

/** PATCH /admin/suggestions/:id { status?, submittedData? } — reopen / edit data */
reviewsRouter.patch('/suggestions/:id', requireAdmin(), requireResource('edit_suggestions', 'write'), async (c) => {
  try {
    const id = c.req.param('id');
    const body = (await c.req.json().catch(() => null)) as
      | { status?: string; submittedData?: Record<string, unknown> }
      | null;
    if (!body || (body.status === undefined && body.submittedData === undefined)) {
      return fail(c, 400, 'status or submittedData is required');
    }
    const db = createDb(c.env.DB);
    const values: Record<string, unknown> = { updatedAt: isoNow() };
    if (body.status !== undefined) values.status = body.status;
    if (body.submittedData !== undefined) values.submittedData = body.submittedData;
    await db
      .update(publicEditSuggestions)
      .set(values as never)
      .where(eq(publicEditSuggestions.id, id));
    return ok(c, null);
  } catch (error) {
    console.error('[suggestions] patch failed:', error);
    return fail(c, 500, 'Failed to update suggestion');
  }
});

reviewsRouter.delete('/suggestions/:id', requireAdmin(), requireResource('edit_suggestions', 'delete'), async (c) => {
  try {
    const db = createDb(c.env.DB);
    await db.delete(publicEditSuggestions).where(eq(publicEditSuggestions.id, c.req.param('id')));
    return ok(c, null);
  } catch (error) {
    console.error('[suggestions] delete failed:', error);
    return fail(c, 500, 'Failed to delete suggestion');
  }
});

/** DELETE /admin/suggestions?status=pending|rejected|approved|all — bulk clear */
reviewsRouter.delete('/suggestions', requireAdmin(), requireResource('edit_suggestions', 'delete'), async (c) => {
  try {
    const db = createDb(c.env.DB);
    const status = c.req.query('status');
    if (status && status !== 'all') {
      await db.delete(publicEditSuggestions).where(eq(publicEditSuggestions.status, status));
    } else {
      await db.delete(publicEditSuggestions);
    }
    return ok(c, null);
  } catch (error) {
    console.error('[suggestions] bulk delete failed:', error);
    return fail(c, 500, 'Failed to clear edit suggestions');
  }
});

