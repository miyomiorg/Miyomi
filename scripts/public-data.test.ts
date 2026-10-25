// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { EntryNotice } from '../src/components/EntryNotice';
import { useDonations } from '../src/hooks/useDonations';
import { useBlogPost } from '../src/hooks/useBlogPost';
import { useBlogPosts } from '../src/hooks/useBlogPosts';
import { useGlobalSearch } from '../src/hooks/useGlobalSearch';
import { repositoryNotesApi } from '../src/services/api';
import { CacheManager } from '../src/utils/cache';

let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear();
  container = document.createElement('div'); document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals(); vi.restoreAllMocks();
});
const response = (data: unknown, status = 200) => new Response(JSON.stringify(status === 200 ? { success: true, data } : { success: false, error: 'Temporary error' }), { status });

it('does not fetch search directories until a search is entered', async () => {
  const fetcher = vi.fn(async () => response([]));
  vi.stubGlobal('fetch', fetcher);
  function Search({ query }: { query: string }) { useGlobalSearch(query); return null; }
  await act(async () => root.render(createElement(Search, { query: '' })));
  expect(fetcher).not.toHaveBeenCalled();
  await act(async () => root.render(createElement(Search, { query: 'manga' })));
  expect(fetcher).toHaveBeenCalledTimes(3);
  await act(async () => root.render(createElement(Search, { query: 'anime' })));
  expect(fetcher).toHaveBeenCalledTimes(3);
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

it('loads every donor page through the real adapter and computes the full goal total', async () => {
  const rows = Array.from({ length: 205 }, (_, id) => ({ id: String(id), donorName: `Donor ${id}`, amount: 2, currency: 'USD', isPublic: true, showAmount: true }));
  const fetcher = vi.fn(async (url: string) => {
    if (url === '/api/donation-settings') return response([{ key: 'goal', value: { autoCalc: true, currentAmount: 999 } }]);
    const offset = Number(new URL(url, 'https://test.invalid').searchParams.get('offset'));
    return response(rows.slice(offset, offset + 200));
  });
  vi.stubGlobal('fetch', fetcher);
  function Donors() { const data = useDonations(); return createElement('span', null, `${data.donators.length}:${data.goal.currentAmount}:${data.donators[0]?.name}`); }
  await act(async () => root.render(createElement(Donors)));
  expect(container.textContent).toBe('205:410:Donor 0');
  expect(fetcher.mock.calls.map(c => c[0])).toContain('/api/donations?limit=200&offset=200');
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

it('resets an auto-calculated donation goal when there are no public donors', async () => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => response(url.endsWith('donation-settings')
    ? [{ key: 'goal', value: { autoCalc: true, currentAmount: 999 } }] : [])));
  function Donors() { const data = useDonations(); return createElement('span', null, data.goal.currentAmount); }
  await act(async () => root.render(createElement(Donors)));
  expect(container.textContent).toBe('0');
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
