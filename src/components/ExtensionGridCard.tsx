import React, { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import type { ExtensionData } from '../types/data';
import { FlagDisplay } from './FlagDisplay';
import { useAccentColor } from '../hooks/useAccentColor';
import { CardLink } from './CardLink';
import { LoveButton } from './LoveButton';
import { TagBadge } from './TagBadge';
import { RepositoryStatus } from './RepositoryStatus';
import { MatchedTagChips } from './MatchedTagChips';

interface ExtensionGridCardProps {
  key?: string | number;
  extension: ExtensionData;
  isHighlighted?: boolean;
  matchedTags?: string[];
  onSelect: (extensionId: string) => void;
}

// Memoized: list pages re-render on every search keystroke / like change.
export const ExtensionGridCard = React.memo(function ExtensionGridCard({ extension, isHighlighted, matchedTags, onSelect }: ExtensionGridCardProps) {
  const ref = extension.slug || extension.id;
  const handleSelect = () => onSelect(ref);
  const accentColor = useAccentColor({
    logoUrl: extension.logoUrl,
    preferredColor: extension.accentColor,
    defaultColor: 'var(--brand)',
  });
  const [imageError, setImageError] = useState(false);
  useEffect(() => setImageError(false), [extension.logoUrl]);

  const renderLogo = () => {
    const showFallback = imageError || !extension.logoUrl?.trim();

    if (showFallback) {
      return (
        <div
          className="w-full h-full flex items-center justify-center text-white"
          style={{ backgroundColor: accentColor, fontWeight: 600, fontSize: '20px' }}
        >
          {extension.name.charAt(0)}
        </div>
      );
    }

    return (
      <img
        src={extension.logoUrl}
        alt={`${extension.name} logo`}
        className="w-full h-full object-cover"
        loading="lazy"
        decoding="async"
        width={48}
        height={48}
        referrerPolicy="no-referrer"
        onError={() => setImageError(true)}
      />
    );
  };

  return (
    // The title is a stretched link (CardLink) covering the whole card.
    <div
      className={`list-item-cv relative group bg-[var(--bg-surface)] border border-[var(--divider)] rounded-2xl p-3 sm:p-5 hover:shadow-lg hover:border-[var(--brand)] [@media(hover:hover)]:hover:-translate-y-1 active:scale-[0.98] transition-[transform,box-shadow,border-color] duration-200 cursor-pointer flex flex-col h-full focus-within:ring-2 focus-within:ring-[var(--brand)] ${isHighlighted
        ? 'ring-2 ring-[var(--brand)] shadow-[0_8px_30px_rgba(0,0,0,0.12),0_0_0_4px_rgba(var(--brand-rgb),0.2)]'
        : 'shadow-[0_6px_20px_0_rgba(0,0,0,0.08)]'
        }`}
    >
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-3 mb-2 sm:mb-3">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden bg-[var(--chip-bg)] group-hover:scale-105 transition-transform">
          {renderLogo()}
        </div>
        <div className="flex-1 min-w-0 text-center sm:text-left">
          <h3
            className="font-['Inter',sans-serif] text-[var(--text-primary)] mb-1 line-clamp-2"
            style={{ fontWeight: 600, fontSize: '14px', lineHeight: '1.3', wordBreak: 'break-word' }}
          >
            <CardLink href={`/extensions/${ref}`} onNavigate={handleSelect}>{extension.name}</CardLink>
          </h3>
          <div className="flex flex-wrap justify-center sm:justify-start gap-1 mb-2">
            <RepositoryStatus status={extension.devStatus} />
          </div>
          <div className="flex items-center justify-center sm:justify-start gap-1.5 flex-wrap mb-1">
            {extension.types.map((tag, index) => (
              <React.Fragment key={index}>
                <TagBadge tag={tag} />
              </React.Fragment>
            ))}
            {extension.types.length > 0 && <span className="h-4 w-px bg-[var(--divider)]" aria-hidden="true"></span>}
            <FlagDisplay region={extension.language || (extension as any).region || ''} size="small" />
          </div>
        </div>
      </div>


      <div className="flex-grow">
        {(extension.shortDescription || extension.info) && (
          <p className="text-sm text-[var(--text-secondary)] font-['Inter',sans-serif] line-clamp-2 mb-2 sm:mb-4 text-center sm:text-left overflow-hidden" style={{ fontSize: '12px', lineHeight: '1.5', maxHeight: '3em' }}>
            {extension.shortDescription || extension.info}
          </p>
        )}
        <MatchedTagChips
          tags={matchedTags}
          className="justify-center sm:justify-start mb-2"
        />
      </div>

      {/* Footer: Love Button and View Details */}
      <div className="mt-auto pt-3 border-t border-[var(--divider)] w-full flex items-center justify-between">
        <LoveButton itemId={extension.id} itemType="extension" fallbackCount={extension.likes || 0} />

        <button
          onClick={(event) => {
            event.stopPropagation();
            handleSelect();
          }}
          className="relative z-10 flex items-center justify-center text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--brand)] transition-colors p-2.5 -m-1 rounded-md hover:bg-[var(--divider)]"
          title="View Details"
          aria-label={`View ${extension.name} details`}
        >
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
});
