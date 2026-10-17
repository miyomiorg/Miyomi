import { and, eq, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { createDb } from '../../lib/db.ts';
import { rateLimit } from '../../lib/rate-limit.ts';
import { fail, isoNow, ok, type AppEnv } from '../../lib/http.ts';
import { apps, extensions, likes } from '../../db/schema.ts';

export const likesRouter = new Hono<AppEnv>();

const ITEM_TYPES = ['app', 'extension'] as const;
type ItemType = (typeof ITEM_TYPES)[number];

/**
 * GET /api/likes/registry?fingerprint=
 * → { [itemId]: { count, loved } } for every app and extension.
 * Port of the retired Supabase `like` GET bulk-registry hydration.
 */
likesRouter.get('/registry', async (c) => {
  try {
    const fingerprint = (c.req.query('fingerprint') ?? '').trim();
    const db = createDb(c.env.DB);
    const [appRows, extRows] = await Promise.all([
      db.select({ id: apps.id, likesCount: apps.likesCount }).from(apps),
      db.select({ id: extensions.id, likesCount: extensions.likesCount }).from(extensions),
    ]);

    const loved = new Set<string>();
    if (fingerprint) {
      const rows = await db
        .select({ itemId: likes.itemId })
        .from(likes)
        .where(eq(likes.deviceFingerprint, fingerprint));
      for (const r of rows) loved.add(r.itemId);
    }

    const out: Record<string, { count: number; loved: boolean }> = {};
    for (const r of appRows) out[r.id] = { count: r.likesCount ?? 0, loved: loved.has(r.id) };
    for (const r of extRows) out[r.id] = { count: r.likesCount ?? 0, loved: loved.has(r.id) };
    return ok(c, out);
  } catch (error) {
    console.error('[likes] registry failed:', error);
    return fail(c, 500, 'Failed to fetch like registry');
  }
});

/**
 * POST /api/likes — TOGGLE a like (deduped by device fingerprint).
 * Body: { itemId, itemType: 'app' | 'extension', fingerprint,
 *         device?: { anonymousId, os, osVersion, browser, browserVersion,
 *                    deviceType, deviceModel, deviceVendor, userAgent,
 *                    language, screenResolution, timezone } }
 * → { loved, count, total, liked }
 *
 * Mirrors the old `like` edge function: an existing like is removed
 * (un-like) and the item's likes_count is decremented; otherwise the
 * like is inserted and likes_count is incremented.
 */
likesRouter.post('/', rateLimit(60, 10), async (c) => {
  try {
    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
    const itemId = typeof body?.itemId === 'string' ? body.itemId : '';
    const itemType = body?.itemType as ItemType;
    const fingerprint = typeof body?.fingerprint === 'string' ? body.fingerprint.trim() : '';

    if (!itemId || !ITEM_TYPES.includes(itemType) || !fingerprint) {
      return fail(c, 400, 'itemId, itemType (app|extension) and fingerprint are required');
    }

    const db = createDb(c.env.DB);
    const table = itemType === 'app' ? apps : extensions;

    // The target must exist and be public.
    const [target] = await db
      .select({ id: table.id, status: table.status })
      .from(table)
      .where(eq(table.id, itemId))
      .limit(1);
    if (!target || target.status !== 'approved') {
      return fail(c, 404, 'Item not found');
    }

    // The unique key is (item_id, device_fingerprint) — item_type is not in it.
    const [existing] = await db
      .select({ id: likes.id })
      .from(likes)
      .where(and(eq(likes.itemId, itemId), eq(likes.deviceFingerprint, fingerprint)))
      .limit(1);

    let loved: boolean;
    if (existing) {
      await db.delete(likes).where(eq(likes.id, existing.id));
      await (itemType === 'app'
        ? db
            .update(apps)
            .set({ likesCount: sql`MAX(0, COALESCE(${apps.likesCount}, 0) - 1)` })
            .where(eq(apps.id, itemId))
        : db
            .update(extensions)
            .set({ likesCount: sql`MAX(0, COALESCE(${extensions.likesCount}, 0) - 1)` })
            .where(eq(extensions.id, itemId)));
      loved = false;
    } else {
      const device = (body.device ?? {}) as Record<string, unknown>;
      const str = (v: unknown) => (typeof v === 'string' && v ? v : null);
      await db.insert(likes).values({
        id: crypto.randomUUID(),
        itemId,
        itemType,
        deviceFingerprint: fingerprint,
        anonymousId: str(device.anonymousId),
        os: str(device.os),
        osVersion: str(device.osVersion),
        browser: str(device.browser),
        browserVersion: str(device.browserVersion),
        deviceType: str(device.deviceType),
        deviceModel: str(device.deviceModel),
        deviceVendor: str(device.deviceVendor),
        userAgent: str(device.userAgent),
        language: str(device.language),
        screenResolution: str(device.screenResolution),
        timezone: str(device.timezone),
        likedAt: isoNow(),
      });
      await (itemType === 'app'
        ? db
            .update(apps)
            .set({ likesCount: sql`(COALESCE(${apps.likesCount}, 0) + 1)` })
            .where(eq(apps.id, itemId))
        : db
            .update(extensions)
            .set({ likesCount: sql`(COALESCE(${extensions.likesCount}, 0) + 1)` })
            .where(eq(extensions.id, itemId)));
      loved = true;
    }

    // The item's likes_count is authoritative (matches the list pages).
    const [after] = await db
      .select({ likesCount: table.likesCount })
      .from(table)
      .where(eq(table.id, itemId))
      .limit(1);
    const total = after?.likesCount ?? 0;

    return ok(c, { loved, count: total, total, liked: loved });
  } catch (error) {
    console.error('[likes] toggle failed:', error);
    return fail(c, 500, 'Failed to update like');
  }
});

/**
 * GET /api/likes/status?itemId=&itemType=&fingerprint=
 * → { liked, total } (single-item hydration).
 */
likesRouter.get('/status', async (c) => {
  try {
    const itemId = c.req.query('itemId');
    const itemType = c.req.query('itemType');
    const fingerprint = c.req.query('fingerprint');
    if (!itemId || !itemType || !fingerprint) {
      return fail(c, 400, 'itemId, itemType and fingerprint query params are required');
    }
    const db = createDb(c.env.DB);
    const cond = and(eq(likes.itemId, itemId), eq(likes.itemType, itemType));
    const [mine] = await db
      .select({ id: likes.id })
      .from(likes)
      .where(and(cond, eq(likes.deviceFingerprint, fingerprint)))
      .limit(1);
    const table = itemType === 'extension' ? extensions : apps;
    const [row] = await db
      .select({ likesCount: table.likesCount })
      .from(table)
      .where(eq(table.id, itemId))
      .limit(1);
    return ok(c, { liked: Boolean(mine), total: row?.likesCount ?? 0 });
  } catch (error) {
    console.error('[likes] status failed:', error);
    return fail(c, 500, 'Failed to fetch like status');
  }
});
