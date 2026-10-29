import { desc, eq, inArray, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { createDb } from '../../lib/db.ts';
import { fail, ok, requireAdmin, requireMinRole, type AppEnv } from '../../lib/http.ts';
import {
  adminLogs,
  admins,
  apps,
  extensions,
  guides,
  notices,
  submissions,
} from '../../db/schema.ts';

export const dashboardRouter = new Hono<AppEnv>();

/**
 * GET /admin/dashboard — port of AdminDashboardPage: counts, recent
 * updates, and per-admin contribution stats.
 */
// No moderator resource mapping in the frontend → admin+ only (RLS parity: is_admin)
dashboardRouter.get('/', requireAdmin(), requireMinRole('admin'), async (c) => {
  try {
    const db = createDb(c.env.DB);
    const adminId = c.get('adminId')!;
    const isSuperAdmin = c.get('role') === 'super_admin';

    // ── Contribution stats ──
    const ownLogsWhere = eq(adminLogs.adminId, adminId);

    const recentLogsSelect = db
      .select({
        id: adminLogs.id,
        action: adminLogs.action,
        resourceType: adminLogs.resourceType,
        resourceName: adminLogs.resourceName,
        createdAt: adminLogs.createdAt,
        adminEmail: admins.email,
      })
      .from(adminLogs)
      .innerJoin(admins, eq(adminLogs.adminId, admins.id));

    // Every query in one D1 round trip. Total likes are summed from the small
    // apps/extensions counters instead of counting the whole likes table.
    const [
      [approvedApps],
      [approvedExts],
      [publishedGuides],
      [pendingSubs],
      [activeNotices],
      [likesTotal],
      recentApps,
      recentExts,
      [totalActions],
      actionBreakdown,
      recentLogs,
      topContributorRows,
    ] = await db.batch([
      db.select({ n: sql<number>`count(*)` }).from(apps).where(eq(apps.status, 'approved')),
      db.select({ n: sql<number>`count(*)` }).from(extensions).where(eq(extensions.status, 'approved')),
      db.select({ n: sql<number>`count(*)` }).from(guides).where(inArray(guides.status, ['approved', 'published'])),
      db.select({ n: sql<number>`count(*)` }).from(submissions).where(eq(submissions.status, 'pending')),
      db.select({ n: sql<number>`count(*)` }).from(notices).where(eq(notices.active, true)),
      db.select({
        n: sql<number>`(SELECT COALESCE(SUM(likes_count), 0) FROM apps) + (SELECT COALESCE(SUM(likes_count), 0) FROM extensions)`,
      }).from(sql`(SELECT 1)`),
      db.select({ name: apps.name, updatedAt: apps.updatedAt }).from(apps).orderBy(desc(apps.updatedAt)).limit(3),
      db.select({ name: extensions.name, updatedAt: extensions.updatedAt }).from(extensions).orderBy(desc(extensions.updatedAt)).limit(3),
      db.select({ n: sql<number>`count(*)` }).from(adminLogs).where(ownLogsWhere),
      db
        .select({ action: adminLogs.action, count: sql<number>`count(*)` })
        .from(adminLogs)
        .where(ownLogsWhere)
        .groupBy(adminLogs.action),
      isSuperAdmin
        ? recentLogsSelect.orderBy(desc(adminLogs.createdAt)).limit(10)
        : recentLogsSelect.where(ownLogsWhere).orderBy(desc(adminLogs.createdAt)).limit(10),
      db
        .select({ adminEmail: admins.email, totalActions: sql<number>`count(*)` })
        .from(adminLogs)
        .innerJoin(admins, eq(adminLogs.adminId, admins.id))
        .groupBy(admins.email)
        .orderBy(desc(sql`count(*)`))
        .limit(isSuperAdmin ? 5 : 0),
    ]);
    const topContributors = isSuperAdmin ? topContributorRows : [];

    return ok(c, {
      counts: {
        approvedApps: approvedApps.n,
        approvedExtensions: approvedExts.n,
        publishedGuides: publishedGuides.n,
        pendingSubmissions: pendingSubs.n,
        activeNotices: activeNotices.n,
        totalLikes: likesTotal.n,
      },
      recentApps,
      recentExtensions: recentExts,
      stats: {
        totalActions: totalActions.n,
        actionBreakdown,
        recentLogs,
        topContributors,
      },
    });
  } catch (error) {
    console.error('[dashboard] failed:', error);
    return fail(c, 500, 'Failed to load dashboard');
  }
});
