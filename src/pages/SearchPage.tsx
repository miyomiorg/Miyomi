import { useMemo, useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useGlobalSearch, SearchResultType } from '../hooks/useGlobalSearch';
import { AppListCard } from '../components/AppListCard';
import { ExtensionListCard } from '../components/ExtensionListCard';
import { Search, Filter, Smartphone, Puzzle, BookOpen } from 'lucide-react';
import { SearchBar } from '../components/SearchBar';
import { FilterChip } from '../components/FilterChip';
import { motion } from 'motion/react';

interface SearchPageProps {
  onNavigate: (path: string) => void;
}

export function SearchPage({ onNavigate }: SearchPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const urlQuery = searchParams.get('q') || '';
  const [localQuery, setLocalQuery] = useState(urlQuery);
  const [activeFilter, setActiveFilter] = useState<SearchResultType | 'all'>('all');

  // Sync urlQuery to localQuery when urlQuery changes (e.g. back navigation)
  useEffect(() => {
    setLocalQuery(urlQuery);
  }, [urlQuery]);

  // Debounced URL updates
  useEffect(() => {
    const handler = setTimeout(() => {
      const currentQueryParam = searchParams.get('q') || '';
      if (localQuery.trim() !== currentQueryParam.trim()) {
        if (localQuery.trim()) {
          setSearchParams({ q: localQuery });
        } else {
          setSearchParams({});
        }
      }
    }, 250);

    return () => clearTimeout(handler);
  }, [localQuery, setSearchParams, searchParams]);

  const results = useGlobalSearch(localQuery);

  const filteredResults = useMemo(() => {
    if (activeFilter === 'all') return results;
    return results.filter(result => result.type === activeFilter);
  }, [results, activeFilter]);

  const handleSearch = (value: string) => {
    setLocalQuery(value);
  };

  const handleChipClick = (term: string) => {
    setLocalQuery(term);
    setSearchParams({ q: term });
  };

  const handleResultClick = (result: any) => {
    switch (result.type) {
      case 'app':
        onNavigate(`/software/${result.slug || result.id}`);
        break;
      case 'extension':
        onNavigate(`/extensions/${result.slug || result.id}`);
        break;
      case 'guide':
        onNavigate(`/guides/${result.slug}`);
        break;
    }
  };

  const resultCounts = useMemo(() => {
    return {
      all: results.length,
      app: results.filter(r => r.type === 'app').length,
      extension: results.filter(r => r.type === 'extension').length,
      guide: results.filter(r => r.type === 'guide').length,
    };
  }, [results]);

  const popularTerms = ['aniyomi', 'mihon', 'dantotsu', 'cloudstream', 'manga', 'anime', 'light novel'];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-6">
          <Search className="w-8 h-8 text-[var(--brand)]" />
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">
            Search Results
          </h1>
        </div>

        <div className="mb-6">
          <SearchBar
            placeholder="Search apps, extensions, or guides..."
            onSearch={handleSearch}
          />
        </div>

        {localQuery && (
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <span className="text-sm text-[var(--text-secondary)]">Filter by:</span>
            <FilterChip
              label={`All (${resultCounts.all})`}
              selected={activeFilter === 'all'}
              onClick={() => setActiveFilter('all')}
            />
            <FilterChip
              label={`Apps (${resultCounts.app})`}
              selected={activeFilter === 'app'}
              onClick={() => setActiveFilter('app')}
            />
            <FilterChip
              label={`Extensions (${resultCounts.extension})`}
              selected={activeFilter === 'extension'}
              onClick={() => setActiveFilter('extension')}
            />
            <FilterChip
              label={`Guides (${resultCounts.guide})`}
              selected={activeFilter === 'guide'}
              onClick={() => setActiveFilter('guide')}
            />
          </div>
        )}
      </div>

      {!localQuery ? (
        <div className="max-w-4xl mx-auto py-4">
          {/* Quick Categories */}
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-[var(--text-secondary)] mb-4 uppercase tracking-wider">
              Browse Categories
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                onClick={() => onNavigate('/software')}
                className="flex items-start gap-4 p-5 bg-[var(--bg-surface)] border border-[var(--divider)] rounded-2xl hover:shadow-md hover:border-[var(--brand)] hover:scale-[1.02] transition-all text-left focus:outline-none"
                style={{ boxShadow: '0 4px 12px 0 rgba(0,0,0,0.03)' }}
              >
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center flex-shrink-0">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--text-primary)] mb-1">Software</h3>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    Explore apps for Android, iOS, Windows, macOS, and Linux.
                  </p>
                </div>
              </button>

              <button
                onClick={() => onNavigate('/extensions')}
                className="flex items-start gap-4 p-5 bg-[var(--bg-surface)] border border-[var(--divider)] rounded-2xl hover:shadow-md hover:border-[var(--brand)] hover:scale-[1.02] transition-all text-left focus:outline-none"
                style={{ boxShadow: '0 4px 12px 0 rgba(0,0,0,0.03)' }}
              >
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center flex-shrink-0">
                  <Puzzle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--text-primary)] mb-1">Extensions</h3>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    Find repositories & sources for Aniyomi, Mihon, and Dantotsu.
                  </p>
                </div>
              </button>

              <button
                onClick={() => onNavigate('/guides')}
                className="flex items-start gap-4 p-5 bg-[var(--bg-surface)] border border-[var(--divider)] rounded-2xl hover:shadow-md hover:border-[var(--brand)] hover:scale-[1.02] transition-all text-left focus:outline-none"
                style={{ boxShadow: '0 4px 12px 0 rgba(0,0,0,0.03)' }}
              >
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--text-primary)] mb-1">Guides</h3>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    Read setups, troubleshooting, and general configuration tutorials.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Popular terms */}
          <div className="bg-[var(--bg-elev-1)] border border-[var(--divider)] rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
              Popular Search Terms
            </h3>
            <div className="flex flex-wrap gap-2">
              {popularTerms.map((term) => (
                <button
                  key={term}
                  onClick={() => handleChipClick(term)}
                  className="px-3.5 py-1.5 bg-[var(--bg-surface)] hover:bg-[var(--chip-bg)] border border-[var(--divider)] hover:border-[var(--brand)] text-[var(--text-primary)] rounded-full text-xs font-medium transition-all hover:scale-105 active:scale-95 focus:outline-none"
                >
                  #{term}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : filteredResults.length === 0 ? (
        <div className="text-center py-16">
          <Search className="w-16 h-16 text-[var(--text-tertiary)] mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
            No results found
          </h2>
          <p className="text-[var(--text-secondary)]">
            Try adjusting your search or filters
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredResults.map((result, index) => (
            <motion.div
              key={`${result.type}-${result.id}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              {result.type === 'app' && (
                <AppListCard
                  appId={result.id}
                  name={result.name}
                  description={result.description}
                  tags={result.contentTypes || []}
                  platforms={result.platforms || []}
                  iconColor={result.accentColor || result.iconColor}
                  logoUrl={result.logoUrl}
                  rating={result.rating}
                  downloads={result.downloadCount}
                  forkOf={result.forkOf}
                  upstreamUrl={result.upstreamUrl}
                  onClick={() => handleResultClick(result)}
                />
              )}
              {result.type === 'extension' && (
                <ExtensionListCard
                  extension={result as any}
                  onSelect={() => handleResultClick(result)}
                />
              )}
              {result.type === 'guide' && (
                <button
                  onClick={() => handleResultClick(result)}
                  className="flex items-start gap-4 p-4 bg-[var(--bg-surface)] border border-[var(--divider)] rounded-xl hover:shadow-lg hover:border-[var(--brand)] transition-all w-full text-left group"
                >
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: result.categoryColor || 'var(--brand)' }}
                  >
                    <span className="text-2xl">📚</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-[var(--text-secondary)] mb-1">
                      {result.categoryTitle}
                    </div>
                    <h3 className="font-semibold text-[var(--text-primary)] mb-1">
                      {result.name}
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)] line-clamp-2">
                      {result.description}
                    </p>
                  </div>
                </button>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
