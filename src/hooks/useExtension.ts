import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ExtensionData } from '../types/data';

export function useExtension(extensionId: string): { extension: ExtensionData | null; loading: boolean } {
    const [extension, setExtension] = useState<ExtensionData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!extensionId) {
            setLoading(false);
            return;
        }

        async function fetchExtension() {
            setLoading(true);
            try {
                const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(extensionId);

                let query = (supabase.from('extensions').select('*') as any).eq('status', 'approved');
                if (isUuid) {
                    query = query.eq('id', extensionId);
                } else {
                    query = query.eq('slug', extensionId);
                }

                const { data, error } = await query.maybeSingle();

                if (error) throw error;
                if (data) {
                    const meta = data.metadata as any;
                    setExtension({
                        id: data.id,
                        slug: data.slug || undefined,
                        name: data.name,
                        info: data.short_description || data.description || '', // Prefer short_description for info (legacy)
                        shortDescription: data.short_description, // Map short_description
                        logoUrl: data.icon_url,
                        types: data.types || data.tags || [],
                        region: data.region || 'Global',
                        language: data.language || '',
                        accentColor: data.accent_color || data.icon_color,
                        autoUrl: data.auto_url || '',
                        manualUrl: data.manual_url || '',
                        supportedApps: (data.compatible_with || []).map((app: string) => app.toLowerCase()),
                        lastUpdated: data.last_updated || '',
                        overview: data.description || undefined,
                        github: data.repo_url,
                        gitProvider: meta?.git_provider || undefined,
                        website: data.source_url || undefined,
                        keywords: data.tags || [],
                        tutorials: Array.isArray(data.tutorials) ? data.tutorials : [],
                        installUrls: (() => {
                            if (meta?.install_urls && Array.isArray(meta.install_urls) && meta.install_urls.length > 0) {
                                return meta.install_urls;
                            }
                            // Fallback: construct from legacy fields
                            const legacy: any[] = [];
                            if (data.auto_url) legacy.push({ label: 'Auto Install', url: data.auto_url, type: 'auto' });
                            if (data.manual_url) legacy.push({ label: 'Copy URL', url: data.manual_url, type: 'copy' });
                            return legacy;
                        })(),
                        socialUrls: (Array.isArray(data.social_urls) && data.social_urls.length > 0)
                            ? data.social_urls.filter((u: string) => u)
                            : (data.discord_url ? [data.discord_url] : []),
                        rating: 0,
                        downloadCount: data.download_count || 0,
                        likes: data.likes_count || 0
                    });
                } else {
                    setExtension(null);
                }
            } catch (err) {
                console.error('Failed to fetch extension:', err);
                setExtension(null);
            } finally {
                setLoading(false);
            }
        }
        fetchExtension();
    }, [extensionId]);

    return { extension, loading };
}
