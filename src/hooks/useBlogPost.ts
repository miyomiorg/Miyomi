import { useState, useEffect } from 'react';
import { blogApi } from '@/services/api';
import { ApiError } from '@/services/api/http';
import type { BlogPostData } from '../types/data';

interface UseBlogPostOptions {
  incrementView?: boolean;
  requirePublished?: boolean;
}

/** Count a view at most once per browser session per post (fire-and-forget). */
function recordViewOnce(postId: string) {
  const key = `miyomi-blog-viewed:${postId}`;
  try {
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
  } catch {
    // Storage unavailable (private mode) — still count the view.
  }
  blogApi.recordView(postId).catch(() => {});
}

export function useBlogPost(idOrSlug: string | undefined, options: UseBlogPostOptions = {}) {
  const [post, setPost] = useState<BlogPostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;
    setError(null);
    setPost(null);

    async function fetchPost() {
      if (!idOrSlug) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const data = await blogApi.get(idOrSlug);

        if (isMounted) {
          setError(null);
          setPost(data as unknown as BlogPostData);
        }
        if (options.incrementView !== false) recordViewOnce(data.id);
      } catch (err: any) {
        if (err instanceof ApiError && err.status === 404) {
          if (isMounted) setPost(null);
        } else {
          console.error('Failed to fetch blog post:', err);
          if (isMounted) setError(err);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchPost();

    return () => {
      isMounted = false;
    };
  }, [idOrSlug, options.requirePublished, options.incrementView]);

  return { post, loading, error };
}
