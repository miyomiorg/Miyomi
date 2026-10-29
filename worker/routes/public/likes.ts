import { and, eq, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { createDb } from '../../lib/db.ts';
import { rateLimit } from '../../lib/rate-limit.ts';
import { fail, isoNow, ok, type AppEnv } from '../../lib/http.ts';
import { apps, extensions, likes } from '../../db/schema.ts';

export const likesRouter = new Hono<AppEnv>();

/** Public counts can share the ordinary public cache; personal state never can. */
likesRouter.get('/counts', async (c) => {
  try {
    const db = createDb(c.env.DB);
    const [appRows, extRows] = await db.batch([
      db.select({ id: apps.id, count: apps.likesCount }).from(apps).where(eq(apps.status, 'approved')),
      db.select({ id: extensions.id, count: extensions.likesCount }).from(extensions).where(eq(extensions.status, 'approved')),
    ]);
    return ok(c, Object.fromEntries([...appRows, ...extRows].map(r => [r.id, r.count ?? 0])));
  } catch { return fail(c, 500, 'Failed to fetch like counts'); }
});

likesRouter.get('/mine', async (c) => {
  c.header('Cache-Control', 'private, no-store');
  try {
    const fingerprint = (c.req.query('fingerprint') ?? '').trim();
    if (!fingerprint || fingerprint.length > 256) return fail(c, 400, 'A valid fingerprint is required');
    const rows = await createDb(c.env.DB).select({ itemId: likes.itemId }).from(likes)
      .where(eq(likes.deviceFingerprint, fingerprint));
    return ok(c, rows.map(r => r.itemId));
  } catch { return fail(c, 500, 'Failed to fetch liked items'); }
});

const ITEM_TYPES = ['app', 'extension'] as const;
type ItemType = (typeof ITEM_TYPES)[number];
const MAX_FINGERPRINT = 256;
const MAX_DEVICE_FIELD = 256;

/**
 * GET /api/likes/registry?fingerprint=
 * → { [itemId]: { count, loved } } for every app and extension.
 * Port of the retired Supabase `like` GET bulk-registry hydration.
 */
likesRouter.get('/registry', async (c) => {
  try {
    const fingerprint = (c.req.query('fingerprint') ?? '').trim().slice(0, MAX_FINGERPRINT);
    const db = createDb(c.env.DB);
    const appQ = db.select({ id: apps.id, likesCount: apps.likesCount }).from(apps).where(eq(apps.status, 'approved'));
    const extQ = db.select({ id: extensions.id, likesCount: extensions.likesCount }).from(extensions).where(eq(extensions.status, 'approved'));
    const [appRows, extRows, mineRows] = fingerprint
      ? await db.batch([appQ, extQ, db.select({ itemId: likes.itemId }).from(likes).where(eq(likes.deviceFingerprint, fingerprint))])
      : [...(await db.batch([appQ, extQ])), [] as { itemId: string }[]];

    const loved = new Set(mineRows.map((r) => r.itemId));

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

    if (!itemId || itemId.length > 64 || !ITEM_TYPES.includes(itemType) || !fingerprint || fingerprint.length > MAX_FINGERPRINT) {
      return fail(c, 400, 'itemId, itemType (app|extension) and fingerprint are required');
    }

    const db = createDb(c.env.DB);
    const table = itemType === 'app' ? apps : extensions;

    // One round trip: the target must exist and be public; find any existing like.
    // The unique key is (item_id, device_fingerprint) — item_type is not in it.
    const [[target], [existing]] = await db.batch([
      db.select({ id: table.id, status: table.status }).from(table).where(eq(table.id, itemId)).limit(1),
      db.select({ id: likes.id }).from(likes)
        .where(and(eq(likes.itemId, itemId), eq(likes.deviceFingerprint, fingerprint))).limit(1),
    ]);
    if (!target || target.status !== 'approved') {
      return fail(c, 404, 'Item not found');
    }

    // The counter only moves when the preceding statement changed a row
    // (`changes()`), so concurrent toggles cannot drift likes_count. The batch
    // runs as one transaction and returns the authoritative count.
    const delta = existing ? sql`MAX(0, COALESCE(${table.likesCount}, 0) - 1)` : sql`(COALESCE(${table.likesCount}, 0) + 1)`;
    const bump = db
      .update(table)
      .set({ likesCount: delta })
      .where(and(eq(table.id, itemId), sql`changes() > 0`));
    const readBack = db.select({ likesCount: table.likesCount }).from(table).where(eq(table.id, itemId)).limit(1);

    let loved: boolean;
    let after: { likesCount: number | null } | undefined;
    if (existing) {
      const [, , rows] = await db.batch([
        db.delete(likes).where(eq(likes.id, existing.id)),
        bump,
        readBack,
      ]);
      loved = false;
      after = rows[0];
    } else {
      const device = (typeof body?.device === 'object' && body.device !== null ? body.device : {}) as Record<string, unknown>;
      const str = (v: unknown) => (typeof v === 'string' && v ? v.slice(0, MAX_DEVICE_FIELD) : null);
      const [, , rows] = await db.batch([
        db.insert(likes).values({
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
        }).onConflictDoNothing(),
        bump,
        readBack,
      ]);
      loved = true;
      after = rows[0];
    }

    // The item's likes_count is authoritative (matches the list pages).
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
    const table = itemType === 'extension' ? extensions : apps;
    const [[mine], [row]] = await db.batch([
      db.select({ id: likes.id }).from(likes)
        .where(and(eq(likes.itemId, itemId), eq(likes.deviceFingerprint, fingerprint.slice(0, MAX_FINGERPRINT)))).limit(1),
      db.select({ likesCount: table.likesCount }).from(table).where(eq(table.id, itemId)).limit(1),
    ]);
    return ok(c, { liked: Boolean(mine), total: row?.likesCount ?? 0 });
  } catch (error) {
    console.error('[likes] status failed:', error);
    return fail(c, 500, 'Failed to fetch like status');
  }
});
