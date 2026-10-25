import { useDataCache } from './useDataCache';
import { dataService } from '@/services/dataService';
import type { GuideCategoryData } from '../types/data';

export function useGuideCategories() {
  const { data, loading, error, refetch } = useDataCache<GuideCategoryData[]>(
    'guide_categories_v1',
    () => dataService.getGuideCategories(),
    { ttl: 1000 * 60 * 5 }, // 5 minutes fresh, matching the app directory.
  );

  return { categories: data || [], loading, error, refetch };
}
