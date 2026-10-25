import { useState, useEffect } from 'react';
import { dataService } from '../services/dataService';
import type { AppData, ExtensionData, GuideCategoryData } from '../types/data';

export type SearchResultType = 'app' | 'extension' | 'guide';

export interface SearchResult {
  id: string;
  name: string;
  description: string;
  type: SearchResultType;
  keywords?: readonly string[] | string[];
  [key: string]: any;
}

export function useGlobalSearch(query: string): SearchResult[] {
  const [data, setData] = useState<{
    apps: AppData[];
    extensions: ExtensionData[];
    guideCategories: GuideCategoryData[];
  } | null>(null);

  const [results, setResults] = useState<SearchResult[]>([]);
  const searching = query.trim().length > 0;

  useEffect(() => {
    // Navbar/home search mounts even when unused. Do not fetch three complete
    // directories until a visitor actually searches.
    if (!searching || data) return;
    let cancelled = false;
    const fetchData = async () => {
      try {
        const [apps, extensions, guideCategories] = await Promise.all([
          dataService.getApps(),
          dataService.getExtensions(),
          dataService.getGuideCategories()
        ]);
        if (!cancelled) setData({ apps, extensions, guideCategories });
      } catch (error) {
        console.error('Failed to fetch search data:', error);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, [searching, data]);

  useEffect(() => {
    if (!data || !query || query.trim().length === 0) {
      setResults([]);
      return;
    }

    const normalizedQuery = query.toLowerCase().trim();
    const newResults: SearchResult[] = [];

    data.apps.forEach((app) => {
      const matchesName = app.name?.toLowerCase().includes(normalizedQuery);
      const matchesDescription = app.description?.toLowerCase().includes(normalizedQuery);
      const matchesKeywords = app.keywords?.some((kw) =>
        kw.toLowerCase().includes(normalizedQuery)
      );
      const matchesContentTypes = app.contentTypes?.some((ct) =>
        ct.toLowerCase().includes(normalizedQuery)
      );

      if (matchesName || matchesDescription || matchesKeywords || matchesContentTypes) {
        newResults.push({ ...app, type: 'app' });
      }
    });

    data.extensions.forEach((ext) => {
      const matchesName = ext.name?.toLowerCase().includes(normalizedQuery);
      const matchesInfo = ext.info?.toLowerCase().includes(normalizedQuery);
      const matchesKeywords = ext.keywords?.some((kw) =>
        kw.toLowerCase().includes(normalizedQuery)
      );
      const matchesTypes = ext.types?.some((type) =>
        type.toLowerCase().includes(normalizedQuery)
      );

      if (matchesName || matchesInfo || matchesKeywords || matchesTypes) {
        newResults.push({
          ...ext,
          type: 'extension',
          description: ext.info || ext.shortDescription || ''
        });
      }
    });

    data.guideCategories.forEach((category) => {
      category.guides.forEach((guide) => {
        const matchesTitle = guide.title?.toLowerCase().includes(normalizedQuery);
        const matchesKeywords = guide.keywords?.some((kw) =>
          kw.toLowerCase().includes(normalizedQuery)
        );
        const matchesCategoryTitle = category.title?.toLowerCase().includes(normalizedQuery);
        const matchesCategoryDescription = category.description?.toLowerCase().includes(normalizedQuery);

        if (matchesTitle || matchesKeywords || matchesCategoryTitle || matchesCategoryDescription) {
          newResults.push({
            ...guide,
            type: 'guide',
            // @ts-ignore - guide doesn't have name, mapping title to name for search result
            name: guide.title,
            description: category.description,
            categoryTitle: category.title,
            categoryColor: category.color
          });
        }
      });
    });

    setResults(newResults);
  }, [query, data]);

  return results;
}
