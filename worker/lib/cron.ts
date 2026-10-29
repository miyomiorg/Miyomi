import { and, eq, lt } from 'drizzle-orm';
import type { Bindings } from '../env';
import { createDb } from './db.ts';
import {
  adminSessions,
  botAttackLogs,
  publicEditSuggestions,
  rateLimits,
  submissions,
  unauthorizedLoginAttempts,
} from '../db/schema.ts';

const isoDaysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();

/**
 * Scheduled maintenance (Cloudflare Cron Trigger — see `triggers` in
 * wrangler.toml). Ports the Postgres functions
 * `cleanup_expired_rate_limits` and `cleanup_old_rejected`, plus retention
 * for the append-only log tables so they cannot grow without bound.
 *
 * Each job is isolated: one failure does not skip the others.
 */
export async function runCronJobs(env: Bindings): Promise<void> {
  const db = createDb(env.DB);
  const jobs: Array<[string, () => Promise<unknown>]> = [
    // Rate-limit windows older than 48h
    ['rate_limits', () => db.delete(rateLimits).where(lt(rateLimits.createdAt, isoDaysAgo(2)))],
    // Rejected submissions / edit suggestions older than 30 days
    ['submissions', () => db.delete(submissions).where(
      and(eq(submissions.status, 'rejected'), lt(submissions.createdAt, isoDaysAgo(30))),
    )],
    ['public_edit_suggestions', () => db.delete(publicEditSuggestions).where(
      and(eq(publicEditSuggestions.status, 'rejected'), lt(publicEditSuggestions.createdAt, isoDaysAgo(30))),
    )],
    // Log retention
    ['admin_sessions', () => db.delete(adminSessions).where(lt(adminSessions.createdAt, isoDaysAgo(90)))],
    ['unauthorized_login_attempts', () => db.delete(unauthorizedLoginAttempts).where(
      lt(unauthorizedLoginAttempts.createdAt, isoDaysAgo(90)),
    )],
    ['bot_attack_logs', () => db.delete(botAttackLogs).where(lt(botAttackLogs.createdAt, isoDaysAgo(30)))],
  ];
  const results = await Promise.allSettled(jobs.map(([, run]) => run()));
  results.forEach((result, i) => {
    if (result.status === 'rejected') console.error(`[cron] cleanup of ${jobs[i][0]} failed:`, result.reason);
  });
}
