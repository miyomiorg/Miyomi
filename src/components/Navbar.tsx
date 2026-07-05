"use client";

import { X, ChevronDown, Github, Instagram, Youtube, Facebook, Plus, Search, Menu, Heart, HelpCircle, Info, ArrowUpCircle, MessageSquare, LayoutGrid, Puzzle, FileText, Users } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import { FeedbackPanel } from './FeedbackPanel';
import { ThemeToggle } from './ThemeToggle';
import { SearchModal } from './SearchModal';
import { useSeasonalAsset } from '../hooks/useSeasonalAsset';
import { useLocation, useNavigate } from 'react-router-dom';
import { ParticleEffect } from './ParticleEffect';
import { useThemeEngineContext } from '@/hooks/useThemeEngine';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { TelegramIcon } from './TelegramIcon';
import { DiscordIcon } from './DiscordIcon';
import { getPerformanceTier } from '../utils/performanceTier';

interface NavbarProps {
  onNavigate?: (path: string) => void;
  mobileMenuOpen?: boolean;
  setMobileMenuOpen?: (open: boolean) => void;
}

function NavbarParticles() {
  try {
    const tier = getPerformanceTier();
    if (tier === 'low') return null;

    const { particleConfig } = useThemeEngineContext();
    if (!particleConfig || particleConfig.type === 'none') return null;

    const countOverride = tier === 'medium' ? 8 : 15;
    return <ParticleEffect className="absolute inset-0 z-0" config={particleConfig} countOverride={countOverride} />;
  } catch {
    return null;
  }
}

export function Navbar({
  onNavigate,
  mobileMenuOpen: propsMobileMenuOpen,
  setMobileMenuOpen: propsSetMobileMenuOpen,
}: NavbarProps) {
  const [localMobileMenuOpen, localSetMobileMenuOpen] = useState(false);
  const mobileMenuOpen = propsMobileMenuOpen !== undefined ? propsMobileMenuOpen : localMobileMenuOpen;
  const setMobileMenuOpen = propsSetMobileMenuOpen !== undefined ? propsSetMobileMenuOpen : localSetMobileMenuOpen;

  const [scrolled, setScrolled] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [pagesDropdownOpen, setPagesDropdownOpen] = useState(false);
  const [guidesDropdownOpen, setGuidesDropdownOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const hoverTimeouts = useRef<{ pages: number | null; guides: number | null }>({
    pages: null,
    guides: null,
  });
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    const handleOpenSearchModal = () => setSearchModalOpen(true);

    handleScroll();
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('open-search-modal', handleOpenSearchModal);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('open-search-modal', handleOpenSearchModal);
    };
  }, []);

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key.toLowerCase() === 's' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        if (location.pathname === '/') {
          const heroSearchInput = document.getElementById('hero-search-input');
          if (heroSearchInput) {
            heroSearchInput.focus();
          }
        } else {
          setSearchModalOpen(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [location.pathname]);

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
    setExpandedSection(null);
  }, [location.pathname]);

  useEffect(() => {
    return () => {
      (['pages', 'guides'] as const).forEach((section) => {
        const timeoutId = hoverTimeouts.current[section];
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      });
    };
  }, []);

  const logoImage = useSeasonalAsset('logo', '/hugme.webp');

  const pageDropdownItems = [
    { label: 'Software', path: '/software', className: 'xl:hidden' },
    { label: 'Extensions', path: '/extensions', className: 'xl:hidden' },
    { label: 'Blog', path: '/blog' },
    { label: 'Guides', path: '/guides' },
    { label: 'FAQ', path: '/faq' },
    { label: 'About', path: '/about' },
    { label: 'Privacy Policy', path: '/privacy-policy' },
  ];

  // const guidesNavItems = [
  //   { label: 'All Guides', path: '/guides' },
  //   { label: 'Installation', path: '/guides#installation' },
  //   { label: 'Configuration', path: '/guides#configuration' },
  //   { label: 'Troubleshooting', path: '/guides#troubleshooting' },
  // ];

  const socialLinks = [
    { icon: <DiscordIcon className="w-5 h-5" />, label: 'Discord', link: 'https://discord.gg/hfYtH9hrRm', color: '#5865F2', showDesktop: true, showMobile: true },
    { icon: <Github className="w-5 h-5" />, label: 'GitHub', link: 'https://github.com/miyomiorg/Miyomi', showDesktop: true, showMobile: true },
    { icon: <TelegramIcon className="w-5 h-5" />, label: 'Telegram', link: 'https://t.me/iitachiyomi', color: '#1877F2', showDesktop: false, showMobile: true },
    { icon: <Youtube className="w-5 h-5" />, label: 'YouTube', link: 'https://www.youtube.com/@iitachiyomi', color: '#FF0000', showDesktop: false, showMobile: true },
  ];

  const handleClick = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      navigate(path);
    }
    setMobileMenuOpen(false);
  };

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const clearHoverTimeout = (section: 'pages' | 'guides') => {
    const timeoutId = hoverTimeouts.current[section];
    if (timeoutId) {
      clearTimeout(timeoutId);
      hoverTimeouts.current[section] = null;
    }
  };

  const openDropdown = (section: 'pages' | 'guides') => {
    clearHoverTimeout(section);
    if (section === 'pages') {
      setPagesDropdownOpen(true);
    } else {
      setGuidesDropdownOpen(true);
    }
  };

  const scheduleDropdownClose = (section: 'pages' | 'guides') => {
    clearHoverTimeout(section);
    hoverTimeouts.current[section] = window.setTimeout(() => {
      if (section === 'pages') {
        setPagesDropdownOpen(false);
      } else {
        setGuidesDropdownOpen(false);
      }
      hoverTimeouts.current[section] = null;
    }, 150);
  };

  const renderDropdownItem = (item: { label: string; path: string; className?: string }) => (
    <DropdownMenuItem
      key={item.path}
      onClick={() => handleClick(item.path)}
      className={`cursor-pointer ${isActive(item.path)
        ? 'text-[var(--brand)] bg-[var(--chip-bg)]'
        : 'text-[var(--text-primary)] hover:bg-[var(--bg-elev-1)]'
        } ${item.className || ''}`}
      style={{ fontWeight: isActive(item.path) ? 600 : 400 }}
    >
      {item.label}
    </DropdownMenuItem>
  );

  return (
    <>
      <SearchModal isOpen={searchModalOpen} onClose={() => setSearchModalOpen(false)} />
      {isFeedbackOpen && (
        <FeedbackPanel page="global" onClose={() => setIsFeedbackOpen(false)} />
      )}

      <nav
        className={`h-16 fixed top-0 left-0 right-0 z-[999] transition-all duration-300 ${scrolled
          ? 'bg-[var(--bg-page)]/80 backdrop-blur-xl border-b border-[var(--divider)]/50 shadow-sm'
          : 'bg-transparent'
          }`}
        style={{ willChange: scrolled ? 'transform, backdrop-filter' : 'auto' }}
      >
        {/* Background Particles Wrapper */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <NavbarParticles />
        </div>

        {/* Navbar Content */}
        <div className="relative z-10 h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between w-full gap-2 lg:gap-4">
          {/* Left Section: Logo & Segmented Nav */}
          <div className="flex items-center gap-4 lg:gap-8">
            <button
              onClick={() => handleClick('/')}
              className="flex items-center gap-2 cursor-pointer group flex-shrink-0"
            >
              <img src={logoImage} alt="Miyomi" className="w-8 h-8 object-contain group-hover:scale-110 transition-transform" />
              <span className="text-[var(--brand)] font-['Poppins',sans-serif] text-lg" style={{ fontWeight: 600 }}>
                Miyomi
              </span>
            </button>

            {/* Center Section: Segmented Navigation (Desktop Only) */}
            <div className="hidden lg:flex items-center gap-1 rounded-full p-1">
              <button
                onClick={() => handleClick('/software')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-['Inter',sans-serif] transition-all rounded-full ${isActive('/software') ? 'bg-[var(--bg-surface)] text-[var(--brand)] shadow-sm font-medium' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elev-2)]'}`}
              >
                {/* <LayoutGrid className="w-4 h-4" /> */}
                <span>Software</span>
              </button>

              <button
                onClick={() => handleClick('/extensions')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-['Inter',sans-serif] transition-all rounded-full ${isActive('/extensions') ? 'bg-[var(--bg-surface)] text-[var(--brand)] shadow-sm font-medium' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elev-2)]'}`}
              >
                {/* <Puzzle className="w-4 h-4" /> */}
                <span>Extensions</span>
              </button>

              {/* Pages Dropdown - Hover Trigger */}
              <DropdownMenu open={pagesDropdownOpen} onOpenChange={setPagesDropdownOpen}>
                <DropdownMenuTrigger asChild>
                  <button
                    onPointerDown={(event) => event.preventDefault()}
                    onMouseEnter={() => openDropdown('pages')}
                    onMouseLeave={() => scheduleDropdownClose('pages')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-['Inter',sans-serif] transition-all rounded-full outline-none ${pagesDropdownOpen ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elev-2)]'}`}
                  >
                    {/* <FileText className="w-4 h-4" /> */}
                    <span>Pages</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  sideOffset={6}
                  onMouseEnter={() => openDropdown('pages')}
                  onMouseLeave={() => scheduleDropdownClose('pages')}
                  className="w-48 bg-[var(--bg-page)]/90 backdrop-blur-xl border border-[var(--divider)]/50 rounded-xl shadow-sm p-1 transition-all duration-200 ease-out"
                >
                  {pageDropdownItems.map(renderDropdownItem)}
                </DropdownMenuContent>
              </DropdownMenu>

              <button
                onClick={() => handleClick('/contribute')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-['Inter',sans-serif] transition-all rounded-full ${isActive('/contribute') ? 'bg-[var(--bg-surface)] text-[var(--brand)] shadow-sm font-medium' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elev-2)]'}`}
              >
                {/* <Users className="w-4 h-4" /> */}
                <span>Contribute</span>
              </button>

              <button
                onClick={() => setIsFeedbackOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-['Inter',sans-serif] transition-all rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elev-2)]"
              >
                {/* <MessageSquare className="w-4 h-4" /> */}
                <span>Feedback</span>
              </button>
            </div>
          </div>

          {/* Right Section: Search, Donate, Theme, Social Links */}
          <div className="hidden md:flex items-center gap-1.5 lg:gap-2">

            {/* Desktop Search Box */}
            {location.pathname !== '/' && (
              <button
                onClick={() => setSearchModalOpen(true)}
                className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--bg-elev-1)]/80 backdrop-blur-md border border-[var(--divider)]/50 hover:bg-[var(--bg-elev-2)] hover:border-[var(--brand)]/50 transition-all text-sm group w-48 xl:w-56"
              >
                <Search className="w-4 h-4 flex-shrink-0 text-[var(--text-secondary)] group-hover:text-[var(--brand)] transition-colors" />
                <span className="text-[var(--text-secondary)] font-medium mr-auto truncate">Search...</span>
                <kbd className="hidden sm:inline-block flex-shrink-0 px-1.5 py-0.5 text-[10px] font-mono text-[var(--text-secondary)] bg-[var(--chip-bg)] border border-[var(--divider)] rounded opacity-70 group-hover:opacity-100 transition-opacity">
                  S
                </kbd>
              </button>
            )}

            {/* Search Icon for Tablet (Hidden on desktop lg+) */}
            {location.pathname !== '/' && (
              <button
                onClick={() => setSearchModalOpen(true)}
                className="lg:hidden p-2 text-[var(--text-secondary)] hover:text-[var(--brand)] transition-colors relative group"
                aria-label="Search"
              >
                <Search className="w-5 h-5" />
              </button>
            )}

            {/* Donate Button — highlighted */}
            <button
              onClick={() => handleClick('/donate')}
              className="relative flex items-center gap-1 text-sm py-1.5 px-2.5 lg:px-3 lg:ml-1 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 text-white font-medium font-['Inter',sans-serif] hover:shadow-lg hover:shadow-pink-500/25 hover:scale-105 active:scale-95 transition-all duration-200"
            >
              <Heart className="w-3.5 h-3.5 fill-current" />
              Donate
              {/* Subtle ping animation */}
              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-300 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-pink-200" />
              </span>
            </button>

            <div className="w-px h-6 bg-[var(--divider)] mx-1"></div>

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Social Links */}
            <div className="flex items-center gap-0.5">
              {socialLinks.filter(social => social.showDesktop).map((social, index) => (
                <a
                  key={index}
                  href={social.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-[var(--text-secondary)] hover:text-[var(--brand)] rounded-full hover:bg-[var(--bg-elev-1)] transition-colors"
                  aria-label={social.label}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Mobile Actions */}
          <div className="md:hidden flex items-center gap-1">
            {location.pathname !== '/' && (
              <button
                onClick={() => setSearchModalOpen(true)}
                className="p-2 text-[var(--text-secondary)] hover:text-[var(--brand)] transition-colors"
                aria-label="Search"
              >
                <Search className="w-5 h-5" />
              </button>
            )}
            <ThemeToggle />
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay (Backdrop) */}
      <div
        className={`fixed inset-0 z-[997] md:hidden transition-opacity duration-300 ${mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        style={{
          backgroundColor: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          willChange: 'opacity, transform',
        }}
        onClick={() => setMobileMenuOpen(false)}
      />

      {/* Mobile Menu Drawer (Slide-in from Bottom) */}
      <div
        className={`fixed left-0 right-0 bottom-0 max-h-[80vh] w-full z-[998] md:hidden bg-[var(--bg-page)]/95 backdrop-blur-xl border-t border-[var(--divider)]/50 shadow-2xl rounded-t-3xl flex flex-col transition-transform duration-300 ease-in-out ${mobileMenuOpen ? 'translate-y-0' : 'translate-y-full'
          }`}
        style={{ willChange: 'transform' }}
      >
        {/* Drawer Header */}
        <div className="pt-6 pb-4 px-6 border-b border-[var(--divider)]/50 flex items-center justify-between">
          <span className="text-[var(--brand)] font-['Poppins',sans-serif] text-lg font-semibold">
            Menu
          </span>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors focus:outline-none cursor-pointer"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Content */}
        <div
          className="flex-1 overflow-y-auto px-6 pt-6 space-y-6"
          style={{ paddingBottom: 'calc(4rem + env(safe-area-inset-bottom) + 1.5rem)' }}
        >
          <div className="space-y-1">
            {/* Blog Link */}
            <button
              onClick={() => handleClick('/blog')}
              className={`w-full flex items-center gap-3 py-3 px-4 rounded-xl transition-all text-left ${isActive('/blog')
                ? 'text-[var(--brand)] bg-[var(--chip-bg)] font-semibold'
                : 'text-[var(--text-primary)] hover:bg-[var(--bg-elev-1)] hover:text-[var(--brand)]'
                }`}
            >
              <FileText className="w-5 h-5 opacity-70" />
              <span className="text-sm font-['Inter',sans-serif]">Blog</span>
            </button>

            {/* FAQ Link */}
            <button
              onClick={() => handleClick('/faq')}
              className={`w-full flex items-center gap-3 py-3 px-4 rounded-xl transition-all text-left ${isActive('/faq')
                ? 'text-[var(--brand)] bg-[var(--chip-bg)] font-semibold'
                : 'text-[var(--text-primary)] hover:bg-[var(--bg-elev-1)] hover:text-[var(--brand)]'
                }`}
            >
              <HelpCircle className="w-5 h-5 opacity-70" />
              <span className="text-sm font-['Inter',sans-serif]">FAQ</span>
            </button>

            {/* About Link */}
            <button
              onClick={() => handleClick('/about')}
              className={`w-full flex items-center gap-3 py-3 px-4 rounded-xl transition-all text-left ${isActive('/about')
                ? 'text-[var(--brand)] bg-[var(--chip-bg)] font-semibold'
                : 'text-[var(--text-primary)] hover:bg-[var(--bg-elev-1)] hover:text-[var(--brand)]'
                }`}
            >
              <Info className="w-5 h-5 opacity-70" />
              <span className="text-sm font-['Inter',sans-serif]">About</span>
            </button>

            {/* Contribute Link */}
            <button
              onClick={() => handleClick('/contribute')}
              className={`w-full flex items-center gap-3 py-3 px-4 rounded-xl transition-all text-left ${isActive('/contribute')
                ? 'text-[var(--brand)] bg-[var(--chip-bg)] font-semibold'
                : 'text-[var(--text-primary)] hover:bg-[var(--bg-elev-1)] hover:text-[var(--brand)]'
                }`}
            >
              <ArrowUpCircle className="w-5 h-5 opacity-70" />
              <span className="text-sm font-['Inter',sans-serif]">Contribute</span>
            </button>

            {/* Feedback Link */}
            <button
              onClick={() => {
                setIsFeedbackOpen(true);
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-3 py-3 px-4 rounded-xl transition-all text-left text-[var(--text-primary)] hover:bg-[var(--bg-elev-1)] hover:text-[var(--brand)]"
            >
              <MessageSquare className="w-5 h-5 opacity-70" />
              <span className="text-sm font-['Inter',sans-serif]">Feedback</span>
            </button>
          </div>

          {/* Support Miyomi Button */}
          <div>
            <button
              onClick={() => handleClick('/donate')}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white font-medium font-['Inter',sans-serif] hover:shadow-lg transition-all cursor-pointer"
            >
              <Heart className="w-4 h-4 fill-current" />
              Support Miyomi
            </button>
          </div>

          {/* Socials section */}
          <div className="pt-6 border-t border-[var(--divider)]/50">
            <h4 className="text-xs font-semibold text-[var(--text-secondary)] mb-3 uppercase tracking-wider">
              Join Our Community
            </h4>
            <div className="flex flex-wrap gap-2">
              {socialLinks.filter(social => social.showMobile).map((social, index) => (
                <a
                  key={index}
                  href={social.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 bg-[var(--bg-surface)] hover:bg-[var(--chip-bg)] border border-[var(--divider)] hover:border-[var(--brand)] text-[var(--text-secondary)] hover:text-[var(--brand)] rounded-xl transition-all flex items-center justify-center flex-1"
                  aria-label={social.label}
                  title={social.label}
                >
                  {React.cloneElement(social.icon, { className: 'w-5 h-5' })}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
