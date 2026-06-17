import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { BlogPostData } from '../types/data';

interface UseBlogPostOptions {
    incrementView?: boolean;
    requirePublished?: boolean;
}

export function useBlogPost(idOrSlug: string | undefined, options: UseBlogPostOptions = {}) {
    const [post, setPost] = useState<BlogPostData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        let isMounted = true;

        async function fetchPost() {
            if (!idOrSlug) {
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                // Determine if it's a UUID
                const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
                
                let query = supabase.from('blog_posts').select('*');

                if (isUuid) {
                    query = query.or(`id.eq.${idOrSlug},slug.eq.${idOrSlug}`);
                } else {
                    query = query.eq('slug', idOrSlug);
                }

                if (options.requirePublished) {
                    query = query.eq('status', 'published');
                }

                const { data, error: err } = await query.limit(1);

                if (err) throw err;

                if (isMounted) {
                    if (data && data.length > 0) {
                        const postData = data[0] as unknown as BlogPostData;
                        setPost(postData);
                        
                        // Increment view count via RPC if requested
                        if (options.incrementView) {
                            // Run asynchronously in background, no need to await or handle error strictly
                            (async () => {
                                try {
                                    await supabase.rpc('increment_blog_view', { blog_id: postData.id });
                                } catch (e) {
                                    console.warn('Failed to increment view count:', e);
                                }
                            })();
                        }
                    } else {
                        setPost(null);
                    }
                }
            } catch (err: any) {
                console.error('Failed to fetch blog post:', err);
                if (isMounted) setError(err);
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
