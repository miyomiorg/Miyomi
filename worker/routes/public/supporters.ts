import { Hono } from 'hono';
import { fail, ok, type AppEnv } from '../../lib/http.ts';

export const supportersRouter = new Hono<AppEnv>();

/**
 * Public supporter section.
 *
 * The existing donations table stores one row per donation and has no donor
 * identity or payment-status column. All public, positive-amount rows are
 * therefore treated as completed donations. Named donors are grouped by a
 * normalized name; generic anonymous entries are kept as separate supporters
 * so distinct anonymous donors are never merged.
 *
 * The first page contains the top three supporters by lifetime total followed
 * by the remaining supporters ordered by their latest donation. Later pages
 * contain only the recent list. Amounts are normalized to USD with the existing
 * `currencies` setting (`rate` is local currency units per USD).
 */
const BASE_SQL = `
WITH rates AS (
  SELECT
    upper(trim(json_extract(j.value, '$.code'))) AS code,
    CAST(json_extract(j.value, '$.rate') AS REAL) AS rate
  FROM donation_settings ds,
       json_each(CASE WHEN json_valid(ds.value) THEN ds.value ELSE '[]' END) j
  WHERE ds.key = 'currencies'
),
normalized AS (
  SELECT
    CASE
      WHEN lower(trim(donor_name)) IN ('anonymous', 'anon', 'anonymous donor', 'anonymous supporter', 'anonymous user')
        THEN 'donation:' || id
      ELSE 'name:' || lower(trim(donor_name))
    END AS supporter_key,
    CASE
      WHEN lower(trim(donor_name)) IN ('anonymous', 'anon', 'anonymous donor', 'anonymous supporter', 'anonymous user')
        THEN 'Anonymous'
      ELSE trim(donor_name)
    END AS display_name,
    amount / COALESCE(
      NULLIF((SELECT rate FROM rates WHERE code = upper(trim(COALESCE(currency, 'USD'))) AND rate > 0), 0),
      1
    ) AS usd_amount,
    COALESCE(NULLIF(trim(date), ''), created_at) AS donated_at,
    show_amount
  FROM donations
  WHERE is_public = 1
    AND amount IS NOT NULL
    AND amount > 0
    AND trim(donor_name) <> ''
),
supporters AS (
  SELECT
    supporter_key,
    MAX(display_name) AS display_name,
    ROUND(SUM(usd_amount), 2) AS total_usd,
    COUNT(*) AS donation_count,
    MIN(COALESCE(donated_at, '9999-12-31')) AS first_donation_at,
    MAX(donated_at) AS latest_donation_at,
    MIN(CASE WHEN show_amount = 1 THEN 1 ELSE 0 END) AS show_amount
  FROM normalized
  GROUP BY supporter_key
),
summary AS (
  SELECT
    COUNT(DISTINCT supporter_key) AS total,
    ROUND(COALESCE(SUM(usd_amount), 0), 2) AS total_raised_usd
  FROM normalized
),
ranked AS (
  SELECT
    supporter_key,
    display_name,
    total_usd,
    donation_count,
    first_donation_at,
    latest_donation_at,
    show_amount,
    COALESCE(latest_donation_at, '0000-01-01') AS recent_at,
    ROW_NUMBER() OVER (
      ORDER BY total_usd DESC, first_donation_at ASC, supporter_key ASC
    ) AS total_rank
  FROM supporters
)
`;

type SummaryRow = {
  total: number;
  total_raised_usd: number;
};

type LeaderboardRow = {
  section: number;
  rank_position: number | null;
  supporter_key: string;
  display_name: string;
  total_usd: number;
  donation_count: number;
  latest_donation_at: string | null;
  show_amount: number;
  recent_at: string;
};

type Cursor = {
  recent: string;
  key: string;
};

function parseLimit(raw: string | undefined): number {
  const parsed = Number.parseInt(raw ?? '20', 10);
  if (!Number.isFinite(parsed)) return 20;
  return Math.min(Math.max(parsed, 1), 50);
}

function encodeCursor(row: LeaderboardRow): string {
  const bytes = new TextEncoder().encode(JSON.stringify({
    r: row.recent_at,
    k: row.supporter_key,
  }));
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeCursor(raw: string): Cursor | null {
  if (raw.length > 8192) return null;
  try {
    const base64 = raw.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as {
      r?: unknown;
      k?: unknown;
    };
    if (
      typeof parsed.r !== 'string' ||
      parsed.r.length > 64 ||
      typeof parsed.k !== 'string' ||
      parsed.k.length > 2048
    ) {
      return null;
    }
    return { recent: parsed.r, key: parsed.k };
  } catch {
    return null;
  }
}

/** GET /api/donations/leaderboard — top three + recent supporters, cursor-paginated. */
supportersRouter.get('/', async (c) => {
  try {
    const limit = parseLimit(c.req.query('limit'));
    const rawCursor = c.req.query('cursor');
    const cursor = rawCursor ? decodeCursor(rawCursor) : null;
    if (rawCursor && !cursor) return fail(c, 400, 'Invalid cursor');

    const binds: Array<string | number> = [];
    let recentWhere = 'WHERE total_rank > 3';
    if (cursor) {
      recentWhere += `
        AND (
          recent_at < ?
          OR (recent_at = ? AND supporter_key > ?)
        )`;
      binds.push(cursor.recent, cursor.recent, cursor.key);
    }
    binds.push(limit + 1);

    // The first page also includes the top three by lifetime total. Later
    // pages only contain the recent list; the client keeps the podium it
    // already has.
    const topSql = cursor ? '' : `
      SELECT
        0 AS section,
        total_rank AS rank_position,
        supporter_key,
        display_name,
        total_usd,
        donation_count,
        latest_donation_at,
        show_amount,
        recent_at
      FROM ranked
      WHERE total_rank <= 3
      UNION ALL`;

    const pageSql = `${BASE_SQL}
      SELECT * FROM (
        ${topSql}
        SELECT
          1 AS section,
          NULL AS rank_position,
          supporter_key,
          display_name,
          total_usd,
          donation_count,
          latest_donation_at,
          show_amount,
          recent_at
        FROM (
          SELECT
            supporter_key,
            display_name,
            total_usd,
            donation_count,
            latest_donation_at,
            show_amount,
            recent_at
          FROM ranked
          ${recentWhere}
          ORDER BY recent_at DESC, supporter_key ASC
          LIMIT ?
        )
      )
      ORDER BY section ASC, rank_position ASC, recent_at DESC, supporter_key ASC`;

    const [summaryResult, pageResult] = await Promise.all([
      c.env.DB.prepare(`${BASE_SQL} SELECT total, total_raised_usd FROM summary`).bind().all<SummaryRow>(),
      c.env.DB.prepare(pageSql).bind(...binds).all<LeaderboardRow>(),
    ]);

    const summary = summaryResult.results?.[0] ?? { total: 0, total_raised_usd: 0 };
    const rows = pageResult.results ?? [];
    const topRows = rows.filter((row) => row.section === 0);
    const recentRows = rows.filter((row) => row.section === 1);
    const pageRows = recentRows.slice(0, limit);
    const nextCursor = recentRows.length > limit && pageRows.length > 0
      ? encodeCursor(pageRows[pageRows.length - 1])
      : null;

    const mapRow = (row: LeaderboardRow) => ({
      key: row.supporter_key,
      displayName: row.display_name,
      totalUsd: row.show_amount === 1 ? row.total_usd : null,
      donationCount: row.donation_count,
      latestDonationAt: row.latest_donation_at,
      amountHidden: row.show_amount !== 1,
    });

    return ok(c, {
      top: topRows.map((row) => ({
        ...mapRow(row),
        rank: row.rank_position,
      })),
      items: pageRows.map((row) => ({
        ...mapRow(row),
        rank: null,
      })),
      total: summary.total,
      totalRaisedUsd: summary.total_raised_usd,
      nextCursor,
    });
  } catch (error) {
    console.error('[supporters] leaderboard failed:', error);
    return fail(c, 500, 'Failed to fetch supporter leaderboard');
  }
});
