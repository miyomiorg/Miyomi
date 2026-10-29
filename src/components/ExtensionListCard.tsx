import React from 'react';
import type { ExtensionData } from '../types/data';
import { CardLink } from './CardLink';
import { FlagDisplay } from './FlagDisplay';
import { useAccentColor } from '../hooks/useAccentColor';
import { LoveButton } from './LoveButton';
import { AppLogo } from './AppLogo';
import { TagBadge } from './TagBadge';
import { RepositoryStatus } from './RepositoryStatus';
import { MatchedTagChips } from './MatchedTagChips';

interface ExtensionListCardProps {
  extension: ExtensionData;
  isHighlighted?: boolean;
  matchedTags?: string[];
  onSelect: (extensionId: string) => void;
}

export const ExtensionListCard = React.memo(function ExtensionListCard({ extension, isHighlighted, matchedTags, onSelect }: ExtensionListCardProps) {
  const ref = extension.slug || extension.id;
  const handleSelect = () => onSelect(ref);
  const accentColor = useAccentColor({
    logoUrl: extension.logoUrl,
    preferredColor: extension.accentColor,
    defaultColor: 'var(--brand)',
  });

  // Title is a stretched link covering the row; CSS hover instead of motion.
  return (
    <div
      className={`list-item-cv relative flex items-center gap-3 p-3 bg-[var(--bg-surface)] border border-[var(--divider)] border-l-4 rounded-xl hover:shadow-lg hover:border-[var(--brand)] [@media(hover:hover)]:hover:scale-[1.01] active:scale-[0.99] transition-[transform,box-shadow,border-color] duration-200 w-full text-left group cursor-pointer focus-within:ring-2 focus-within:ring-[var(--brand)] ${isHighlighted
        ? 'ring-2 ring-[var(--brand)] shadow-[0_8px_30px_rgba(0,0,0,0.12),0_0_0_4px_rgba(var(--brand-rgb),0.2)]'
        : 'shadow-[0_4px_12px_0_rgba(0,0,0,0.05)]'
        }`}
      style={{ borderLeftColor: accentColor }}
    >
      <div className="flex-shrink-0 group-hover:scale-105 transition-transform">
        <AppLogo
          name={extension.name}
          logoUrl={extension.logoUrl}
          iconColor={accentColor}
          className="w-12 h-12"
          roundedClass="rounded-xl"
          textClassName="text-base"
        />
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-['Inter',sans-serif] text-[var(--text-primary)] truncate mb-1" style={{ fontWeight: 600, fontSize: '15px' }}>
          <CardLink href={`/extensions/${ref}`} onNavigate={handleSelect}>{extension.name}</CardLink>
        </h3>
        <div className="flex flex-wrap gap-1 mb-2">
          <RepositoryStatus status={extension.devStatus} />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 mb-1">
          {extension.types.map((tag, index) => (
            <React.Fragment key={index}>
              <TagBadge tag={tag} />
            </React.Fragment>
          ))}
          {extension.types.length > 0 && <span className="h-4 w-px bg-[var(--divider)]" aria-hidden="true"></span>}
          <FlagDisplay region={extension.language || (extension as any).region || ''} size="small" />
        </div>

        {(extension.shortDescription || extension.info) && (
          <p className="text-[var(--text-secondary)] font-['Inter',sans-serif] text-xs line-clamp-1">
            {extension.shortDescription || extension.info}
          </p>
        )}
        <MatchedTagChips tags={matchedTags} className="mt-1" />
      </div>

      {/* Action - Love Button */}
      <div className="flex flex-col items-end justify-center self-stretch flex-shrink-0 pl-3 border-l border-[var(--divider)]/30 border-dashed ml-2 gap-2">
        <LoveButton itemId={extension.id} itemType="extension" fallbackCount={extension.likes || 0} />
      </div>
    </div>
  );
});
