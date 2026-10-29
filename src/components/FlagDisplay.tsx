import { Globe } from 'lucide-react';

// code → hashed asset URL. Only URL strings ship in JS; each SVG is fetched
// only when a flag is actually rendered. (The full flag-icons stylesheet —
// ~540 rules on every page — is no longer loaded.)
const FLAG_URLS = Object.fromEntries(
  Object.entries(
    import.meta.glob('/node_modules/flag-icons/flags/4x3/*.svg', { eager: true, query: '?url', import: 'default' }) as Record<string, string>,
  ).map(([path, url]) => [path.slice(path.lastIndexOf('/') + 1, -'.svg'.length), url]),
);

// Language codes → the country flag used to represent them.
const LANGUAGE_TO_COUNTRY: Record<string, string> = {
  en: 'gb',
  zh: 'cn',
  ja: 'jp',
  ko: 'kr',
  ar: 'sa',
  vi: 'vn',
  id: 'id',
  es: 'es',
  pt: 'pt',
  'pt-br': 'br',
  fr: 'fr',
  de: 'de',
  it: 'it',
  ru: 'ru',
  tr: 'tr',
};

const SIZE = {
  small: { className: 'w-5 h-4', width: 20, height: 15 },
  medium: { className: 'w-6 h-5', width: 24, height: 18 },
  large: { className: 'w-8 h-6', width: 32, height: 24 },
} as const;

interface FlagDisplayProps {
  region: string;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

function parseRegion(regionStr: string): string[] {
  if (!regionStr) return [];
  const lower = regionStr.toLowerCase();
  if (lower === 'all' || lower === 'global') return ['all'];
  // "pt-BR,tr" → ['br', 'tr']
  return regionStr.split(',').map((code) => {
    const trimmed = code.trim().toLowerCase();
    return LANGUAGE_TO_COUNTRY[trimmed] || trimmed;
  });
}

export function FlagDisplay({ region, size = 'medium', className = '' }: FlagDisplayProps) {
  const countryCodes = parseRegion(region);

  if (countryCodes.includes('all')) {
    return (
      <span className={`inline-flex items-center gap-1 text-sm ${className}`} title="Global">
        <Globe className="w-4 h-4 text-[var(--text-secondary)]" />
      </span>
    );
  }

  const dims = SIZE[size];
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      {countryCodes.map((code, index) => {
        const url = FLAG_URLS[code];
        const label = code.toUpperCase();
        return url ? (
          <img
            key={index}
            src={url}
            alt={`${label} flag`}
            title={label}
            width={dims.width}
            height={dims.height}
            loading="lazy"
            decoding="async"
            className={`${dims.className} inline-block rounded-sm object-cover align-middle`}
            style={{ boxShadow: '0 0 1px rgba(0,0,0,0.2)' }}
          />
        ) : (
          <span key={index} className="text-[10px] font-semibold text-[var(--text-secondary)]" title={label}>
            {label}
          </span>
        );
      })}
    </span>
  );
}
