import { useDataCache } from './useDataCache';
import { supabase } from '@/integrations/supabase/client';
import type { ExtensionData } from '../types/data';

export function useExtensions(): { extensions: ExtensionData[]; loading: boolean } {
    const fetchExtensions = async (): Promise<ExtensionData[]> => {
        const { data, error } = await supabase
            .from('extensions')
            .select('*')
            .order('name');

        if (error) throw error;

        return (data || []).map((ext: any) => ({
            id: ext.id,
            slug: ext.slug,
            name: ext.name,
            info: ext.short_description || ext.description || '',
            shortDescription: ext.short_description,
            logoUrl: ext.icon_url,
            types: ext.types || ext.tags || [],
            region: ext.region || 'Global',
            language: ext.language || '',
            accentColor: ext.accent_color || ext.icon_color,
            autoUrl: ext.auto_url,
            manualUrl: ext.manual_url,
            installUrls: (() => {
                const meta = ext.metadata as any;
                if (meta?.install_urls && Array.isArray(meta.install_urls) && meta.install_urls.length > 0) {
                    return meta.install_urls;
                }
                const legacy: any[] = [];
                if (ext.auto_url) legacy.push({ label: 'Auto Install', url: ext.auto_url, type: 'auto' });
                if (ext.manual_url) legacy.push({ label: 'Copy URL', url: ext.manual_url, type: 'copy' });
                return legacy;
            })(),
            supportedApps: (ext.compatible_with || []).map((app: string) => app.toLowerCase()),
            lastUpdated: ext.last_updated || ext.updated_at,
            overview: ext.description || undefined,
            github: ext.repo_url,
            website: ext.source_url || undefined,
            keywords: ext.tags || [],
            tutorials: Array.isArray(ext.tutorials) ? ext.tutorials : [],
            socialUrls: (Array.isArray(ext.social_urls) && ext.social_urls.length > 0)
                ? ext.social_urls.filter((u: string) => u)
                : (ext.discord_url ? [ext.discord_url] : []),
            rating: 0,
            downloadCount: ext.download_count || 0,
            likes: ext.likes_count || 0,
            createdAt: ext.created_at || undefined
        }));
    };

    const { data: extensions, loading } = useDataCache<ExtensionData[]>(
        'extensions_list_v1',
        fetchExtensions,
        { ttl: 1000 * 60 * 10 } // 10 minutes fresh
    );

    return { extensions: extensions || [], loading };
}
