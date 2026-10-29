import { and, eq, inArray, or, sql } from 'drizzle-orm';
import { Hono, type Context } from 'hono';
import { createDb } from '../../lib/db.ts';
import { notifyTelegram } from '../../lib/telegram.ts';
import { rateLimit } from '../../lib/rate-limit.ts';
import { clampText, stripSubmitterPrivileged } from '../../lib/sanitize.ts';
import { verifyTurnstile } from '../../lib/turnstile.ts';
import { clientIp, fail, isoNow, ok, type AppEnv } from '../../lib/http.ts';
import {
  apps,
  extensions,
  feedbacks,
  publicEditSuggestions,
  reports,
  settings,
  submissions,
} from '../../db/schema.ts';

/**
 * Public submission endpoints (ports of the Supabase Edge Functions
 * `feedback` and `report-content`, plus the submissions table writes).
 * All require a Turnstile token and are rate-limited per IP.
 */
export const submitRouter = new Hono<AppEnv>();

/** Helper: read several setting values in one query → { key: value } */
async function settingValues(db: ReturnType<typeof createDb>, keys: string[]): Promise<Record<string, unknown>> {
  const rows = await db.select({ key: settings.key, value: settings.value }).from(settings).where(inArray(settings.key, keys));
  return Object.fromEntries(rows.map((r) => [r.key, r.value ?? null]));
}

async function jsonBody(c: Context<AppEnv>): Promise<Record<string, unknown> | null> {
  return (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
}

const SUBMISSION_TYPES = ['app', 'extension', 'guide'] as const;

// Field caps for public writes (bodies are also capped globally in worker/index.ts).
const MAX_SHORT = 200;
const MAX_URL = 2048;
const MAX_NOTE = 2000;
const MAX_MESSAGE = 5000;
const MAX_SUBMITTED_DATA = 200_000; // guide submissions carry full article bodies

/** POST /api/submissions — new app/extension/guide submission */
submitRouter.post('/submissions', rateLimit(300, 5), async (c) => {
  try {
    const body = await jsonBody(c);
    const submissionType = body?.submissionType;
    const submittedData = body?.submittedData;

    if (!SUBMISSION_TYPES.includes(submissionType as (typeof SUBMISSION_TYPES)[number])) {
      return fail(c, 400, "submissionType must be 'app', 'extension' or 'guide'");
    }
    if (typeof submittedData !== 'object' || submittedData === null) {
      return fail(c, 400, 'submittedData object is required');
    }
    if (!(await verifyTurnstile(c, typeof body.token === 'string' ? body.token : undefined))) {
      return fail(c, 400, 'Turnstile verification failed');
    }

    const db = createDb(c.env.DB);
    // Submitters may not set counters, slug, status, SEO fields or arbitrary metadata.
    const submitted = stripSubmitterPrivileged(submittedData);
    const notes = clampText(body.submitterNotes, MAX_NOTE);
    if (notes) submitted.submitter_notes = notes;
    if (JSON.stringify(submitted).length > MAX_SUBMITTED_DATA) {
      return fail(c, 413, 'Submission is too large');
    }
    const id = crypto.randomUUID();
    await db.insert(submissions).values({
      id,
      submissionType: submissionType as string,
      submittedData: submitted,
      status: 'pending',
      author: clampText(body.author, MAX_SHORT),
      submitterName: clampText(body.submitterName, MAX_SHORT),
      submitterEmail: clampText(body.submitterEmail, MAX_SHORT),
      submitterContact: clampText(body.submitterContact, MAX_SHORT),
      submitterUserId: clampText(body.submitterUserId, MAX_SHORT),
      createdAt: isoNow(),
      updatedAt: isoNow(),
    });
    const dataName = typeof submitted.name === 'string' ? submitted.name : 'unknown';
    c.executionCtx.waitUntil(notifyTelegram(c.env, db, [
      `📦 New ${submissionType} submission`,
      `Name: ${dataName}`,
      `By: ${typeof body.submitterName === 'string' ? body.submitterName : 'anonymous'}`,
      `Contact: ${typeof body.submitterContact === 'string' ? body.submitterContact : '—'}`,
    ].join('\n')));
    return ok(c, { id }, 201);
  } catch (error) {
    console.error('[submissions] create failed:', error);
    return fail(c, 500, 'Failed to submit');
  }
});

/** POST /api/reports — report content (port of the report-content Edge Function) */
submitRouter.post('/reports', rateLimit(300, 5), async (c) => {
  try {
    const body = await jsonBody(c);
    const flags = await settingValues(createDb(c.env.DB), ['reports_enabled', 'reports_disabled_reason']);
    if (flags.reports_enabled === false) {
      const reason = flags.reports_disabled_reason;
      return fail(c, 403, typeof reason === 'string' ? reason : 'Reports are currently disabled');
    }

    const targetId = clampText(body?.targetId, MAX_SHORT) ?? '';
    const targetType = clampText(body?.targetType, 50);
    const reason = clampText(body?.reason, MAX_SHORT) ?? '';
    if (!targetType || !reason) {
      return fail(c, 400, 'targetType and reason are required');
    }
    if (!(await verifyTurnstile(c, typeof body.token === 'string' ? body.token : undefined))) {
      return fail(c, 400, 'Turnstile verification failed');
    }

    const db = createDb(c.env.DB);
    const id = crypto.randomUUID();
    await db.insert(reports).values({
      id,
      reason,
      targetType,
      targetId: targetId || null,
      // Postgres default + frontend expectation: 'new' (not 'pending')
      status: 'new',
      message: clampText(body.message, MAX_MESSAGE),
      pageUrl: clampText(body.pageUrl, MAX_URL),
      reporterName: clampText(body.reporterName, MAX_SHORT),
      reporterContact: clampText(body.reporterContact, MAX_SHORT),
      reporterUserId: clampText(body.reporterUserId, MAX_SHORT),
      anonymousId: clampText(body.anonymousId, MAX_SHORT),
      deviceFingerprint: clampText(body.deviceFingerprint, 256),
      deviceType: clampText(body.deviceType, 50),
      ipAddress: clientIp(c),
      os: clampText(body.os, 100),
      browser: clampText(body.browser, 100),
      language: clampText(body.language, 50),
      screenResolution: clampText(body.screenResolution, 50),
      timezone: clampText(body.timezone, 100),
      createdAt: isoNow(),
      updatedAt: isoNow(),
    });
    c.executionCtx.waitUntil(notifyTelegram(c.env, db, [
      `🚩 New report`,
      `Target: ${targetType}${targetId ? ` (${targetId})` : ''}`,
      `Reason: ${reason}`,
      `By: ${typeof body.reporterName === 'string' ? body.reporterName : 'anonymous'}`,
      typeof body.message === 'string' && body.message ? `\n${body.message}` : '',
    ].join('\n')));
    return ok(c, { id }, 201);
  } catch (error) {
    console.error('[reports] create failed:', error);
    return fail(c, 500, 'Failed to submit report');
  }
});

/** POST /api/feedback — general site feedback (port of the feedback Edge Function) */
submitRouter.post('/feedback', rateLimit(300, 5), async (c) => {
  try {
    const body = await jsonBody(c);
    const flags = await settingValues(createDb(c.env.DB), ['feedback_enabled', 'feedback_disabled_reason']);
    if (flags.feedback_enabled === false) {
      const reason = flags.feedback_disabled_reason;
      return fail(c, 403, typeof reason === 'string' ? reason : 'Feedback is currently disabled');
    }

    const message = clampText(body?.message, MAX_MESSAGE) ?? '';
    if (!message) return fail(c, 400, 'Message is required');
    if (!(await verifyTurnstile(c, typeof body.token === 'string' ? body.token : undefined))) {
      return fail(c, 400, 'Turnstile verification failed');
    }

    const db = createDb(c.env.DB);
    const id = crypto.randomUUID();
    await db.insert(feedbacks).values({
      id,
      message: message,
      // Postgres default + frontend expectation: 'new' (not 'pending')
      status: 'new',
      feedbackType: clampText(body.feedbackType, 50),
      pageUrl: clampText(body.pageUrl, MAX_URL),
      userId: clampText(body.userId, MAX_SHORT),
      userName: clampText(body.userName, MAX_SHORT),
      userContact: clampText(body.userContact, MAX_SHORT),
      createdAt: isoNow(),
      updatedAt: isoNow(),
    });
    c.executionCtx.waitUntil(notifyTelegram(c.env, db, [
      `📝 New feedback${typeof body.feedbackType === 'string' ? ` (${body.feedbackType})` : ''}`,
      `From: ${typeof body.userName === 'string' ? body.userName : 'anonymous'}`,
      `Page: ${typeof body.pageUrl === 'string' ? body.pageUrl : '—'}`,
      `\n${message}`,
    ].join('\n')));
    return ok(c, { id }, 201);
  } catch (error) {
    console.error('[feedback] create failed:', error);
    return fail(c, 500, 'Failed to submit feedback');
  }
});

/**
 * GET /api/submissions/check?type=&name=&repoUrl=
 * Live-table name/repo duplicates + pending/rejected submission duplicates.
 * One D1 round trip; lookups use the lower(name)/lower(repo_url) indexes and
 * submissions are filtered in SQL instead of loading every row.
 */
submitRouter.get('/submissions/check', rateLimit(60, 30), async (c) => {
  try {
    const db = createDb(c.env.DB);
    const type = c.req.query('type') === 'extension' ? 'extension' : 'app';
    // Empty strings never match (names/urls are non-empty), so unused probes are no-ops.
    const name = (c.req.query('name') ?? '').trim().slice(0, 200).toLowerCase();
    const repoUrl = (c.req.query('repoUrl') ?? '').trim().slice(0, 500).toLowerCase();
    if (!name && !repoUrl) return ok(c, { nameMatch: null, repoMatch: null, submissions: [] });

    const appCols = { id: apps.id, name: apps.name, slug: apps.slug };
    const extCols = { id: extensions.id, name: extensions.name, slug: extensions.slug };
    const subName = sql`lower(trim(json_extract(${submissions.submittedData}, '$.name')))`;
    const subRepo = sql`lower(trim(json_extract(${submissions.submittedData}, '$.repo_url')))`;
    const [appByName, extByName, appByRepo, extByRepo, subRows] = await db.batch([
      db.select(appCols).from(apps).where(and(eq(sql`lower(${apps.name})`, name), eq(apps.status, 'approved'))).limit(1),
      db.select(extCols).from(extensions).where(and(eq(sql`lower(${extensions.name})`, name), eq(extensions.status, 'approved'))).limit(1),
      db.select(appCols).from(apps).where(and(eq(sql`lower(${apps.repoUrl})`, repoUrl), eq(apps.status, 'approved'))).limit(1),
      db.select(extCols).from(extensions).where(and(eq(sql`lower(${extensions.repoUrl})`, repoUrl), eq(extensions.status, 'approved'))).limit(1),
      db.select({ status: submissions.status, adminNotes: submissions.adminNotes })
        .from(submissions)
        .where(and(
          eq(submissions.submissionType, type),
          inArray(submissions.status, ['pending', 'rejected']),
          or(eq(subName, name), eq(subRepo, repoUrl)),
        ))
        .limit(20),
    ]);

    const pick = (a: typeof appByName, e: typeof extByName) =>
      a[0] ? { ...a[0], kind: 'app' as const } : e[0] ? { ...e[0], kind: 'extension' as const } : null;
    const nameMatch = name ? pick(appByName, extByName) : null;
    const repoMatch = repoUrl ? pick(appByRepo, extByRepo) : null;
    // The moderator note is shown to submitters only as a rejection reason.
    const duplicateSubmissions = subRows.map((row) => ({
      status: row.status,
      admin_notes: row.status === 'rejected' ? row.adminNotes : null,
    }));

    return ok(c, { nameMatch, repoMatch, submissions: duplicateSubmissions });
  } catch (error) {
    console.error('[submissions] check failed:', error);
    return fail(c, 500, 'Failed to check for duplicates');
  }
});

/** POST /api/edit-suggestions — suggest an edit to an existing app/extension */
submitRouter.post('/edit-suggestions', rateLimit(300, 5), async (c) => {
  try {
    const body = await jsonBody(c);
    const targetType = body?.targetType;
    const targetId = body?.targetId;
    const submittedData = body?.submittedData;

    if (targetType !== 'app' && targetType !== 'extension' && targetType !== 'guide') {
      return fail(c, 400, "targetType must be 'app', 'extension' or 'guide'");
    }
    if (typeof targetId !== 'string' || !targetId || targetId.length > MAX_SHORT) {
      return fail(c, 400, 'targetId is required');
    }
    if (typeof submittedData !== 'object' || submittedData === null) {
      return fail(c, 400, 'submittedData object is required');
    }
    if (!(await verifyTurnstile(c, typeof body.token === 'string' ? body.token : undefined))) {
      return fail(c, 400, 'Turnstile verification failed');
    }

    const submitted = stripSubmitterPrivileged(submittedData);
    const notes = clampText(body.submitterNotes, MAX_NOTE);
    if (notes) submitted.submitter_notes = notes;
    const snapshot =
      typeof body.originalDataSnapshot === 'object' && body.originalDataSnapshot !== null
        ? body.originalDataSnapshot
        : null;
    if (JSON.stringify(submitted).length + JSON.stringify(snapshot).length > MAX_SUBMITTED_DATA * 2) {
      return fail(c, 413, 'Suggestion is too large');
    }

    const db = createDb(c.env.DB);
    const id = crypto.randomUUID();
    await db.insert(publicEditSuggestions).values({
      id,
      targetType,
      targetId,
      submittedData: submitted,
      originalDataSnapshot: snapshot,
      status: 'pending',
      submitterName: clampText(body.submitterName, MAX_SHORT),
      submitterContact: clampText(body.submitterContact, MAX_SHORT),
      submitterUserId: clampText(body.submitterUserId, MAX_SHORT),
      createdAt: isoNow(),
      updatedAt: isoNow(),
    });
    const dataName = typeof submitted.name === 'string' ? submitted.name : 'unknown';
    c.executionCtx.waitUntil(notifyTelegram(c.env, db, [
      `✏️ Edit suggestion`,
      `Target: ${targetType} (${targetId})`,
      `Name: ${dataName}`,
      `By: ${typeof body.submitterName === 'string' ? body.submitterName : 'anonymous'}`,
    ].join('\n')));
    return ok(c, { id }, 201);
  } catch (error) {
    console.error('[edit-suggestions] create failed:', error);
    return fail(c, 500, 'Failed to submit edit suggestion');
  }
});
