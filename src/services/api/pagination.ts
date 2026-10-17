import type { Page } from './types';

/** Follow server pagination rather than relying on an oversized limit. */
export async function collectPages<T>(fetchPage: (params: { limit: number; offset: number }) => Promise<Page<T>>): Promise<T[]> {
  const rows: T[] = [];
  while (true) {
    const page = await fetchPage({ limit: 200, offset: rows.length });
    rows.push(...page.items);
    if (rows.length >= page.total) return rows;
    if (page.items.length === 0) throw new Error('Incomplete list response');
  }
}
