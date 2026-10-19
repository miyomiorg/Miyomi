import { useDataCache } from './useDataCache';
import { appsApi } from '@/services/api';
import { ApiError } from '@/services/api/http';
import type { AppData } from '../types/data';

export function useApp(appId: string): { app: AppData | null; loading: boolean } {
  const fetchApp = async (): Promise<AppData | null> => {
    if (!appId) return null;

    let data;
    try {
      data = await appsApi.get(appId);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }

    return {
      id: data.id,
      moderatorNote: data.moderator_note,
      noteSeverity: data.note_severity,
      noticeSticky: data.notice_sticky,
      slug: data.slug || undefined,
      name: (data.name || '').trim(),
      description: data.description || '',
      version: data.version || undefined,
      contentTypes: data.content_types || data.tags || [],
      platforms: data.platforms || [],
      accentColor: data.icon_color || data.accent_color,
      logoUrl: data.icon_url,
      author: data.author,
      keywords: data.tags || [],
      supportedExtensions: data.compatible_with || [],
      lastUpdated: data.last_release_date || undefined,
      githubUrl: data.repo_url,
      getApp: data.download_url || undefined,
      officialSite: data.website_url,
      discordUrl: data.discord_url,
      socialUrls: (Array.isArray(data.social_urls) && data.social_urls.length > 0)
        ? data.social_urls.filter((u: string) => u)
        : (data.discord_url ? [data.discord_url] : []),
      tutorials: data.tutorials || [],
      forkOf: data.fork_of,
      upstreamUrl: data.upstream_url,
      status: data.status,
      downloads: data.download_count || undefined,
      likes: data.likes_count || undefined,
      shortDescription: data.short_description || data.metadata?.shortDescription || undefined,
      rating: data.metadata?.rating || undefined,
      devStatus: data.metadata?.dev_status || undefined,
      gitProvider: data.metadata?.git_provider || undefined,
    };
  };

  const { data: app, loading } = useDataCache<AppData | null>(
    `app_details_${appId}`,
    fetchApp,
    { ttl: 1000 * 60 * 5 } // 5 minutes fresh
  );

  return { app, loading };
}
