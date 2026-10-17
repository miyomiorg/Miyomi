import { useState, useEffect, useCallback } from 'react';
import {
  adminAppsApi,
  adminExtensionsApi,
  adminGuidesApi,
  adminBlogApi,
  adminFaqsApi,
  adminLikesApi,
} from '@/services/api';
import type { Tables } from '@/types/db';
import { collectPages } from '@/services/api/pagination';

// Global cache store
const cache = new Map<string, { data: any[]; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface CacheOptions {
  table: 'apps' | 'extensions' | 'guides' | 'faqs' | 'likes' | 'blog_posts';
  orderBy?: string;
  forceRefresh?: boolean;
}

/** Fetch all rows for a table (admin list pages filter client-side). */
async function fetchAll(table: CacheOptions['table']): Promise<any[]> {
  switch (table) {
    case 'apps': {
      return collectPages(adminAppsApi.list);
    }
    case 'extensions': {
      return collectPages(adminExtensionsApi.list);
    }
    case 'guides': {
      return collectPages(adminGuidesApi.list);
    }
    case 'blog_posts': {
      return collectPages(adminBlogApi.list);
    }
    case 'faqs':
      return adminFaqsApi.list();
    case 'likes': {
      return collectPages(adminLikesApi.list);
    }
    default:
      return [];
  }
}

/**
 * Admin data caching hook - provides instant data loading from cache
 * and automatic cache invalidation on mutations.
 */
export function useAdminCache<T extends Tables<any>>(options: CacheOptions) {
  const { table, orderBy = 'name', forceRefresh = false } = options;
  const cacheKey = `${table}:${orderBy}`;

  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async (skipCache = false) => {
    // Check cache first unless skipCache is true
    if (!skipCache && !forceRefresh) {
      const cached = cache.get(cacheKey);
      const now = Date.now();

      if (cached && (now - cached.timestamp) < CACHE_DURATION) {
        setData(cached.data);
        setLoading(false);
        return cached.data;
      }
    }

    setLoading(true);
    try {
      const freshData = await fetchAll(table);

      // Sort client-side to preserve the original `.order(orderBy)` behaviour
      const sorted = [...freshData].sort((a, b) => {
        const av = a?.[orderBy];
        const bv = b?.[orderBy];
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        if (typeof av === 'number' && typeof bv === 'number') return av - bv;
        return String(av).localeCompare(String(bv));
      });

      cache.set(cacheKey, { data: sorted, timestamp: Date.now() });
      setData(sorted as T[]);
      return sorted;
    } catch (error) {
      console.error(`Failed to fetch ${table}:`, error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [table, orderBy, cacheKey, forceRefresh]);

  // Initial load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Invalidate cache for this table (call after create/update/delete)
  const invalidateCache = useCallback(() => {
    cache.delete(cacheKey);
    return fetchData(true); // Force refetch
  }, [cacheKey, fetchData]);

  // Optimistic update - update cache immediately without refetch
  const updateCacheOptimistically = useCallback((updater: (current: T[]) => T[]) => {
    setData(updater);
    const cached = cache.get(cacheKey);
    if (cached) {
      cache.set(cacheKey, { data: updater(cached.data), timestamp: cached.timestamp });
    }
  }, [cacheKey]);

  return {
    data,
    loading,
    refetch: fetchData,
    invalidateCache,
    updateCacheOptimistically,
  };
}

// Global cache invalidation for all tables (use when bulk changes happen)
export function invalidateAllAdminCaches() {
  cache.clear();
}

// Invalidate specific table cache from anywhere
export function invalidateTableCache(table: string) {
  for (const key of cache.keys()) {
    if (key.startsWith(`${table}:`)) {
      cache.delete(key);
    }
  }
}
