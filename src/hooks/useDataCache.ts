import { useState, useEffect, useRef, useCallback } from 'react';
import { CacheManager } from '../utils/cache';

interface CacheOptions<T> {
    ttl?: number;
    initialData?: T;
}

// Share simultaneous mounts (including StrictMode's effect replay).
const pending = new Map<string, Promise<unknown>>();

export function useDataCache<T>(key: string, fetcher: () => Promise<T>, options: CacheOptions<T> = {}) {
    const { ttl } = options;
    const fetcherRef = useRef(fetcher);
    fetcherRef.current = fetcher;
    const generation = useRef(0);
    const [state, setState] = useState(() => {
        const data = CacheManager.get<T>(key, ttl) ?? options.initialData ?? null;
        return { key, data, loading: data === null, error: null as Error | null };
    });

    const fetchData = useCallback(async () => {
        const current = ++generation.current;
        setState(s => ({ key, data: s.key === key ? s.data : null, loading: true, error: null }));
        try {
            let task = pending.get(key) as Promise<T> | undefined;
            if (!task) {
                const load = fetcherRef.current;
                task = Promise.resolve().then(load).then(data => {
                    // Refresh the timestamp even when the response is unchanged.
                    CacheManager.set(key, data);
                    return data;
                }).finally(() => pending.delete(key));
                pending.set(key, task);
            }
            const data = await task;
            if (current === generation.current) setState({ key, data, loading: false, error: null });
        } catch (err) {
            if (current === generation.current) {
                setState(s => ({ ...s, loading: false, error: err instanceof Error ? err : new Error('Unknown error') }));
            }
        }
    }, [key]);

    useEffect(() => {
        const cached = CacheManager.get<T>(key, ttl);
        if (cached !== null) {
            setState({ key, data: cached, loading: false, error: null });
        } else {
            void fetchData();
        }
        // Prevent late responses for a previous key/unmounted hook from winning.
        return () => { generation.current++; };
    }, [key, ttl, fetchData]);

    return {
        data: state.key === key ? state.data : null,
        loading: state.key !== key || state.loading,
        error: state.key === key ? state.error : null,
        refetch: fetchData,
    };
}
