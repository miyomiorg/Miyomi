import React, { useEffect, useState, useRef } from 'react';
import { BookOpen, Download, Settings, HelpCircle, ChevronDown, ArrowRight, Sparkles } from 'lucide-react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { dataService } from '../services/dataService';
import type { GuideCategoryData } from '../types/data';
import { DevBanner } from '@/components/DevBanner';

interface GuidesPageProps {
  onNavigate?: (path: string) => void;
}

const STORAGE_KEY = 'miyomi-guides-state';

export function GuidesPage({ onNavigate }: GuidesPageProps) {
  const location = useLocation();
  const navigationType = useNavigationType();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [guideCategories, setGuideCategories] = useState<GuideCategoryData[]>([]);
  const [isLoading, setIsLoading] = useState(true);


  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchData = async () => {
      try {
        const categories = await dataService.getGuideCategories();
        setGuideCategories(categories);


        let initialExpanded = new Set<string>();

        if (navigationType === 'POP' && location.state?.expandedCategories) {
          initialExpanded = new Set(location.state.expandedCategories);
        } else {

          try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
              const parsed = JSON.parse(saved);
              initialExpanded = new Set(parsed.expandedCategories || []);
            }
          } catch (e) {
            console.error('Failed to restore guides state:', e);
          }
        }


        if (initialExpanded.size === 0 && categories.length > 0) {
          initialExpanded.add(categories[0].id);
        }

        setExpandedCategories(initialExpanded);
      } catch (error) {
        console.error('Failed to fetch guide categories:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [navigationType, location.state]);

  const iconMap = {
    download: Download,
    settings: Settings,
    book: BookOpen,
    help: HelpCircle,
  } as const;

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedCategories(new Set(guideCategories.map(c => c.id)));
  };

  const collapseAll = () => {
    setExpandedCategories(new Set());
  };


  useEffect(() => {

    if (!isLoading) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          expandedCategories: Array.from(expandedCategories),
        }));
      } catch (e) {
        console.error('Failed to save guides state:', e);
      }
    }
  }, [expandedCategories, isLoading]);


  useEffect(() => {
    if (navigationType === 'POP' && location.state?.scrollPosition && !isLoading) {
      setTimeout(() => {
        window.scrollTo({
          top: location.state.scrollPosition,
          behavior: 'instant' as ScrollBehavior,
        });
      }, 0);
    }
  }, [navigationType, location.state, isLoading]);


  useEffect(() => {
    if (isLoading) return;

    const hash = location.hash?.replace('#', '');
    if (!hash) {
      return;
    }

    const target = document.getElementById(hash);
    if (!target) {
      return;
    }


    const category = guideCategories.find(c => c.id === hash);
    if (category && !expandedCategories.has(hash)) {
      setExpandedCategories(prev => new Set([...prev, hash]));
    }

    window.requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [location.hash, expandedCategories, guideCategories, isLoading]);


  const handleGuideClick = (slug: string) => {

    const state = {
      expandedCategories: Array.from(expandedCategories),
      scrollPosition: window.scrollY,
    };


    if (onNavigate) {
      onNavigate(`/guides/${slug}`);

      window.history.replaceState(state, '');
    }
  };

  const totalGuides = guideCategories.reduce((sum, cat) => sum + cat.guides.length, 0);
  const expandedCount = expandedCategories.size;

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--brand)]"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto" ref={scrollContainerRef}>
      {/* Hero Section */}


      <div className="mb-6">
        <DevBanner section="Guides" />
      </div>


      <div className="mb-8 relative">
        {/* Decorative background glow - positioned safely */}
        <div className="absolute -top-4 left-0 w-32 h-32 bg-gradient-to-br from-[#FFB3C1]/20 to-[#FF6B9D]/10 rounded-full blur-3xl opacity-60 pointer-events-none -z-10"></div>

        <div className="flex items-center gap-3 mb-4">
          <h1
            className="text-[var(--text-primary)] font-['Poppins',sans-serif]"
            style={{ fontSize: 'clamp(32px, 5vw, 40px)', lineHeight: '1.2', fontWeight: 700 }}
          >
            Guides
          </h1>
        </div>

        <p className="text-[var(--text-secondary)] font-['Inter',sans-serif] mb-6" style={{ fontSize: '17px', lineHeight: '1.6' }}>
          Step-by-step tutorials to help you use and understand various apps and extensions.
        </p>

        {/* Stats & Controls Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-[var(--bg-surface)] border border-[var(--divider)] rounded-2xl">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[var(--brand)]" />
              <div>
                <div className="text-sm font-['Inter',sans-serif] text-[var(--text-secondary)]">
                  Total Guides
                </div>
                <div className="text-xl font-['Poppins',sans-serif] text-[var(--text-primary)]" style={{ fontWeight: 700 }}>
                  {totalGuides}
                </div>
              </div>
            </div>
            <div className="h-10 w-px bg-[var(--divider)]"></div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[var(--brand)]" />
              <div>
                <div className="text-sm font-['Inter',sans-serif] text-[var(--text-secondary)]">
                  Categories
                </div>
                <div className="text-xl font-['Poppins',sans-serif] text-[var(--text-primary)]" style={{ fontWeight: 700 }}>
                  {guideCategories.length}
                </div>
              </div>
            </div>
          </div>

          {/* Expand/Collapse Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={expandAll}
              className="px-4 py-2 text-sm font-['Inter',sans-serif] text-[var(--brand)] hover:bg-[var(--chip-bg)] rounded-lg transition-all"
              style={{ fontWeight: 500 }}
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="px-4 py-2 text-sm font-['Inter',sans-serif] text-[var(--text-secondary)] hover:bg-[var(--chip-bg)] rounded-lg transition-all"
              style={{ fontWeight: 500 }}
            >
              Collapse All
            </button>
          </div>
        </div>
      </div>

      {/* Guide Categories */}
      <div className="space-y-4 mb-12">
        {guideCategories.map((category, categoryIndex) => {
          const Icon = iconMap[category.icon];
          const isExpanded = expandedCategories.has(category.id);

          return (
            <motion.div
              key={category.id}
              id={category.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: categoryIndex * 0.1 }}
              className="bg-[var(--bg-surface)] border border-[var(--divider)] rounded-2xl overflow-hidden scroll-mt-24 hover:border-[var(--brand)]/30 transition-all"
              style={{ boxShadow: '0 6px 20px 0 rgba(0,0,0,0.08)' }}
            >
              {/* Category Header - Clickable */}
              <button
                onClick={() => toggleCategory(category.id)}
                className="w-full p-5 sm:p-6 flex items-center gap-4 hover:bg-[var(--bg-elev-1)] transition-colors text-left"
              >
                {/* Icon */}
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center text-white flex-shrink-0 shadow-lg"
                  style={{ backgroundColor: category.color }}
                >
                  <Icon className="w-7 h-7" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-['Poppins',sans-serif] text-[var(--text-primary)] mb-1 flex items-center gap-2" style={{ fontWeight: 600, fontSize: '18px' }}>
                    {category.title}
                    <span className="inline-flex items-center justify-center px-2 py-0.5 bg-[var(--chip-bg)] rounded-md text-xs font-['Inter',sans-serif] text-[var(--text-secondary)]" style={{ fontWeight: 600 }}>
                      {category.guides.length}
                    </span>
                  </h3>
                  <p className="text-[var(--text-secondary)] font-['Inter',sans-serif] text-sm sm:text-base">
                    {category.description}
                  </p>
                </div>

                {/* Chevron */}
                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="flex-shrink-0"
                >
                  <ChevronDown className="w-6 h-6 text-[var(--text-secondary)]" />
                </motion.div>
              </button>

              {/* Guides List - Expandable */}
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {category.guides.map((guide, index) => (
                          <motion.button
                            key={guide.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            onClick={() => handleGuideClick(guide.slug)}
                            className="group relative p-4 bg-[var(--bg-elev-1)] hover:bg-[var(--chip-bg)] border border-transparent hover:border-[var(--brand)] rounded-xl transition-all text-left overflow-hidden"
                          >
                            {/* Hover glow effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-[var(--brand)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

                            <div className="relative flex items-start gap-3">
                              {/* Number badge */}
                              <div className="flex-shrink-0 w-6 h-6 rounded-md bg-[var(--brand)]/10 flex items-center justify-center">
                                <span className="text-xs font-['Inter',sans-serif] text-[var(--brand)]" style={{ fontWeight: 700 }}>
                                  {index + 1}
                                </span>
                              </div>

                              {/* Guide title */}
                              <div className="flex-1 min-w-0">
                                <span className="text-[var(--text-primary)] font-['Inter',sans-serif] group-hover:text-[var(--brand)] transition-colors line-clamp-2" style={{ fontSize: '14px', fontWeight: 500 }}>
                                  {guide.title}
                                </span>
                              </div>

                              {/* Arrow icon */}
                              <ArrowRight className="flex-shrink-0 w-4 h-4 text-[var(--brand)] opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
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
      </div>
    </div>
  );
}
