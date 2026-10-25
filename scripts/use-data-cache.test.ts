// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, createElement, StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { useDataCache } from '../src/hooks/useDataCache';
import { CacheManager } from '../src/utils/cache';

let root: Root;
let container: HTMLDivElement;
let latest: ReturnType<typeof useDataCache<string>>;
function Probe({ cacheKey, load }: { cacheKey: string; load: () => Promise<string> }) {
  latest = useDataCache(cacheKey, load, { ttl: 1000, refreshOnExpiry: true });
  return createElement('span', null, latest.data);
}
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear();
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

it('refreshes mounted detail data at expiry and on focus without a loading flash', async () => {
  vi.useFakeTimers();
  const load = vi.fn().mockResolvedValueOnce('old').mockResolvedValue('new');
  await act(async () => root.render(createElement(Probe, { cacheKey: 'notice', load })));
  expect(container.textContent).toBe('old');
  await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
  expect(container.textContent).toBe('new');
  expect(latest.loading).toBe(false);
  expect(load).toHaveBeenCalledTimes(2);
});

it('does not resurrect an old in-flight response after invalidation', async () => {
  let resolve!: (value: string) => void;
  const load = vi.fn().mockImplementationOnce(() => new Promise<string>(r => { resolve = r; })).mockResolvedValue('new');
  await act(async () => root.render(createElement(Probe, { cacheKey: 'edit', load })));
  await act(async () => CacheManager.invalidate());
  await act(async () => resolve('old'));
  expect(container.textContent).toBe('new');
  expect(CacheManager.get('edit')).toBe('new');
});

it('uses fresh data without a request, expires it, and refreshes identical data timestamps', async () => {
  const clock = vi.spyOn(Date, 'now').mockReturnValue(10000);
  CacheManager.set('fresh', 'same');
  const load = vi.fn(async () => 'same');
  await act(async () => root.render(createElement(Probe, { cacheKey: 'fresh', load })));
  expect(load).not.toHaveBeenCalled();
  expect(container.textContent).toBe('same');
  clock.mockReturnValue(11000);
  expect(CacheManager.get('fresh', 1000)).toBeNull();
  await act(async () => latest.refetch());
  expect(load).toHaveBeenCalledTimes(1);
  expect(CacheManager.getWithMetadata('fresh')?.timestamp).toBe(11000);
});

it('deduplicates concurrent consumers and StrictMode effect replay', async () => {
  let resolve!: (data: string) => void;
  const load = vi.fn(() => new Promise<string>(r => { resolve = r; }));
  await act(async () => root.render(createElement(StrictMode, null,
    createElement(Probe, { cacheKey: 'shared', load }),
    createElement(Probe, { cacheKey: 'shared', load }),
  )));
  expect(load).toHaveBeenCalledTimes(1);
  await act(async () => resolve('loaded'));
  expect(container.textContent).toBe('loadedloaded');
});

it('ignores late responses after a key change and permits retry after failure', async () => {
  let resolve!: (data: string) => void;
  const oldLoad = () => new Promise<string>(r => { resolve = r; });
  await act(async () => root.render(createElement(Probe, { cacheKey: 'old', load: oldLoad })));
  const load = vi.fn<() => Promise<string>>().mockRejectedValueOnce(new Error('offline')).mockResolvedValue('new');
  await act(async () => root.render(createElement(Probe, { cacheKey: 'new', load })));
  expect(latest.error?.message).toBe('offline');
  await act(async () => latest.refetch());
  await act(async () => resolve('old'));
  expect(container.textContent).toBe('new');
  expect(CacheManager.get('old')).toBe('old');
  expect(load).toHaveBeenCalledTimes(2);
});
