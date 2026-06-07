"use client";

import { X, ChevronDown, Github, Instagram, Youtube, Facebook, Plus, Search, Menu, Heart, HelpCircle, Info, ArrowUpCircle, MessageSquare } from 'lucide-react';
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

interface NavbarProps {
  onNavigate?: (path: string) => void;
  mobileMenuOpen?: boolean;
  setMobileMenuOpen?: (open: boolean) => void;
}

function NavbarParticles() {
  try {
    const { particleConfig } = useThemeEngineContext();
    if (!particleConfig || particleConfig.type === 'none') return null;
    return <ParticleEffect className="absolute inset-0 z-0" config={particleConfig} countOverride={15} />;
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

    handleScroll();
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchModalOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  const logoImage = useSeasonalAsset('logo', '/hugme.png');

  const pageDropdownItems = [
    { label: 'Software', path: '/software', className: 'xl:hidden' },
    { label: 'Extensions', path: '/extensions', className: 'xl:hidden' },
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
    // { icon: <Facebook className="w-5 h-5" />, label: 'Facebook', link: 'https://www.facebook.com/iitachiyomi' },
    { icon: <DiscordIcon className="w-5 h-5" />, label: 'Discord', link: 'https://discord.gg/hfYtH9hrRm', color: '#5865F2' },
    { icon: <TelegramIcon className="w-5 h-5" />, label: 'Telegram', link: 'https://t.me/iitachiyomi', color: '#1877F2' },
    { icon: <Youtube className="w-5 h-5" />, label: 'YouTube', link: 'https://www.youtube.com/@iitachiyomi' },
    // { icon: <Instagram className="w-5 h-5" />, label: 'Instagram', link: 'https://www.instagram.com/iitachiyomi/' },
    { icon: <Github className="w-5 h-5" />, label: 'GitHub', link: 'https://github.com/tas33n/miyomi' },
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
      >
        {/* Background Particles Wrapper */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <NavbarParticles />
        </div>

        {/* Navbar Content */}
        <div className="relative z-10 h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between w-full gap-2 lg:gap-4">
          {/* Left Section: Logo & Search */}
          <div className="flex items-center gap-2 lg:gap-3">
            <button
              onClick={() => handleClick('/')}
              className="flex items-center gap-2 cursor-pointer group flex-shrink-0"
            >
              <img src={logoImage} alt="Miyomi" className="w-8 h-8 object-contain group-hover:scale-110 transition-transform" />
              <span className="text-[var(--brand)] font-['Poppins',sans-serif] text-lg" style={{ fontWeight: 600 }}>
                Miyomi
              </span>
            </button>

            <button
              onClick={() => setSearchModalOpen(true)}
              className="hidden lg:flex items-center gap-3 px-4 py-2 ml-2 rounded-xl bg-[var(--bg-elev-1)]/80 backdrop-blur-md border border-[var(--divider)]/50 hover:bg-[var(--bg-elev-2)] hover:border-[var(--brand)]/50 transition-all text-sm group w-[calc(100vw-850px)] max-w-[200px] min-w-[120px]"
            >
              <Search className="w-4 h-4 flex-shrink-0 text-[var(--text-secondary)] group-hover:text-[var(--brand)] transition-colors" />
              <span className="text-[var(--text-secondary)] font-medium mr-auto truncate">Search</span>
              <kbd className="hidden sm:inline-block flex-shrink-0 px-1.5 py-0.5 text-[10px] font-mono text-[var(--text-secondary)] bg-[var(--chip-bg)] border border-[var(--divider)] rounded opacity-70 group-hover:opacity-100 transition-opacity">
                Ctrl K
              </kbd>
            </button>
          </div>

          {/* Right Section: Desktop Nav Items */}
          <div className="hidden md:flex items-center gap-1.5 lg:gap-2">
            {/* Direct Links */}
            <button
              onClick={() => handleClick('/')}
              className={`text-sm py-2 px-1 lg:px-1.5 transition-colors font-['Inter',sans-serif] ${isActive('/') && location.pathname === '/' ? 'text-[var(--brand)] font-medium' : 'text-[var(--text-primary)] hover:text-[var(--brand)]'}`}
            >
              Home
            </button>
            <button
              onClick={() => handleClick('/software')}
              className={`hidden xl:block text-sm py-2 px-1 lg:px-1.5 transition-colors font-['Inter',sans-serif] ${isActive('/software') ? 'text-[var(--brand)] font-medium' : 'text-[var(--text-primary)] hover:text-[var(--brand)]'}`}
            >
              Software
            </button>
            <button
              onClick={() => handleClick('/extensions')}
              className={`hidden xl:block text-sm py-2 px-1 lg:px-1.5 transition-colors font-['Inter',sans-serif] ${isActive('/extensions') ? 'text-[var(--brand)] font-medium' : 'text-[var(--text-primary)] hover:text-[var(--brand)]'}`}
            >
              Extensions
            </button>

            {/* Pages Dropdown - Hover Trigger */}
            <DropdownMenu open={pagesDropdownOpen} onOpenChange={setPagesDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  onPointerDown={(event) => event.preventDefault()}
                  onMouseEnter={() => openDropdown('pages')}
                  onMouseLeave={() => scheduleDropdownClose('pages')}
                  className="flex items-center gap-0.5 lg:gap-1 text-sm py-2 px-1 lg:px-1.5 relative transition-colors text-[var(--text-primary)] hover:text-[var(--brand)] font-['Inter',sans-serif]"
                  style={{ fontWeight: 400 }}
                >
                  Pages <ChevronDown className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
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

            {/* Guides Dropdown - Hover Trigger */}
            {/* <DropdownMenu open={guidesDropdownOpen} onOpenChange={setGuidesDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  onPointerDown={(event) => event.preventDefault()}
                  onMouseEnter={() => openDropdown('guides')}
                  onMouseLeave={() => scheduleDropdownClose('guides')}
                  className="flex items-center gap-0.5 lg:gap-1 text-sm py-2 px-1 lg:px-1.5 relative transition-colors text-[var(--text-primary)] hover:text-[var(--brand)] font-['Inter',sans-serif]"
                  style={{ fontWeight: 400 }}
                >
                  Guides <ChevronDown className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                sideOffset={6}
                onMouseEnter={() => openDropdown('guides')}
                onMouseLeave={() => scheduleDropdownClose('guides')}
                className="w-48 bg-[var(--bg-page)]/90 backdrop-blur-xl border border-[var(--divider)]/50 rounded-xl shadow-sm p-1 transition-all duration-200 ease-out"
              >
                {guidesNavItems.map(renderDropdownItem)}
              </DropdownMenuContent>
            </DropdownMenu> */}

            {/* Contribute Link */}
            <button
              onClick={() => handleClick('/contribute')}
              className={`text-sm py-2 px-1 lg:px-1.5 transition-colors font-['Inter',sans-serif] ${isActive('/contribute') ? 'text-[var(--brand)] font-medium' : 'text-[var(--text-primary)] hover:text-[var(--brand)]'}`}
            >
              Contribute
            </button>

            {/* Feedback Link */}
            <button
              onClick={() => setIsFeedbackOpen(true)}
              className="text-sm py-2 px-1 lg:px-1.5 transition-colors font-['Inter',sans-serif] text-[var(--text-primary)] hover:text-[var(--brand)]"
            >
              Feedback
            </button>

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

            <div className="w-px h-6 bg-[var(--divider)]"></div>

            {/* Search Icon for Tablet (Hidden on desktop lg+) */}
            <button
              onClick={() => setSearchModalOpen(true)}
              className="lg:hidden p-2 text-[var(--text-secondary)] hover:text-[var(--brand)] transition-colors relative group"
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Social Links */}
            <div className="flex items-center gap-0.5">
              {socialLinks.map((social, index) => (
                <a
                  key={index}
                  href={social.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-[var(--text-secondary)] hover:text-[var(--brand)] transition-colors"
                  aria-label={social.label}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Mobile Actions */}
          <div className="md:hidden flex items-center gap-1">
            <button
              onClick={() => setSearchModalOpen(true)}
              className="p-2 text-[var(--text-secondary)] hover:text-[var(--brand)] transition-colors"
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </button>
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
        }}
        onClick={() => setMobileMenuOpen(false)}
      />

      {/* Mobile Menu Drawer (Slide-in from Bottom) */}
      <div
        className={`fixed left-0 right-0 bottom-0 max-h-[80vh] w-full z-[998] md:hidden bg-[var(--bg-page)]/95 backdrop-blur-xl border-t border-[var(--divider)]/50 shadow-2xl rounded-t-3xl flex flex-col transition-transform duration-300 ease-in-out ${mobileMenuOpen ? 'translate-y-0' : 'translate-y-full'
          }`}
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
              {socialLinks.map((social, index) => (
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
