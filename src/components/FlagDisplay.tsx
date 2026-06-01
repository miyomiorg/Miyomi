import React from 'react';
import { Globe } from 'lucide-react';
import 'flag-icons/css/flag-icons.min.css';

interface FlagDisplayProps {
  region: string;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export function FlagDisplay({ region, size = 'medium', className = '' }: FlagDisplayProps) {
  // Map language codes to country codes for flag-icons
  const languageToCountry: Record<string, string> = {
    'en': 'gb',
    'zh': 'cn',
    'ja': 'jp',
    'ko': 'kr',
    'ar': 'sa',
    'vi': 'vn',
    'id': 'id',
    'es': 'es',
    'pt': 'pt',
    'pt-br': 'br',
    'fr': 'fr',
    'de': 'de',
    'it': 'it',
    'ru': 'ru',
    'tr': 'tr'
  };

  const parseRegion = (regionStr: string): string[] => {
    if (!regionStr) return [];
    
    // Handle special case for "ALL" or global
    if (regionStr.toLowerCase() === 'all' || regionStr.toLowerCase() === 'global') {
      return ['all']; // Return lowercase for consistency
    }
    
    // Split by comma for multiple countries (e.g., "pt-BR,tr") -> map to country codes
    return regionStr.split(',').map(code => {
      const trimmed = code.trim().toLowerCase();
      return languageToCountry[trimmed] || trimmed;
    });
  };

  const countryCodes = parseRegion(region);
  
  // Size mapping for flag display
  const sizeClasses = {
    small: 'w-5 h-4',
    medium: 'w-6 h-5',
    large: 'w-8 h-6',
  };

  // Handle ALL/Global region
  if (countryCodes.includes('all')) {
    return (
      <span className={`inline-flex items-center gap-1 text-sm ${className}`} title="Global">
        <Globe className="w-4 h-4 text-[var(--text-secondary)]" />
      </span>
    );
  }

  // Render country flags using CSS flag-icons
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      {countryCodes.map((code, index) => (
        <span
          key={index}
          className={`fi fi-${code} ${sizeClasses[size]} inline-block rounded-sm`}
          title={code.toUpperCase()}
          aria-label={`${code.toUpperCase()} flag`}
          style={{ 
            boxShadow: '0 0 1px rgba(0,0,0,0.2)',
            verticalAlign: 'middle'
          }}
        />
      ))}
    </span>
  );
}
