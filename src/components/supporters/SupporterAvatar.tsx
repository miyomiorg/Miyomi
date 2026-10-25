import { useEffect, useState } from 'react';
import { supporterAvatarUrl, supporterInitials } from './supporterUtils';

interface SupporterAvatarProps {
  name: string;
  size?: number;
  className?: string;
}

/** Fixed-size avatar with an initials fallback, so late image loads cannot shift the row. */
export function SupporterAvatar({ name, size = 36, className = '' }: SupporterAvatarProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [name]);

  return (
    <span
      aria-hidden="true"
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--chip-bg)] text-[var(--brand)] ${className}`}
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      {!failed ? (
        <img
          src={supporterAvatarUrl(name)}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span
          className="font-['Poppins',sans-serif] font-semibold"
          style={{ fontSize: Math.max(10, Math.round(size * 0.34)) }}
        >
          {supporterInitials(name)}
        </span>
      )}
    </span>
  );
}
