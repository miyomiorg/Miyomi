import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { Search } from 'lucide-react';
import { FilterDropdown } from '../components/FilterDropdown';
import { AppGridCard } from '../components/AppGridCard';
import { AppListCard } from '../components/AppListCard';
import { ViewToggle } from '../components/ViewToggle';
import type { AppData } from '../types/data';
import { useAppMeta } from '../hooks/useAppMeta';
import { FeedbackPanel } from '../components/FeedbackPanel';
import { FeedbackTrigger } from '../components/FeedbackTrigger';
import { useFeedbackState } from '../hooks/useFeedbackState';
import { AnimatePresence } from 'motion/react';
import { useLikes } from '../context/LikeContext';
import { Skeleton } from '../components/ui/skeleton';

interface SoftwarePageProps {
  onNavigate?: (path: string) => void;
}

type SortOption = 'name-asc' | 'name-desc' | 'updated-desc' | 'updated-asc' | 'rating' | 'downloads' | 'loved' | 'added-desc' | 'added-asc';

const contentTypes = ['All', 'Manga', 'Anime', 'Light Novel', 'Webtoon', 'Comics', 'Multi'];
const platforms = ['All', 'Android', 'iOS', 'Windows', 'macOS', 'Linux', 'Web'];

export function SoftwarePage({ onNavigate }: SoftwarePageProps) {
  const { apps: unifiedApps, loading } = useAppMeta();
  const location = useLocation();
  const navType = useNavigationType();

  const getInitialParam = (key: string, options: string[], defaultVal: string) => {
    if (typeof window === 'undefined') return defaultVal;
    const params = new URLSearchParams(window.location.search);
    const val = params.get(key);
    if (!val) return defaultVal;
    return options.find(opt => opt.toLowerCase() === val.toLowerCase()) || defaultVal;
  };

  const [selectedContentType, setSelectedContentType] = useState<string>(() =>
    getInitialParam('content', contentTypes, 'All')
  );
  const [selectedPlatform, setSelectedPlatform] = useState<string>(() =>
    getInitialParam('platform', platforms, 'All')
  );

  const [searchQuery, setSearchQuery] = useState(() => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get('search') || '';
  });

  const [view, setView] = useState<'grid' | 'list'>(() => {
    if (typeof window === 'undefined') return 'grid';
    const v = new URLSearchParams(window.location.search).get('view');
    if (v === 'grid' || v === 'list') return v;
    return (localStorage.getItem('miyomi_view_mode') as 'grid' | 'list') || 'grid';
  });

  useEffect(() => {
    localStorage.setItem('miyomi_view_mode', view);
  }, [view]);

  const [sortBy, setSortBy] = useState<SortOption>(() => {
    if (typeof window === 'undefined') return 'name-asc';
    const val = new URLSearchParams(window.location.search).get('sort');

    return (val as SortOption) || 'name-asc';
  });


  const sortFields = [
    { id: 'name', label: 'Names', defaultDir: 'asc' },
    { id: 'updated', label: 'Updated', defaultDir: 'desc' },
    { id: 'downloads', label: 'Downloads', defaultDir: 'desc' },
    { id: 'loved', label: 'Loved', defaultDir: 'desc' },
    { id: 'added', label: 'Added', defaultDir: 'desc' },
  ] as const;

  const handleSortChange = (fieldId: string) => {
    const field = sortFields.find(f => f.id === fieldId);
    if (!field) return;

    const [currentField, currentDir] = sortBy.split('-');

    if (currentField === field.id) {

      const newDir = currentDir === 'asc' ? 'desc' : 'asc';
      setSortBy(`${field.id}-${newDir}` as SortOption);
    } else {

      setSortBy(`${field.id}-${field.defaultDir}` as SortOption);
    }
  };

  const getSortLabel = () => {
    const [currentField, currentDir] = sortBy.split('-');
    const field = sortFields.find(f => f.id === currentField);
    if (!field) return 'Names ↧'; // default


    const arrow = currentDir === 'desc' ? '↧' : '↥';
    return `${field.label} ${arrow}`;
  };

  const { isFeedbackOpen, handleToggle, handleClose } = useFeedbackState();
  const { getLikeData } = useLikes();
  const [highlightedId, setHighlightedId] = useState<string | null>(null);


  useEffect(() => {
    if (typeof window !== 'undefined') {
      const lastClicked = sessionStorage.getItem('software-last-clicked-id');
      if (lastClicked) {
        setHighlightedId(lastClicked);
      }
    }
  }, []);



  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams();
    if (selectedPlatform !== 'All') {
      params.set('platform', selectedPlatform);
    }
    if (selectedContentType !== 'All') {
      params.set('content', selectedContentType);
    }
    if (sortBy !== 'name-asc') {
      params.set('sort', sortBy);
    }
    if (view !== 'grid') {
      params.set('view', view);
    }
    if (searchQuery.trim().length > 0) {
      params.set('search', searchQuery.trim());
    }
    const queryString = params.toString();
    const newUrl = `${window.location.pathname}${queryString ? `?${queryString}` : ''}`;
    const currentUrl = `${window.location.pathname}${window.location.search}`;

    if (newUrl !== currentUrl) {
      window.history.replaceState({}, '', newUrl);
    }
  }, [selectedPlatform, selectedContentType, sortBy, view, searchQuery]);

  const filteredAndSortedApps = useMemo(() => {
    let filtered = unifiedApps.filter((app: AppData) => {

      if (selectedContentType !== 'All') {
        const isMulti = app.contentTypes.length > 1;
        if (selectedContentType === 'Multi') {
          if (!isMulti) return false;
        } else {
          if (!app.contentTypes.includes(selectedContentType as any)) return false;
        }
      }


      if (selectedPlatform !== 'All' && !app.platforms.includes(selectedPlatform as any)) {
        return false;
      }


      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const searchableText = [
          app.name,
          app.description,
          ...(app.keywords || []),
        ].join(' ').toLowerCase();
        if (!searchableText.includes(query)) return false;
      }

      return true;
    });


    filtered.sort((a, b) => {
      const [field, direction] = sortBy.split('-');
      const dir = direction === 'desc' ? -1 : 1;

      switch (field) {
        case 'name':
          return dir === 1 ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
        case 'updated':
          return dir * ((a.lastUpdated || '').localeCompare(b.lastUpdated || ''));
        case 'downloads':
          return dir * ((a.downloads || 0) - (b.downloads || 0));
        case 'loved': {
          const aLoved = getLikeData(a.id).count;
          const bLoved = getLikeData(b.id).count;
          return dir * (aLoved - bLoved);
        }
        case 'added':
          return dir * ((a.createdAt || '').localeCompare(b.createdAt || ''));
        default:
          return 0;
      }
    });

    return filtered;
  }, [unifiedApps, selectedContentType, selectedPlatform, searchQuery, sortBy, getLikeData]);


  useEffect(() => {

    if (typeof window !== 'undefined' && window.history.scrollRestoration) {
      window.history.scrollRestoration = 'manual';
    }

    const restoreScroll = () => {
      const savedScroll = sessionStorage.getItem('software-scroll-position');

      if (savedScroll && navType === 'POP') {
        const position = parseInt(savedScroll, 10);
        setTimeout(() => {
          window.scrollTo({ top: position, behavior: 'instant' });
        }, 100);
        sessionStorage.removeItem('software-scroll-position');
      }
    };

    if (!loading && filteredAndSortedApps.length > 0) {

      requestAnimationFrame(() => {
        restoreScroll();
      });
    }

    return () => {

      if (typeof window !== 'undefined' && window.history.scrollRestoration) {
        window.history.scrollRestoration = 'auto';
      }
    };
  }, [loading, filteredAndSortedApps.length, navType]);

  const handleAppClick = (appId: string) => {
    const currentScrollY = window.scrollY;
    onNavigate?.(`/software/${appId}`);

    sessionStorage.setItem('software-scroll-position', currentScrollY.toString());
    sessionStorage.setItem('software-last-clicked-id', appId);
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center gap-3">
          <h1
            className="text-[var(--text-primary)] font-['Poppins',sans-serif]"
            style={{ fontSize: 'clamp(28px, 5vw, 40px)', lineHeight: '1.2', fontWeight: 700 }}
          >
            Software
          </h1>
          <FeedbackTrigger isOpen={isFeedbackOpen} onToggle={handleToggle} title="Software" />
        </div>
        <p className="text-[var(--text-secondary)] font-['Inter',sans-serif]" style={{ fontSize: '16px' }}>
          Apps and software for reading manga, watching anime, and more across all platforms.
        </p>
      </div>

      {/* Inline Feedback Panel */}
      <AnimatePresence>
        {isFeedbackOpen && (
          <div className="mb-8">
            <FeedbackPanel page="software" onClose={handleClose} />
          </div>
        )}
      </AnimatePresence>

      {/* Filters and Search */}
      <div className="grid gap-2 grid-cols-1 md:grid-cols-2 mb-6 sm:mb-8 space-y-4">
        <div className="grid gap-2 sm:gap-3" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
          <FilterDropdown
            label="Platform"
            value={selectedPlatform}
            options={platforms}
            onChange={setSelectedPlatform}
          />

          <FilterDropdown
            label="Content Type"
            value={selectedContentType}
            options={contentTypes}
            onChange={setSelectedContentType}
          />

          <FilterDropdown
            label="Sort By"
            value={getSortLabel()}
            options={sortFields.map(f => {
              const [currentField, currentDir] = sortBy.split('-');
              const isActive = currentField === f.id;

              let nextDir = f.defaultDir;
              if (isActive) {
                nextDir = currentDir === 'asc' ? 'desc' : 'asc';
              }
              const arrow = nextDir === 'desc' ? '↧' : '↥';

              return {
                label: `${f.label} ${arrow}`,
                value: f.id,
                isSelected: isActive
              };
            })}
            onChange={handleSortChange}
          />
        </div>

        {/* Search Box and View Toggle */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)] pointer-events-none flex-shrink-0" />
            <input
              type="text"
              placeholder="Search software by name, description, or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-4 py-2 mt-1 bg-[var(--bg-surface)] border border-[var(--divider)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--brand)] transition-colors font-['Inter',sans-serif] text-sm"
            />
          </div>
          <ViewToggle view={view} onViewChange={setView} />
        </div>
      </div>

      {/* Apps Display */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rounded-2xl border p-6 space-y-4">
              <div className="flex items-start gap-4">
                <Skeleton className="w-16 h-16 rounded-xl" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
              <Skeleton className="h-16 w-full" />
              <div className="flex justify-between items-center pt-4 border-t">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredAndSortedApps.length > 0 ? (
        view === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
            {filteredAndSortedApps.map((app) => (
              <React.Fragment key={app.id}>
                <AppGridCard
                  appId={app.id}
                  name={app.name}
                  description={app.shortDescription || app.description}
                  tags={app.contentTypes as any}
                  platforms={app.platforms as any}
                  accentColor={app.accentColor}
                  logoUrl={app.logoUrl}
                  rating={app.rating}
                  downloads={app.downloads}
                  likes={app.likes}

                  forkOf={app.forkOf}
                  upstreamUrl={app.upstreamUrl}
                  isHighlighted={highlightedId === app.id || highlightedId === app.slug}
                  onClick={() => handleAppClick(app.slug || app.id)}
                />
              </React.Fragment>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredAndSortedApps.map((app) => (
              <React.Fragment key={app.id}>
                <AppListCard
                  appId={app.id}
                  name={app.name}
                  description={app.shortDescription || app.description}
                  tags={app.contentTypes as any}
                  platforms={app.platforms as any}
                  accentColor={app.accentColor}
                  logoUrl={app.logoUrl}
                  rating={app.rating}
                  downloads={app.downloads}
                  likes={app.likes}
                  forkOf={app.forkOf}
                  upstreamUrl={app.upstreamUrl}
                  isHighlighted={highlightedId === app.id || highlightedId === app.slug}
                  onClick={() => handleAppClick(app.slug || app.id)}
                />
              </React.Fragment>
            ))}
          </div>
        )
      ) : (
        <div className="text-center py-16 sm:py-24">
          <div className="text-6xl sm:text-8xl mb-6 opacity-50">🔍</div>
          <h3 className="text-[var(--text-primary)] font-['Poppins',sans-serif] mb-2" style={{ fontSize: '20px', fontWeight: 600 }}>
            No software found
          </h3>
          <p className="text-[var(--text-secondary)] font-['Inter',sans-serif]">
            Try adjusting your filters or search query
          </p>
        </div>
      )
      }

      {/* Results Count */}
      {
        filteredAndSortedApps.length > 0 && (
          <div className="mt-8 text-center text-[var(--text-secondary)] font-['Inter',sans-serif] text-sm">
            Showing {filteredAndSortedApps.length} {filteredAndSortedApps.length === 1 ? 'app' : 'apps'}
          </div>
        )
      }
    </div >
  );
}