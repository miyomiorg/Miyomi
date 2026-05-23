import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { ArrowLeft, Download, Copy, Github, Globe, Calendar, Heart, Star, Clock, PlayCircle, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppGridCard } from '../components/AppGridCard';
import { ParticleBackground } from '../components/ParticleBackground';
import { useFeedbackState } from '../hooks/useFeedbackState';
import { FlagDisplay } from '../components/FlagDisplay';
import { useAccentColor } from '../hooks/useAccentColor';
import { LoveButton } from '../components/LoveButton';
import { useExtension } from '../hooks/useExtension';
import { useAppMeta } from '../hooks/useAppMeta';
import { Skeleton } from '../components/ui/skeleton';
import { PlatformIcon } from '../components/admin/CommunityUrlInput';
import { detectPlatform, getPlatform } from '../utils/communityPlatforms';

import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from '../components/ui/carousel';
import Autoplay from 'embla-carousel-autoplay';

interface ExtensionDetailPageProps {
  extensionId: string;
  onNavigate?: (path: string) => void;
}

export function ExtensionDetailPage({ extensionId, onNavigate }: ExtensionDetailPageProps) {
  const { extension, loading: extensionLoading } = useExtension(extensionId);
  const { apps: allApps, loading: appsLoading } = useAppMeta();


  const accentColor = useAccentColor({
    logoUrl: extension?.logoUrl,
    preferredColor: extension?.accentColor,
    defaultColor: 'var(--brand)',
  });
  const [logoError, setLogoError] = useState(false);


  const supportedApps = React.useMemo(() => {
    if (!extension) return [];
    return allApps.filter(app =>
      app.supportedExtensions?.includes(extensionId) ||
      extension.supportedApps?.includes(app.id) ||
      extension.supportedApps?.includes(app.name.toLowerCase())
    );
  }, [extension, extensionId, allApps]);

  const displayedApps = supportedApps.slice(0, 3);
  const hasMoreApps = supportedApps.length > displayedApps.length;
  const { isFeedbackOpen, handleToggle, handleClose } = useFeedbackState();
  const location = useLocation();
  const navigate = useNavigate();


  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);

  React.useEffect(() => {
    if (!api) {
      return;
    }

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap() + 1);

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap() + 1);
    });
  }, [api]);

  const handleBackClick = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      if (onNavigate) {
        onNavigate('/extensions');
      } else {
        navigate('/extensions');
      }
    }
  };

  const copyToClipboard = (value: string, message = 'URL copied!') => {
    navigator.clipboard.writeText(value);
    toast.success(message);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const renderActionButtons = (layout: 'inline' | 'stack') => {
    if (!extension) return null;

    const installUrls = (extension.installUrls && extension.installUrls.length > 0)
      ? extension.installUrls
      : [
        ...(extension.autoUrl ? [{ label: 'Auto Install', url: extension.autoUrl, type: 'auto' as const }] : []),
        ...(extension.manualUrl ? [{ label: 'Copy URL', url: extension.manualUrl, type: 'copy' as const }] : []),
      ];

    const validUrls = installUrls.filter(u => u.url && u.url.trim() !== '');

    if (validUrls.length === 0) {
      return null;
    }

    const baseButtonClass =
      "flex items-center justify-center gap-2 px-4 py-3 sm:px-6 sm:py-4 rounded-2xl transition-all font-['Inter',sans-serif]";
    const buildButtonClass = (variant: 'primary' | 'secondary') => {
      const palette =
        variant === 'primary'
          ? "bg-[var(--brand)] hover:bg-[var(--brand-strong)] text-white hover:shadow-lg hover:shadow-cyan-500/20"
          : "bg-[var(--bg-elev-1)] hover:bg-[var(--chip-bg)] text-[var(--text-primary)]";
      return `${baseButtonClass} ${palette}`;
    };

    const renderButton = (entry: typeof validUrls[0], widthClass: string, index: number) => {
      const isAuto = entry.type === 'auto';
      const variant = index === 0 ? 'primary' : 'secondary';

      if (isAuto) {
        return (
          <button
            key={index}
            onClick={() => window.open(entry.url, '_blank')}
            className={`${widthClass} ${buildButtonClass(variant)}`}
            style={{ fontWeight: 600 }}
          >
            <Download className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-sm sm:text-lg">{entry.label || 'Auto Install'}</span>
          </button>
        );
      }

      return (
        <button
          key={index}
          onClick={() => copyToClipboard(entry.url, `${entry.label || 'URL'} copied to clipboard!`)}
          className={`${widthClass} ${buildButtonClass(variant)}`}
          style={{ fontWeight: 600 }}
        >
          <Copy className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="text-sm sm:text-lg">{entry.label || 'Copy URL'}</span>
        </button>
      );
    };

    if (layout === 'inline') {
      const hasOnlyOneButton = validUrls.length === 1;
      const buttonContainerClass = hasOnlyOneButton
        ? 'flex gap-3 justify-center'
        : 'flex flex-wrap gap-3';
      const buttonWidthClass = hasOnlyOneButton
        ? 'max-w-[280px] w-full'
        : 'flex-1 min-w-[140px]';

      return (
        <div className="flex flex-col gap-3">
          <div className={buttonContainerClass}>
            {validUrls.map((entry, i) => renderButton(entry, buttonWidthClass, i))}
          </div>

          <div className="flex items-center justify-center gap-3">
            {extension.github && (
              <a
                href={extension.github}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 bg-[var(--bg-elev-1)] border border-[var(--divider)] rounded-xl hover:bg-[var(--chip-bg)] hover:border-[var(--brand)] transition-all text-[var(--text-secondary)] hover:text-[var(--brand)]"
                title="GitHub"
              >
                <Github className="w-5 h-5" />
              </a>
            )}
            {extension.website && (
              <a
                href={extension.website}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 bg-[var(--bg-elev-1)] border border-[var(--divider)] rounded-xl hover:bg-[var(--chip-bg)] hover:border-[var(--brand)] transition-all text-[var(--text-secondary)] hover:text-[var(--brand)]"
                title="Website"
              >
                <Globe className="w-5 h-5" />
              </a>
            )}
            {extension.socialUrls && extension.socialUrls.length > 0 && extension.socialUrls.map((url, idx) => {
              const platformId = detectPlatform(url);
              const platform = getPlatform(platformId);
              return (
                <a
                  key={idx}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 bg-[var(--bg-elev-1)] border border-[var(--divider)] rounded-xl hover:bg-[var(--chip-bg)] hover:border-[var(--brand)] transition-all text-[var(--text-secondary)] hover:text-[var(--brand)]"
                  title={platform.label}
                >
                  <PlatformIcon platformId={platformId} className="w-5 h-5" />
                </a>
              );
            })}
          </div>
        </div>
      );
    }


    return (
      <div className="flex w-full flex-col gap-3">
        {validUrls.map((entry, i) => renderButton(entry, 'w-full', i))}
      </div>
    );
  };

  const renderDesktopQuickLinks = () => {
    if (!extension) return null;
    const quickLinks = [
      extension.github && {
        href: extension.github,
        label: 'GitHub',
        description: 'Project repository',
        Icon: Github,
      },
      extension.website && {
        href: extension.website,
        label: 'Website',
        description: 'Official site',
        Icon: Globe,
      },
    ].filter(Boolean) as {
      href: string;
      label: string;
      description: string;
      Icon: typeof Github;
    }[];

    if (quickLinks.length === 0) {
      return null;
    }

    return (
      <div className="flex flex-col gap-3">
        {quickLinks.map(({ href, label, description, Icon }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-3 rounded-2xl border border-[var(--divider)] bg-[var(--bg-surface)]/50 px-4 py-3 text-left transition-all hover:border-[var(--brand)] hover:bg-[var(--bg-elev-1)]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--chip-bg)] text-[var(--brand)] group-hover:scale-110 transition-transform">
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-['Inter',sans-serif] font-semibold text-[var(--text-primary)] text-sm">
                {label}
              </p>
              <p className="font-['Inter',sans-serif] text-xs text-[var(--text-secondary)] truncate">
                {description}
              </p>
            </div>
            <span className="text-[var(--text-secondary)] group-hover:translate-x-1 transition-transform">→</span>
          </a>
        ))}
        {extension.socialUrls && extension.socialUrls.length > 0 && extension.socialUrls.map((url, idx) => {
          const platformId = detectPlatform(url);
          const platform = getPlatform(platformId);
          return (
            <a
              key={`social-${idx}`}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 rounded-2xl border border-[var(--divider)] bg-[var(--bg-surface)]/50 px-4 py-3 text-left transition-all hover:border-[var(--brand)] hover:bg-[var(--bg-elev-1)]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--chip-bg)] text-[var(--brand)] group-hover:scale-110 transition-transform">
                <PlatformIcon platformId={platformId} className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-['Inter',sans-serif] font-semibold text-[var(--text-primary)] text-sm">
                  {platform.label}
                </p>
                <p className="font-['Inter',sans-serif] text-xs text-[var(--text-secondary)] truncate">
                  Join the community
                </p>
              </div>
              <span className="text-[var(--text-secondary)] group-hover:translate-x-1 transition-transform">→</span>
            </a>
          );
        })}
      </div>
    );
  };

  if (extensionLoading) {
    return (
      <div className="max-w-7xl mx-auto">
        <Skeleton className="w-32 h-6 mb-6" />
        <div className="bg-[var(--bg-surface)] border border-[var(--divider)] rounded-2xl p-6 sm:p-8 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <Skeleton className="w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 rounded-2xl flex-shrink-0" />
            <div className="flex-1 space-y-4 w-full">
              <Skeleton className="h-10 w-48 sm:w-64" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-6 w-20 rounded-lg" />
                <Skeleton className="h-6 w-20 rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!extension) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="text-center py-16 sm:py-24">
          <div className="text-6xl sm:text-8xl mb-6 opacity-30">🕶️</div>
          <h3 className="text-[var(--text-primary)] font-['Poppins',sans-serif] mb-2" style={{ fontSize: '20px', fontWeight: 600 }}>
            Extension restricted or not found
          </h3>
          <p className="text-[var(--text-secondary)] font-['Inter',sans-serif] mb-6">
            Only approved extensions are visible to the public.
          </p>
          <button
            onClick={handleBackClick}
            className="px-6 py-3 bg-[var(--brand)] hover:bg-[var(--brand-strong)] text-white rounded-xl transition-all font-['Inter',sans-serif]"
            style={{ fontWeight: 600 }}
          >
            Explore Extensions
          </button>
        </div>
      </div>
    );
  }

  const inlineActions = renderActionButtons('inline');
  const stackedActions = renderActionButtons('stack');
  const desktopQuickLinks = renderDesktopQuickLinks();
  const showDesktopSidebar = Boolean(stackedActions) || Boolean(desktopQuickLinks);

  const tutorials = extension.tutorials ?? [];
  const hasTutorials = tutorials.length > 0;

  const viewMoreContentType =
    extension.types.length === 0
      ? 'All'
      : extension.types.length > 1
        ? 'Multi'
        : extension.types[0];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="max-w-7xl mx-auto"
    >
      {/* Back Button */}
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
        onClick={handleBackClick}
        className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--brand)] transition-colors mb-6 font-['Inter',sans-serif]"
        style={{ fontWeight: 500 }}
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Extensions
      </motion.button>

      {/* Header Section */}
      <motion.div
        layoutId={!isMobile ? `extension-card-${extensionId}` : undefined}
        initial={isMobile ? { opacity: 0, x: 20 } : undefined}
        animate={isMobile ? { opacity: 1, x: 0 } : undefined}
        exit={isMobile ? { opacity: 0, x: -20 } : undefined}
        transition={isMobile ? { duration: 0.2, ease: "easeOut" } : {
          type: "spring",
          stiffness: 260,
          damping: 35,
          mass: 0.8
        }}
        className="relative bg-[var(--bg-surface)] border border-[var(--divider)] rounded-2xl p-6 sm:p-8 mb-6 sm:mb-8 overflow-hidden"
        style={{ boxShadow: '0 6px 20px 0 rgba(0,0,0,0.08)' }}
      >
        <ParticleBackground />
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[auto_1fr_auto] gap-6 lg:gap-12 items-center">
          {/* Extension Logo - Left */}
          <div className="mx-auto flex h-24 w-24 sm:h-32 sm:w-32 lg:h-40 lg:w-40 items-center justify-center rounded-3xl text-white flex-shrink-0 shadow-2xl ring-1 ring-white/10 overflow-hidden bg-[var(--chip-bg)]">
            {(!extension.logoUrl || logoError) ? (
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ backgroundColor: accentColor, fontWeight: 700 }}
              >
                <span className="text-4xl lg:text-6xl">{extension.name.charAt(0)}</span>
              </div>
            ) : (
              <img
                src={extension.logoUrl}
                alt={`${extension.name} logo`}
                className="w-full h-full object-cover"
                onError={() => setLogoError(true)}
              />
            )}
          </div>

          {/* Extension Info - Center */}
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="flex items-center gap-3 justify-center">
              <h1
                className="text-[var(--text-primary)] font-['Poppins',sans-serif] text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight"
              >
                {extension.name}
              </h1>

              <LoveButton itemId={extension.id} itemType="extension" fallbackCount={extension.likes || 0} size="lg" />
            </div>

            {/* Short Description */}
            <p className={`text-[var(--text-secondary)] font-['Inter',sans-serif] text-lg max-w-2xl leading-relaxed ${!extension.shortDescription && !extension.info ? 'line-clamp-3' : ''}`}>
              {extension.shortDescription || extension.info || extension.overview}
            </p>

            {/* Types Chips */}
            {/* Types & Region */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              {extension.types.map((type, index) => (
                <span
                  key={index}
                  className="rounded-full bg-[var(--chip-bg)] px-3 py-1 font-['Inter',sans-serif] text-[var(--text-primary)] border border-[var(--divider)]"
                  style={{ fontWeight: 600, fontSize: '13px' }}
                >
                  {type}
                </span>
              ))}

              {extension.types.length > 0 && (
                <span className="text-[var(--text-tertiary)] opacity-50 mx-1">|</span>
              )}

              <div
                className="rounded-full bg-[var(--chip-bg)] px-3 py-1 font-['Inter',sans-serif] text-[var(--text-primary)] border border-[var(--divider)] flex items-center gap-1.5"
                style={{ fontWeight: 600, fontSize: '13px' }}
              >
                {(!(extension.language || extension.region) || (extension.language || extension.region)?.toLowerCase() === 'all' || (extension.language || extension.region)?.toLowerCase() === 'global') ? (
                  <>
                    <Globe className="w-3.5 h-3.5" />
                    <span>Global</span>
                  </>
                ) : (
                  <>
                    <FlagDisplay region={extension.language || extension.region || ''} size="small" />
                  </>
                )}
              </div>
            </div>

            {/* Statistics Row */}
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-sm text-[var(--text-secondary)] pt-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--bg-surface)] border border-[var(--divider)] shadow-sm">
                <Clock className="w-4 h-4 text-[var(--text-tertiary)]" />
                <span className="opacity-70">Updated {new Date(extension.lastUpdated || Date.now()).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Mobile Actions */}
            <div className="lg:hidden w-full pt-4">{inlineActions}</div>
          </div>

          {/* Desktop Actions - Right */}
          {showDesktopSidebar && (
            <div className="hidden lg:flex w-[280px] flex-col gap-3">
              {stackedActions && (
                <div className="flex flex-col gap-3">
                  {stackedActions}
                </div>
              )}
              {desktopQuickLinks}
            </div>
          )}
        </div>
      </motion.div>

      {/* Overview Section - Conditional */}
      {extension.overview?.trim() && (
        <div className="mb-6 sm:mb-8">
          <h2
            className="text-[var(--text-primary)] font-['Poppins',sans-serif] mb-4"
            style={{ fontSize: '24px', fontWeight: 600 }}
          >
            Overview
          </h2>
          <div className="bg-[var(--bg-surface)] border border-[var(--divider)] rounded-2xl p-6 prose prose-invert max-w-none text-[var(--text-secondary)] font-['Inter',sans-serif] leading-relaxed" style={{ boxShadow: '0 6px 20px 0 rgba(0,0,0,0.08)', fontSize: '15px' }}>
            <ReactMarkdown>
              {extension.overview}
            </ReactMarkdown>
          </div>
        </div>
      )}

      {/* Tutorials & Guides Section */}
      {hasTutorials && (
        <div className="mb-6 sm:mb-8">
          <h2
            className="text-[var(--text-primary)] font-['Poppins',sans-serif] mb-4"
            style={{ fontSize: '24px', fontWeight: 600 }}
          >
            Tutorials & Guides
          </h2>
          <p className="text-[var(--text-secondary)] font-['Inter',sans-serif] mb-4" style={{ fontSize: '15px' }}>
            Learn how to get the most out of {extension.name} with curated walkthroughs and documentation.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {tutorials.map((tutorial: any, index: number) => {
              if (tutorial.type === 'video') {
                return (
                  <div
                    key={`${tutorial.type}-${index}`}
                    className="bg-[var(--bg-surface)] border border-[var(--divider)] rounded-2xl p-4 sm:p-5"
                    style={{ boxShadow: '0 6px 20px 0 rgba(0,0,0,0.08)' }}
                  >
                    <div className="relative w-full mb-3 overflow-hidden rounded-xl aspect-video">
                      <iframe
                        src={tutorial.url}
                        title={tutorial.title}
                        className="absolute inset-0 h-full w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      ></iframe>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--chip-bg)] text-[var(--brand)]">
                        <PlayCircle className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-[var(--text-primary)] font-['Inter',sans-serif]" style={{ fontWeight: 600, fontSize: '15px' }}>
                          {tutorial.title}
                        </h3>
                        {tutorial.description && (
                          <p className="text-[var(--text-secondary)] font-['Inter',sans-serif] text-sm mt-1">
                            {tutorial.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <a
                  key={`${tutorial.type}-${index}`}
                  href={tutorial.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col gap-3 rounded-2xl border border-[var(--divider)] bg-[var(--bg-surface)] p-4 sm:p-5 hover:border-[var(--brand)] hover:shadow-lg transition-all"
                  style={{ boxShadow: '0 6px 20px 0 rgba(0,0,0,0.06)' }}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--chip-bg)] text-[var(--brand)]">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-[var(--text-primary)] font-['Inter',sans-serif]" style={{ fontWeight: 600, fontSize: '15px' }}>
                        {tutorial.title}
                      </h3>
                      {tutorial.description && (
                        <p className="text-[var(--text-secondary)] font-['Inter',sans-serif] text-sm mt-1">
                          {tutorial.description}
                        </p>
                      )}
                    </div>
                    <span className="ml-auto text-[var(--text-secondary)] group-hover:text-[var(--brand)] transition-colors">
                      &rarr;
                    </span>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* Supported Apps Section */}
      {supportedApps.length > 0 && (
        <div className="mb-6 sm:mb-8">
          <h2
            className="text-[var(--text-primary)] font-['Poppins',sans-serif] mb-4"
            style={{ fontSize: '24px', fontWeight: 600 }}
          >
            Compatible Apps
          </h2>
          <p className="text-[var(--text-secondary)] font-['Inter',sans-serif] mb-4" style={{ fontSize: '15px' }}>
            This source is compatible with the following apps:
          </p>

          <Carousel
            setApi={setApi}
            opts={{
              align: "start",
              loop: true,
            }}
            plugins={[
              Autoplay({
                delay: 4000,
              }),
            ]}
            className="w-full relative"
          >
            <div className="absolute -top-12 right-0 hidden sm:flex gap-2">
              <CarouselPrevious className="relative left-0 top-0 translate-y-0 h-8 w-8" />
              <CarouselNext className="relative right-0 top-0 translate-y-0 h-8 w-8" />
            </div>

            <CarouselContent className="-ml-4">
              {supportedApps.map((app) => (
                <CarouselItem key={app.id} className="pl-4 basis-1/2 md:basis-1/2 lg:basis-1/3">
                  <div className="h-full">
                    <AppGridCard
                      appId={app.id}
                      name={app.name}
                      description={app.shortDescription || app.description}
                      tags={app.contentTypes as any}
                      platforms={app.platforms as any}
                      iconColor={app.accentColor || app.iconColor}
                      logoUrl={app.logoUrl}
                      rating={app.rating}
                      downloads={app.downloads}

                      forkOf={app.forkOf}
                      upstreamUrl={app.upstreamUrl}
                      onClick={() => onNavigate?.(`/software/${app.slug || app.id}`)}
                    />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <div className="py-2 text-center text-sm text-muted-foreground">
              <div className="flex justify-center gap-1 mt-4">
                {Array.from({ length: count }).map((_, index) => (
                  <button
                    key={index}
                    className={`h-2 w-2 rounded-full transition-all ${index + 1 === current ? "bg-[var(--brand)] w-4" : "bg-[var(--divider)] hover:bg-[var(--text-secondary)]"
                      }`}
                    onClick={() => api?.scrollTo(index)}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          </Carousel>
        </div>
      )}

      {/* Support Information */}
      <div className="mb-6 sm:mb-8">
        <h2
          className="text-[var(--text-primary)] font-['Poppins',sans-serif] mb-4"
          style={{ fontSize: '24px', fontWeight: 600 }}
        >
          Support Information
        </h2>
        <div className="bg-[var(--bg-surface)] border border-[var(--divider)] rounded-2xl p-6" style={{ boxShadow: '0 6px 20px 0 rgba(0,0,0,0.08)' }}>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[var(--chip-bg)] flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs">📦</span>
              </div>
              <div>
                <div className="text-[var(--text-primary)] font-['Inter',sans-serif] mb-1" style={{ fontWeight: 600, fontSize: '14px' }}>
                  Installation Method
                </div>
                <p className="text-[var(--text-secondary)] font-['Inter',sans-serif] text-sm">
                  Use the Auto Install button for automatic setup, or copy the manual URL for manual configuration in your app.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[var(--chip-bg)] flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs">🔄</span>
              </div>
              <div>
                <div className="text-[var(--text-primary)] font-['Inter',sans-serif] mb-1" style={{ fontWeight: 600, fontSize: '14px' }}>
                  Updates
                </div >
                <p className="text-[var(--text-secondary)] font-['Inter',sans-serif] text-sm">
                  Extensions are automatically updated by your app when new versions are available from this source.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
