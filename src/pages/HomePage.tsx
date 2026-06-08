import { Plus, Package, Star, Twitter, MessageSquare, Facebook, Search, Youtube, Info, HelpCircle, ArrowUpCircle, Smartphone, Puzzle, BookOpen, Link, Sparkles, MonitorSmartphone } from 'lucide-react';
import { Button } from '../components/Button';
import React, { useState, useEffect, useRef } from 'react';
import { useAppMeta } from '../hooks/useAppMeta';
import { useFeedbackState } from '../hooks/useFeedbackState';
import { motion } from 'motion/react';
import { useSeasonalAsset } from '../hooks/useSeasonalAsset';
import { dataService } from '../services/dataService';
import type { ExtensionData, GuideCategoryData } from '../types/data';
import { DiscordIcon } from '../components/DiscordIcon';
import { TelegramIcon } from '../components/TelegramIcon';
import { useGlobalSearch } from '../hooks/useGlobalSearch';

interface HomePageProps {
  onNavigate?: (path: string) => void;
}

export function HomePage({ onNavigate }: HomePageProps) {
  const { apps: unifiedApps } = useAppMeta();
  const { isFeedbackOpen, handleToggle, handleClose } = useFeedbackState();
  const [extensionsCount, setExtensionsCount] = useState<number>(0);
  const [guidesCount, setGuidesCount] = useState<number>(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchResults = useGlobalSearch(searchQuery);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      const [exts, guides] = await Promise.all([
        dataService.getExtensions(),
        dataService.getGuideCategories()
      ]);
      setExtensionsCount(exts.length);
      const totalGuides = guides.reduce((total, category) => total + category.guides.length, 0);
      setGuidesCount(totalGuides);
    };
    fetchData();
  }, []);

  // Close search suggestions dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      onNavigate?.(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleSuggestionClick = (result: any) => {
    setIsSearchFocused(false);
    setSearchQuery('');
    if (result.type === 'app') {
      onNavigate?.(`/software/${result.slug || result.id}`);
    } else if (result.type === 'extension') {
      onNavigate?.(`/extensions/${result.slug || result.id}`);
    } else if (result.type === 'guide') {
      onNavigate?.(`/guides/${result.slug}`);
    }
  };

  const avatarImage = useSeasonalAsset('homeAvatar', '/polic.png');

  const socialLinks = [
    { icon: <DiscordIcon className="w-5 h-5" />, label: 'Discord', link: 'https://discord.gg/hfYtH9hrRm', color: '#5865F2' },
    { icon: <TelegramIcon className="w-5 h-5" />, label: 'Telegram', link: 'https://t.me/iitachiyomi', color: '#1877F2' },
    { icon: <Youtube className="w-5 h-5" />, label: 'YouTube', link: 'https://www.youtube.com/@iitachiyomi', color: '#FF0000' },
  ];

  const formatCount = (value: number) => {
    if (value >= 1000) {
      const formatted = value % 1000 === 0 ? (value / 1000).toString() : (value / 1000).toFixed(1).replace(/\.0$/, '');
      return `${formatted}k+`;
    }
    return `${value}+`;
  };

  return (
    <div className="max-w-7xl mx-auto pt-10 relative">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20 -z-10">
        <div className="absolute top-20 right-10 w-64 h-64 bg-gradient-to-br from-[#FBBF24] to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-40 left-10 w-72 h-72 bg-gradient-to-br from-[#38BDF8] to-transparent rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-[#F472B6] to-transparent rounded-full blur-3xl"></div>
      </div>

      {/* Hero Section */}
      <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center pb-2 relative z-20">
        {/* Mobile Avatar */}
        <div className="lg:hidden flex items-center justify-center mb-4">
          <div className="relative w-48 h-48">
            <div className="animate-float">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--chart-3)] via-[var(--chart-2)] to-[var(--chart-1)] rounded-full blur-2xl opacity-60 scale-110"></div>
                <img
                  src={avatarImage}
                  alt="Miyomi Mascot"
                  height={180}
                  width={180}
                  className="relative z-10 object-contain drop-shadow-2xl"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Left Content */}
        <div className="relative z-10 text-center lg:text-left">
          <div className="flex items-center justify-center lg:justify-start gap-3 mb-4">
            <h1
              className="text-[var(--brand)] font-['Poppins',sans-serif] relative inline-block"
              style={{ fontSize: 'clamp(32px, 8vw, 56px)', lineHeight: '1.1', fontWeight: 800, letterSpacing: '-0.02em' }}
            >
              Miyomi
              <div className="absolute -top-4 -right-8 w-16 h-16 bg-gradient-to-br from-[var(--chart-4)] to-[var(--chart-3)] rounded-2xl rotate-12 blur-xl opacity-40"></div>
            </h1>
          </div>

          <p
            className="text-[var(--text-primary)] font-['Inter',sans-serif] mb-4 lg:mb-8 leading-relaxed"
            style={{ fontSize: 'clamp(16px, 2vw, 18px)', lineHeight: '1.6' }}
          >
            Your one-stop hub for <span className="text-[var(--brand)]" style={{ fontWeight: 600 }}>apps, extensions</span> and more!
          </p>

          {/* Autocomplete Input Search */}
          <div ref={searchRef} className="max-w-md mx-auto lg:mx-0 mb-4 lg:mb-6 relative z-50">
            <div
              className={`w-full flex items-center gap-3 h-12 px-4 bg-[var(--bg-surface)] border rounded-xl transition-all shadow-sm ${isSearchFocused
                ? 'border-[var(--brand)] ring-2 ring-[var(--focus-ring)] ring-opacity-50'
                : 'border-[var(--divider)] hover:border-[var(--brand)]'
                }`}
              style={{ boxShadow: '0 6px 20px 0 rgba(0,0,0,0.06)' }}
            >
              <Search className="w-5 h-5 text-[var(--text-secondary)] flex-shrink-0" />
              <input
                type="text"
                placeholder="Search apps, extensions, guides..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchFocused(true);
                }}
                onKeyDown={handleSearchKeyDown}
                onFocus={() => setIsSearchFocused(true)}
                className="flex-1 bg-transparent outline-none text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] text-sm font-['Inter',sans-serif]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="p-1 hover:bg-[var(--chip-bg)] rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all focus:outline-none cursor-pointer"
                  aria-label="Clear search"
                >
                  <Plus className="w-4 h-4 rotate-45" />
                </button>
              )}
            </div>

            {/* Autocomplete Suggestions Box */}
            {isSearchFocused && searchQuery.trim().length > 0 && (
              <div
                className="absolute top-full left-0 right-0 mt-2 glass rounded-2xl z-50 animate-fade-in font-['Inter',sans-serif]"
              >
                <div className="max-h-60 overflow-y-auto py-2">
                  {searchResults.length === 0 ? (
                    <div className="px-4 py-3 text-xs text-[var(--text-secondary)] text-center">
                      No matches found
                    </div>
                  ) : (
                    <>
                      <div className="px-4 py-1 text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                        Suggestions
                      </div>
                      {searchResults.slice(0, 5).map((result) => {
                        const typeLabel =
                          result.type === 'app'
                            ? 'App'
                            : result.type === 'extension'
                              ? 'Extension'
                              : 'Guide';

                        const typeBgColor =
                          result.type === 'app'
                            ? 'bg-blue-500/10 text-blue-500'
                            : result.type === 'extension'
                              ? 'bg-purple-500/10 text-purple-500'
                              : 'bg-amber-500/10 text-amber-500';

                        return (
                          <button
                            key={`${result.type}-${result.id}`}
                            onClick={() => handleSuggestionClick(result)}
                            className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-left hover:bg-[var(--chip-bg)] transition-colors gap-3 cursor-pointer"
                          >
                            <span className="font-medium text-[var(--text-primary)] truncate flex-1">
                              {result.name}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${typeBgColor}`}>
                              {typeLabel}
                            </span>
                          </button>
                        );
                      })}
                      {searchResults.length > 5 && (
                        <button
                          onClick={() => onNavigate?.(`/search?q=${encodeURIComponent(searchQuery.trim())}`)}
                          className="w-full text-center px-4 py-2 border-t border-[var(--divider)]/30 text-[var(--brand)] hover:bg-[var(--chip-bg)] transition-colors text-xs font-semibold block cursor-pointer"
                        >
                          View all {searchResults.length} results
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Social Buttons - Centered Icon Only flex-row */}
          <div className="flex justify-center lg:justify-start gap-4 mb-4 lg:mb-8">
            {socialLinks.map((social, index) => (
              <button
                key={index}
                onClick={() => window.open(social.link, '_blank')}
                className="w-12 h-12 bg-[var(--bg-surface)] hover:bg-[var(--chip-bg)] border border-[var(--divider)] text-[var(--text-primary)] rounded-xl transition-all flex items-center justify-center shadow-sm hover:shadow-md hover:scale-105 active:scale-95 group cursor-pointer"
                title={social.label}
                aria-label={social.label}
              >
                <div className="transition-transform group-hover:scale-110 text-[var(--text-primary)] flex-shrink-0 flex items-center justify-center">
                  {social.icon}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Desktop Avatar */}
        <div className="hidden lg:flex items-center justify-center relative mx-auto">
          <div className="relative w-full max-w-lg">
            <div className="animate-float">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--chart-3)] via-[var(--chart-2)] to-[var(--chart-1)] rounded-full blur-3xl opacity-50 scale-110"></div>
                <img
                  src={avatarImage}
                  alt="Miyomi Mascot"
                  height={280}
                  width={280}
                  className="relative z-10 object-contain drop-shadow-2xl"
                />
              </div>
            </div>
            <div className="absolute -top-6 -left-6 w-24 h-24 bg-gradient-to-br from-[var(--chart-4)] to-transparent rounded-full blur-2xl animate-pulse"></div>
            <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-gradient-to-br from-[var(--chart-2)] to-transparent rounded-full blur-2xl animate-pulse delay-300"></div>
          </div>
        </div>
      </div>

      {/* Desktop Features / Community Card */}
      <div className="hidden md:block mb-8 relative z-10">
        <div className="">
          <h2 className="text-2xl font-bold text-[#1e3a8a] dark:text-[#60a5fa] font-['Poppins',sans-serif] mb-2 flex items-center gap-2">
            Made for the Community <span className="text-2xl">❤️</span>
          </h2>
          <p className="text-[var(--text-secondary)] font-['Inter',sans-serif] mb-6 flex items-center">
            Miyomi helps anime, manga and novel fans discover:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Software Card */}
            <div 
              onClick={() => onNavigate?.('/software')}
              className="bg-[var(--bg-page)] border border-[var(--divider)]/50 rounded-2xl p-4 flex items-center gap-4 hover:border-blue-500/50 transition-colors cursor-pointer group shadow-sm"
            >
              <div className="w-12 h-12 rounded-xl bg-[#2563eb] text-white flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                <Smartphone className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-[var(--text-primary)] text-sm mb-0.5">Software</h3>
                <p className="text-[11px] text-[var(--text-secondary)] leading-snug">Software for every Operating System</p>
              </div>
              <div className="text-[var(--text-secondary)] group-hover:text-blue-500 transition-colors flex-shrink-0 ml-2">&rarr;</div>
            </div>

            {/* Extensions Card */}
            <div 
              onClick={() => onNavigate?.('/extensions')}
              className="bg-[var(--bg-page)] border border-[var(--divider)]/50 rounded-2xl p-4 flex items-center gap-4 hover:border-purple-500/50 transition-colors cursor-pointer group shadow-sm"
            >
              <div className="w-12 h-12 rounded-xl bg-[#8b5cf6] text-white flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                <Puzzle className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-[var(--text-primary)] text-sm mb-0.5">Extensions</h3>
                <p className="text-[11px] text-[var(--text-secondary)] leading-snug line-clamp-2">Cloudstream, Aniyomi & Dantotsu Extension Repos & Guides</p>
              </div>
              <div className="text-[var(--text-secondary)] group-hover:text-purple-500 transition-colors flex-shrink-0 ml-2">&rarr;</div>
            </div>

            {/* Guides Card */}
            <div 
              onClick={() => onNavigate?.('/guides')}
              className="bg-[var(--bg-page)] border border-[var(--divider)]/50 rounded-2xl p-4 flex items-center gap-4 hover:border-orange-500/50 transition-colors cursor-pointer group shadow-sm"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-400 to-orange-400 text-white flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                <BookOpen className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-[var(--text-primary)] text-sm mb-0.5">Guides</h3>
                <p className="text-[11px] text-[var(--text-secondary)] leading-snug">Get started quickly with our comprehensive guides</p>
              </div>
              <div className="text-[var(--text-secondary)] group-hover:text-orange-500 transition-colors flex-shrink-0 ml-2">&rarr;</div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-4">
            <Sparkles className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <h3 className="text-[var(--text-primary)] font-bold text-lg">
              Everything organized in one searchable place.
            </h3>
          </div>
        </div>
      </div>

      {/* Mobile Features / Community Card */}
      <div className="md:hidden relative z-10">
        <div className="bg-[var(--bg-surface)] border border-[var(--divider)] rounded-[20px] p-4 shadow-sm">
          <h2 className="text-[16px] font-bold text-[var(--brand)] font-['Poppins',sans-serif] mb-1">
            Made for the Community ❤️
          </h2>
          <p className="text-xs text-[var(--text-secondary)] font-['Inter',sans-serif] mb-3">
            Miyomi helps anime and manga fans discover:
          </p>

          <div className="space-y-3 mb-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center flex-shrink-0">
                <MonitorSmartphone className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-[var(--text-primary)] text-xs mb-0.5">Software</h3>
                <p className="text-[11px] text-[var(--text-secondary)] leading-snug">for your Mobile and desktop</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center flex-shrink-0">
                <Puzzle className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-[var(--text-primary)] text-xs mb-0.5">Extensions & Plugins</h3>
                <p className="text-[11px] text-[var(--text-secondary)] leading-snug">that are compatible with your favorite apps</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-green-500/10 text-green-500 flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-[var(--text-primary)] text-xs mb-0.5">Helpful Guides</h3>
                <p className="text-[11px] text-[var(--text-secondary)] leading-snug">to setup and configure your favorite apps</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center flex-shrink-0">
                <Link className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-[var(--text-primary)] text-xs mb-0.5">Other resources</h3>
                <p className="text-[11px] text-[var(--text-secondary)] leading-snug">like links to App's socials, FAQs and more</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 pt-3 border-t border-[var(--divider)]/50">
            <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <p className="text-[11px] text-[var(--text-secondary)] font-medium leading-tight">
              Everything organized in one searchable place.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
