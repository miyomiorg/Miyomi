// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { SupportersLeaderboard } from '../src/components/supporters/SupportersLeaderboard';
import { formatRelativeDonationDate } from '../src/components/supporters/supporterUtils';
import type {
  SupporterLeaderboardItem,
  SupporterLeaderboardTopItem,
} from '../src/types/donations';

let root: Root;
let container: HTMLDivElement;

const topItems: SupporterLeaderboardTopItem[] = [
  { key: 'name:alice', rank: 1, display_name: 'Alice', total_usd: 120, donation_count: 2, latest_donation_at: '2026-10-01', amount_hidden: false },
  { key: 'name:bob', rank: 2, display_name: 'Bob', total_usd: 80, donation_count: 1, latest_donation_at: '2026-09-20', amount_hidden: false },
  { key: 'name:carol', rank: 3, display_name: 'Carol', total_usd: 40, donation_count: 3, latest_donation_at: '2026-09-01', amount_hidden: false },
];

const recentItems: SupporterLeaderboardItem[] = [
  { key: 'name:dave', rank: null, display_name: 'Dave', total_usd: 20, donation_count: 1, latest_donation_at: '2026-10-10', amount_hidden: false },
  { key: 'name:eve', rank: null, display_name: 'Eve', total_usd: 10, donation_count: 1, latest_donation_at: '2026-10-05', amount_hidden: true },
  { key: 'name:frank', rank: null, display_name: 'Frank', total_usd: 5, donation_count: 1, latest_donation_at: '2026-09-01', amount_hidden: false },
];

beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear();
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it('formats relative donation dates and invalid dates', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-25T12:00:00Z'));
  expect(formatRelativeDonationDate('2026-10-21')).toBe('4d ago');
  expect(formatRelativeDonationDate('2026-10-11')).toBe('2w ago');
  expect(formatRelativeDonationDate('2026-09-20')).toBe('1mo ago');
  expect(formatRelativeDonationDate('2025-10-20')).toBe('1y ago');
  expect(formatRelativeDonationDate('not-a-date')).toBe('Date unavailable');
  expect(formatRelativeDonationDate(null)).toBe('Date unavailable');
  vi.useRealTimers();
});

it('renders the top-three podium, recent supporters, and an inline load-more button', async () => {
  const onLoadMore = vi.fn();
  await act(async () => root.render(createElement(SupportersLeaderboard, {
    top: topItems,
    items: recentItems,
    total: 10,
    loading: false,
    loadingMore: false,
    error: null,
    moreError: null,
    hasMore: true,
    onLoadMore,
    onRetry: () => {},
    showAmounts: true,
  })));

  expect(container.textContent).toContain('Top Supporters');
  expect(container.textContent).toContain('Top 3 by lifetime support');
  expect(container.querySelector('[aria-label="Gold rank"]')).not.toBeNull();
  expect(container.querySelector('[aria-label="Silver rank"]')).not.toBeNull();
  expect(container.querySelector('[aria-label="Bronze rank"]')).not.toBeNull();
  expect(container.textContent).toContain('$120.00');
  expect(container.textContent).toContain('Private');
  expect(container.textContent).toContain('Dave');
  expect(container.textContent).toContain('Frank');
  expect(container.querySelector('[aria-label="Rank 4"]')).toBeNull();
  expect(Array.from(container.querySelectorAll('button')).some(button => button.textContent?.includes('View all'))).toBe(false);
  expect(container.textContent).not.toContain('All Supporters');

  const loadMore = Array.from(container.querySelectorAll('button')).find(button => button.textContent?.includes('Load more supporters'));
  expect(loadMore).toBeTruthy();
  await act(async () => { loadMore!.click(); });
  expect(onLoadMore).toHaveBeenCalledTimes(1);
});

it('shows loading and retry states for pagination', async () => {
  const onLoadMore = vi.fn();
  await act(async () => root.render(createElement(SupportersLeaderboard, {
    top: topItems,
    items: recentItems,
    total: 10,
    loading: false,
    loadingMore: true,
    error: null,
    moreError: new Error('offline'),
    hasMore: true,
    onLoadMore,
    onRetry: () => {},
    showAmounts: true,
  })));

  expect(container.textContent).toContain('Couldn’t load more supporters.');
  const loadingButton = Array.from(container.querySelectorAll('button')).find(button => button.textContent?.includes('Loading…'));
  expect(loadingButton).toBeTruthy();
  expect((loadingButton as HTMLButtonElement).disabled).toBe(true);
  const retry = Array.from(container.querySelectorAll('button')).find(button => button.textContent?.includes('Try again'));
  expect(retry).toBeTruthy();
  await act(async () => { retry!.click(); });
  expect(onLoadMore).toHaveBeenCalledTimes(1);
});
