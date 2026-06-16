import React, { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { motion } from 'motion/react';
import type { ExtensionData } from '../types/data';
import { FlagDisplay } from './FlagDisplay';
import { useAccentColor } from '../hooks/useAccentColor';
import { LoveButton } from './LoveButton';
import { AppLogo } from './AppLogo';
import { TagBadge } from './TagBadge';

interface ExtensionListCardProps {
  extension: ExtensionData;
  isHighlighted?: boolean;
  onSelect: (extensionId: string) => void;
}

export function ExtensionListCard({ extension, isHighlighted, onSelect }: ExtensionListCardProps) {
  const handleSelect = () => onSelect(extension.slug || extension.id);
  const accentColor = useAccentColor({
    logoUrl: extension.logoUrl,
    preferredColor: extension.accentColor,
    defaultColor: 'var(--brand)',
  });


  return (
    <motion.div
      onClick={handleSelect}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.2 }}
      className={`flex items-center gap-3 p-3 bg-[var(--bg-surface)] border border-[var(--divider)] border-l-4 rounded-xl hover:shadow-lg hover:border-[var(--brand)] transition-all w-full text-left group cursor-pointer ${isHighlighted
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
          {extension.name}
        </h3>

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
      </div>

      {/* Action - Love Button */}
      <div className="flex flex-col items-end justify-center self-stretch flex-shrink-0 pl-3 border-l border-[var(--divider)]/30 border-dashed ml-2 gap-2">
        <LoveButton itemId={extension.id} itemType="extension" fallbackCount={extension.likes || 0} />
      </div>
    </motion.div>
  );
}
