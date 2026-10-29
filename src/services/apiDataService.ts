import { appsApi, extensionsApi, faqsApi, guidesApi } from '@/services/api';
import { ApiError } from '@/services/api/http';
import type { AppData, ExtensionData, FAQData, GuideCategoryData, GuideTopicData, GuideData } from '../types/data';
import type { Tables } from '@/types/db';


function toAppData(row: Tables<'apps'>): AppData {
  const meta = (row.metadata || {}) as Record<string, any>;
  const r = row as any;
  return {
    id: row.id,
    moderatorNote: row.moderator_note,
    noteSeverity: row.note_severity,
    noticeSticky: row.notice_sticky,
    slug: row.slug || undefined,
    name: row.name,
    shortDescription: r.short_description || meta.shortDescription || undefined,
    description: row.description || '',
    contentTypes: (meta.contentTypes as any) || [],
    platforms: (row.platforms || []) as any,
    accentColor: row.icon_color || meta.accentColor || undefined,
    logoUrl: row.icon_url || undefined,
    author: row.author || undefined,
    keywords: (row.tags && row.tags.length > 0 ? row.tags : meta.keywords) || undefined,
    supportedExtensions: meta.supportedExtensions || [],
    lastUpdated: row.updated_at,
    githubUrl: row.repo_url || undefined,
    getApp: row.download_url || undefined,
    officialSite: row.website_url || undefined,
    discordUrl: meta.discordUrl || undefined,
    tutorials: meta.tutorials || undefined,
    rating: meta.rating || undefined,
    downloads: r.download_count || row.download_count || undefined,
    likes: r.likes_count || undefined,
    forkOf: meta.forkOf || undefined,
    upstreamUrl: meta.upstreamUrl || undefined,
    status: row.status,
  };
}


function toExtensionData(row: Tables<'extensions'>): ExtensionData {
  const meta = (row.metadata || {}) as Record<string, any>;
  const r = row as any;
  return {
    id: row.id,
    moderatorNote: r.moderator_note,
    noteSeverity: r.note_severity,
    noticeSticky: r.notice_sticky,
    slug: row.slug || undefined,
    name: row.name,
    info: row.description || undefined,
    shortDescription: r.short_description || meta.shortDescription || undefined,
    logoUrl: row.icon_url || undefined,
    types: r.types || (meta.types as any) || [],
    language: r.region || meta.region || '',
    accentColor: row.icon_color || undefined,
    autoUrl: meta.autoUrl || '',
    manualUrl: meta.manualUrl || '',
    supportedApps: (row.compatible_with || []) as any,
    lastUpdated: row.updated_at,
    overview: row.description || undefined,
    github: row.repo_url || undefined,
    website: row.source_url || undefined,
    keywords: (row.tags && row.tags.length > 0 ? row.tags : meta.keywords) || undefined,
    tutorials: meta.tutorials || undefined,
    rating: meta.rating || undefined,
    downloadCount: r.download_count || meta.downloadCount || undefined,
    likes: r.likes_count || undefined,
    devStatus: meta.dev_status || undefined,
  };
}



function toGuideData(row: Tables<'guides'>): GuideData {
  const meta = (row.metadata || {}) as Record<string, any>;
  return {
    id: row.id,
    title: row.title,
    slug: row.slug || row.id,
    content: row.content || row.content_html || '',
    category: row.category || 'Uncategorized',
    description: row.description || '',
    author: row.author || '',
    readTime: meta.readTime || '5 min read',
    tags: (row.tags as string[]) || [],
    relatedAppIds: (row.related_apps as string[]) || [],
    relatedExtensionIds: (row.related_extensions as string[]) || [],
    updatedAt: row.updated_at,
  };
}


function toFAQData(row: Tables<'faqs'>): FAQData {
  return {
    id: row.id,
    question: row.question,
    answer: row.answer,
    category: (row.category as any) || 'general',
    content_format: (row as any).content_format || 'markdown',
  };
}

export const apiDataService = {
  async getApps(): Promise<AppData[]> {
    try {
      const data = await appsApi.list();
      return (data || []).map(toAppData);
    } catch (error) {
      console.error('Failed to fetch apps:', error);
      return [];
    }
  },

  async getExtensions(): Promise<ExtensionData[]> {
    try {
      const data = await extensionsApi.list();
      return (data || []).map(toExtensionData);
    } catch (error) {
      console.error('Failed to fetch extensions:', error);
      return [];
    }
  },

  async getFAQs(): Promise<FAQData[]> {
    try {
      const data = await faqsApi.list();
      return (data || []).map(toFAQData);
    } catch (error) {
      console.error('Failed to fetch FAQs:', error);
      return [];
    }
  },

  async getGuideCategories(): Promise<GuideCategoryData[]> {
    try {
      const data = await guidesApi.list();
      const categoryMap = new Map<string, GuideTopicData[]>();
      for (const row of data || []) {
        const cat = row.category || 'uncategorized';
        if (!categoryMap.has(cat)) categoryMap.set(cat, []);
        categoryMap.get(cat)!.push({
          id: row.id,
          title: row.title,
          slug: row.slug || row.id,
          summary: row.description || undefined,
          // Editor-set reading time (same value the guide page shows).
          readTime: ((row.metadata || {}) as Record<string, any>).readTime || undefined,
          keywords: (row.tags || []) as any,
          relatedAppIds: (row.related_apps || []) as any,
          relatedExtensionIds: (row.related_extensions || []) as any,
        });
      }
      return Array.from(categoryMap.entries()).map(([id, guides]) => ({
        id,
        title: id.charAt(0).toUpperCase() + id.slice(1),
        description: '',
        color: '#6366F1',
        icon: 'book' as const,
        guides,
      }));
    } catch (error) {
      console.error('Failed to fetch guides:', error);
      return [];
    }
  },

  async getGuideBySlug(slug: string): Promise<GuideData | null> {
    try {
      const data = await guidesApi.get(slug);
      return toGuideData(data);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null;
      console.error('Failed to fetch guide by slug:', error);
      return null;
    }
  },
};