import { afterEach, describe, expect, it, vi } from 'vitest';
import { adminLikesApi } from './index';

afterEach(() => vi.unstubAllGlobals());

function respondWith(data: unknown) {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(
    JSON.stringify({ success: true, data }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  )));
}

describe('admin likes API response contract', () => {
  it('preserves aggregate keys and breakdown labels used by the Likes page', async () => {
    const stats = {
      total: 7,
      byType: { app: 5, extension: 2 },
      byBrowser: { Chrome: 4, Firefox: 3 },
      byOS: { Windows: 4, iOS: 3 },
      byDeviceType: { desktop: 4, mobile: 3 },
    };
    respondWith(stats);
    const result = await adminLikesApi.stats();
    expect(result).toEqual(stats);
    expect(Object.entries(result.byType)).toEqual([['app', 5], ['extension', 2]]);
    expect(Object.keys(result.byOS)).toEqual(['Windows', 'iOS']);
  });

  it('returns iterable empty breakdowns when there are no likes', async () => {
    respondWith({ total: 0, byType: {}, byBrowser: {}, byOS: {}, byDeviceType: {} });
    const stats = await adminLikesApi.stats();
    for (const breakdown of [stats.byType, stats.byBrowser, stats.byOS, stats.byDeviceType]) {
      expect(Object.entries(breakdown)).toEqual([]);
    }
  });

  it('still snake-cases paginated database rows for the likes table', async () => {
    respondWith({ items: [{ id: 'like-1', itemId: 'app-1', deviceType: 'desktop', likedAt: '2026-10-17T00:00:00Z' }], total: 1 });
    expect(await adminLikesApi.list({ limit: 100 })).toEqual({
      items: [{ id: 'like-1', item_id: 'app-1', device_type: 'desktop', liked_at: '2026-10-17T00:00:00Z' }],
      total: 1,
    });
  });
});
