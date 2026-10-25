import { useCallback, useEffect, useState } from 'react';
import { donationsApi } from '@/services/api';
import type {
  SupporterLeaderboardItem,
  SupporterLeaderboardPage,
  SupporterLeaderboardTopItem,
} from '@/types/donations';
import { useDataCache } from './useDataCache';

const CACHE_TTL = 60_000;

/** Top three + first recent page, then cursor-paginated recent supporters. */
export function useSupportersLeaderboard(limit = 20) {
  const { data, loading, error, refetch } = useDataCache<SupporterLeaderboardPage>(
    `supporters_leaderboard_v3:${limit}`,
    () => donationsApi.leaderboard({ limit }),
    { ttl: CACHE_TTL, refreshOnExpiry: true },
  );
  const [extra, setExtra] = useState<SupporterLeaderboardItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(data?.next_cursor ?? null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState<Error | null>(null);

  useEffect(() => {
    setExtra([]);
    setNextCursor(data?.next_cursor ?? null);
    setMoreError(null);
  }, [data]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    setMoreError(null);
    try {
      const page = await donationsApi.leaderboard({ limit, cursor: nextCursor });
      setExtra(previous => {
        const seen = new Set(previous.map(item => item.key));
        return [...previous, ...page.items.filter(item => !seen.has(item.key))];
      });
      setNextCursor(page.next_cursor);
    } catch (err) {
      setMoreError(err instanceof Error ? err : new Error('Failed to load more supporters'));
    } finally {
      setLoadingMore(false);
    }
  }, [limit, nextCursor, loadingMore]);

  const firstPageItems = data?.items ?? [];
  const firstPageKeys = new Set(firstPageItems.map(item => item.key));
  const items = [
    ...firstPageItems,
    ...extra.filter(item => !firstPageKeys.has(item.key)),
  ];

  return {
    top: (data?.top ?? []) as SupporterLeaderboardTopItem[],
    items,
    total: data?.total ?? 0,
    totalRaisedUsd: data?.total_raised_usd ?? null,
    hasMore: nextCursor !== null,
    loading,
    loadingMore,
    error,
    moreError,
    loadMore,
    refetch,
  };
}
