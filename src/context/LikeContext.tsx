import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { getDeviceFingerprint } from '../utils/deviceFingerprint';
import { voteStorage, type VoteRegistry } from '../utils/voteStorage';

export interface LikeData {
    count: number;
    loved: boolean;
}

interface LikeContextValue {
    /** Get like data for an item */
    getLikeData: (itemId: string) => LikeData;
    /** Toggle like for an item. Returns the server-confirmed state. */
    toggleLike: (itemId: string, itemType?: string) => Promise<void>;
    /** Whether the initial bulk fetch is still loading */
    loading: boolean;
}

const LikeContext = createContext<LikeContextValue | null>(null);

export function useLikes(): LikeContextValue {
    const ctx = useContext(LikeContext);
    if (!ctx) throw new Error('useLikes must be used within a LikeProvider');
    return ctx;
}

export function LikeProvider({ children }: { children: React.ReactNode }) {
    const [registry, setRegistry] = useState<VoteRegistry>(() => voteStorage.get());
    const [loading, setLoading] = useState(true);
    const fingerprintRef = useRef<string | null>(null);
    const toggleLockRef = useRef<Set<string>>(new Set());
    const registryRef = useRef<VoteRegistry>(registry);
    useEffect(() => { registryRef.current = registry; }, [registry]);

    useEffect(() => {
        const init = async () => {
            try {
                const { fingerprint } = await getDeviceFingerprint();
                fingerprintRef.current = fingerprint;

                const res = await fetch(
                    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/like?fingerprint=${fingerprint}`,
                    {
                        headers: {
                            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                        },
                    }
                );

                if (res.ok) {
                    const data: VoteRegistry = await res.json();
                    setRegistry(data);
                    voteStorage.set(data);
                }
            } catch (error) {
                console.error('Failed to fetch like registry:', error);
            } finally {
                setLoading(false);
            }
        };

        init();
    }, []);

    const getLikeData = useCallback(
        (itemId: string): LikeData => {
            const entry = registry[itemId];
            if (entry) {
                return { count: entry.count, loved: entry.loved };
            }
            return { count: 0, loved: false };
        },
        [registry]
    );

    const toggleLike = useCallback(
        async (itemId: string, itemType: string = 'app') => {
            if (toggleLockRef.current.has(itemId)) return;
            toggleLockRef.current.add(itemId);

            const current = registryRef.current[itemId] || { count: 0, loved: false };
            const newLoved = !current.loved;
            const optimisticCount = newLoved
                ? current.count + 1
                : Math.max(0, current.count - 1);

            setRegistry(prev => {
                const updated = { ...prev, [itemId]: { count: optimisticCount, loved: newLoved } };
                voteStorage.set(updated);
                return updated;
            });

            try {
                if (!fingerprintRef.current) {
                    const { fingerprint } = await getDeviceFingerprint();
                    fingerprintRef.current = fingerprint;
                }

                const res = await fetch(
                    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/like`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                        },
                        body: JSON.stringify({
                            itemId,
                            itemType,
                            fingerprint: fingerprintRef.current,
                        }),
                    }
                );

                if (!res.ok) throw new Error('Like request failed');

                const data = await res.json();

                const serverCount = typeof data.count === 'number' ? data.count : optimisticCount;
                const serverLoved = typeof data.loved === 'boolean' ? data.loved : newLoved;

                setRegistry(prev => {
                    const updated = { ...prev, [itemId]: { count: serverCount, loved: serverLoved } };
                    voteStorage.set(updated);
                    return updated;
                });
            } catch (err) {
                setRegistry(prev => {
                    const rolledBack = { ...prev, [itemId]: current };
                    voteStorage.set(rolledBack);
                    return rolledBack;
                });
                console.error('Like toggle failed:', err);
            } finally {
                toggleLockRef.current.delete(itemId);
            }
        },
        []
    );

    return (
        <LikeContext.Provider value={{ getLikeData, toggleLike, loading }}>
            {children}
        </LikeContext.Provider>
    );
}

