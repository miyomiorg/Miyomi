import { useDataCache } from './useDataCache';
import { blogApi } from '@/services/api';
import type { BlogPostSummary } from '../types/data';

interface UseBlogPostsOptions {
  category?: string;
  tag?: string;
  pinned?: boolean;
  limit?: number;
  requirePublished?: boolean;
}

export function useBlogPosts(options: UseBlogPostsOptions = {}) {
  // Filters operate on the same public list; changing categories or mounting
  // related-post cards should not download the entire list again.
  const { data, loading, error, refetch } = useDataCache<BlogPostSummary[]>(
    'blog_list', () => blogApi.list() as unknown as Promise<BlogPostSummary[]>, { ttl: 60_000 },
  );
  let posts = data || [];
  if (options.category && options.category !== 'All') posts = posts.filter(p => p.category === options.category);
  if (options.tag) posts = posts.filter(p => (p.tags || []).includes(options.tag!));
  if (options.pinned !== undefined) posts = posts.filter(p => p.is_pinned === options.pinned);
  if (options.limit) posts = posts.slice(0, options.limit);
  return { posts, loading, error, refetch };
}
