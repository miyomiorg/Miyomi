export type PerformanceTier = 'high' | 'medium' | 'low';

let cachedTier: PerformanceTier | null = null;

export function getPerformanceTier(): PerformanceTier {
    if (cachedTier) return cachedTier;

    if (typeof window === 'undefined') return 'high';

    try {
        const storedTier = sessionStorage.getItem('miyomi-perf-tier');
        if (storedTier === 'high' || storedTier === 'medium' || storedTier === 'low') {
            cachedTier = storedTier as PerformanceTier;
            return cachedTier;
        }
    } catch (e) {
        // Ignore sessionStorage errors
    }

    // 1. Check for reduced motion preference (accessibility)
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        cachedTier = 'low';
        return cachedTier;
    }

    // 2. Network constraints (data saver)
    // @ts-ignore
    if (navigator.connection && navigator.connection.saveData === true) {
        cachedTier = 'low';
        return cachedTier;
    }

    let score = 0;

    // 3. Hardware concurrency (CPU cores)
    const cores = navigator.hardwareConcurrency || 4;
    if (cores <= 2) score -= 2;
    else if (cores <= 4) score -= 1;
    else score += 1;

    // 4. Device Memory (if available, usually only in Chromium)
    // @ts-ignore
    const memory = navigator.deviceMemory || 4;
    if (memory <= 2) score -= 2;
    else if (memory <= 4) score -= 1;
    else score += 1;

    // 5. Screen size (proxy for old mobile devices)
    const width = window.innerWidth;
    if (width <= 480) score -= 1;
    else if (width > 1024) score += 1;

    // Evaluate tier based on score
    if (score <= -2) cachedTier = 'low';
    else if (score <= 0) cachedTier = 'medium';
    else cachedTier = 'high';

    try {
        sessionStorage.setItem('miyomi-perf-tier', cachedTier);
    } catch (e) {
        // Ignore
    }

    return cachedTier;
}

// Optional: call this once on mount to sample actual FPS and downgrade if needed
export function runFpsBenchmark() {
    if (typeof window === 'undefined' || cachedTier === 'low') return;

    let frames = 0;
    let startTime = performance.now();

    function sample(timestamp: number) {
        frames++;
        const elapsed = timestamp - startTime;
        
        if (elapsed >= 500) { // Sample for 500ms
            const fps = (frames / elapsed) * 1000;
            if (fps < 30) {
                cachedTier = 'low';
                try { sessionStorage.setItem('miyomi-perf-tier', 'low'); } catch (e) {}
            } else if (fps < 45 && cachedTier === 'high') {
                cachedTier = 'medium';
                try { sessionStorage.setItem('miyomi-perf-tier', 'medium'); } catch (e) {}
            }
        } else {
            requestAnimationFrame(sample);
        }
    }

    requestAnimationFrame((timestamp) => {
        startTime = timestamp;
        requestAnimationFrame(sample);
    });
}
