import { useState, useEffect } from 'react';
import { extensionsApi } from '@/services/api';
import { ApiError } from '@/services/api/http';
import type { ExtensionData } from '../types/data';

export function useExtension(extensionId: string): { extension: ExtensionData | null; loading: boolean } {
  const [extension, setExtension] = useState<ExtensionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!extensionId) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function fetchExtension() {
      setLoading(true);
      try {
        const data = await extensionsApi.get(extensionId);
        if (!isMounted) return;
        const meta = data.metadata as any;
        setExtension({
          id: data.id,
          slug: data.slug || undefined,
          name: data.name,
          info: data.short_description || data.description || '',
          shortDescription: data.short_description,
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
          tutorials: Array.isArray(data.tutorials) ? data.tutorials as unknown as ExtensionData['tutorials'] : [],
          installUrls: (() => {
            if (meta?.install_urls && Array.isArray(meta.install_urls) && meta.install_urls.length > 0) {
              return meta.install_urls;
            }
            const legacy: any[] = [];
            if (data.auto_url) legacy.push({ label: 'Auto Install', url: data.auto_url, type: 'auto' });
            if (data.manual_url) legacy.push({ label: 'Copy URL', url: data.manual_url, type: 'copy' });
            return legacy;
          })(),
          socialUrls: (Array.isArray(data.social_urls) && data.social_urls.length > 0)
            ? data.social_urls.filter((u): u is string => typeof u === 'string' && !!u)
            : (data.discord_url ? [data.discord_url] : []),
          rating: 0,
          downloadCount: data.download_count || 0,
          likes: data.likes_count || 0,
          devStatus: meta?.dev_status || undefined
        });
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          if (isMounted) setExtension(null);
        } else {
          console.error('Failed to fetch extension:', err);
          if (isMounted) setExtension(null);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchExtension();

    return () => {
      isMounted = false;
    };
  }, [extensionId]);

  return { extension, loading };
}
