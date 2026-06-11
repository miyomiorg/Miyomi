import { useState, useEffect } from 'react';

const CACHE_NAME = 'miyomi-image-cache-v1';

export function useCachedImage(url?: string | null): string | undefined {
    const [cachedUrl, setCachedUrl] = useState<string | undefined>(undefined);

    useEffect(() => {
        let isMounted = true;
        let blobUrl: string | undefined;

        const loadCachedImage = async () => {
            if (!url) {
                setCachedUrl(undefined);
                return;
            }

            try {
                const cache = await caches.open(CACHE_NAME);
                let response = await cache.match(url);

                if (!response) {
                    // Try to fetch it with CORS to ensure we don't pollute the cache with opaque responses
                    // that use huge amounts of quota.
                    try {
                        response = await fetch(url, { mode: 'cors' });
                        if (response.ok) {
                            await cache.put(url, response.clone());
                        }
                    } catch (fetchErr) {
                        // If CORS fails, fallback to just returning the standard URL
                        if (isMounted) setCachedUrl(url);
                        return;
                    }
                }

                if (response && response.ok) {
                    const blob = await response.blob();
                    blobUrl = URL.createObjectURL(blob);
                    if (isMounted) setCachedUrl(blobUrl);
                } else {
                    if (isMounted) setCachedUrl(url);
                }
            } catch (err) {
                console.warn('Image cache error:', err);
                if (isMounted) setCachedUrl(url);
            }
        };

        loadCachedImage();

        return () => {
            isMounted = false;
            if (blobUrl) {
                URL.revokeObjectURL(blobUrl);
            }
        };
    }, [url]);

    // Return the original url immediately so we don't show a blank space while checking the cache
    // unless we actually have the cached blobUrl ready.
    return cachedUrl || (url ? url : undefined);
}
