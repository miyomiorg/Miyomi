import { useState, useEffect } from 'react';
import { blogApi } from '@/services/api';
import type { BlogPostData } from '../types/data';

interface UseBlogPostsOptions {
  category?: string;
  tag?: string;
  pinned?: boolean;
  limit?: number;
  requirePublished?: boolean; // public always true (the /api/blog endpoint returns published only)
}

export function useBlogPosts(options: UseBlogPostsOptions = {}) {
  const [posts, setPosts] = useState<BlogPostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchPosts() {
      setLoading(true);
      try {
        const data = await blogApi.list();

        if (!isMounted) return;

        let result = data as unknown as BlogPostData[];

        if (options.category && options.category !== 'All') {
          result = result.filter((p) => p.category === options.category);
        }
        if (options.tag) {
          result = result.filter((p) => (p.tags || []).includes(options.tag!));
        }
        if (options.pinned !== undefined) {
          result = result.filter((p) => p.is_pinned === options.pinned);
        }
        if (options.limit) {
          result = result.slice(0, options.limit);
        }

        setPosts(result);
      } catch (err: any) {
        console.error('Failed to fetch blog posts:', err);
        if (isMounted) setError(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchPosts();

    return () => {
      isMounted = false;
    };
  }, [options.category, options.tag, options.pinned, options.limit, options.requirePublished]);

  return { posts, loading, error };
}
