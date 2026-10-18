import React from 'react';
import { TagBadge } from './TagBadge';
import { ExternalLink, Download, GitFork } from 'lucide-react';
import { AppLogo } from './AppLogo';
import { PlatformBadge } from './PlatformBadge';
import { StarRating } from './StarRating';
import { motion } from 'motion/react';
import { useAccentColor } from '../hooks/useAccentColor';
import { LoveButton } from './LoveButton';

interface AppListCardProps {
  appId: string;
  name: string;
  description: string;
  tags: Array<'Manga' | 'Anime' | 'Light Novel' | 'Multi'>;
  platforms: Array<'Windows' | 'Mac' | 'Android' | 'iOS' | 'Linux' | 'Web'>;
  accentColor?: string;
  logoUrl?: string;
  rating?: number;
  downloads?: number;
  likes?: number;
  forkOf?: string;
  upstreamUrl?: string;
  isHighlighted?: boolean;
  onClick?: () => void;
}

export function AppListCard({
  appId,
  name,
  description,
  tags,
  platforms,
  accentColor,
  logoUrl,
  rating,
  downloads,
  likes,
  forkOf,
  upstreamUrl,
  isHighlighted,
  onClick,
}: AppListCardProps) {
  const displayedTags = tags.slice(0, 2);
  const displayedPlatforms = platforms.slice(0, 3);
  const extraPlatforms = platforms.length - displayedPlatforms.length;
  const showPlatformDivider = displayedTags.length > 0 && platforms.length > 0;
  const colorToUse = useAccentColor({ logoUrl, preferredColor: accentColor });

  // Only use layoutId on desktop
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className={`flex items-center gap-3 p-3 bg-[var(--bg-surface)] border border-[var(--divider)] border-l-4 rounded-xl hover:shadow-lg hover:border-[var(--brand)] transition-all w-full text-left group ${isHighlighted
        ? 'ring-2 ring-[var(--brand)] shadow-[0_8px_30px_rgba(0,0,0,0.12),0_0_0_4px_rgba(var(--brand-rgb),0.2)]'
        : 'shadow-[0_4px_12px_0_rgba(0,0,0,0.05)]'
        }`}
      style={{ borderLeftColor: colorToUse }}
    >
      {/* App Icon - Fixed size, full height */}
      <div className="flex-shrink-0 group-hover:scale-105 transition-transform">
        <AppLogo
          name={name}
          logoUrl={logoUrl}
          iconColor={colorToUse}
          className="w-12 h-12"
          roundedClass="rounded-xl"
          textClassName="text-base"
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3 className="font-['Inter',sans-serif] text-[var(--text-primary)] truncate mb-1" style={{ fontWeight: 600, fontSize: '15px' }}>
          {name}
        </h3>
        <div className="flex flex-wrap items-center gap-1.5 mb-1">
          {displayedTags.map((tag, index) => (
            <React.Fragment key={index}>
              <TagBadge tag={tag} mobile={isMobile} />
            </React.Fragment>
          ))}
          {showPlatformDivider && <span className="h-4 w-px bg-[var(--divider)]" aria-hidden="true"></span>}
          {platforms.length > 0 && (
            <>
              {displayedPlatforms.map((platform, index) => (
                <React.Fragment key={`${platform}-${index}`}>
                  <PlatformBadge platform={platform} small />
                </React.Fragment>
              ))}
              {extraPlatforms > 0 && (
                <span className="text-[10px] text-[var(--text-secondary)] font-['Inter',sans-serif]" style={{ fontWeight: 500 }}>
                  +{extraPlatforms}
                </span>
              )}
            </>
          )}
        </div>
        <p className="text-[var(--text-secondary)] font-['Inter',sans-serif] text-xs line-clamp-1">
          {description}
        </p>
        {rating && (
          <div className="flex items-center gap-1.5 mt-1">
            <StarRating rating={rating} size="sm" />
          </div>
        )}
      </div>

      {/* Right side: Action & Downloads */}
      <div className="flex flex-col items-end justify-center self-stretch flex-shrink-0 pl-3 border-l border-[var(--divider)]/30 border-dashed ml-2 gap-2">
        <LoveButton itemId={appId} fallbackCount={likes || 0} />
        {downloads ? (
          <div className="flex items-center gap-1 text-xs text-[var(--text-secondary)] font-medium font-sans">
            <Download className="w-3.5 h-3.5 opacity-70" />
            <span>
              {downloads >= 1000000
                ? `${(downloads / 1000000).toFixed(1)}M`
                : downloads >= 1000
                  ? `${(downloads / 1000).toFixed(1)}k`
                  : downloads}
            </span>
          </div>
        ) : <div />}
      </div>
    </motion.button>
  );
}
