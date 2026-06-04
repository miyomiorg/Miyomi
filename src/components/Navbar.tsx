"use client";

import { X, ChevronDown, Github, Instagram, Youtube, Facebook, Plus, Search, Menu, Heart } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
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

export function Navbar({ onNavigate }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [pagesDropdownOpen, setPagesDropdownOpen] = useState(false);
  const [guidesDropdownOpen, setGuidesDropdownOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
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

  const mainNavItems = [
    { label: 'Home', path: '/' },
    { label: 'Software', path: '/software' },
    { label: 'Extensions', path: '/extensions' },
    { label: 'FAQ', path: '/faq' },
    { label: 'About', path: '/about' },
  ];

  const guidesNavItems = [
    { label: 'All Guides', path: '/guides' },
    { label: 'Installation', path: '/guides#installation' },
    { label: 'Configuration', path: '/guides#configuration' },
    { label: 'Troubleshooting', path: '/guides#troubleshooting' },
  ];

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

  const renderDropdownItem = (item: { label: string; path: string }) => (
    <DropdownMenuItem
      key={item.path}
      onClick={() => handleClick(item.path)}
      className={`cursor-pointer ${isActive(item.path)
        ? 'text-[var(--brand)] bg-[var(--chip-bg)]'
        : 'text-[var(--text-primary)] hover:bg-[var(--bg-elev-1)]'
        }`}
      style={{ fontWeight: isActive(item.path) ? 600 : 400 }}
    >
      {item.label}
    </DropdownMenuItem>
  );

  return (
    <>
      <SearchModal isOpen={searchModalOpen} onClose={() => setSearchModalOpen(false)} />

      <nav
        className={`h-16 fixed top-0 left-0 right-0 z-[999] transition-all duration-300 ${scrolled
          ? 'bg-[var(--bg-page)]/95 border-b border-[var(--divider)]/50 shadow-sm'
          : 'bg-transparent'
          }`}
      >
        {/* Navbar Content */}
        <div className="relative z-10 h-full px-4 sm:px-8 lg:px-[120px] flex items-center justify-between w-full gap-4 overflow-hidden">
          <NavbarParticles />
          {/* Left Section: Logo */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => handleClick('/')}
              className="flex items-center gap-2 cursor-pointer group flex-shrink-0"
            >
              <img src={logoImage} alt="Miyomi" className="w-8 h-8 object-contain group-hover:scale-110 transition-transform" />
              <span className="text-[var(--brand)] font-['Poppins',sans-serif] text-lg" style={{ fontWeight: 600 }}>
                Miyomi
              </span>
            </button>
          </div>

          {/* Right Section: Desktop Nav Items */}
          <div className="hidden md:flex items-center gap-4">
            {/* Pages Dropdown - Hover Trigger */}
            <DropdownMenu open={pagesDropdownOpen} onOpenChange={setPagesDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  onPointerDown={(event) => event.preventDefault()}
                  onMouseEnter={() => openDropdown('pages')}
                  onMouseLeave={() => scheduleDropdownClose('pages')}
                  className="flex items-center gap-1 text-sm py-2 px-2 relative transition-colors text-[var(--text-primary)] hover:text-[var(--brand)] font-['Inter',sans-serif]"
                  style={{ fontWeight: 400 }}
                >
                  Pages <ChevronDown className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                sideOffset={6}
                onMouseEnter={() => openDropdown('pages')}
                onMouseLeave={() => scheduleDropdownClose('pages')}
                className="w-48 bg-[var(--bg-page)]/95 border border-[var(--divider)]/50 rounded-xl shadow-sm p-1 transition-all duration-200 ease-out"
              >
                {mainNavItems.map(renderDropdownItem)}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Guides Dropdown - Hover Trigger */}
            <DropdownMenu open={guidesDropdownOpen} onOpenChange={setGuidesDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  onPointerDown={(event) => event.preventDefault()}
                  onMouseEnter={() => openDropdown('guides')}
                  onMouseLeave={() => scheduleDropdownClose('guides')}
                  className="flex items-center gap-1 text-sm py-2 px-2 relative transition-colors text-[var(--text-primary)] hover:text-[var(--brand)] font-['Inter',sans-serif]"
                  style={{ fontWeight: 400 }}
                >
                  Guides <ChevronDown className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                sideOffset={6}
                onMouseEnter={() => openDropdown('guides')}
                onMouseLeave={() => scheduleDropdownClose('guides')}
                className="w-48 bg-[var(--bg-page)]/95 border border-[var(--divider)]/50 rounded-xl shadow-sm p-1 transition-all duration-200 ease-out"
              >
                {guidesNavItems.map(renderDropdownItem)}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Contribute Link */}
            <button
              onClick={() => handleClick('/contribute')}
              className={`text-sm py-2 px-2 transition-colors font-['Inter',sans-serif] ${isActive('/contribute') ? 'text-[var(--brand)] font-medium' : 'text-[var(--text-primary)] hover:text-[var(--brand)]'}`}
            >
              Contribute
            </button>

            {/* Donate Button — highlighted */}
            <button
              onClick={() => handleClick('/donate')}
              className="relative flex items-center gap-1.5 text-sm py-1.5 px-3.5 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 text-white font-medium font-['Inter',sans-serif] hover:shadow-lg hover:shadow-pink-500/25 hover:scale-105 active:scale-95 transition-all duration-200"
            >
              <Heart className="w-3.5 h-3.5 fill-current" />
              Donate
              {/* Subtle ping animation */}
              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-300 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-pink-200" />
              </span>
            </button>

            {/* Divider */}
            <div className="w-px h-6 bg-[var(--divider)]"></div>

            {/* Search Button */}
            <button
              onClick={() => setSearchModalOpen(true)}
              className="p-2 text-[var(--text-secondary)] hover:text-[var(--brand)] transition-colors relative group"
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
              <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-[var(--bg-surface)] border border-[var(--divider)] rounded text-xs text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                Search
              </span>
            </button>

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Social Links */}
            <div className="flex items-center gap-1">
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
          <div className="md:hidden flex items-center gap-2">
            {/* Search Button */}
            <button
              onClick={() => setSearchModalOpen(true)}
              className="p-2 text-[var(--text-secondary)] hover:text-[var(--brand)] transition-colors"
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-[var(--text-primary)] transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay (Backdrop) */}
      <div
        className={`fixed inset-0 top-16 z-[997] md:hidden transition-all duration-300 ${mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        style={{
          backgroundColor: 'rgba(0,0,0,0.2)',
        }}
        onClick={() => setMobileMenuOpen(false)}
      />

      {/* Mobile Menu Dropdown (Content) */}
      <div
        className={`fixed top-16 left-0 right-0 z-[998] md:hidden bg-[var(--bg-page)]/95 backdrop-blur-xl border-b border-[var(--divider)] shadow-lg transition-all duration-300 origin-top ${mobileMenuOpen ? 'translate-y-0 opacity-100 scale-y-100' : '-translate-y-4 opacity-0 scale-y-95 pointer-events-none'
          }`}
      >
        <div className="max-h-[calc(100vh-5rem)] overflow-y-auto w-full">
          <div className="px-6 py-6 max-w-lg mx-auto">
            {/* Pages Section */}
            <div className="mb-3">
              <button
                onClick={() => toggleSection('pages')}
                className="w-full flex items-center justify-between py-2.5 text-[var(--text-primary)] font-['Inter',sans-serif]"
                style={{ fontWeight: 500 }}
              >
                <span>Pages</span>
                <Plus
                  className={`w-5 h-5 transition-transform duration-200 ${expandedSection === 'pages' ? 'rotate-45' : ''
                    }`}
                />
              </button>
              <div
                className={`overflow-hidden transition-all duration-200 ${expandedSection === 'pages' ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                  }`}
              >
                <div className="space-y-0.5 mt-2">
                  {mainNavItems.map((item) => (
                    <button
                      key={item.path}
                      onClick={() => handleClick(item.path)}
                      className={`w-full text-left py-2 px-4 pl-8 rounded-lg transition-colors ${isActive(item.path)
                        ? 'text-[var(--brand)] bg-[var(--chip-bg)]'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elev-1)]'
                        }`}
                      style={{ fontWeight: isActive(item.path) ? 600 : 400 }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="border-b border-[var(--divider)] mt-3"></div>
            </div>

            {/* Guides Section */}
            <div className="mb-3">
              <button
                onClick={() => toggleSection('guides')}
                className="w-full flex items-center justify-between py-2.5 text-[var(--text-primary)] font-['Inter',sans-serif]"
                style={{ fontWeight: 500 }}
              >
                <span>Guides</span>
                <Plus
                  className={`w-5 h-5 transition-transform duration-200 ${expandedSection === 'guides' ? 'rotate-45' : ''
                    }`}
                />
              </button>
              <div
                className={`overflow-hidden transition-all duration-200 ${expandedSection === 'guides' ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                  }`}
              >
                <div className="space-y-0.5 mt-2">
                  {guidesNavItems.map((item) => (
                    <button
                      key={item.path}
                      onClick={() => handleClick(item.path)}
                      className={`w-full text-left py-2 px-4 pl-8 rounded-lg transition-colors ${isActive(item.path)
                        ? 'text-[var(--brand)] bg-[var(--chip-bg)]'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elev-1)]'
                        }`}
                      style={{ fontWeight: isActive(item.path) ? 600 : 400 }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="border-b border-[var(--divider)] mt-3"></div>
            </div>

            {/* Contribute Link */}
            <div className="mb-3">
              <button
                onClick={() => handleClick('/contribute')}
                className={`w-full text-left py-2.5 text-[var(--text-primary)] font-['Inter',sans-serif] flex justify-between items-center ${isActive('/contribute') ? 'text-[var(--brand)] font-medium' : 'hover:text-[var(--brand)]'}`}
                style={{ fontWeight: 500 }}
              >
                Contribute
              </button>
              <div className="border-b border-[var(--divider)] mt-3"></div>
            </div>

            {/* Donate Link — highlighted in mobile */}
            <div className="mb-3">
              <button
                onClick={() => handleClick('/donate')}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white font-medium font-['Inter',sans-serif] hover:shadow-lg transition-all"
              >
                <Heart className="w-4 h-4 fill-current" />
                Support Miyomi
              </button>
              <div className="border-b border-[var(--divider)] mt-3"></div>
            </div>

            {/* Appearance Section */}
            <div className="mb-4">
              <div className="flex items-center justify-between py-2.5">
                <span className="text-[var(--text-primary)] font-['Inter',sans-serif]" style={{ fontWeight: 500 }}>
                  appearance
                </span>
                <ThemeToggle />
              </div>
            </div>

            {/* Social Icons */}
            <div className="pt-3 border-t border-[var(--divider)]">
              <div className="flex items-center justify-center gap-4">
                {socialLinks.map((social, index) => (
                  <a
                    key={index}
                    href={social.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 text-[var(--text-secondary)] hover:text-[var(--brand)] transition-colors"
                    aria-label={social.label}
                  >
                    {social.icon}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
