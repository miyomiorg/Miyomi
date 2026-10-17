import { Hono } from 'hono';
import { fail, ok, type AppEnv } from '../../lib/http.ts';

/**
 * GET /api/stats — 30-day pageview total from the Cloudflare GraphQL
 * API. Port of functions/api/stats.ts. Requires CF_API_TOKEN and
 * CF_ZONE_ID (set via `wrangler secret put`).
 */
export const statsRouter = new Hono<AppEnv>();

statsRouter.get('/', async (c) => {
  try {
    const { CF_API_TOKEN: token, CF_ZONE_ID: zoneId, CF_ZONE_TAG: zoneTag } = c.env as {
      CF_API_TOKEN?: string;
      CF_ZONE_ID?: string;
      CF_ZONE_TAG?: string;
    };
    if (!token || !zoneId) {
      return fail(c, 500, 'Cloudflare analytics credentials not configured');
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateStr = thirtyDaysAgo.toISOString().split('T')[0];

    // Accept either a numeric zone id or a zone tag
    const zoneRef = zoneTag?.trim() || zoneId;

    const query = `
      query {
        viewer {
          zones(filter: { zoneTag: "${zoneRef}" }) {
            httpRequests1dGroups(limit: 1000, filter: { date_gt: "${dateStr}" }) {
              sum { pageViews }
            }
          }
        }
      }
    `;

    const response = await fetch('https://api.cloudflare.com/client/v4/graphql', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[stats] Cloudflare API error:', response.status, errorText.slice(0, 500));
      return fail(c, 502, 'Failed to query Cloudflare analytics');
    }

    const data = (await response.json()) as {
      data?: { viewer?: { zones?: Array<{ httpRequests1dGroups?: Array<{ sum?: { pageViews?: number } }> }> } };
    };
    const groups = data?.data?.viewer?.zones?.[0]?.httpRequests1dGroups ?? [];
    const visits = groups.reduce((acc, g) => acc + (g?.sum?.pageViews || 0), 0);

    return c.json({ success: true, data: { monthlyVisitors: visits } }, 200, {
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    });
  } catch (error) {
    console.error('[stats] failed:', error);
    return fail(c, 500, 'Failed to fetch stats');
  }
});
