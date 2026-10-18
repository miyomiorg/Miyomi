import React from 'react';
import { TagBadge } from './TagBadge';
import { PlatformBadge } from './PlatformBadge';
import { Download, GitFork } from 'lucide-react';
import { AppLogo } from './AppLogo';
import { StarRating } from './StarRating';
import { motion } from 'motion/react';
import { useAccentColor } from '../hooks/useAccentColor';
import { LoveButton } from './LoveButton';

interface AppGridCardProps {
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

export function AppGridCard({
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
}: AppGridCardProps) {

  const displayedTags = tags;
  const displayedPlatforms = platforms.slice(0, 3);
  const extraPlatforms = platforms.length - displayedPlatforms.length;
  const showPlatformDivider = displayedTags.length > 0 && platforms.length > 0;
  const colorToUse = useAccentColor({ logoUrl, preferredColor: accentColor });

  // Only use layoutId on desktop for morphing effect
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <motion.div
      onClick={onClick}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className={`p-3 sm:p-6 bg-[var(--bg-surface)] border border-[var(--divider)] rounded-2xl hover:shadow-lg hover:border-[var(--brand)] transition-all text-left w-full group flex flex-col cursor-pointer h-full ${isHighlighted
        ? 'ring-2 ring-[var(--brand)] shadow-[0_8px_30px_rgba(0,0,0,0.12),0_0_0_4px_rgba(var(--brand-rgb),0.2)]'
        : 'shadow-[0_6px_20px_0_rgba(0,0,0,0.08)]'
        }`}
    >
      {/* App Icon and Title - Centered on mobile, left-aligned on desktop */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-4 mb-2 sm:mb-4">
        <div className="flex-shrink-0 group-hover:scale-105 transition-transform">
          <AppLogo
            name={name}
            logoUrl={logoUrl}
            iconColor={colorToUse}
            className="w-12 h-12 sm:w-16 sm:h-16"
            roundedClass="rounded-xl sm:rounded-2xl"
            textClassName="text-lg sm:text-2xl"
          />
        </div>
        <div className="flex-1 min-w-0 text-center sm:text-left w-full">
          <h3 className="font-['Inter',sans-serif] text-[var(--text-primary)] mb-1 sm:mb-1" style={{ fontWeight: 600, fontSize: '14px', lineHeight: '1.3' }}>
            {name}
          </h3>
          <div className="flex items-center justify-center sm:justify-start gap-1.5 flex-wrap">
            {displayedTags.map((tag, index) => (
              <React.Fragment key={index}>
                <TagBadge tag={tag} mobile={isMobile} />
              </React.Fragment>
            ))}
            {showPlatformDivider && <span className="hidden sm:inline h-4 w-px bg-[var(--divider)]" aria-hidden="true"></span>}
            <div className="flex items-center gap-1.5 flex-wrap justify-center sm:justify-start">
              {displayedPlatforms.map((platform, index) => (
                <React.Fragment key={`${platform}-${index}`}>
                  <PlatformBadge platform={platform} small />
                </React.Fragment>
              ))}
              {extraPlatforms > 0 && (
                <span className="text-[11px] text-[var(--text-secondary)] font-['Inter',sans-serif]" style={{ fontWeight: 500 }}>
                  +{extraPlatforms}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="flex-grow">
        <p className="text-[var(--text-secondary)] font-['Inter',sans-serif] mb-2 sm:mb-4 line-clamp-2 text-center sm:text-left overflow-hidden" style={{ fontSize: '12px', lineHeight: '1.5', maxHeight: '3em' }}>
          {description}
        </p>
      </div>

      {/* Rating (Downloads moved to footer) */}
      {rating && (
        <div className="flex items-center justify-center sm:justify-start gap-3 mb-3">
          <StarRating rating={rating} size="sm" />
        </div>
      )}

      {/* Footer Section: Love Button & Downloads */}
      <div className="mt-auto pt-3 border-t border-[var(--divider)] w-full flex items-center justify-between">
        <LoveButton itemId={appId} fallbackCount={likes || 0} />

        {downloads && downloads > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]" title="Estimated Downloads">
            <Download className="w-3.5 h-3.5" />
            <span className="font-medium font-sans">
              {downloads >= 1000000
                ? `${(downloads / 1000000).toFixed(1)}M`
                : downloads >= 1000
                  ? `${(downloads / 1000).toFixed(1)}k`
                  : downloads}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
