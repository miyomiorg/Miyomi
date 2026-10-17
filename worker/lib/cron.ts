import { and, eq, lt } from 'drizzle-orm';
import type { Bindings } from '../env';
import { createDb } from './db.ts';
import { publicEditSuggestions, rateLimits, submissions } from '../db/schema.ts';

const isoDaysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();

/**
 * Scheduled maintenance (Cloudflare Cron Trigger — see `triggers` in
 * wrangler.toml). Ports the Postgres functions
 * `cleanup_expired_rate_limits` and `cleanup_old_rejected`.
 */
export async function runCronJobs(env: Bindings): Promise<void> {
  const db = createDb(env.DB);
  try {
    // 1. Drop rate-limit windows older than 48h
    await db.delete(rateLimits).where(lt(rateLimits.createdAt, isoDaysAgo(2)));

    // 2. Drop rejected submissions older than 30 days
    await db.delete(submissions).where(
      and(eq(submissions.status, 'rejected'), lt(submissions.createdAt, isoDaysAgo(30))),
    );

    // 3. Drop rejected edit suggestions older than 30 days
    await db.delete(publicEditSuggestions).where(
      and(eq(publicEditSuggestions.status, 'rejected'), lt(publicEditSuggestions.createdAt, isoDaysAgo(30))),
    );
  } catch (error) {
    console.error('[cron] cleanup failed:', error);
  }
}
