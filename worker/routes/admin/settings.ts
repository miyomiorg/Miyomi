import { asc, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { createDb } from '../../lib/db.ts';
import { fail, isoNow, ok, requireAdmin, requireMinRole, type AppEnv } from '../../lib/http.ts';
import { adminLogs, donationSettings, settings } from '../../db/schema.ts';
import { sendTelegramText } from '../../lib/telegram.ts';

export const settingsRouter = new Hono<AppEnv>();

// Private, per-account defaults; articles store their own author snapshot.
settingsRouter.get('/author-profile', requireAdmin(), async (c) => {
  try {
    const [row] = await createDb(c.env.DB).select({ value: settings.value }).from(settings)
      .where(eq(settings.key, `author-profile:${c.get('adminId')!}`)).limit(1);
    c.header('Cache-Control', 'private, no-store');
    return ok(c, row?.value ?? { name: '', role: '', avatar: '' });
  } catch { return fail(c, 500, 'Failed to load author profile'); }
});
settingsRouter.put('/author-profile', requireAdmin(), async (c) => {
  try {
    const body = await c.req.json();
    if (!body || typeof body.name !== 'string' || typeof body.role !== 'string' || typeof body.avatar !== 'string' ||
      body.name.length > 150 || body.role.length > 150 || body.avatar.length > 2048) return fail(c, 400, 'Invalid author profile');
    if (body.avatar && !/^https?:\/\//i.test(body.avatar)) return fail(c, 400, 'Avatar must be an HTTP(S) URL');
    const value = { name: body.name.trim(), role: body.role.trim(), avatar: body.avatar.trim() };
    const updatedBy = c.get('adminId')!;
    await createDb(c.env.DB).insert(settings).values({ key: `author-profile:${updatedBy}`, value,
      isSensitive: true, updatedBy, updatedAt: isoNow() }).onConflictDoUpdate({ target: settings.key,
      set: { value, isSensitive: true, updatedBy, updatedAt: isoNow() } });
    return ok(c, value);
  } catch { return fail(c, 500, 'Failed to save author profile'); }
});

async function logChange(db: ReturnType<typeof createDb>, adminId: string, action: string, details: Record<string, unknown>) {
  await db.insert(adminLogs).values({
    id: crypto.randomUUID(),
    action,
    resourceType: 'settings',
    adminId,
    details,
    createdAt: isoNow(),
  });
}

// â”€â”€ Site settings (ports of EndpointToggle / TelegramSettingsForm) â”€

/** GET /admin/settings â€” all settings */
settingsRouter.get('/settings', requireAdmin(), requireMinRole('admin'), async (c) => {
  try {
    const db = createDb(c.env.DB);
    const rows = await db.select().from(settings).orderBy(asc(settings.key));
    return ok(c, rows);
  } catch (error) {
    console.error('[settings] list failed:', error);
    return fail(c, 500, 'Failed to fetch settings');
  }
});

/**
 * PUT /admin/settings/:key { value, category?, description?, isSensitive? }
 * Upsert â€” the admin UI used `upsert({ onConflict: 'key' })`.
 */
settingsRouter.put('/settings/:key', requireAdmin(), requireMinRole('admin'), async (c) => {
  try {
    const key = c.req.param('key');
    if (!key) return fail(c, 400, 'Key required');
    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
    if (typeof body?.value === 'undefined') return fail(c, 400, 'value is required');

    // settings is keyed by `key` (no id column â€” matches the Postgres DDL)
    const db = createDb(c.env.DB);
    const [existing] = await db.select().from(settings).where(eq(settings.key, key)).limit(1);

    if (existing) {
      await db
        .update(settings)
        .set({
          value: body.value,
          category: typeof body.category === 'string' ? body.category : existing.category,
          description: typeof body.description === 'string' ? body.description : existing.description,
          isSensitive: typeof body.isSensitive === 'boolean' ? body.isSensitive : existing.isSensitive,
          updatedBy: c.get('adminId')!,
          updatedAt: isoNow(),
        })
        .where(eq(settings.key, key));
    } else {
      await db.insert(settings).values({
        key,
        value: body.value,
        category: typeof body.category === 'string' ? body.category : null,
        description: typeof body.description === 'string' ? body.description : null,
        isSensitive: body.isSensitive === true,
        updatedBy: c.get('adminId')!,
        updatedAt: isoNow(),
      });
    }
    await logChange(db, c.get('adminId')!, 'settings.update', { key });
    return ok(c, null);
  } catch (error) {
    console.error('[settings] upsert failed:', error);
    return fail(c, 500, 'Failed to save setting');
  }
});

/** POST /admin/settings/telegram-test — send a test Telegram message */
settingsRouter.post('/settings/telegram-test', requireAdmin(), requireMinRole('super_admin'), async (c) => {
  try {
    const db = createDb(c.env.DB);
    if (!c.env.TELEGRAM_BOT_TOKEN) {
      return fail(c, 400, 'TELEGRAM_BOT_TOKEN secret is not configured');
    }
    const delivered = await sendTelegramText(c.env, db, 'This is a test message from Miyomi Admin Settings.');
    if (!delivered) {
      return fail(c, 502, 'Failed to send Telegram test message (check TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_IDS)');
    }
    return ok(c, null);
  } catch (error) {
    console.error('[settings] telegram test failed:', error);
    return fail(c, 500, 'Failed to send Telegram test message');
  }
});

/** DELETE /admin/settings/:key */
settingsRouter.delete('/settings/:key', requireAdmin(), requireMinRole('admin'), async (c) => {
  try {
    const key = c.req.param('key');
    const db = createDb(c.env.DB);
    await db.delete(settings).where(eq(settings.key, key));
    await logChange(db, c.get('adminId')!, 'settings.delete', { key });
    return ok(c, null);
  } catch (error) {
    console.error('[settings] delete failed:', error);
    return fail(c, 500, 'Failed to delete setting');
  }
});

// â”€â”€ Donation settings (ports of AdminDonationsPage upserts) â”€â”€â”€â”€â”€â”€

/** GET /admin/donation-settings */
settingsRouter.get('/donation-settings', requireAdmin(), requireMinRole('admin'), async (c) => {
  try {
    const rows = await createDb(c.env.DB).select().from(donationSettings);
    return ok(c, rows);
  } catch (error) {
    console.error('[donation-settings] list failed:', error);
    return fail(c, 500, 'Failed to fetch donation settings');
  }
});

/** PUT /admin/donation-settings/:key { value } â€” upsert on key */
settingsRouter.put('/donation-settings/:key', requireAdmin(), requireMinRole('admin'), async (c) => {
  try {
    const key = c.req.param('key');
    const body = (await c.req.json().catch(() => null)) as { value?: unknown } | null;
    if (typeof body?.value === 'undefined') return fail(c, 400, 'value is required');

    const db = createDb(c.env.DB);
    const [existing] = await db.select().from(donationSettings).where(eq(donationSettings.key, key)).limit(1);
    if (existing) {
      await db
        .update(donationSettings)
        .set({ value: body.value, updatedAt: isoNow() })
        .where(eq(donationSettings.key, key));
    } else {
      await db.insert(donationSettings).values({ key, value: body.value, updatedAt: isoNow() });
    }
    return ok(c, null);
  } catch (error) {
    console.error('[donation-settings] upsert failed:', error);
    return fail(c, 500, 'Failed to save donation setting');
  }
});

