import { inArray } from 'drizzle-orm';
import type { createDb } from './db.ts';
import { settings } from '../db/schema.ts';

type Db = ReturnType<typeof createDb>;

const MAX_TEXT = 1000; // Telegram message cap is 4096 — keep notifications compact

function truncate(text: string): string {
  return text.length > MAX_TEXT ? `${text.slice(0, MAX_TEXT - 1)}…` : text;
}

/**
 * Send a plain-text message to every configured Telegram chat.
 * Reads `telegram_bot_token` + `telegram_chat_ids` from the `settings` table
 * (managed in Admin → Settings → Telegram Integration).
 * Returns true when at least one chat accepted the message.
 */
export async function sendTelegramText(db: Db, text: string): Promise<boolean> {
  const rows = await db
    .select()
    .from(settings)
    .where(inArray(settings.key, ['telegram_bot_token', 'telegram_chat_ids']));
  const token = rows.find((r) => r.key === 'telegram_bot_token')?.value;
  const chatIdsRaw = rows.find((r) => r.key === 'telegram_chat_ids')?.value;

  if (typeof token !== 'string' || !token) return false;
  const chatIds = Array.isArray(chatIdsRaw)
    ? chatIdsRaw.filter((v): v is string => typeof v === 'string')
    : [];
  if (chatIds.length === 0) return false;

  const results = await Promise.allSettled(
    chatIds.map((chatId) =>
      fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: truncate(text), disable_web_page_preview: true }),
      }).then((res) => ({ ok: res.ok, status: res.status })),
    ),
  );
  return results.some((r) => r.status === 'fulfilled' && r.value.ok);
}

/**
 * Fire-and-forget admin notification (submissions, reports, feedback, edit
 * suggestions, failed logins). Never throws; suitable for c.executionCtx.waitUntil.
 */
export function notifyTelegram(db: Db, text: string): Promise<boolean> {
  return sendTelegramText(db, text)
    .then((ok) => {
      if (!ok) console.warn('[telegram] notification not delivered (check bot token / chat ids)');
      return ok;
    })
    .catch((error) => {
      console.error('[telegram] notify failed:', error);
      return false;
    });
}