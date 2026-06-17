import { useState, useEffect, useRef } from 'react';
import { CacheManager } from '../utils/cache';

interface CacheOptions {
    ttl?: number;
    initialData?: any;
}

export function useDataCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
) {
    const { ttl } = options;
    const isMounted = useRef(true);

    // 1. Initialize state from cache or initialData
    const [data, setData] = useState<T | null>(() => {
        // Check cache first (Instant Load)
        if (typeof window !== 'undefined') {
            const cached = CacheManager.get<T>(key, ttl);
            if (cached) return cached;
        }
        return options.initialData || null;
    });

    const [loading, setLoading] = useState(!data);
    const [error, setError] = useState<Error | null>(null);

    const fetchData = async () => {
        // If we don't have data, show loading state
        if (!data) setLoading(true);
        setError(null);

        try {
            const freshData = await fetcher();

            if (isMounted.current) {
                const isChanged = JSON.stringify(freshData) !== JSON.stringify(data);

                if (isChanged || !data) {
                    setData(freshData);
                    CacheManager.set(key, freshData);
                }
            }
        } catch (err) {
            if (isMounted.current) {
                console.error(`Cache fetch failed for ${key}:`, err);
                setError(err instanceof Error ? err : new Error('Unknown error'));
            }
        } finally {
            if (isMounted.current) {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        isMounted.current = true;
        fetchData();

        return () => {
            isMounted.current = false;
        };
    }, [key]); // Re-fetch when key changes

    return { data, loading, error, refetch: fetchData };
}
