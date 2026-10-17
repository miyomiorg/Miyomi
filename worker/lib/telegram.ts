import { isNotNull } from 'drizzle-orm';
import type { Bindings } from '../env';
import type { createDb } from './db.ts';
import { admins } from '../db/schema.ts';

type Db = ReturnType<typeof createDb>;

const MAX_TEXT = 1000; // Telegram message cap is 4096 — keep notifications compact

function truncate(text: string): string {
  return text.length > MAX_TEXT ? `${text.slice(0, MAX_TEXT - 1)}…` : text;
}

/**
 * Resolve the full recipient list for a notification:
 * the global `TELEGRAM_CHAT_IDS` env var plus every admin profile chat id
 * (admins.telegram_chat_id), deduplicated.
 */
async function recipientChatIds(env: Bindings, db: Db): Promise<string[]> {
  const global = (env.TELEGRAM_CHAT_IDS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const rows = await db
    .select({ chatId: admins.telegramChatId })
    .from(admins)
    .where(isNotNull(admins.telegramChatId));
  const personal = rows
    .map((r) => r.chatId)
    .filter((v): v is string => typeof v === 'string' && v.trim() !== '');
  return [...new Set([...global, ...personal])];
}

/**
 * Send a plain-text message to the global Telegram chat ids plus every
 * admin's personal chat id. Bot token comes from the TELEGRAM_BOT_TOKEN
 * secret. Returns true when at least one chat accepted the message.
 */
export async function sendTelegramText(env: Bindings, db: Db, text: string): Promise<boolean> {
  const token = env.TELEGRAM_BOT_TOKEN;
  if (!token) return false;
  const chatIds = await recipientChatIds(env, db);
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
export function notifyTelegram(env: Bindings, db: Db, text: string): Promise<boolean> {
  return sendTelegramText(env, db, text)
    .then((ok) => {
      if (!ok) console.warn('[telegram] notification not delivered (check TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_IDS)');
      return ok;
    })
    .catch((error) => {
      console.error('[telegram] notify failed:', error);
      return false;
    });
}