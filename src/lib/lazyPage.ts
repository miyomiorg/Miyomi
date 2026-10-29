import { lazy, type ComponentType } from 'react';

const RELOAD_FLAG = 'miyomi-chunk-reload';

/**
 * After a deploy, an open tab may request a chunk hash that no longer
 * exists. Reload once to pick up the new index.html instead of showing a
 * broken page; the flag prevents a reload loop if the failure is real.
 */
async function loadWithReload<M>(load: () => Promise<M>): Promise<M> {
  try {
    const mod = await load();
    try { sessionStorage.removeItem(RELOAD_FLAG); } catch { /* optional */ }
    return mod;
  } catch (error) {
    let alreadyReloaded = false;
    try {
      alreadyReloaded = sessionStorage.getItem(RELOAD_FLAG) === '1';
      if (!alreadyReloaded) sessionStorage.setItem(RELOAD_FLAG, '1');
    } catch { /* storage unavailable: still try one reload */ }
    if (!alreadyReloaded) {
      window.location.reload();
      return new Promise<M>(() => {});
    }
    throw error;
  }
}

/**
 * React.lazy for a NAMED export: `lazyPage(() => import('./pages/X'), 'X')`.
 * Keeps the component's prop types.
 */
export function lazyPage<M, K extends keyof M>(load: () => Promise<M>, name: K) {
  return lazy(async () => {
    const mod = await loadWithReload(load);
    return { default: mod[name] as M[K] & ComponentType<any> };
  });
}

/** Warm the cache for likely-next pages when the browser is idle. */
export function prefetchWhenIdle(loaders: Array<() => Promise<unknown>>) {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType ?? '')) return;
  const run = () => loaders.forEach((load) => load().catch(() => {}));
  const idle = (window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback;
  if (idle) idle(run, { timeout: 4000 });
  else window.setTimeout(run, 2500);
}
