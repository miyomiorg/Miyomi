export interface CacheItem<T> {
    data: T;
    timestamp: number;
    version: string;
}

if (typeof window !== 'undefined') window.addEventListener('storage', event => {
    if (event.key === CACHE_REVISION_KEY) {
        CacheManager.revision++;
        window.dispatchEvent(new Event(CACHE_INVALIDATED));
    }
});

const CACHE_VERSION = 'v1';
const DEFAULT_TTL = 1000 * 60 * 60;
const PREFIX = 'miyomi-data:';
export const CACHE_INVALIDATED = 'miyomi-data-invalidated';
export const CACHE_REVISION_KEY = 'miyomi-data-revision';

export class CacheManager {
    static revision = 0;

    static invalidate(): void {
        CacheManager.revision++;
        try {
            for (const key of Object.keys(localStorage)) if (key.startsWith(PREFIX)) localStorage.removeItem(key);
            localStorage.setItem(CACHE_REVISION_KEY, String(Date.now()) + ':' + CacheManager.revision);
        } catch { /* In-memory consumers still refresh when storage is unavailable. */ }
        window.dispatchEvent(new Event(CACHE_INVALIDATED));
    }

    static set<T>(key: string, data: T): void {
        try {
            const item: CacheItem<T> = {
                data,
                timestamp: Date.now(),
                version: CACHE_VERSION,
            };
            localStorage.setItem(PREFIX + key, JSON.stringify(item));
        } catch (error) {
            console.warn('Failed to save to cache:', error);
        }
    }

    static get<T>(key: string, ttl: number = DEFAULT_TTL): T | null {
        try {
            const stored = localStorage.getItem(PREFIX + key);
            if (!stored) return null;

            const item: CacheItem<T> = JSON.parse(stored);

            if (item.version !== CACHE_VERSION) {
                localStorage.removeItem(PREFIX + key);
                return null;
            }

            if (!Number.isFinite(item.timestamp) || Date.now() - item.timestamp >= ttl) {
                localStorage.removeItem(PREFIX + key);
                return null;
            }

            return item.data;
        } catch (error) {
            return null;
        }
    }

    static getWithMetadata<T>(key: string): CacheItem<T> | null {
        try {
            const stored = localStorage.getItem(PREFIX + key);
            if (!stored) return null;

            const item: CacheItem<T> = JSON.parse(stored);

            if (item.version !== CACHE_VERSION) {
                localStorage.removeItem(PREFIX + key);
                return null;
            }
            return item;
        } catch (error) {
            return null;
        }
    }
}
