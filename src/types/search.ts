export type SearchResultType = 'app' | 'extension' | 'guide' | 'blog';

export interface SearchResult {
  id: string;
  name: string;
  description: string;
  type: SearchResultType;
  keywords?: readonly string[] | string[];
  /** Actual tags/keywords on the item, normalized for display. */
  tags?: string[];
  /** Tags that matched the current query. */
  matchedTags?: string[];
  [key: string]: any;
}
