import React from 'react';
import ReactMarkdown from 'react-markdown';
import { ArrowLeft, Download, Github, Globe, PlayCircle, BookOpen, GitFork, ExternalLink } from 'lucide-react';
import { motion } from "motion/react";
import { useLocation, useNavigate } from 'react-router-dom';
import { PlatformBadge } from '../components/PlatformBadge';
import { TagBadge } from './../components/TagBadge';
import { ParticleBackground } from '../components/ParticleBackground';
import { ExtensionGridCard } from '../components/ExtensionGridCard';
import { Skeleton } from '../components/ui/skeleton';
import { useGitHubRelease } from '../hooks/useGitHubRelease';
import { GitHubReleaseMeta } from '../components/GitHubReleaseMeta';
import { useAccentColor } from '../hooks/useAccentColor';
import { LoveButton } from '../components/LoveButton';
import { DetailActions } from '../components/DetailActions';
import { BackButton } from '../components/BackButton';
import { ReportModal } from '../components/ReportModal';
import { useApp } from '../hooks/useApp';
import { useExtensions } from '../hooks/useExtensions';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from '../components/ui/carousel';
import Autoplay from 'embla-carousel-autoplay';
import { WheelGesturesPlugin } from 'embla-carousel-wheel-gestures';
import { toast } from 'sonner';

import { DiscordIcon } from '../components/DiscordIcon';
import { detectPlatform, getPlatform } from '../utils/communityPlatforms';
import { PlatformIcon } from '../components/admin/CommunityUrlInput';
import { detectGitProvider, getProviderIcon, resolveGitProvider } from '../utils/gitProviders';

type StatusStyle = {
  bg: string;
  text: string;
  border: string;
};

const STATUS_STYLE_MAP: Record<string, StatusStyle> = {
  active: { bg: 'rgba(76, 175, 80, 0.12)', text: '#4CAF50', border: 'rgba(76, 175, 80, 0.35)' },
  discontinued: { bg: 'rgba(255, 99, 71, 0.15)', text: '#FF6347', border: 'rgba(255, 99, 71, 0.4)' },
  abandoned: { bg: 'rgba(255, 193, 7, 0.15)', text: '#FFB300', border: 'rgba(255, 193, 7, 0.4)' },
  suspended: { bg: 'rgba(156, 39, 176, 0.15)', text: '#9C27B0', border: 'rgba(156, 39, 176, 0.35)' },
  dmca: { bg: 'rgba(233, 30, 99, 0.15)', text: '#E91E63', border: 'rgba(233, 30, 99, 0.35)' },
  dead: { bg: 'rgba(158, 158, 158, 0.15)', text: '#9E9E9E', border: 'rgba(158, 158, 158, 0.35)' },
};

const STATUS_LABEL_MAP: Record<string, string> = {
  active: 'Active',
  discontinued: 'Discontinued',
  abandoned: 'Abandoned',
  suspended: 'Suspended',
  dmca: 'DMCA',
  dead: 'Dead',
};

const DEFAULT_STATUS_STYLE: StatusStyle = {
  bg: 'rgba(255, 255, 255, 0.08)',
  text: 'var(--text-secondary)',
  border: 'rgba(255, 255, 255, 0.2)',
};

const getStatusLabel = (status: string): string => {
  const normalized = status.trim().toLowerCase();
  if (STATUS_LABEL_MAP[normalized]) {
    return STATUS_LABEL_MAP[normalized];
  }

  return status
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

interface AppDetailPageProps {
  appId: string;
  onNavigate?: (path: string) => void;
}

export function AppDetailPage({ appId, onNavigate }: AppDetailPageProps) {
  const { app, loading: appLoading } = useApp(appId);
  const { extensions: allExtensions } = useExtensions();

  const accentColor = useAccentColor({
    logoUrl: app?.logoUrl,
    preferredColor: app?.accentColor,
    defaultColor: 'var(--brand)',
  });

  const supportedExtensions = React.useMemo(() => {
    if (!app) return [];
    return (app.supportedExtensions ?? [])
      .map((extensionId) => allExtensions.find(e => e.id === extensionId))
      .filter((ext): ext is NonNullable<typeof ext> => Boolean(ext));
  }, [app, allExtensions]);

  const recommendedExtensions = React.useMemo(() => {
    if (!app) return [];
    if (supportedExtensions.length > 0) return supportedExtensions;
    return allExtensions.filter(ext =>
      ext.supportedApps?.includes(appId.toLowerCase()) ||
      ext.supportedApps?.includes(app.name.toLowerCase()) ||
      ext.supportedApps?.includes(app.id)
    );
  }, [app, appId, allExtensions, supportedExtensions]);

  const displayedExtensions = recommendedExtensions.slice(0, 3);
  const hasMoreExtensions = recommendedExtensions.length > displayedExtensions.length;
  const location = useLocation();
  const navigate = useNavigate();


  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const [api, setApi] = React.useState<CarouselApi>();
  const [current, setCurrent] = React.useState(0);
  const [count, setCount] = React.useState(0);

  const [isReportOpen, setIsReportOpen] = React.useState(false);
  const handleShare = async (title: string, url: string) => {
    // Always copy to clipboard as a reliable fallback
    try {
      await navigator.clipboard.writeText(url);
    } catch (e) {
      console.error("Failed to copy", e);
    }

    const shareData = {
      title: title,
      text: `Check out ${title} on Miyomi!`,
      url: url,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // Usually AbortError if the user cancels the native share menu.
        toast.success("Link copied to clipboard!");
      }
    } else {
      toast.success("Link copied to clipboard!");
    }
  };

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


  const releaseInitialData = React.useMemo(() => (app ? {
    version: app.version,
    downloads: app.downloads,
    date: app.lastUpdated,
  } : undefined), [app?.downloads, app?.lastUpdated, app?.version]);

  const { release, loading: releaseLoading } = useGitHubRelease(
    app?.githubUrl,
    app?.lastUpdated,
    releaseInitialData
  );

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const getGithubOwner = (githubUrl?: string) => {
    if (!githubUrl) return null;
    try {
      if (!githubUrl.startsWith('http')) {
        const [owner] = githubUrl.split('/');
        return owner || null;
      }
      const url = new URL(githubUrl);
      const [owner] = url.pathname.split('/').filter(Boolean);
      return owner || null;
    } catch (error) {
      console.warn('Failed to parse GitHub URL for owner:', error);
      return null;
    }
  };

  const authorInfo = React.useMemo(() => {
    if (!app) return null;
    const githubOwner = getGithubOwner(app.githubUrl);
    if (app.author) {
      return {
        name: app.author,
        url: githubOwner ? `https://github.com/${githubOwner}` : app.officialSite || null,
      };
    }
    if (githubOwner) {
      return {
        name: githubOwner,
        url: `https://github.com/${githubOwner}`,
      };
    }
    return null;
  }, [app]);

  const resolvedGitProvider = React.useMemo(() => resolveGitProvider(app?.gitProvider, app?.githubUrl), [app?.gitProvider, app?.githubUrl]);


  const handleBackClick = () => {
    if (location.state?.fromNavigation || (window.history.state && window.history.state.idx > 0)) {
      navigate(-1);
    } else {
      if (onNavigate) {
        onNavigate('/software');
      } else {
        navigate('/software');
      }
    }
  };



  if (appLoading) {
    return (
      <div className="max-w-7xl mx-auto">
        {/* Back Button Skeleton */}
        <Skeleton className="w-32 h-6 mb-6" />

        {/* Header Skeleton */}
        <div className="bg-[var(--bg-surface)] border border-[var(--divider)] rounded-2xl p-6 sm:p-8 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row gap-6 lg:gap-8 items-start">
            <Skeleton className="w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 rounded-2xl flex-shrink-0" />
            <div className="flex-1 space-y-4 w-full">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-48 sm:w-64" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <Skeleton className="h-4 w-32" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-6 w-20 rounded-lg" />
                <Skeleton className="h-6 w-20 rounded-lg" />
                <Skeleton className="h-6 w-20 rounded-lg" />
              </div>
            </div>
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="space-y-4">
              <Skeleton className="h-8 w-48" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Skeleton className="h-32 rounded-2xl" />
                <Skeleton className="h-32 rounded-2xl" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!app) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="text-center py-16 sm:py-24">
          <div className="text-6xl sm:text-8xl mb-6 opacity-30">🕶️</div>
          <h3 className="text-[var(--text-primary)] font-['Poppins',sans-serif] mb-2" style={{ fontSize: '20px', fontWeight: 600 }}>
            Item restricted or not found
          </h3>
          <p className="text-[var(--text-secondary)] font-['Inter',sans-serif] mb-6">
            Only approved items are visible to the public.
          </p>
          <button
            onClick={handleBackClick}
            className="px-6 py-3 bg-[var(--brand)] hover:bg-[var(--brand-strong)] text-white rounded-xl transition-all font-['Inter',sans-serif]"
            style={{ fontWeight: 600 }}
          >
            Explore Apps
          </button>
        </div>
      </div>
    );
  }

  const tutorials = app.tutorials ?? [];
  const hasTutorials = tutorials.length > 0;

  const hasGithub = Boolean(app.githubUrl);
  const socialUrls = (app.socialUrls && app.socialUrls.length > 0) ? app.socialUrls : (app.discordUrl ? [app.discordUrl] : []);
  const hasCommunityUrl = socialUrls.length > 0;
  const hasOfficialSite = Boolean(app.officialSite);
  const downloadUrl = app.getApp || release?.url
  const hasDownload = Boolean(downloadUrl);
  const hasAnyActions = hasDownload || hasCommunityUrl || hasOfficialSite;

  const inlineActions = hasAnyActions ? (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {hasGithub && (
        <a
          href={app.githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-3 bg-[var(--bg-elev-1)] border border-[var(--divider)] rounded-xl hover:bg-[var(--chip-bg)] hover:border-[var(--brand)] transition-all text-[var(--text-secondary)] hover:text-[var(--brand)]"
          title={resolvedGitProvider === 'Other' ? 'Repository' : resolvedGitProvider}
        >
          {(() => {
            const ProviderIcon = getProviderIcon(resolvedGitProvider);
            return <ProviderIcon className="w-5 h-5" />;
          })()}
        </a>
      )}
      {socialUrls.map((url, idx) => {
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
      {hasOfficialSite && (
        <a
          href={app.officialSite}
          target="_blank"
          rel="noopener noreferrer"
          className="p-3 bg-[var(--bg-elev-1)] border border-[var(--divider)] rounded-xl hover:bg-[var(--chip-bg)] hover:border-[var(--brand)] transition-all text-[var(--text-secondary)] hover:text-[var(--brand)]"
          title="Website"
        >
          <Globe className="w-5 h-5" />
        </a>
      )}
      {hasDownload && (
        <a
          href={downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-6 py-3 bg-[var(--brand)] hover:bg-[var(--brand-strong)] text-white rounded-xl transition-all font-['Inter',sans-serif]"
          style={{ fontWeight: 600 }}
        >
          <Download className="w-4 h-4" />
          Get App
        </a>
      )}
    </div>
  ) : null;

  const showDesktopActions = true;


  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="max-w-7xl mx-auto"
    >
      <ReportModal isOpen={isReportOpen} onClose={() => setIsReportOpen(false)} targetType="app" targetId={app.id} targetName={app.name} pageUrl={window.location.href} />

      {/* Top Bar (Back Button + Actions) */}
      <div className="flex items-center justify-between mb-6 sm:mb-8">
        <BackButton onClick={handleBackClick} />

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <DetailActions
            targetType="app"
            targetId={app.id}
            targetName={app.name}
            onReportClick={() => setIsReportOpen(true)}
            onShareClick={() => handleShare(app.name, window.location.href)}
          />
        </motion.div>
      </div>

      {/* App Header */}
      <motion.div
        layoutId={!isMobile ? `app-card-${appId}` : undefined}
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
        <ParticleBackground appStatus={app.devStatus} />
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[auto_1fr_auto] gap-6 lg:gap-12 items-center">
          {/* App Icon - Left */}
          <div className="mx-auto flex h-24 w-24 sm:h-32 sm:w-32 lg:h-40 lg:w-40 items-center justify-center rounded-3xl text-white flex-shrink-0 shadow-2xl ring-1 ring-white/10">
            {app.logoUrl ? (
              <img src={app.logoUrl} alt={app.name} className="h-full w-full rounded-3xl object-cover" />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center rounded-3xl"
                style={{ backgroundColor: accentColor, fontWeight: 700 }}
              >
                <span className="text-4xl lg:text-6xl">{app.name.charAt(0)}</span>
              </div>
            )}
          </div>

          {/* App Info - Center */}
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="flex items-center gap-3 justify-center">
              <h1
                className="text-[var(--text-primary)] font-['Poppins',sans-serif] text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight"
              >
                {app.name}
              </h1>
              <LoveButton itemId={app.id} fallbackCount={app.likes || 0} size="lg" />
            </div>
            {app.devStatus && app.devStatus !== 'active' && (
              <div
                className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide uppercase shadow-sm"
                style={{
                  backgroundColor: STATUS_STYLE_MAP[app.devStatus.toLowerCase()]?.bg || DEFAULT_STATUS_STYLE.bg,
                  color: STATUS_STYLE_MAP[app.devStatus.toLowerCase()]?.text || DEFAULT_STATUS_STYLE.text,
                  border: `1px solid ${STATUS_STYLE_MAP[app.devStatus.toLowerCase()]?.border || DEFAULT_STATUS_STYLE.border}`
                }}
              >
                {getStatusLabel(app.devStatus)}
              </div>
            )}

            {authorInfo && (
              <p className="text-[var(--text-secondary)] font-['Inter',sans-serif] text-base">
                by{' '}
                {authorInfo.url ? (
                  <a
                    href={authorInfo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--text-primary)] hover:text-[var(--brand)] transition-colors font-semibold"
                  >
                    {authorInfo.name}
                  </a>
                ) : (
                  <span className="font-semibold">{authorInfo.name}</span>
                )}
              </p>
            )}

            {app.forkOf && (
              <div className="flex items-center justify-center gap-2 text-sm text-[var(--text-secondary)]">
                <GitFork className="w-4 h-4 opacity-70" />
                <span>Fork of</span>
                {app.upstreamUrl ? (
                  <a
                    href={app.upstreamUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-[var(--brand)] hover:underline hover:text-[var(--brand-strong)] transition-colors"
                  >
                    {app.forkOf}
                  </a>
                ) : (
                  <span className="font-medium opacity-80">{app.forkOf}</span>
                )}
              </div>
            )}

            <p className={`text-[var(--text-secondary)] font-['Inter',sans-serif] text-lg max-w-2xl leading-relaxed ${!app.shortDescription ? 'line-clamp-3' : ''}`}>
              {app.shortDescription || app.description}
            </p>

            {/* Tags and Platforms */}
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
              {app.contentTypes.map((tag, index) => (
                <React.Fragment key={index}>
                  <TagBadge tag={tag} forceFull />
                </React.Fragment>
              ))}
              {(app.contentTypes.length > 0 && app.platforms.length > 0) && (
                <div className="h-4 w-px bg-[var(--divider)] mx-1"></div>
              )}
              {app.platforms.map((platform, index) => (
                <React.Fragment key={`${platform}-${index}`}>
                  <PlatformBadge platform={platform} />
                </React.Fragment>
              ))}
            </div>

            {/* GitHub Release Metadata */}
            <div className="flex justify-center">
              <GitHubReleaseMeta
                release={release}
                loading={releaseLoading}
                formatDate={formatDate}
                className=""
                justify="center"
              />
            </div>

            {/* Mobile Actions */}
            {inlineActions && <div className="lg:hidden w-full pt-4">{inlineActions}</div>}
          </div>

          {/* Desktop Actions - Right */}
          {showDesktopActions && (
            <div className="hidden lg:flex w-[280px] flex-col gap-3">
              {hasDownload && (
                <a
                  href={downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-2xl bg-[var(--brand)] px-6 py-4 font-['Inter',sans-serif] text-white transition-all hover:bg-[var(--brand-strong)] hover:shadow-lg hover:shadow-cyan-500/20 mb-2"
                  style={{ fontWeight: 600 }}
                >
                  <Download className="w-5 h-5" />
                  <span className="text-lg">Get App</span>
                </a>
              )}

              {app.githubUrl && (
                <a
                  href={app.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3 rounded-2xl border border-[var(--divider)] bg-[var(--bg-surface)]/50 px-4 py-3 text-left transition-all hover:border-[var(--brand)] hover:bg-[var(--bg-elev-1)]"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--chip-bg)] text-[var(--brand)] group-hover:scale-110 transition-transform">
                    {(() => {
                      const ProviderIcon = getProviderIcon(resolvedGitProvider);
                      return <ProviderIcon className="w-5 h-5" />;
                    })()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-['Inter',sans-serif] font-semibold text-[var(--text-primary)] text-sm">
                      {resolvedGitProvider === 'Other' ? 'Repository' : resolvedGitProvider}
                    </p>
                    <p className="font-['Inter',sans-serif] text-xs text-[var(--text-secondary)] truncate">
                      Project repository
                    </p>
                  </div>
                  <span className="text-[var(--text-secondary)] group-hover:translate-x-1 transition-transform">→</span>
                </a>
              )}

              {socialUrls.map((url, idx) => {
                const platformId = detectPlatform(url);
                const platform = getPlatform(platformId);
                return (
                  <a
                    key={idx}
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

              {app.officialSite && (
                <a
                  href={app.officialSite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3 rounded-2xl border border-[var(--divider)] bg-[var(--bg-surface)]/50 px-4 py-3 text-left transition-all hover:border-[var(--brand)] hover:bg-[var(--bg-elev-1)]"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--chip-bg)] text-[var(--brand)] group-hover:scale-110 transition-transform">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-['Inter',sans-serif] font-semibold text-[var(--text-primary)] text-sm">
                      Website
                    </p>
                    <p className="font-['Inter',sans-serif] text-xs text-[var(--text-secondary)] truncate">
                      Official site
                    </p>
                  </div>
                  <span className="text-[var(--text-secondary)] group-hover:translate-x-1 transition-transform">→</span>
                </a>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* Overview Section */}
      {app.description && (
        <div className="mb-6 sm:mb-8">
          <h2 className="text-[var(--text-primary)] font-['Poppins',sans-serif] mb-4" style={{ fontSize: '24px', fontWeight: 600 }}>
            Overview
          </h2>
          <div className="text-[var(--text-secondary)] font-['Inter',sans-serif] text-base leading-relaxed bg-[var(--bg-surface)] border border-[var(--divider)] rounded-2xl p-6 sm:p-8 prose prose-invert max-w-none">
            <ReactMarkdown>
              {app.description}
            </ReactMarkdown>
          </div>
        </div>
      )}


      {/* Supported Extensions Section */}
      {recommendedExtensions.length > 0 && (
        <div className="mb-6 sm:mb-8">
          <h2
            className="text-[var(--text-primary)] font-['Poppins',sans-serif] mb-4"
            style={{ fontSize: '24px', fontWeight: 600 }}
          >
            Supported Extensions
          </h2>
          <p className="text-[var(--text-secondary)] font-['Inter',sans-serif] mb-4" style={{ fontSize: '15px' }}>
            Extension sources compatible with {app.name}:
          </p>

          <Carousel
            setApi={setApi}
            opts={{
              align: "start",
              loop: true,
              dragFree: false,
            }}
            plugins={[
              Autoplay({
                delay: 4000,
                stopOnInteraction: false,
                stopOnMouseEnter: true,
              }),
              WheelGesturesPlugin(),
            ]}
            className="w-full relative"
          >
            <div className="absolute -top-12 right-0 hidden sm:flex gap-2">
              <CarouselPrevious className="relative left-0 top-0 translate-y-0 h-8 w-8" />
              <CarouselNext className="relative right-0 top-0 translate-y-0 h-8 w-8" />
            </div>

            <CarouselContent className="-ml-4">
              {recommendedExtensions.map((ext) => (
                <CarouselItem key={ext.id} className="pl-4 basis-1/2 md:basis-1/2 lg:basis-1/3">
                  <div className="h-full">
                    <ExtensionGridCard
                      extension={ext}
                      onSelect={(extId) => onNavigate?.(`/extensions/${ext.slug || ext.id}`)}
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


      {hasTutorials && (
        <div className="mb-6 sm:mb-8">
          <h2
            className="text-[var(--text-primary)] font-['Poppins',sans-serif] mb-4"
            style={{ fontSize: '24px', fontWeight: 600 }}
          >
            Tutorials & Guides
          </h2>
          <p className="text-[var(--text-secondary)] font-['Inter',sans-serif] mb-4" style={{ fontSize: '15px' }}>
            Learn how to get the most out of {app.name} with curated walkthroughs and documentation.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {tutorials.map((tutorial, index) => {
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
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--chip-bg)] text-[var(--brand)]">
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
                      <h3 className="text-[var(--text-primary)] font-['Inter',sans-serif] flex items-center gap-2" style={{ fontWeight: 600, fontSize: '15px' }}>
                        {tutorial.title}
                        {tutorial.type === 'external' && (
                          <ExternalLink className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                        )}
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
    </motion.div>
  );
}
