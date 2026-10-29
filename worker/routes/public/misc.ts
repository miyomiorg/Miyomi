import { asc, count, desc, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { createDb } from '../../lib/db.ts';
import { fail, ok, pagination, type AppEnv } from '../../lib/http.ts';
import { guideIsPublic } from '../../lib/visibility.ts';
import {
  apps,
  extensions,
  guides,
  appGroupMemberships,
  compatibilityGroups,
  contributors,
  donationSettings,
  donations,
  extensionGroupMemberships,
  notices,
  settings,
  themes,
} from '../../db/schema.ts';

export const miscRouter = new Hono<AppEnv>();

/** GET /api/settings/public — non-sensitive settings as { key: value } */
miscRouter.get('/settings/public', async (c) => {
  try {
    const db = createDb(c.env.DB);
    const rows = await db
      .select()
      .from(settings)
      .where(eq(settings.isSensitive, false))
      .orderBy(asc(settings.key));
    const map: Record<string, unknown> = {};
    for (const row of rows) map[row.key] = row.value;
    return ok(c, map);
  } catch (error) {
    console.error('[settings] public read failed:', error);
    return fail(c, 500, 'Failed to fetch settings');
  }
});

/** GET /api/notices — active notices, highest priority first */
miscRouter.get('/notices', async (c) => {
  try {
    const db = createDb(c.env.DB);
    const rows = await db
      .select()
      .from(notices)
      .where(eq(notices.active, true))
      .orderBy(desc(notices.priority), desc(notices.createdAt));
    return ok(c, rows);
  } catch (error) {
    console.error('[notices] list failed:', error);
    return fail(c, 500, 'Failed to fetch notices');
  }
});

/** GET /api/themes — all themes (client picks active/seasonal) */
miscRouter.get('/themes', async (c) => {
  try {
    const db = createDb(c.env.DB);
    const rows = await db.select().from(themes).orderBy(asc(themes.name));
    return ok(c, rows);
  } catch (error) {
    console.error('[themes] list failed:', error);
    return fail(c, 500, 'Failed to fetch themes');
  }
});

/** GET /api/donations — public donations only, most recent first */
miscRouter.get('/donations', async (c) => {
  try {
    const db = createDb(c.env.DB);
    const { limit, offset } = pagination(c, 200);
    // payment_method is never public; amounts only when the donor allowed it.
    const rows = await db
      .select({
        id: donations.id,
        donorName: donations.donorName,
        message: donations.message,
        amount: donations.amount,
        currency: donations.currency,
        date: donations.date,
        isPublic: donations.isPublic,
        showAmount: donations.showAmount,
        createdAt: donations.createdAt,
        updatedAt: donations.updatedAt,
      })
      .from(donations)
      .where(eq(donations.isPublic, true))
      .orderBy(desc(donations.createdAt), desc(donations.id))
      .limit(limit)
      .offset(offset);
    return ok(
      c,
      rows.map((r) => (r.showAmount ? r : { ...r, amount: null, currency: null })),
    );
  } catch (error) {
    console.error('[donations] list failed:', error);
    return fail(c, 500, 'Failed to fetch donations');
  }
});

/** GET /api/donation-settings */
miscRouter.get('/donation-settings', async (c) => {
  try {
    const db = createDb(c.env.DB);
    const rows = await db.select().from(donationSettings);
    return ok(c, rows);
  } catch (error) {
    console.error('[donation-settings] read failed:', error);
    return fail(c, 500, 'Failed to fetch donation settings');
  }
});

/**
 * GET /api/groups — compatibility groups with membership counts.
 */
miscRouter.get('/groups', async (c) => {
  try {
    const db = createDb(c.env.DB);
    const [groups, appRows, extRows] = await db.batch([
      db.select().from(compatibilityGroups).orderBy(asc(compatibilityGroups.name)),
      db
        .select({ groupId: appGroupMemberships.groupId, n: count() })
        .from(appGroupMemberships)
        .groupBy(appGroupMemberships.groupId),
      db
        .select({ groupId: extensionGroupMemberships.groupId, n: count() })
        .from(extensionGroupMemberships)
        .groupBy(extensionGroupMemberships.groupId),
    ]);
    const appCount = new Map(appRows.map((r) => [r.groupId, r.n]));
    const extCount = new Map(extRows.map((r) => [r.groupId, r.n]));
    return ok(
      c,
      groups.map((g) => ({
        ...g,
        appCount: appCount.get(g.id) ?? 0,
        extensionCount: extCount.get(g.id) ?? 0,
      })),
    );
  } catch (error) {
    console.error('[groups] list failed:', error);
    return fail(c, 500, 'Failed to fetch compatibility groups');
  }
});

/**
 * GET /api/counts — public totals for the home page ({ apps, extensions, guides })
 * so it doesn't download every list just to show three numbers.
 */
miscRouter.get('/counts', async (c) => {
  try {
    const db = createDb(c.env.DB);
    const [[appRow], [extRow], [guideRow]] = await db.batch([
      db.select({ n: count() }).from(apps).where(eq(apps.status, 'approved')),
      db.select({ n: count() }).from(extensions).where(eq(extensions.status, 'approved')),
      db.select({ n: count() }).from(guides).where(guideIsPublic()),
    ]);
    return ok(c, { apps: appRow?.n ?? 0, extensions: extRow?.n ?? 0, guides: guideRow?.n ?? 0 });
  } catch (error) {
    console.error('[counts] failed:', error);
    return fail(c, 500, 'Failed to fetch counts');
  }
});

/** GET /api/contributors */
miscRouter.get('/contributors', async (c) => {
  try {
    const db = createDb(c.env.DB);
    // email/contact are private submitter details — never public.
    const rows = await db
      .select({
        id: contributors.id,
        name: contributors.name,
        contributions: contributors.contributions,
        createdAt: contributors.createdAt,
      })
      .from(contributors)
      .orderBy(asc(contributors.name));
    return ok(c, rows);
  } catch (error) {
    console.error('[contributors] list failed:', error);
    return fail(c, 500, 'Failed to fetch contributors');
  }
});
