import { useDataCache } from './useDataCache';
import { settingsApi } from '@/services/api';

export function usePublicSettings() {
  const { data, loading, error, refetch } = useDataCache<Record<string, any>>(
    'public_settings',
    () => settingsApi.public(),
    { ttl: 1000 * 60 }, // Settings can change from the admin panel; keep the TTL short.
  );

  return { settings: data, loading, error, refetch };
}
