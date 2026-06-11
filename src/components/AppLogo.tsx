import { useState } from 'react';
import { useCachedImage } from '../hooks/useCachedImage';

interface AppLogoProps {
  name: string;
  logoUrl?: string;
  iconColor?: string;
  className?: string;
  roundedClass?: string;
  textClassName?: string;
}

export function AppLogo({
  name,
  logoUrl,
  iconColor,
  className = 'w-16 h-16',
  roundedClass = 'rounded-xl',
  textClassName = 'text-xl',
}: AppLogoProps) {
  const [shouldFallback, setShouldFallback] = useState(!logoUrl);
  const fallbackColor = iconColor || 'var(--brand)';
  const cachedUrl = useCachedImage(logoUrl);

  const handleError = () => setShouldFallback(true);

  if (shouldFallback) {
    return (
      <div
        className={`${className} ${roundedClass} flex items-center justify-center text-white font-semibold uppercase select-none`}
        style={{ backgroundColor: fallbackColor }}
        aria-hidden="true"
      >
        <span className={textClassName}>{name.charAt(0)}</span>
      </div>
    );
  }

  return (
    <div
      className={`${className} ${roundedClass} overflow-hidden bg-[var(--bg-surface)] flex items-center justify-center`}
      aria-hidden="true"
    >
      <img
        src={cachedUrl}
        alt={`${name} logo`}
        className="w-full h-full object-contain"
        onError={handleError}
        referrerPolicy="no-referrer"
      />
    </div>
  );
}
