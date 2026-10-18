export interface CacheItem<T> {
    data: T;
    timestamp: number;
    version: string;
}

const CACHE_VERSION = 'v1';
const DEFAULT_TTL = 1000 * 60 * 60;

export class CacheManager {
    static set<T>(key: string, data: T): void {
        try {
            const item: CacheItem<T> = {
                data,
                timestamp: Date.now(),
                version: CACHE_VERSION,
            };
            localStorage.setItem(key, JSON.stringify(item));
        } catch (error) {
            console.warn('Failed to save to cache:', error);
        }
    }

    static get<T>(key: string, ttl: number = DEFAULT_TTL): T | null {
        try {
            const stored = localStorage.getItem(key);
            if (!stored) return null;

            const item: CacheItem<T> = JSON.parse(stored);

            if (item.version !== CACHE_VERSION) {
                localStorage.removeItem(key);
                return null;
            }

            if (!Number.isFinite(item.timestamp) || Date.now() - item.timestamp >= ttl) {
                localStorage.removeItem(key);
                return null;
            }

            return item.data;
        } catch (error) {
            return null;
        }
    }

    static getWithMetadata<T>(key: string): CacheItem<T> | null {
        try {
            const stored = localStorage.getItem(key);
            if (!stored) return null;

            const item: CacheItem<T> = JSON.parse(stored);

            if (item.version !== CACHE_VERSION) {
                localStorage.removeItem(key);
                return null;
            }
            return item;
        } catch (error) {
            return null;
        }
    }
}
