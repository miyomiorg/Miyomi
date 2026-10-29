import type { MouseEvent, ReactNode } from 'react';

interface CardLinkProps {
  href: string;
  /** SPA navigation (keeps the list pages' scroll/highlight bookkeeping). */
  onNavigate?: () => void;
  className?: string;
  children: ReactNode;
}

/**
 * "Stretched link" for cards: a real <a href> (crawlable, middle-click /
 * Ctrl+click open a new tab, native keyboard focus) whose ::after overlay
 * covers the nearest positioned ancestor — the card, which must be
 * `relative`. Buttons inside the card sit above it with `relative z-10`,
 * so no interactive element is nested inside the link.
 */
export function CardLink({ href, onNavigate, className = '', children }: CardLinkProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    // Let the browser handle new-tab / new-window / download gestures.
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (!onNavigate) return;
    event.preventDefault();
    onNavigate();
  };

  return (
    <a
      href={href}
      onClick={handleClick}
      className={`after:absolute after:inset-0 after:content-[''] focus-visible:outline-none ${className}`}
    >
      {children}
    </a>
  );
}
