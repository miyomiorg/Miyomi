import { and, asc, desc, eq, isNotNull, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { createDb } from '../../lib/db.ts';
import {
  fail,
  isoNow,
  ok,
  pagination,
  requireAdmin,
  requireMinRole,
  requireResource,
  requireSuperAdmin,
  type AppEnv,
} from '../../lib/http.ts';
import {
  adminLogs,
  adminSessions,
  admins,
  botAttackLogs,
  faqs,
  likes,
  notices,
  themes,
} from '../../db/schema.ts';

/**
 * Additional admin routers for pages that need plain CRUD / read access:
 * faqs, themes, notices, admin logs, admin sessions, bot logs, likes (+stats).
 * Mounted at /api/admin (see ./index.ts).
 */
export const adminExtraRouter = new Hono<AppEnv>();

// ── Small CRUD helper (explicit column whitelist — no mass assignment) ──

function pickDefined(body: Record<string, unknown>, cols: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const c of cols) if (body[c] !== undefined) out[c] = body[c];
  return out;
}

// ── FAQs ─────────────────────────────────────────────────────────────

const FAQ_COLS = ['question', 'answer', 'category', 'orderIndex', 'contentFormat', 'tags', 'legacyId'];

adminExtraRouter.get('/faqs', requireAdmin(), requireResource('faqs', 'read'), async (c) => {
  try {
    const rows = await createDb(c.env.DB)
      .select().from(faqs).orderBy(asc(faqs.orderIndex), asc(faqs.question));
    return ok(c, rows);
  } catch (error) {
    console.error('[admin/faqs] list failed:', error);
    return fail(c, 500, 'Failed to fetch FAQs');
  }
});

adminExtraRouter.post('/faqs', requireAdmin(), requireResource('faqs', 'write'), async (c) => {
  try {
    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body.question !== 'string' || !body.question.trim()) {
      return fail(c, 400, 'question is required');
    }
    const id = crypto.randomUUID();
    const values: Record<string, unknown> = { id, ...pickDefined(body, FAQ_COLS) };
    if (typeof values.answer !== 'string') values.answer = '';
    await createDb(c.env.DB)
      .insert(faqs).values({ ...values, createdAt: isoNow(), updatedAt: isoNow() } as never);
    return ok(c, { id }, 201);
  } catch (error) {
    console.error('[admin/faqs] create failed:', error);
    return fail(c, 500, 'Failed to create FAQ');
  }
});

adminExtraRouter.put('/faqs/:id', requireAdmin(), requireResource('faqs', 'write'), async (c) => {
  try {
    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return fail(c, 400, 'JSON body required');
    const db = createDb(c.env.DB);
    const [existing] = await db.select().from(faqs).where(eq(faqs.id, c.req.param('id'))).limit(1);
    if (!existing) return fail(c, 404, 'FAQ not found');
    await db.update(faqs).set({ ...pickDefined(body, FAQ_COLS), updatedAt: isoNow() } as never)
      .where(eq(faqs.id, existing.id));
    return ok(c, null);
  } catch (error) {
    console.error('[admin/faqs] update failed:', error);
    return fail(c, 500, 'Failed to update FAQ');
  }
});

adminExtraRouter.delete('/faqs/:id', requireAdmin(), requireResource('faqs', 'delete'), async (c) => {
  try {
    await createDb(c.env.DB).delete(faqs).where(eq(faqs.id, c.req.param('id')));
    return ok(c, null);
  } catch (error) {
    console.error('[admin/faqs] delete failed:', error);
    return fail(c, 500, 'Failed to delete FAQ');
  }
});

// ── Themes ───────────────────────────────────────────────────────────

const THEME_COLS = ['name', 'slug', 'isSeasonal', 'activeFrom', 'activeTo', 'isActive',
  'cssVariables', 'assets', 'particleConfig', 'previewImage'];

adminExtraRouter.get('/themes', requireAdmin(), requireResource('themes', 'read'), async (c) => {
  try {
    const rows = await createDb(c.env.DB).select().from(themes).orderBy(asc(themes.name));
    return ok(c, rows);
  } catch (error) {
    console.error('[admin/themes] list failed:', error);
    return fail(c, 500, 'Failed to fetch themes');
  }
});

adminExtraRouter.post('/themes', requireAdmin(), requireResource('themes', 'write'), async (c) => {
  try {
    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body.name !== 'string' || !body.name.trim()) {
      return fail(c, 400, 'name is required');
    }
    const id = crypto.randomUUID();
    const values: Record<string, unknown> = { id, ...pickDefined(body, THEME_COLS) };
    if (typeof values.slug !== 'string' || !values.slug) {
      values.slug = String(body.name).toLowerCase().replace(/\s+/g, '-');
    }
    await createDb(c.env.DB)
      .insert(themes).values({ ...values, createdAt: isoNow(), updatedAt: isoNow() } as never);
    return ok(c, { id }, 201);
  } catch (error) {
    console.error('[admin/themes] create failed:', error);
    return fail(c, 500, 'Failed to create theme');
  }
});

adminExtraRouter.put('/themes/:id', requireAdmin(), requireResource('themes', 'write'), async (c) => {
  try {
    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return fail(c, 400, 'JSON body required');
    const db = createDb(c.env.DB);
    const [existing] = await db.select().from(themes).where(eq(themes.id, c.req.param('id'))).limit(1);
    if (!existing) return fail(c, 404, 'Theme not found');
    await db.update(themes).set({ ...pickDefined(body, THEME_COLS), updatedAt: isoNow() } as never)
      .where(eq(themes.id, existing.id));
    return ok(c, null);
  } catch (error) {
    console.error('[admin/themes] update failed:', error);
    return fail(c, 500, 'Failed to update theme');
  }
});

/**
 * POST /admin/themes/:id/activate — atomically make this theme the active one
 * (port of useThemeEngine's two-step deactivate-all + activate-selected).
 */
adminExtraRouter.post('/themes/:id/activate', requireAdmin(), requireResource('themes', 'write'), async (c) => {
  try {
    const db = createDb(c.env.DB);
    const [existing] = await db.select().from(themes).where(eq(themes.id, c.req.param('id'))).limit(1);
    if (!existing) return fail(c, 404, 'Theme not found');
    await db.update(themes).set({ isActive: false }).where(eq(themes.isActive, true));
    await db.update(themes).set({ isActive: true, updatedAt: isoNow() }).where(eq(themes.id, existing.id));
    return ok(c, null);
  } catch (error) {
    console.error('[admin/themes] activate failed:', error);
    return fail(c, 500, 'Failed to activate theme');
  }
});

adminExtraRouter.delete('/themes/:id', requireAdmin(), requireResource('themes', 'delete'), async (c) => {
  try {
    await createDb(c.env.DB).delete(themes).where(eq(themes.id, c.req.param('id')));
    return ok(c, null);
  } catch (error) {
    console.error('[admin/themes] delete failed:', error);
    return fail(c, 500, 'Failed to delete theme');
  }
});

// ── Notices ──────────────────────────────────────────────────────────

const NOTICE_COLS = ['title', 'message', 'priority', 'type', 'active', 'startDate',
  'endDate', 'dismissible'];

adminExtraRouter.get('/notices', requireAdmin(), requireResource('notices', 'read'), async (c) => {
  try {
    const rows = await createDb(c.env.DB)
      .select().from(notices).orderBy(desc(notices.priority), desc(notices.createdAt));
    return ok(c, rows);
  } catch (error) {
    console.error('[admin/notices] list failed:', error);
    return fail(c, 500, 'Failed to fetch notices');
  }
});

adminExtraRouter.post('/notices', requireAdmin(), requireResource('notices', 'write'), async (c) => {
  try {
    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body.title !== 'string' || typeof body.message !== 'string') {
      return fail(c, 400, 'title and message are required');
    }
    const id = crypto.randomUUID();
    await createDb(c.env.DB).insert(notices).values({
      id,
      ...pickDefined(body, NOTICE_COLS),
      createdBy: c.get('adminId')!,
      createdAt: isoNow(),
      updatedAt: isoNow(),
    } as never);
    return ok(c, { id }, 201);
  } catch (error) {
    console.error('[admin/notices] create failed:', error);
    return fail(c, 500, 'Failed to create notice');
  }
});

adminExtraRouter.put('/notices/:id', requireAdmin(), requireResource('notices', 'write'), async (c) => {
  try {
    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return fail(c, 400, 'JSON body required');
    const db = createDb(c.env.DB);
    const [existing] = await db.select().from(notices).where(eq(notices.id, c.req.param('id'))).limit(1);
    if (!existing) return fail(c, 404, 'Notice not found');
    await db.update(notices).set({ ...pickDefined(body, NOTICE_COLS), updatedAt: isoNow() } as never)
      .where(eq(notices.id, existing.id));
    return ok(c, null);
  } catch (error) {
    console.error('[admin/notices] update failed:', error);
    return fail(c, 500, 'Failed to update notice');
  }
});

adminExtraRouter.delete('/notices/:id', requireAdmin(), requireResource('notices', 'delete'), async (c) => {
  try {
    await createDb(c.env.DB).delete(notices).where(eq(notices.id, c.req.param('id')));
    return ok(c, null);
  } catch (error) {
    console.error('[admin/notices] delete failed:', error);
    return fail(c, 500, 'Failed to delete notice');
  }
});

// ── Admin logs (read + write; port of useAdminLogger) ───────────────

adminExtraRouter.get('/logs', requireAdmin(), requireMinRole('admin'), async (c) => {
  try {
    const { limit, offset } = pagination(c, 200);
    const conds = [];
    if (c.req.query('action')) conds.push(eq(adminLogs.action, c.req.query('action')!));
    if (c.req.query('resourceType')) conds.push(eq(adminLogs.resourceType, c.req.query('resourceType')!));
    const rows = await createDb(c.env.DB)
      .select({
        log: adminLogs,
        adminEmail: admins.email,
        adminDisplayName: admins.displayName,
      })
      .from(adminLogs)
      .leftJoin(admins, eq(adminLogs.adminId, admins.id))
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(desc(adminLogs.createdAt))
      .limit(limit).offset(offset);
    // `admins` keeps snake_case keys: the client adapter only rewrites
    // top-level keys and leaves nested objects untouched.
    return ok(c, rows.map(({ log, adminEmail, adminDisplayName }) => ({
      ...log,
      admins: adminEmail ? { email: adminEmail, display_name: adminDisplayName } : null,
    })));
  } catch (error) {
    console.error('[admin/logs] list failed:', error);
    return fail(c, 500, 'Failed to fetch logs');
  }
});

/** DELETE /admin/logs — clear all activity logs (super admin only) */
adminExtraRouter.delete('/logs', requireAdmin(), requireSuperAdmin(), async (c) => {
  try {
    const db = createDb(c.env.DB);
    // The clear itself stays on record (audit trail tamper evidence).
    await db.batch([
      db.delete(adminLogs),
      db.insert(adminLogs).values({
        id: crypto.randomUUID(), adminId: c.get('adminId')!, action: 'logs.clear',
        resourceType: 'admin_logs', createdAt: isoNow(),
      }),
    ]);
    return ok(c, null);
  } catch (error) {
    console.error('[admin/logs] clear failed:', error);
    return fail(c, 500, 'Failed to clear logs');
  }
});

/** POST /admin/logs — record an admin action (port of useAdminLogger inserts) */
adminExtraRouter.post('/logs', requireAdmin(), requireMinRole('admin'), async (c) => {
  try {
    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body.action !== 'string' || typeof body.resourceType !== 'string') {
      return fail(c, 400, 'action and resourceType are required');
    }
    const details = typeof body.details === 'object' && body.details !== null ? (body.details as object) : null;
    if (details && JSON.stringify(details).length > 10_000) return fail(c, 413, 'details too large');
    const id = crypto.randomUUID();
    await createDb(c.env.DB).insert(adminLogs).values({
      id,
      adminId: c.get('adminId')!,
      action: body.action.slice(0, 100),
      resourceType: body.resourceType.slice(0, 100),
      resourceId: typeof body.resourceId === 'string' ? body.resourceId.slice(0, 200) : null,
      resourceName: typeof body.resourceName === 'string' ? body.resourceName.slice(0, 300) : null,
      details,
      createdAt: isoNow(),
    });
    return ok(c, { id }, 201);
  } catch (error) {
    console.error('[admin/logs] create failed:', error);
    return fail(c, 500, 'Failed to record log');
  }
});

// Deleting audit entries is super-admin only, and the deletion is itself logged.
adminExtraRouter.delete('/logs/:id', requireAdmin(), requireSuperAdmin(), async (c) => {
  try {
    const db = createDb(c.env.DB);
    const id = c.req.param('id');
    await db.batch([
      db.delete(adminLogs).where(eq(adminLogs.id, id)),
      db.insert(adminLogs).values({
        id: crypto.randomUUID(), adminId: c.get('adminId')!, action: 'logs.delete',
        resourceType: 'admin_logs', resourceId: id, createdAt: isoNow(),
      }),
    ]);
    return ok(c, null);
  } catch (error) {
    console.error('[admin/logs] delete failed:', error);
    return fail(c, 500, 'Failed to delete log');
  }
});

// ── Admin sessions (read) ────────────────────────────────────────────

adminExtraRouter.get('/sessions', requireAdmin(), requireMinRole('admin'), async (c) => {
  try {
    const { limit, offset } = pagination(c, 200);
    const conds = [];
    if (c.req.query('sessionType')) conds.push(eq(adminSessions.sessionType, c.req.query('sessionType')!));
    // Non-super-admins only see their own sessions (mirrors the old RLS policy).
    if (c.get('role') !== 'super_admin') conds.push(eq(adminSessions.adminId, c.get('adminId')!));
    const rows = await createDb(c.env.DB)
      .select({ session: adminSessions, adminEmail: admins.email })
      .from(adminSessions)
      .innerJoin(admins, eq(adminSessions.adminId, admins.id))
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(desc(adminSessions.createdAt))
      .limit(limit).offset(offset);
    return ok(c, rows.map(({ session, adminEmail }) => ({
      ...session,
      admins: { email: adminEmail },
    })));
  } catch (error) {
    console.error('[admin/sessions] list failed:', error);
    return fail(c, 500, 'Failed to fetch sessions');
  }
});

/** DELETE /admin/sessions — clear all session logs (super admin only) */
adminExtraRouter.delete('/sessions', requireAdmin(), requireSuperAdmin(), async (c) => {
  try {
    await createDb(c.env.DB).delete(adminSessions);
    return ok(c, null);
  } catch (error) {
    console.error('[admin/sessions] clear failed:', error);
    return fail(c, 500, 'Failed to clear sessions');
  }
});

// ── Bot attack logs (read) ───────────────────────────────────────────

adminExtraRouter.get('/bot-logs', requireAdmin(), requireMinRole('admin'), async (c) => {
  try {
    const { limit, offset } = pagination(c, 200);
    const rows = await createDb(c.env.DB)
      .select().from(botAttackLogs).orderBy(desc(botAttackLogs.createdAt))
      .limit(limit).offset(offset);
    return ok(c, rows);
  } catch (error) {
    console.error('[admin/bot-logs] list failed:', error);
    return fail(c, 500, 'Failed to fetch bot logs');
  }
});

/** DELETE /admin/bot-logs — clear all bot attack logs (super admin only) */
adminExtraRouter.delete('/bot-logs', requireAdmin(), requireSuperAdmin(), async (c) => {
  try {
    await createDb(c.env.DB).delete(botAttackLogs);
    return ok(c, null);
  } catch (error) {
    console.error('[admin/bot-logs] clear failed:', error);
    return fail(c, 500, 'Failed to clear bot logs');
  }
});

// ── Likes (read + stats port of get_likes_stats()) ──────────────────

adminExtraRouter.get('/likes', requireAdmin(), requireResource('likes', 'read'), async (c) => {
  try {
    const db = createDb(c.env.DB);
    const { limit, offset } = pagination(c, 200);
    const conds = [];
    if (c.req.query('itemId')) conds.push(eq(likes.itemId, c.req.query('itemId')!));
    if (c.req.query('itemType')) conds.push(eq(likes.itemType, c.req.query('itemType')!));
    const where = conds.length > 1 ? and(...conds) : conds[0];
    const [rows, counts] = await Promise.all([
      db.select().from(likes).where(where).orderBy(desc(likes.likedAt)).limit(limit).offset(offset),
      db.select({ total: sql<number>`count(*)` }).from(likes).where(where).limit(1),
    ]);
    return ok(c, { items: rows, total: counts[0]?.total ?? 0 });
  } catch (error) {
    console.error('[admin/likes] list failed:', error);
    return fail(c, 500, 'Failed to fetch likes');
  }
});

/** GET /admin/likes/stats — port of the Postgres get_likes_stats() RPC. */
adminExtraRouter.get('/likes/stats', requireAdmin(), requireResource('likes', 'read'), async (c) => {
  try {
    const db = createDb(c.env.DB);
    const [totalRow] = await db.select({ total: sql<number>`count(*)` }).from(likes);
    const [byTypeRows, byBrowserRows, byOSRows, byDeviceTypeRows] = await Promise.all([
      db.select({ k: likes.itemType, n: sql<number>`count(*)` })
        .from(likes).where(isNotNull(likes.itemType)).groupBy(likes.itemType),
      top5(db, likes.browser),
      top5(db, likes.os),
      top5(db, likes.deviceType),
    ]);
    return ok(c, {
      total: totalRow?.total ?? 0,
      byType: Object.fromEntries(byTypeRows.map((r) => [r.k as string, r.n])),
      byBrowser: Object.fromEntries(byBrowserRows.map((r) => [r.k as string, r.n])),
      byOS: Object.fromEntries(byOSRows.map((r) => [r.k as string, r.n])),
      byDeviceType: Object.fromEntries(byDeviceTypeRows.map((r) => [r.k as string, r.n])),
    });
  } catch (error) {
    console.error('[admin/likes] stats failed:', error);
    return fail(c, 500, 'Failed to fetch likes stats');
  }
});

async function top5(
  db: ReturnType<typeof createDb>,
  col: typeof likes.browser | typeof likes.os | typeof likes.deviceType,
) {
  return db
    .select({ k: col, n: sql<number>`count(*)` })
    .from(likes)
    .where(isNotNull(col))
    .groupBy(col)
    .orderBy(desc(sql<number>`count(*)`))
    .limit(5);
}
