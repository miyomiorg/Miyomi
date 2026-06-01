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
  iconColor?: string;
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
  iconColor,
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
  const accentColor = useAccentColor({ logoUrl, preferredColor: iconColor });

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
      style={{ borderLeftColor: accentColor }}
    >
      {/* App Icon - Fixed size, full height */}
      <div className="flex-shrink-0 group-hover:scale-105 transition-transform">
        <AppLogo
          name={name}
          logoUrl={logoUrl}
          iconColor={accentColor}
          className="w-14 h-14"
          roundedClass="rounded-xl"
          textClassName="text-lg"
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3 className="font-['Inter',sans-serif] text-[var(--text-primary)] truncate mb-1" style={{ fontWeight: 600, fontSize: '15px' }}>
          {name}
        </h3>
        <div className="flex flex-wrap items-center gap-1.5 mb-1">
          {displayedTags.map((tag, index) => (
            <TagBadge key={index} tag={tag} mobile={isMobile} />
          ))}
          {showPlatformDivider && <span className="h-4 w-px bg-[var(--divider)]" aria-hidden="true"></span>}
          {platforms.length > 0 && (
            <>
              {displayedPlatforms.map((platform, index) => (
                <PlatformBadge key={`${platform}-${index}`} platform={platform} small />
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
        {(rating || downloads) && (
          <div className="flex items-center gap-3 mt-2">
            {rating && <StarRating rating={rating} size="sm" />}
            {downloads && (
              <div className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                <Download className="w-3 h-3" />
                <span>{downloads >= 1000 ? `${(downloads / 1000).toFixed(1)}k` : downloads}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action - Love Button */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <LoveButton itemId={appId} fallbackCount={likes || 0} />
      </div>
    </motion.button>
  );
}
