import { useMemo, useState, useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { Search } from 'lucide-react';
import { FilterDropdown } from '../components/FilterDropdown';
import { ViewToggle } from '../components/ViewToggle';
import { useExtensions } from '../hooks/useExtensions';
import { ExtensionGridCard } from '../components/ExtensionGridCard';
import { Skeleton } from '../components/ui/skeleton';
import { ExtensionListCard } from '../components/ExtensionListCard';
import { AnimatePresence } from 'motion/react';
import { useLikes } from '../context/LikeContext';

interface ExtensionsPageProps {
  onNavigate?: (path: string) => void;
}

type SortOption = 'name-asc' | 'name-desc' | 'updated-desc' | 'updated-asc' | 'loved' | 'added-desc' | 'added-asc';

const apps = ['All', 'Aniyomi', 'Mihon', 'Dantotsu', 'Mangayomi'];
const types = ['All', 'Anime', 'Manga', 'Light Novel'];

export function ExtensionsPage({ onNavigate }: ExtensionsPageProps) {
  const location = useLocation();


  const getInitialParam = (key: string, options: string[], defaultVal: string) => {
    if (typeof window === 'undefined') return defaultVal;
    const params = new URLSearchParams(window.location.search);
    const val = params.get(key);
    if (!val) return defaultVal;
    return options.find(opt => opt.toLowerCase() === val.toLowerCase()) || defaultVal;
  };

  const [selectedApp, setSelectedApp] = useState<string>(() =>
    getInitialParam('app', apps, 'All')
  );
  const [selectedType, setSelectedType] = useState<string>(() =>
    getInitialParam('type', types, 'All')
  );

  const [selectedLanguage, setSelectedLanguage] = useState<string>(() => {
    if (typeof window === 'undefined') return 'All';
    const val = new URLSearchParams(window.location.search).get('language');
    return val || 'All';
  });

  const [searchQuery, setSearchQuery] = useState(() => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get('search') || '';
  });

  const [view, setView] = useState<'grid' | 'list'>(() => {
    if (typeof window === 'undefined') return 'list';
    const v = new URLSearchParams(window.location.search).get('view');
    if (v === 'grid' || v === 'list') return v;
    return (localStorage.getItem('miyomi_view_mode') as 'grid' | 'list') || 'list';
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
    { id: 'loved', label: 'Loved', defaultDir: 'desc' },
    { id: 'added', label: 'Added', defaultDir: 'desc' },
  ] as const;

  const handleSortChange = (fieldId: string) => {
    const field = sortFields.find(f => f.id === fieldId);
    if (!field) return;

    const [currentField, currentDir] = sortBy.split('-');


    const normalizedCurrentField = currentField || 'name';
    const normalizedCurrentDir = currentDir || 'asc';

    if (normalizedCurrentField === field.id) {
      const newDir = normalizedCurrentDir === 'asc' ? 'desc' : 'asc';
      setSortBy(`${field.id}-${newDir}` as SortOption);
    } else {
      setSortBy(`${field.id}-${field.defaultDir}` as SortOption);
    }
  };

  const getSortLabel = () => {
    const [currentField, currentDir] = sortBy.split('-');
    const field = sortFields.find(f => f.id === currentField);
    if (!field) return 'Names ↧';


    const dir = currentDir || (field.id === 'name' ? 'asc' : 'desc');
    return `${field.label} ${dir === 'desc' ? '↧' : '↥'}`;
  };



  const { getLikeData } = useLikes();
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const navType = useNavigationType();


  useEffect(() => {
    if (typeof window !== 'undefined') {
      const lastClicked = sessionStorage.getItem('extensions-last-clicked-id');
      if (lastClicked) {
        setHighlightedId(lastClicked);
      }
    }
  }, []);
  const { extensions: unifiedExtensions, loading } = useExtensions();

  const availableLanguages = useMemo(() => {
    const langs = new Set<string>();
    unifiedExtensions.forEach(ext => {
      const codeStr = ext.language || ext.region || '';
      if (!codeStr || codeStr.toLowerCase() === 'all' || codeStr.toLowerCase() === 'global') return;
      codeStr.split(',').forEach(c => langs.add(c.trim().toLowerCase()));
    });
    return ['All', ...Array.from(langs).sort()];
  }, [unifiedExtensions]);



  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams();
    if (selectedApp !== 'All') {
      params.set('app', selectedApp);
    }
    if (selectedType !== 'All') {
      params.set('type', selectedType);
    }
    if (selectedLanguage !== 'All') {
      params.set('language', selectedLanguage);
    }
    if (sortBy !== 'name-asc') {
      params.set('sort', sortBy);
    }
    params.set('view', view);
    if (searchQuery.trim().length > 0) {
      params.set('search', searchQuery.trim());
    }

    const queryString = params.toString();
    const newUrl = `${window.location.pathname}${queryString ? `?${queryString}` : ''}`;
    const currentUrl = `${window.location.pathname}${window.location.search}`;

    window.history.replaceState({}, '', newUrl);
  }, [selectedApp, selectedType, selectedLanguage, sortBy, view, searchQuery]);

  const filteredAndSortedExtensions = useMemo(() => {
    let filtered = unifiedExtensions.filter((ext) => {

      if (selectedApp !== 'All' && !ext.supportedApps.includes(selectedApp.toLowerCase())) {
        return false;
      }


      if (selectedType !== 'All' && !ext.types.includes(selectedType as any)) {
        return false;
      }

      if (selectedLanguage !== 'All') {
        const extLang = (ext.language || ext.region || '').toLowerCase();
        const extLangs = extLang.split(',').map(l => l.trim());
        if (!extLangs.includes(selectedLanguage.toLowerCase()) && !extLangs.includes('all') && !extLangs.includes('global')) {
          return false;
        }
      }

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const searchableText = [
          ext.name,
          ...ext.types,
          ext.region,
          ext.info,
          ...(ext.supportedApps || []),
          ...(ext.keywords || []),
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
  }, [unifiedExtensions, selectedApp, selectedType, selectedLanguage, searchQuery, sortBy, getLikeData]);


  useEffect(() => {
    if (typeof window !== 'undefined' && window.history.scrollRestoration) {
      window.history.scrollRestoration = 'manual';
    }

    const restoreScroll = () => {
      const savedScroll = sessionStorage.getItem('extensions-scroll-position');

      if (savedScroll && navType === 'POP') {
        const position = parseInt(savedScroll, 10);
        setTimeout(() => {
          window.scrollTo({ top: position, behavior: 'instant' });
        }, 100);
        sessionStorage.removeItem('extensions-scroll-position');
      }
    };

    if (!loading && filteredAndSortedExtensions.length > 0) {
      requestAnimationFrame(() => {
        restoreScroll();
      });
    }

    return () => {
      if (typeof window !== 'undefined' && window.history.scrollRestoration) {
        window.history.scrollRestoration = 'auto';
      }
    };
  }, [loading, filteredAndSortedExtensions.length, navType]);

  const handleExtensionClick = (extensionId: string) => {
    const currentScrollY = window.scrollY;
    onNavigate?.(`/extensions/${extensionId}`);

    sessionStorage.setItem('extensions-scroll-position', currentScrollY.toString());
    sessionStorage.setItem('extensions-last-clicked-id', extensionId);
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
            Extensions
          </h1>
        </div>
        <p className="text-[var(--text-secondary)] font-['Inter',sans-serif]" style={{ fontSize: '16px' }}>
          Extension repositories and sources for Mihon, Aniyomi, Dantotsu, and compatible apps.
        </p>
      </div>

      {/* Filters and Search */}
      <div className="grid gap-2 grid-cols-1 md:grid-cols-2 mb-6 sm:mb-8 space-y-4">
        {/* Dropdowns */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
          <FilterDropdown
            label="App Compatibility"
            value={selectedApp}
            options={apps}
            onChange={setSelectedApp}
          />
          <FilterDropdown
            label="Content Type"
            value={selectedType}
            options={types}
            onChange={setSelectedType}
          />
          <FilterDropdown
            label="Language"
            value={selectedLanguage === 'All' ? 'All' : selectedLanguage.toUpperCase()}
            options={availableLanguages.map(l => l === 'All' ? 'All' : l.toUpperCase())}
            onChange={(val) => setSelectedLanguage(val === 'All' ? 'All' : val.toLowerCase())}
          />
          <FilterDropdown
            label="Sort By"
            value={getSortLabel()}
            options={sortFields.map(f => {
              const [currentField, currentDir] = sortBy.split('-');
              const isActive = currentField === f.id;

              let nextDir = f.defaultDir;
              if (isActive) {
                const normalizedDir = currentDir || f.defaultDir;
                nextDir = normalizedDir === 'asc' ? 'desc' : 'asc';
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
              placeholder="Search extensions by name, description, or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-4 py-2 mt-1 bg-[var(--bg-surface)] border border-[var(--divider)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--brand)] transition-colors font-['Inter',sans-serif] text-sm"
            />
          </div>
          <ViewToggle view={view} onViewChange={setView} />
        </div>
      </div>

      {/* Extensions Display */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rounded-2xl border p-6 space-y-4">
              <div className="flex items-center gap-4">
                <Skeleton className="w-12 h-12 rounded-xl" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
              <Skeleton className="h-12 w-full" />
              <div className="flex justify-between items-center pt-4 border-t">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredAndSortedExtensions.length > 0 ? (
        view === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 mb-8">
            {filteredAndSortedExtensions.map((ext) => (
              <ExtensionGridCard
                key={ext.id}
                extension={ext}
                isHighlighted={highlightedId === ext.id || highlightedId === ext.slug}
                onSelect={handleExtensionClick}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-4 mb-8">
            {filteredAndSortedExtensions.map((ext) => (
              <ExtensionListCard
                key={ext.id}
                extension={ext}
                isHighlighted={highlightedId === ext.id || highlightedId === ext.slug}
                onSelect={handleExtensionClick}
              />
            ))}
          </div>
        )
      ) : (
        <div className="text-center py-16 sm:py-24 mb-8">
          <div className="text-6xl sm:text-8xl mb-6 opacity-50">🔌</div>
          <h3
            className="text-[var(--text-primary)] font-['Poppins',sans-serif] mb-2"
            style={{ fontSize: '20px', fontWeight: 600 }}
          >
            No extension sources found
          </h3>
          <p className="text-[var(--text-secondary)] font-['Inter',sans-serif]">
            Try adjusting your filters or search query
          </p>
        </div>
      )}

      {/* Results Count */}
      {filteredAndSortedExtensions.length > 0 && (
        <div className="text-center text-[var(--text-secondary)] font-['Inter',sans-serif] text-sm mb-8">
          Showing {filteredAndSortedExtensions.length} extension {filteredAndSortedExtensions.length === 1 ? 'source' : 'sources'}
        </div>
      )}
    </div>
  );
}