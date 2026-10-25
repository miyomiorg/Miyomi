import { useDataCache } from './useDataCache';
import { noticesApi } from '@/services/api';
import type { Tables } from '@/types/db';

export function useNotices() {
  // Reuse the existing content cache. Refresh expired data on return/focus and
  // invalidate after admin saves, without adding a polling loop.
  const { data, loading } = useDataCache<Tables<'notices'>[]>(
    'public_notices', () => noticesApi.list(), { ttl: 60_000 },
  );
  return { notices: data || [], loading };
}
