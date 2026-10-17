import { afterEach, describe, expect, it, vi } from 'vitest';
import { dashboardApi } from './index';

afterEach(() => vi.unstubAllGlobals());

function respondWith(data: unknown) {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(
    JSON.stringify({ success: true, data }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  )));
}

describe('admin dashboard response contract', () => {
  it('preserves aggregate keys (counts, recentApps, stats) as the Worker emits them', async () => {
    const payload = {
      counts: { approvedApps: 136, approvedExtensions: 48, publishedGuides: 24, pendingSubmissions: 6, activeNotices: 0, totalLikes: 7631 },
      recentApps: [
        { name: 'Komikku', updatedAt: '2026-10-16T05:21:30.435Z' },
        { name: 'Foxlations', updatedAt: '2026-10-15T23:21:51.328Z' },
      ],
      recentExtensions: [{ name: 'Keiyoushi', updatedAt: '2026-10-15T08:00:00.000Z' }],
      stats: {
        totalActions: 54,
        actionBreakdown: [{ action: 'auth.login', count: 38 }],
        recentLogs: [{
          id: 'log-1',
          action: 'approve',
          resourceType: 'submission',
          resourceName: 'Some App',
          createdAt: '2026-10-17T00:00:00.000Z',
          adminEmail: 'admin@example.com',
        }],
        topContributors: [{ adminEmail: 'shiratomikio@gmail.com', totalActions: 528 }],
      },
    };
    respondWith(payload);
    const result = await dashboardApi.get();
    expect(result).toEqual(payload);
    expect(result.recentApps[0].updatedAt).toBe('2026-10-16T05:21:30.435Z');
    expect(result.stats.recentLogs[0].resourceType).toBe('submission');
    expect(result.stats.topContributors[0].totalActions).toBe(528);
  });

  it('keeps an empty dashboard iterable', async () => {
    respondWith({
      counts: { approvedApps: 0, approvedExtensions: 0, publishedGuides: 0, pendingSubmissions: 0, activeNotices: 0, totalLikes: 0 },
      recentApps: [],
      recentExtensions: [],
      stats: { totalActions: 0, actionBreakdown: [], recentLogs: [], topContributors: [] },
    });
    const result = await dashboardApi.get();
    expect(result.recentApps).toEqual([]);
    expect(result.stats.actionBreakdown).toEqual([]);
  });
});