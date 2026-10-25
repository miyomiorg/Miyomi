import { useEffect, useState, useRef, useMemo } from 'react';
import { BookOpen, Download, Settings, HelpCircle, ArrowRight, Search, Clock, FileText } from 'lucide-react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useGuideCategories } from '@/hooks/useGuideCategories';
import { usePublicSettings } from '@/hooks/usePublicSettings';
import { Skeleton } from '@/components/ui/skeleton';

interface GuidesPageProps {
  onNavigate?: (path: string) => void;
}

const STORAGE_KEY = 'miyomi-guides-state';

export function GuidesPage({ onNavigate }: GuidesPageProps) {
  const location = useLocation();
  const navigationType = useNavigationType();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { categories: guideCategories, loading } = useGuideCategories();
  const { settings } = usePublicSettings();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategoryId, setActiveCategoryId] = useState<string>('all');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const [noticeDismissed, setNoticeDismissed] = useState(false);

  const noticeEnabled = settings?.guide_notice_enabled === 'true' || settings?.guide_notice_enabled === true;
  const noticeContent = typeof settings?.guide_notice_content === 'string' ? settings.guide_notice_content : '';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (navigationType === 'POP' && location.state?.activeCategoryId) {
      setActiveCategoryId(location.state.activeCategoryId);
      return;
    }

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.activeCategoryId) setActiveCategoryId(parsed.activeCategoryId);
      }
    } catch (e) {
      console.error('Failed to restore guides state:', e);
    }
  }, [navigationType, location.state]);

  const iconMap = {
    download: Download,
    settings: Settings,
    book: BookOpen,
    help: HelpCircle,
  } as const;

  useEffect(() => {
    if (!loading) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ activeCategoryId }));
      } catch (e) {
        console.error('Failed to save guides state:', e);
      }
    }
  }, [activeCategoryId, loading]);

  useEffect(() => {
    if (navigationType === 'POP' && location.state?.scrollPosition && !loading) {
      setTimeout(() => {
        window.scrollTo({
          top: location.state.scrollPosition,
          behavior: 'instant' as ScrollBehavior,
        });
      }, 0);
    }
  }, [navigationType, location.state, loading]);

  const handleGuideClick = (slug: string) => {
    const state = {
      activeCategoryId,
      scrollPosition: window.scrollY,
    };

    if (onNavigate) {
      onNavigate(`/guides/${slug}`);
      window.history.replaceState(state, '');
    }
  };

  const totalGuides = guideCategories.reduce((sum, cat) => sum + cat.guides.length, 0);

  // Flatten and filter guides
  const filteredGuides = useMemo(() => {
    const allGuides = guideCategories.flatMap(cat =>
      cat.guides.map(g => ({ ...g, categoryObj: cat }))
    );

    return allGuides.filter(guide => {
      const matchesSearch = guide.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (guide.summary && guide.summary.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = activeCategoryId === 'all' || guide.categoryObj.id === activeCategoryId;
      return matchesSearch && matchesCategory;
    });
  }, [guideCategories, searchQuery, activeCategoryId]);

  return (
    <div className="max-w-7xl mx-auto" ref={scrollContainerRef}>
      {/* Notice Banner */}
      {noticeEnabled && noticeContent && !noticeDismissed && (
        <div className="mb-6 relative group">
          <div dangerouslySetInnerHTML={{ __html: noticeContent }} />
          <button
            onClick={() => setNoticeDismissed(true)}
            className="absolute top-3 right-4 p-1 rounded-md transition-colors hover:bg-[var(--bg-elev-2)] text-[var(--text-secondary)] opacity-0 group-hover:opacity-100"
            title="Dismiss"
          >
            <span className="sr-only">Close</span>
          </button>
        </div>
      )}

      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center gap-3">
          <h1
            className="text-[var(--text-primary)] font-['Poppins',sans-serif]"
            style={{ fontSize: 'clamp(28px, 5vw, 40px)', lineHeight: '1.2', fontWeight: 700 }}
          >
            Guides
          </h1>
        </div>
        <p className="text-[var(--text-secondary)] font-['Inter',sans-serif]" style={{ fontSize: '16px' }}>
          Step-by-step tutorials for setting up and using your favorite apps.
        </p>
      </div>

      {/* Search */}
      <div className="mb-4 sm:mb-5 relative" ref={searchContainerRef}>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)] pointer-events-none flex-shrink-0" />
          <input
            type="text"
            className="w-full pl-8 pr-4 py-2 mt-1 bg-[var(--bg-surface)] border border-[var(--divider)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--brand)] transition-colors font-['Inter',sans-serif] text-sm"
            placeholder="Search guides by title, summary, or keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
          />

          {/* Auto-suggestion Dropdown */}
          <AnimatePresence>
            {isSearchFocused && searchQuery.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full left-0 right-0 mt-2 bg-[var(--bg-surface)] border border-[var(--divider)] rounded-xl shadow-xl z-50 overflow-hidden"
              >
                {filteredGuides.length > 0 ? (
                  <div className="max-h-[300px] overflow-y-auto">
                    {filteredGuides.slice(0, 5).map((guide) => (
                      <button
                        key={guide.id}
                        onClick={() => {
                          setSearchQuery('');
                          setIsSearchFocused(false);
                          handleGuideClick(guide.slug);
                        }}
                        className="group w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-[var(--chip-bg)] transition-colors border-b border-[var(--divider)] last:border-b-0"
                      >
                        <FileText className="w-4 h-4 text-[var(--text-secondary)] flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-[var(--text-primary)] truncate font-['Inter',sans-serif]">
                            {guide.title}
                          </div>
                          <div className="text-xs text-[var(--text-secondary)] font-['Inter',sans-serif] mt-0.5">
                            {guide.categoryObj.title}
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-[var(--brand)] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                      </button>
                    ))}
                    {filteredGuides.length > 5 && (
                      <div className="px-4 py-2 text-xs text-center text-[var(--text-secondary)] font-medium bg-[var(--bg-elev-1)]">
                        View {filteredGuides.length - 5} more matching guides below
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="px-4 py-6 text-sm text-center text-[var(--text-secondary)] font-['Inter',sans-serif]">
                    No results found for "{searchQuery}"
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Categories */}
      <div className="mb-6">
        {loading && guideCategories.length === 0 ? (
          <div className="flex gap-2 overflow-hidden">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-9 w-24 rounded-full flex-shrink-0" />
            ))}
          </div>
        ) : (
          <div className="flex overflow-x-auto scrollbar-hide sm:flex-wrap gap-2 pb-1 sm:pb-0">
            <button
              onClick={() => setActiveCategoryId('all')}
              className={`flex-shrink-0 px-4 py-2 rounded-full font-['Inter',sans-serif] text-sm font-medium transition-all ${activeCategoryId === 'all'
                ? 'bg-[var(--brand)] text-white shadow-md'
                : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--chip-bg)] hover:text-[var(--text-primary)] border border-[var(--divider)]'
                }`}
            >
              All Guides ({totalGuides})
            </button>

            {guideCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategoryId(category.id)}
                className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full font-['Inter',sans-serif] text-sm font-medium transition-all ${activeCategoryId === category.id
                  ? 'bg-[var(--brand)] text-white shadow-md'
                  : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--chip-bg)] hover:text-[var(--text-primary)] border border-[var(--divider)]'
                  }`}
              >
                {category.title}
                <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] ${activeCategoryId === category.id ? 'bg-white/20 text-white' : 'bg-[var(--bg-elev-1)] text-[var(--text-secondary)]'
                  }`}>
                  {category.guides.length}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Guide Cards Grid */}
      <div className="mb-16">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="rounded-2xl border p-6 space-y-4" style={{ borderColor: 'var(--divider)' }}>
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-xl" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <div className="pt-4 border-t" style={{ borderColor: 'var(--divider)' }}>
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredGuides.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGuides.map((guide) => {
              const Icon = iconMap[guide.categoryObj.icon] || FileText;

              return (
                <button
                  key={guide.id}
                  onClick={() => handleGuideClick(guide.slug)}
                  className="group relative flex flex-col items-start p-6 bg-[var(--bg-surface)] border border-[var(--divider)] hover:border-[var(--brand)] rounded-2xl transition-all text-left overflow-hidden hover:-translate-y-1 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-[var(--brand)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

                  {/* Category Badge & Icon */}
                  <div className="relative flex items-center gap-3 mb-4">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0 shadow-sm"
                      style={{ backgroundColor: guide.categoryObj.color }}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-['Inter',sans-serif] font-medium text-[var(--text-secondary)] tracking-wide uppercase">
                      {guide.categoryObj.title}
                    </span>
                  </div>

                  {/* Title & Summary */}
                  <div className="relative flex-1 w-full mb-6">
                    <h3 className="font-['Poppins',sans-serif] text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors line-clamp-2 mb-2" style={{ fontSize: '18px', fontWeight: 600, lineHeight: '1.4' }}>
                      {guide.title}
                    </h3>
                    {guide.summary && (
                      <p className="text-[var(--text-secondary)] font-['Inter',sans-serif] text-sm line-clamp-2 leading-relaxed">
                        {guide.summary}
                      </p>
                    )}
                  </div>

                  {/* Metadata Footer */}
                  <div className="relative w-full flex items-center justify-between pt-4 border-t border-[var(--divider)] mt-auto text-xs font-['Inter',sans-serif] text-[var(--text-secondary)]">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{guide.readTime || '5 min read'}</span>
                    </div>

                    <div className="flex items-center gap-1 text-[var(--brand)] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      Read Guide <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20 bg-[var(--bg-surface)] border border-[var(--divider)] rounded-3xl shadow-sm"
          >
            <div className="w-20 h-20 bg-[var(--bg-elev-1)] rounded-full flex items-center justify-center mx-auto mb-6">
              <Search className="w-10 h-10 text-[var(--text-secondary)] opacity-50" />
            </div>
            <h3 className="text-xl font-['Poppins',sans-serif] text-[var(--text-primary)] font-semibold mb-2">No guides found</h3>
            <p className="text-[var(--text-secondary)] font-['Inter',sans-serif] mb-8 max-w-md mx-auto">
              We couldn't find any guides matching "{searchQuery}". Try using different keywords or exploring categories.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <button
                onClick={() => { setSearchQuery(''); setActiveCategoryId('all'); }}
                className="px-6 py-2 bg-[var(--brand)] text-white font-medium rounded-xl hover:bg-[var(--brand-strong)] transition-colors"
              >
                Clear Search
              </button>
              <button
                onClick={() => onNavigate?.('/submit-guide')}
                className="px-6 py-2 bg-[var(--bg-elev-1)] border border-[var(--divider)] text-[var(--text-primary)] font-medium rounded-xl hover:bg-[var(--bg-elev-2)] transition-colors flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Write a Guide
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => onNavigate?.('/faq')}
          className="group relative p-6 bg-[var(--bg-surface)] border border-[var(--divider)] rounded-2xl hover:shadow-lg hover:border-[var(--brand)] transition-all text-left overflow-hidden"
          style={{ boxShadow: '0 6px 20px 0 rgba(0,0,0,0.08)' }}
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#FFB3C1]/20 to-transparent rounded-bl-[100px] opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <HelpCircle className="w-5 h-5 text-[var(--brand)]" />
              <h3 className="font-['Poppins',sans-serif] text-[var(--text-primary)]" style={{ fontWeight: 600 }}>
                Still have questions?
              </h3>
            </div>
            <p className="text-[var(--text-secondary)] font-['Inter',sans-serif] text-sm">
              Check out our FAQ section for quick answers to common questions
            </p>
          </div>
        </button>

        <button
          onClick={() => onNavigate?.('/submit-guide')}
          className="group relative p-6 bg-[var(--bg-surface)] border border-[var(--divider)] rounded-2xl hover:shadow-lg hover:border-[var(--brand)] transition-all text-left overflow-hidden"
          style={{ boxShadow: '0 6px 20px 0 rgba(0,0,0,0.08)' }}
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[var(--brand)]/20 to-transparent rounded-bl-[100px] opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-[var(--brand)]" />
              <h3 className="font-['Poppins',sans-serif] text-[var(--text-primary)]" style={{ fontWeight: 600 }}>
                Write a Guide
              </h3>
            </div>
            <p className="text-[var(--text-secondary)] font-['Inter',sans-serif] text-sm">
              Share your knowledge by contributing a new tutorial or guide.
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}
