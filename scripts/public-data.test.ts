// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { EntryNotice } from '../src/components/EntryNotice';
import { BlogCard } from '../src/components/BlogCard';
import { RepositoryNote } from '../src/components/RepositoryNote';
import type { BlogPostSummary } from '../src/types/data';
import { useDonations } from '../src/hooks/useDonations';
import { useSupportersLeaderboard } from '../src/hooks/useSupportersLeaderboard';
import { useBlogPost } from '../src/hooks/useBlogPost';
import { useBlogPosts } from '../src/hooks/useBlogPosts';
import { useGlobalSearch } from '../src/hooks/useGlobalSearch';
import { repositoryNotesApi } from '../src/services/api';
import { CacheManager } from '../src/utils/cache';

let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear();
  container = document.createElement('div'); document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals(); vi.restoreAllMocks();
});
const response = (data: unknown, status = 200) => new Response(JSON.stringify(status === 200 ? { success: true, data } : { success: false, error: 'Temporary error' }), { status });

it.each(['app', 'extension'] as const)('saves the selected %s notice severity and discards cancelled severity changes', async targetType => {
  const fetcher = vi.fn(async () => response({ id: 'entry' }));
  vi.stubGlobal('fetch', fetcher);
  await act(async () => root.render(createElement(RepositoryNote, {
    id: 'entry', note: 'Please read', severity: 'warning', targetType, canEdit: true,
  })));
  await act(async () => container.querySelector('button')!.click());
  const critical = document.querySelector<HTMLInputElement>('input[type="radio"][value="danger"]')!;
  await act(async () => critical.click());
  expect(critical.checked).toBe(true);
  const save = [...document.querySelectorAll('button')].find(b => b.textContent === 'Save notice')!;
  await act(async () => save.click());
  const [path, init] = (fetcher.mock.calls as unknown as [string, RequestInit][])[0];
  expect(path).toBe(`/api/admin/${targetType === 'app' ? 'apps' : 'extensions'}/entry/note`);
  expect(JSON.parse(init.body as string)).toMatchObject({ note: 'Please read', severity: 'danger', sticky: false });
  expect(container.querySelector('button')!.getAttribute('aria-label')).toBe('Critical notice');

  await act(async () => container.querySelector('button')!.click());
  await act(async () => document.querySelector<HTMLInputElement>('input[value="info"]')!.click());
  await act(async () => [...document.querySelectorAll('button')].find(b => b.textContent === 'Close')!.click());
  await act(async () => container.querySelector('button')!.click());
  expect(document.querySelector<HTMLInputElement>('input[value="danger"]')!.checked).toBe(true);
  expect(fetcher).toHaveBeenCalledTimes(1);
});

it('does not fetch search directories until a search is entered', async () => {
  const fetcher = vi.fn(async () => response([]));
  vi.stubGlobal('fetch', fetcher);
  function Search({ query }: { query: string }) { useGlobalSearch(query); return null; }
  await act(async () => root.render(createElement(Search, { query: '' })));
  expect(fetcher).not.toHaveBeenCalled();
  await act(async () => root.render(createElement(Search, { query: 'manga' })));
  expect(fetcher).toHaveBeenCalledTimes(4);
  await act(async () => root.render(createElement(Search, { query: 'anime' })));
  expect(fetcher).toHaveBeenCalledTimes(4);
});

it('includes blog posts and matches tags in global search', async () => {
  const fetcher = vi.fn(async (url: string) => {
    if (url === '/api/apps') return response([{
      id: 'app-1', name: 'Reader', description: 'A reader', tags: ['Manga'],
      content_types: ['Manga'], platforms: ['Android'], compatible_with: [],
    }]);
    if (url === '/api/extensions' || url === '/api/guides') return response([]);
    if (url === '/api/blog') return response([{
      id: 'post-1', title: 'Manga release notes', slug: 'manga-release-notes',
      excerpt: 'What changed this month.', category: 'News', tags: ['Manga', 'Release'],
      status: 'published', is_pinned: false, views: 0, created_at: '2026-01-01',
      updated_at: '2026-01-01', content_format: 'html', readingMinutes: 2,
    }]);
    return response([]);
  });
  vi.stubGlobal('fetch', fetcher);
  function Search({ query }: { query: string }) {
    const results = useGlobalSearch(query);
    return createElement('span', null, results.map(result => `${result.type}:${result.name}:${(result.matchedTags || []).join(',')}`).join('|'));
  }

  await act(async () => root.render(createElement(Search, { query: 'manga' })));
  await vi.waitFor(() => {
    expect(container.textContent).toContain('app:Reader:Manga');
    expect(container.textContent).toContain('blog:Manga release notes:Manga');
  });
});

it('dismisses only the current entry/revision; edited and sticky notices reappear', async () => {
  const notice = (entryKey = 'app:a', text = 'First', sticky = false) => createElement(EntryNotice, { entryKey, text, sticky, severity: 'warning' });
  await act(async () => root.render(notice()));
  await act(async () => container.querySelector('button')!.click());
  expect(container.textContent).toBe('');
  await act(async () => root.render(notice('app:b')));
  expect(container.textContent).toBe('First');
  await act(async () => root.render(notice()));
  expect(container.textContent).toBe('');
  await act(async () => root.render(notice('app:a', 'Edited')));
  expect(container.textContent).toBe('Edited');
  await act(async () => root.render(notice('app:a', 'First', true)));
  expect(container.textContent).toBe('First');
  expect(container.querySelector('button')).toBeNull();
  // Persisted dismissal survives a new component mount, but legacy '1' does not hide revisions forever.
  await act(async () => root.render(null));
  await act(async () => root.render(notice()));
  expect(container.textContent).toBe('');
  localStorage.setItem('miyomi-dismissed-notice-app:a', '1');
  await act(async () => root.render(notice()));
  expect(container.textContent).toBe('First');
});

it('loads donation settings without downloading the full donation history', async () => {
  const fetcher = vi.fn(async (url: string) => {
    expect(url).toBe('/api/donation-settings');
    return response([{ key: 'goal', value: { autoCalc: true, currentAmount: 999 } }]);
  });
  vi.stubGlobal('fetch', fetcher);
  function Settings() {
    const data = useDonations();
    return createElement('span', null, `${data.goal.currentAmount}:${data.loading}`);
  }
  await act(async () => root.render(createElement(Settings)));
  expect(container.textContent).toBe('999:false');
  expect(fetcher).toHaveBeenCalledTimes(1);
});

it('recovers blog detail after a failed request when navigating to another post', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.stubGlobal('fetch', vi.fn(async (url: string) => url.endsWith('/broken') ? response(null, 500) : response({ title: 'Recovered', content: '<p>Body</p>' })));
  function Post({ slug }: { slug: string }) { const p = useBlogPost(slug); return createElement('span', null, p.error ? 'Error' : p.post?.title); }
  await act(async () => root.render(createElement(Post, { slug: 'broken' })));
  expect(container.textContent).toBe('Error');
  await act(async () => root.render(createElement(Post, { slug: 'good' })));
  expect(container.textContent).toBe('Recovered');
});

it('loads the ranked aggregate and its total through the dedicated endpoint', async () => {
  const fetcher = vi.fn(async () => response({
    top: [{
      key: 'name:top',
      rank: 1,
      displayName: 'Top supporter',
      totalUsd: 12.5,
      donationCount: 2,
      latestDonationAt: '2026-10-01',
      amountHidden: false,
    }],
    items: [{
      key: 'name:recent',
      rank: null,
      displayName: 'Recent supporter',
      totalUsd: 3,
      donationCount: 1,
      latestDonationAt: '2026-10-02',
      amountHidden: false,
    }],
    total: 2,
    totalRaisedUsd: 15.5,
    nextCursor: null,
  }));
  vi.stubGlobal('fetch', fetcher);
  function Supporters() {
    const data = useSupportersLeaderboard(6);
    return createElement('span', null, `${data.top.length}:${data.items.length}:${data.total}:${data.totalRaisedUsd}:${data.top[0]?.display_name}:${data.items[0]?.display_name}:${data.loading}`);
  }
  await act(async () => root.render(createElement(Supporters)));
  expect(container.textContent).toBe('1:1:2:15.5:Top supporter:Recent supporter:false');
  expect(fetcher.mock.calls[0][0]).toBe('/api/donations/leaderboard?limit=6');
});

it('appends cursor pages without duplicates and stops when exhausted', async () => {
  const fetcher = vi.fn()
    .mockResolvedValueOnce(response({
      top: [{
        key: 'name:top',
        rank: 1,
        displayName: 'Top supporter',
        totalUsd: 12.5,
        donationCount: 2,
        latestDonationAt: '2026-10-01',
        amountHidden: false,
      }],
      items: [{
        key: 'name:a',
        rank: null,
        displayName: 'A',
        totalUsd: 4,
        donationCount: 1,
        latestDonationAt: '2026-10-02',
        amountHidden: false,
      }],
      total: 3,
      totalRaisedUsd: 20,
      nextCursor: 'next',
    }))
    .mockResolvedValueOnce(response({
      top: [],
      items: [
        {
          key: 'name:a',
          rank: null,
          displayName: 'A',
          totalUsd: 4,
          donationCount: 1,
          latestDonationAt: '2026-10-02',
          amountHidden: false,
        },
        {
          key: 'name:b',
          rank: null,
          displayName: 'B',
          totalUsd: 3,
          donationCount: 1,
          latestDonationAt: '2026-10-03',
          amountHidden: false,
        },
      ],
      total: 3,
      totalRaisedUsd: 20,
      nextCursor: null,
    }));
  vi.stubGlobal('fetch', fetcher);
  let latest: ReturnType<typeof useSupportersLeaderboard>;
  function Supporters() {
    latest = useSupportersLeaderboard(20);
    return null;
  }
  await act(async () => root.render(createElement(Supporters)));
  expect(latest!.items.map(item => item.display_name)).toEqual(['A']);
  expect(latest!.hasMore).toBe(true);
  await act(async () => { await latest!.loadMore(); });
  expect(latest!.items.map(item => item.display_name)).toEqual(['A', 'B']);
  expect(latest!.hasMore).toBe(false);
  expect(fetcher.mock.calls[1][0]).toBe('/api/donations/leaderboard?limit=20&cursor=next');
});

it('renders blog cards when a newly published post has NULL views', async () => {
  const post = {
    id: 'new-post', title: 'New post', slug: 'new-post', excerpt: 'Summary',
    content_format: 'html', category: 'News', tags: [], status: 'published',
    is_pinned: false, views: null, created_at: '2026-10-25', updated_at: '2026-10-25',
    reading_minutes: 1,
  } as unknown as BlogPostSummary;
  await act(async () => root.render(createElement(BlogCard, { post, onClick: () => {} })));
  expect(container.textContent).toContain('New post');
  expect(container.textContent).not.toContain('null');
});

it('reuses blog lists across filters and invalidates browser content after an admin save', async () => {
  const fetcher = vi.fn(async (url: string) => response(url === '/api/blog' ? [{ id: 'post', title: 'News', category: 'News', readingMinutes: 3 }] : { id: 'a' }));
  vi.stubGlobal('fetch', fetcher);
  function Posts({ category }: { category: string }) { const p = useBlogPosts({ category }); return createElement('span', null, p.posts[0]?.reading_minutes); }
  await act(async () => root.render(createElement(Posts, { category: 'All' })));
  await act(async () => root.render(createElement(Posts, { category: 'News' })));
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(container.textContent).toBe('3');
  CacheManager.set('app_details_a', { moderatorNote: 'old' });
  await act(async () => repositoryNotesApi.save('apps', 'a', 'new', 'info'));
  expect(CacheManager.get('app_details_a')).toBeNull();
  expect(fetcher.mock.calls.filter(c => c[0] === '/api/blog')).toHaveLength(2);
});
