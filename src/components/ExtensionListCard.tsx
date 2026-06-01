import React, { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { motion } from 'motion/react';
import type { ExtensionData } from '../types/data';
import { FlagDisplay } from './FlagDisplay';
import { useAccentColor } from '../hooks/useAccentColor';
import { LoveButton } from './LoveButton';
import { AppLogo } from './AppLogo';

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
          className="w-14 h-14"
          roundedClass="rounded-xl"
          textClassName="text-lg"
        />
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-['Inter',sans-serif] text-[var(--text-primary)] truncate mb-1" style={{ fontWeight: 600, fontSize: '15px' }}>
          {extension.name}
        </h3>

        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] mb-1">
          <FlagDisplay region={extension.language || extension.region || ''} size="small" />
          <span className="text-[var(--divider)]">|</span>
          <span className="font-['Inter',sans-serif] tracking-wide text-[11px]" style={{ fontWeight: 600 }}>
            {extension.types.join(' + ')}
          </span>
        </div>

        {(extension.info || extension.shortDescription) && (
          <p className="text-[var(--text-secondary)] font-['Inter',sans-serif] text-xs line-clamp-1">
            {extension.info || extension.shortDescription}
          </p>
        )}
      </div>

      {/* Action - Love Button */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <LoveButton itemId={extension.id} itemType="extension" fallbackCount={extension.likes || 0} />
      </div>
    </motion.div>
  );
}
