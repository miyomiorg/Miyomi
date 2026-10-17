import { and, eq, sql } from 'drizzle-orm';
import { Hono, type Context } from 'hono';
import { createDb } from '../../lib/db.ts';
import { rateLimit } from '../../lib/rate-limit.ts';
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

/** Helper: read a string setting value from the DB */
async function settingValue(db: ReturnType<typeof createDb>, key: string): Promise<unknown> {
  const [row] = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  return row?.value ?? null;
}

async function jsonBody(c: Context<AppEnv>): Promise<Record<string, unknown> | null> {
  return (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
}

const SUBMISSION_TYPES = ['app', 'extension', 'guide'] as const;

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
    const submitted: Record<string, unknown> = { ...(submittedData as Record<string, unknown>) };
    if (typeof body.submitterNotes === 'string' && body.submitterNotes.trim()) {
      submitted.submitter_notes = body.submitterNotes.trim();
    }
    const id = crypto.randomUUID();
    await db.insert(submissions).values({
      id,
      submissionType: submissionType as string,
      submittedData: submitted,
      status: 'pending',
      author: typeof body.author === 'string' ? body.author : null,
      submitterName: typeof body.submitterName === 'string' ? body.submitterName : null,
      submitterEmail: typeof body.submitterEmail === 'string' ? body.submitterEmail : null,
      submitterContact: typeof body.submitterContact === 'string' ? body.submitterContact : null,
      submitterUserId: typeof body.submitterUserId === 'string' ? body.submitterUserId : null,
      createdAt: isoNow(),
      updatedAt: isoNow(),
    });
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
    const enabled = await settingValue(createDb(c.env.DB), 'reports_enabled');
    if (enabled === false) {
      const reason = await settingValue(createDb(c.env.DB), 'reports_disabled_reason');
      return fail(c, 403, typeof reason === 'string' ? reason : 'Reports are currently disabled');
    }

    const targetId = typeof body?.targetId === 'string' ? body.targetId : '';
    const targetType = body?.targetType;
    const reason = typeof body?.reason === 'string' ? body.reason : '';
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
      targetType: String(targetType),
      targetId: targetId || null,
      // Postgres default + frontend expectation: 'new' (not 'pending')
      status: 'new',
      message: typeof body.message === 'string' ? body.message : null,
      pageUrl: typeof body.pageUrl === 'string' ? body.pageUrl : null,
      reporterName: typeof body.reporterName === 'string' ? body.reporterName : null,
      reporterContact: typeof body.reporterContact === 'string' ? body.reporterContact : null,
      reporterUserId: typeof body.reporterUserId === 'string' ? body.reporterUserId : null,
      anonymousId: typeof body.anonymousId === 'string' ? body.anonymousId : null,
      deviceFingerprint: typeof body.deviceFingerprint === 'string' ? body.deviceFingerprint : null,
      deviceType: typeof body.deviceType === 'string' ? body.deviceType : null,
      ipAddress: clientIp(c),
      os: typeof body.os === 'string' ? body.os : null,
      browser: typeof body.browser === 'string' ? body.browser : null,
      language: typeof body.language === 'string' ? body.language : null,
      screenResolution: typeof body.screenResolution === 'string' ? body.screenResolution : null,
      timezone: typeof body.timezone === 'string' ? body.timezone : null,
      createdAt: isoNow(),
      updatedAt: isoNow(),
    });
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
    const enabled = await settingValue(createDb(c.env.DB), 'feedback_enabled');
    if (enabled === false) {
      const reason = await settingValue(createDb(c.env.DB), 'feedback_disabled_reason');
      return fail(c, 403, typeof reason === 'string' ? reason : 'Feedback is currently disabled');
    }

    const message = typeof body?.message === 'string' ? body.message.trim() : '';
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
      feedbackType: typeof body.feedbackType === 'string' ? body.feedbackType : null,
      pageUrl: typeof body.pageUrl === 'string' ? body.pageUrl : null,
      userId: typeof body.userId === 'string' ? body.userId : null,
      userName: typeof body.userName === 'string' ? body.userName : null,
      userContact: typeof body.userContact === 'string' ? body.userContact : null,
      createdAt: isoNow(),
      updatedAt: isoNow(),
    });
    return ok(c, { id }, 201);
  } catch (error) {
    console.error('[feedback] create failed:', error);
    return fail(c, 500, 'Failed to submit feedback');
  }
});

type LiveMatch = { id: string; name: string; slug: string | null; kind: 'app' | 'extension' };

async function findLiveByName(db: ReturnType<typeof createDb>, name: string): Promise<LiveMatch | null> {
  const lower = name.toLowerCase();
  const [app] = await db
    .select({ id: apps.id, name: apps.name, slug: apps.slug })
    .from(apps)
    .where(and(eq(apps.status, 'approved'), eq(sql`lower(${apps.name})`, lower)))
    .limit(1);
  if (app) return { ...app, kind: 'app' };
  const [ext] = await db
    .select({ id: extensions.id, name: extensions.name, slug: extensions.slug })
    .from(extensions)
    .where(and(eq(extensions.status, 'approved'), eq(sql`lower(${extensions.name})`, lower)))
    .limit(1);
  if (ext) return { ...ext, kind: 'extension' };
  return null;
}

async function findLiveByRepoUrl(db: ReturnType<typeof createDb>, repoUrl: string): Promise<LiveMatch | null> {
  const lower = repoUrl.toLowerCase();
  const [app] = await db
    .select({ id: apps.id, name: apps.name, slug: apps.slug })
    .from(apps)
    .where(and(eq(apps.status, 'approved'), eq(sql`lower(${apps.repoUrl})`, lower)))
    .limit(1);
  if (app) return { ...app, kind: 'app' };
  const [ext] = await db
    .select({ id: extensions.id, name: extensions.name, slug: extensions.slug })
    .from(extensions)
    .where(and(eq(extensions.status, 'approved'), eq(sql`lower(${extensions.repoUrl})`, lower)))
    .limit(1);
  if (ext) return { ...ext, kind: 'extension' };
  return null;
}

/**
 * GET /api/submissions/check?type=&name=&repoUrl=
 * Live-table name/repo duplicates + pending/rejected submission duplicates.
 */
submitRouter.get('/submissions/check', async (c) => {
  try {
    const db = createDb(c.env.DB);
    const type = c.req.query('type') === 'extension' ? 'extension' : 'app';
    const name = (c.req.query('name') ?? '').trim();
    const repoUrl = (c.req.query('repoUrl') ?? '').trim();

    const [nameMatch, repoMatch] = await Promise.all([
      name ? findLiveByName(db, name) : Promise.resolve(null),
      repoUrl ? findLiveByRepoUrl(db, repoUrl) : Promise.resolve(null),
    ]);

    // Scan this type's pending/rejected submissions for name/repo matches.
    const rows = await db.select().from(submissions).where(eq(submissions.submissionType, type));
    const duplicateSubmissions = rows
      .filter((row) => {
        const data = (row.submittedData ?? {}) as Record<string, unknown>;
        const rowName = String(data.name ?? '').trim().toLowerCase();
        const rowRepo = String(data.repo_url ?? '').trim().toLowerCase();
        return (name && rowName === name.toLowerCase()) || (repoUrl && rowRepo === repoUrl.toLowerCase());
      })
      .map((row) => ({ status: row.status, admin_notes: row.adminNotes }));

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
    if (typeof targetId !== 'string' || !targetId) {
      return fail(c, 400, 'targetId is required');
    }
    if (typeof submittedData !== 'object' || submittedData === null) {
      return fail(c, 400, 'submittedData object is required');
    }
    if (!(await verifyTurnstile(c, typeof body.token === 'string' ? body.token : undefined))) {
      return fail(c, 400, 'Turnstile verification failed');
    }

    const submitted: Record<string, unknown> = { ...(submittedData as Record<string, unknown>) };
    if (typeof body.submitterNotes === 'string' && body.submitterNotes.trim()) {
      submitted.submitter_notes = body.submitterNotes.trim();
    }

    const db = createDb(c.env.DB);
    const id = crypto.randomUUID();
    await db.insert(publicEditSuggestions).values({
      id,
      targetType,
      targetId,
      submittedData: submitted,
      originalDataSnapshot:
        typeof body.originalDataSnapshot === 'object' && body.originalDataSnapshot !== null
          ? body.originalDataSnapshot
          : null,
      status: 'pending',
      submitterName: typeof body.submitterName === 'string' ? body.submitterName : null,
      submitterContact: typeof body.submitterContact === 'string' ? body.submitterContact : null,
      submitterUserId: typeof body.submitterUserId === 'string' ? body.submitterUserId : null,
      createdAt: isoNow(),
      updatedAt: isoNow(),
    });
    return ok(c, { id }, 201);
  } catch (error) {
    console.error('[edit-suggestions] create failed:', error);
    return fail(c, 500, 'Failed to submit edit suggestion');
  }
});
