import { Hono } from 'hono';
import { fail, ok, requireAdmin, requireMinRole, type AppEnv } from '../../lib/http.ts';

/**
 * GET /admin/analytics?days=7|14|30 — Cloudflare zone analytics for the
 * admin dashboard. Pulls from the Cloudflare GraphQL Analytics API using the
 * CF_API_TOKEN + CF_ZONE_ID secrets/vars.
 *
 * Sources:
 *  - httpRequests1dGroups (any range): traffic totals/series + countryMap /
 *    browserMap / threatPathingMap breakdowns (maps are the only per-dimension
 *    data available on the 1d dataset for zones).
 *  - httpRequestsAdaptiveGroups (≈7-day retention): top pages, device types,
 *    and OS families (sampled `visits`).
 */
export const analyticsRouter = new Hono<AppEnv>();

const GRAPHQL = `
query MiyomiAnalytics($zone: String!, $start: Date!, $end: Date!, $adaptiveStart: DateTime!, $adaptiveEnd: DateTime!) {
  viewer {
    zones(filter: { zoneTag: $zone }) {
      series: httpRequests1dGroups(filter: { date_geq: $start, date_leq: $end }, limit: 10000, orderBy: [date_ASC]) {
        dimensions { date }
        uniq { uniques }
        sum {
          requests pageViews bytes cachedRequests cachedBytes threats
          encryptedRequests encryptedBytes
          countryMap { clientCountryName requests bytes threats }
          browserMap { uaBrowserFamily pageViews }
          threatPathingMap { threatPathingName requests }
        }
      }
      pages: httpRequestsAdaptiveGroups(filter: { datetime_geq: $adaptiveStart, datetime_leq: $adaptiveEnd }, limit: 10000) {
        dimensions { clientRequestPath }
        sum { visits edgeResponseBytes }
      }
      devices: httpRequestsAdaptiveGroups(filter: { datetime_geq: $adaptiveStart, datetime_leq: $adaptiveEnd }, limit: 10000) {
        dimensions { clientDeviceType }
        sum { visits }
      }
      oss: httpRequestsAdaptiveGroups(filter: { datetime_geq: $adaptiveStart, datetime_leq: $adaptiveEnd }, limit: 10000) {
        dimensions { userAgentOS }
        sum { visits }
      }
    }
  }
}`;

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

interface CfRow {
  dimensions?: Record<string, string>;
  sum?: Record<string, unknown>;
  uniq?: Record<string, unknown>;
}

/** Aggregate map-elements (countryMap/browserMap/threatPathingMap) across days. */
function aggregateMaps<T>(
  series: CfRow[],
  field: string,
  keyOf: (entry: Record<string, unknown>) => string | null,
  metrics: Array<[string, (e: Record<string, unknown>) => number]>,
): Map<string, Record<string, number>> {
  const out = new Map<string, Record<string, number>>();
  for (const day of series) {
    const entries = (day.sum?.[field] ?? []) as Array<Record<string, unknown>>;
    for (const entry of entries) {
      const key = keyOf(entry);
      if (!key) continue;
      const bucket = out.get(key) ?? {};
      for (const [name, fn] of metrics) bucket[name] = (bucket[name] ?? 0) + (fn(entry) ?? 0);
      out.set(key, bucket);
    }
  }
  return out;
}

const sortDesc = (map: Map<string, Record<string, number>>, metric: string) =>
  [...map.entries()].sort((a, b) => (b[1][metric] ?? 0) - (a[1][metric] ?? 0));

const num = (v: unknown): number => (typeof v === 'number' ? v : 0);

export function mapZoneAnalytics(zone: { series?: CfRow[]; pages?: CfRow[]; devices?: CfRow[]; oss?: CfRow[] }, days: number) {
  const series = (zone?.series ?? []).map((r) => ({
    date: r.dimensions?.date ?? '',
    uniques: num(r.uniq?.uniques),
    requests: num(r.sum?.requests),
    pageViews: num(r.sum?.pageViews),
    bytes: num(r.sum?.bytes),
    cachedRequests: num(r.sum?.cachedRequests),
    cachedBytes: num(r.sum?.cachedBytes),
    encryptedRequests: num(r.sum?.encryptedRequests),
    encryptedBytes: num(r.sum?.encryptedBytes),
    threats: num(r.sum?.threats),
  }));

  const sumOf = (metric: string) => series.reduce((acc, r) => acc + (r as unknown as Record<string, number>)[metric], 0);

  const countries = sortDesc(
    aggregateMaps(zone?.series ?? [], 'countryMap', (e) => (typeof e.clientCountryName === 'string' ? e.clientCountryName : null), [
      ['requests', (e) => num(e.requests)],
      ['bytes', (e) => num(e.bytes)],
      ['threats', (e) => num(e.threats)],
    ]),
    'requests',
  ).slice(0, 12).map(([code, v]) => ({ code, requests: v.requests, bytes: v.bytes, threats: v.threats }));

  const browsers = sortDesc(
    aggregateMaps(zone?.series ?? [], 'browserMap', (e) => (typeof e.uaBrowserFamily === 'string' ? e.uaBrowserFamily : null), [
      ['pageViews', (e) => num(e.pageViews)],
    ]),
    'pageViews',
  ).slice(0, 8).map(([family, v]) => ({ family, pageViews: v.pageViews }));

  const threatPathing = sortDesc(
    aggregateMaps(zone?.series ?? [], 'threatPathingMap', (e) => (typeof e.threatPathingName === 'string' ? e.threatPathingName : null), [
      ['requests', (e) => num(e.requests)],
    ]),
    'requests',
  ).slice(0, 8).map(([name, v]) => ({ name, requests: v.requests }));

  // Adaptive (≈last 7 days): filter bot/cdn noise, rank by sampled visits.
  const rank = (rows: CfRow[] | undefined, dim: string) =>
    (rows ?? [])
      .map((r) => ({ key: r.dimensions?.[dim] ?? '', visits: num(r.sum?.visits) }))
      .filter((r) => r.key)
      .sort((a, b) => b.visits - a.visits);

  const pages = (zone?.pages ?? [])
    .map((r) => ({
      path: r.dimensions?.clientRequestPath ?? '',
      visits: num(r.sum?.visits),
      bytes: num(r.sum?.edgeResponseBytes),
    }))
    .filter((r) => r.path && !r.path.startsWith('/cdn-cgi/'))
    .sort((a, b) => b.visits - a.visits)
    .slice(0, 12);

  const devices = rank(zone?.devices, 'clientDeviceType').slice(0, 8).map((r) => ({ type: r.key, visits: r.visits }));
  const oss = rank(zone?.oss, 'userAgentOS').slice(0, 8).map((r) => ({ name: r.key, visits: r.visits }));

  return {
    days,
    totals: {
      uniques: sumOf('uniques'),
      requests: sumOf('requests'),
      pageViews: sumOf('pageViews'),
      bytes: sumOf('bytes'),
      cachedRequests: sumOf('cachedRequests'),
      cachedBytes: sumOf('cachedBytes'),
      encryptedRequests: sumOf('encryptedRequests'),
      encryptedBytes: sumOf('encryptedBytes'),
      threats: sumOf('threats'),
    },
    series,
    countries,
    browsers,
    threatPathing,
    adaptive: { pages, devices, oss },
  };
}

analyticsRouter.get('/', requireAdmin(), requireMinRole('admin'), async (c) => {
  try {
    const env = c.env as { CF_API_TOKEN?: string; CF_ZONE_ID?: string };
    const token = env.CF_API_TOKEN;
    const zoneId = env.CF_ZONE_ID;
    if (!token || !zoneId) return fail(c, 500, 'Cloudflare analytics credentials not configured');

    const daysRaw = parseInt(c.req.query('days') || '7', 10);
    const days = Math.min(Math.max(Number.isFinite(daysRaw) ? daysRaw : 7, 1), 30);

    const end = new Date();
    const start = new Date(Date.now() - (days - 1) * 86_400_000);
    // Adaptive analytics retains ≈7 days; keep its window within the range.
    const adaptiveEnd = new Date();
    const adaptiveStart = new Date(Math.max(start.getTime(), Date.now() - 6 * 86_400_000));

    const res = await fetch('https://api.cloudflare.com/client/v4/graphql', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: GRAPHQL,
        variables: {
          zone: zoneId,
          start: isoDate(start),
          end: isoDate(end),
          adaptiveStart: adaptiveStart.toISOString(),
          adaptiveEnd: adaptiveEnd.toISOString(),
        },
      }),
    });

    if (!res.ok) {
      console.error('[analytics] Cloudflare GraphQL HTTP', res.status, (await res.text()).slice(0, 300));
      return fail(c, 502, 'Failed to query Cloudflare analytics');
    }

    const body = (await res.json()) as {
      errors?: Array<{ message: string }>;
      data?: { viewer?: { zones?: Array<{ series?: CfRow[]; pages?: CfRow[]; devices?: CfRow[]; oss?: CfRow[] }> } };
    };
    if (body.errors?.length) {
      console.error('[analytics] GraphQL errors:', JSON.stringify(body.errors.slice(0, 3)));
      return fail(c, 502, `Cloudflare analytics error: ${body.errors[0].message}`);
    }

    const zone = body.data?.viewer?.zones?.[0];
    c.header('Cache-Control', 'private, max-age=300');
    return ok(c, mapZoneAnalytics(zone ?? {}, days));
  } catch (error) {
    console.error('[analytics] failed:', error);
    return fail(c, 500, 'Failed to fetch analytics');
  }
});