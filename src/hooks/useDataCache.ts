import { useState, useEffect, useRef, useCallback } from 'react';
import { CacheManager, CACHE_INVALIDATED } from '../utils/cache';

interface CacheOptions<T> {
    ttl?: number;
    initialData?: T;
    refreshOnExpiry?: boolean;
    /** Skip fetching until the consumer actually needs the data. */
    enabled?: boolean;
}

// Share simultaneous mounts (including StrictMode's effect replay).
const pending = new Map<string, Promise<unknown>>();

export function useDataCache<T>(key: string, fetcher: () => Promise<T>, options: CacheOptions<T> = {}) {
    const { ttl, refreshOnExpiry = false, enabled = true } = options;
    const fetcherRef = useRef(fetcher);
    fetcherRef.current = fetcher;
    const generation = useRef(0);
    const [state, setState] = useState(() => {
        const data = CacheManager.get<T>(key, ttl) ?? options.initialData ?? null;
        return { key, data, loading: enabled && data === null, error: null as Error | null };
    });

    const fetchData = useCallback(async () => {
        const current = ++generation.current;
        setState(s => ({ key, data: s.key === key ? s.data : null, loading: s.key !== key || s.data === null, error: null }));
        try {
            const revision = CacheManager.revision;
            const pendingKey = `${revision}:${key}`;
            let task = pending.get(pendingKey) as Promise<T> | undefined;
            if (!task) {
                const load = fetcherRef.current;
                task = Promise.resolve().then(load).then(data => {
                    // Refresh the timestamp even when the response is unchanged.
                    if (revision === CacheManager.revision) CacheManager.set(key, data);
                    return data;
                }).finally(() => pending.delete(pendingKey));
                pending.set(pendingKey, task);
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
        if (!enabled) return;
        const cached = CacheManager.get<T>(key, ttl);
        if (cached !== null) {
            setState({ key, data: cached, loading: false, error: null });
        } else {
            void fetchData();
        }
        // Prevent late responses for a previous key/unmounted hook from winning.
        return () => { generation.current++; };
    }, [key, ttl, fetchData, enabled]);

    useEffect(() => {
        if (!enabled) return;
        const refresh = () => { void fetchData(); };
        const check = () => {
            if (document.visibilityState !== 'hidden' && CacheManager.get(key, ttl) === null) refresh();
        };
        window.addEventListener(CACHE_INVALIDATED, refresh);
        window.addEventListener('focus', check);
        document.addEventListener('visibilitychange', check);
        const timer = refreshOnExpiry && ttl ? window.setInterval(check, ttl) : undefined;
        return () => {
            window.removeEventListener(CACHE_INVALIDATED, refresh);
            window.removeEventListener('focus', check);
            document.removeEventListener('visibilitychange', check);
            window.clearInterval(timer);
        };
    }, [key, ttl, refreshOnExpiry, fetchData, enabled]);

    return {
        data: state.key === key ? state.data : null,
        loading: enabled && (state.key !== key || state.loading),
        error: state.key === key ? state.error : null,
        refetch: fetchData,
    };
}
