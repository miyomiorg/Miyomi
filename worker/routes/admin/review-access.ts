import { eq, ne, type SQL } from 'drizzle-orm';
import type { SQLiteColumn } from 'drizzle-orm/sqlite-core';
import type { Context } from 'hono';
import type { ResourceAction } from '../../lib/auth.ts';
import { fail, hasResourceAccess, type AppEnv } from '../../lib/http.ts';

/**
 * Guide submissions and guide edit suggestions are moderated under their own
 * `guide_submissions` permission; app/extension records use the queue's base
 * resource (`submissions` or `edit_suggestions`).
 */
export const GUIDE_REVIEW_RESOURCE = 'guide_submissions';

type Ctx = Context<AppEnv>;
type Denied = ReturnType<typeof fail>;

export function reviewResource(base: string, type: string): string {
  return type === 'guide' ? GUIDE_REVIEW_RESOURCE : base;
}

/** 403 response when the session may not `action` a record of `type`, else null. */
export function denyReview(c: Ctx, base: string, type: string, action: ResourceAction): Denied | null {
  return hasResourceAccess(c, reviewResource(base, type), action)
    ? null
    : fail(c, 403, 'Insufficient privileges for this resource');
}

/**
 * Restrict a list/bulk query to the record types the session may access.
 * An explicitly requested type the session cannot access is a 403.
 */
export function reviewTypeScope(
  c: Ctx,
  base: string,
  column: SQLiteColumn,
  action: ResourceAction,
  requested?: string,
): { cond?: SQL; denied?: Denied } {
  if (requested) {
    const denied = denyReview(c, base, requested, action);
    return denied ? { denied } : { cond: eq(column, requested) };
  }
  const items = hasResourceAccess(c, base, action);
  const guides = hasResourceAccess(c, GUIDE_REVIEW_RESOURCE, action);
  if (items && guides) return {};
  if (guides) return { cond: eq(column, 'guide') };
  if (items) return { cond: ne(column, 'guide') };
  return { denied: fail(c, 403, 'Insufficient privileges for this resource') };
}
