import { useMemo } from 'react';
import { useAppMeta } from './useAppMeta';
import { useBlogPosts } from './useBlogPosts';
import { useExtensions } from './useExtensions';
import { useGuideCategories } from './useGuideCategories';
import type { SearchResult, SearchResultType } from '../types/search';

export type { SearchResult, SearchResultType };

function asTags(value: readonly string[] | string[] | null | undefined): string[] {
  return Array.isArray(value)
    ? value.filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0)
    : [];
}

function matchesText(value: unknown, query: string): boolean {
  return typeof value === 'string' && value.toLowerCase().includes(query);
}

function matchesAny(values: readonly string[] | string[] | null | undefined, query: string): boolean {
  return Array.isArray(values) && values.some((value) => matchesText(value, query));
}

function matchingTags(tags: string[], query: string): string[] {
  return tags.filter((tag) => tag.toLowerCase().includes(query));
}

/**
 * Global search across apps, extensions, guides, and blog posts.
 *
 * The directory hooks are disabled until a query exists, so the navbar/home
 * search does not download every directory on page load. When enabled, they
 * reuse the same localStorage cache as the directory pages.
 */
export function useGlobalSearch(query: string): SearchResult[] {
  const searching = query.trim().length > 0;
  const { apps } = useAppMeta({ enabled: searching });
  const { extensions } = useExtensions({ enabled: searching });
  const { categories } = useGuideCategories({ enabled: searching });
  const { posts } = useBlogPosts({ enabled: searching, requirePublished: true });

  return useMemo(() => {
    const normalizedQuery = query.toLowerCase().trim();
    if (!normalizedQuery) return [];

    const newResults: SearchResult[] = [];

    apps.forEach((app) => {
      const tags = asTags(app.keywords);
      const matchesName = matchesText(app.name, normalizedQuery);
      const matchesDescription = matchesText(app.description, normalizedQuery);
      const matchesTags = matchesAny(tags, normalizedQuery);
      const matchesContentTypes = matchesAny(app.contentTypes, normalizedQuery);

      if (matchesName || matchesDescription || matchesTags || matchesContentTypes) {
        newResults.push({
          ...app,
          type: 'app',
          tags,
          matchedTags: matchingTags(tags, normalizedQuery),
        });
      }
    });

    extensions.forEach((ext) => {
      const tags = asTags(ext.keywords);
      const matchesName = matchesText(ext.name, normalizedQuery);
      const matchesInfo = matchesText(ext.info, normalizedQuery);
      const matchesTags = matchesAny(tags, normalizedQuery);
      const matchesTypes = matchesAny(ext.types, normalizedQuery);

      if (matchesName || matchesInfo || matchesTags || matchesTypes) {
        newResults.push({
          ...ext,
          type: 'extension',
          description: ext.info || ext.shortDescription || '',
          tags,
          matchedTags: matchingTags(tags, normalizedQuery),
        });
      }
    });

    categories.forEach((category) => {
      category.guides.forEach((guide) => {
        const tags = asTags(guide.keywords);
        const matchesTitle = matchesText(guide.title, normalizedQuery);
        const matchesSummary = matchesText(guide.summary, normalizedQuery);
        const matchesTags = matchesAny(tags, normalizedQuery);
        const matchesCategoryTitle = matchesText(category.title, normalizedQuery);
        const matchesCategoryDescription = matchesText(category.description, normalizedQuery);

        if (matchesTitle || matchesSummary || matchesTags || matchesCategoryTitle || matchesCategoryDescription) {
          newResults.push({
            id: guide.id,
            name: guide.title,
            description: guide.summary || category.description || '',
            type: 'guide',
            slug: guide.slug,
            keywords: guide.keywords,
            tags,
            matchedTags: matchingTags(tags, normalizedQuery),
            categoryTitle: category.title,
            categoryColor: category.color,
          });
        }
      });
    });

    posts.forEach((post) => {
      const tags = asTags(post.tags);
      const matchesTitle = matchesText(post.title, normalizedQuery);
      const matchesExcerpt = matchesText(post.excerpt, normalizedQuery);
      const matchesTags = matchesAny(tags, normalizedQuery);
      const matchesCategory = matchesText(post.category, normalizedQuery);

      if (matchesTitle || matchesExcerpt || matchesTags || matchesCategory) {
        newResults.push({
          ...post,
          type: 'blog',
          name: post.title,
          description: post.excerpt || '',
          tags,
          matchedTags: matchingTags(tags, normalizedQuery),
        });
      }
    });

    return newResults;
  }, [query, apps, extensions, categories, posts]);
}
