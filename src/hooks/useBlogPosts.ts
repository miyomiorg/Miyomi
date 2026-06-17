import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { BlogPostData } from '../types/data';

interface UseBlogPostsOptions {
    category?: string;
    tag?: string;
    pinned?: boolean;
    limit?: number;
    requirePublished?: boolean; // True for public, False for admin
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
                let query = supabase
                    .from('blog_posts')
                    .select('*')
                    .order('is_pinned', { ascending: false })
                    .order('published_at', { ascending: false, nullsFirst: false });

                if (options.requirePublished) {
                    query = query.eq('status', 'published');
                }
                
                if (options.category && options.category !== 'All') {
                    query = query.eq('category', options.category);
                }

                if (options.tag) {
                    query = query.contains('tags', [options.tag]);
                }

                if (options.pinned !== undefined) {
                    query = query.eq('is_pinned', options.pinned);
                }

                if (options.limit) {
                    query = query.limit(options.limit);
                }

                const { data, error: err } = await query;

                if (err) throw err;

                if (isMounted && data) {
                    // Type assertion since we know the table structure matches BlogPostData
                    setPosts(data as unknown as BlogPostData[]);
                }
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
