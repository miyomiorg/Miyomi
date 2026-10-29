import { useEffect, useState } from 'react';

interface AppLogoProps {
  name: string;
  logoUrl?: string;
  iconColor?: string;
  className?: string;
  roundedClass?: string;
  textClassName?: string;
  /** Set for above-the-fold logos (e.g. a detail page header). */
  eager?: boolean;
}

export function AppLogo({
  name,
  logoUrl,
  iconColor,
  className = 'w-16 h-16',
  roundedClass = 'rounded-xl',
  textClassName = 'text-xl',
  eager = false,
}: AppLogoProps) {
  const [failed, setFailed] = useState(false);
  const fallbackColor = iconColor || 'var(--brand)';

  // A new logo URL gets a fresh attempt.
  useEffect(() => setFailed(false), [logoUrl]);

  if (!logoUrl || failed) {
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

  // Plain <img>: the browser HTTP cache handles reuse. Lazy + async decoding
  // keeps long lists from downloading/decoding every logo up front.
  return (
    <div
      className={`${className} ${roundedClass} overflow-hidden bg-[var(--bg-surface)] flex items-center justify-center`}
      aria-hidden="true"
    >
      <img
        src={logoUrl}
        alt={`${name} logo`}
        className="w-full h-full object-contain"
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        width={64}
        height={64}
        onError={() => setFailed(true)}
        referrerPolicy="no-referrer"
      />
    </div>
  );
}
