import { Calendar, Tag, Download as DownloadIcon } from 'lucide-react';
import type { ReleaseData } from '../hooks/useGitHubRelease';

interface GitHubReleaseMetaProps {
  release: ReleaseData | null;
  loading?: boolean;
  formatDate: (date?: string) => string;
  className?: string;
  justify?: 'start' | 'center' | 'end';
}

// Full class names so Tailwind can see them (a template like
// `sm:justify-${justify}` is never generated).
const JUSTIFY_CLASS = {
  start: 'sm:justify-start',
  center: 'sm:justify-center',
  end: 'sm:justify-end',
} as const;

const formatDownloadCount = (value: number) => {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(value >= 10_000_000_000 ? 0 : 1).replace(/\.0$/, '')}B`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1).replace(/\.0$/, '')}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1).replace(/\.0$/, '')}K`;
  }
  return value.toLocaleString();
};

export function GitHubReleaseMeta({
  release,
  loading = false,
  formatDate,
  className = 'mb-4',
  justify = 'start',
}: GitHubReleaseMetaProps) {
  // Only show skeleton if we have NO data and we are loading
  const showSkeleton = loading && !release;

  if (!release && !loading) {
    return null;
  }

  return (
    <div className={className}>
      {release && (
        <div className={`flex flex-wrap items-center justify-center gap-1 ${JUSTIFY_CLASS[justify]}`}>
          {release.version && release.version !== 'N/A' && (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[var(--divider)] bg-[var(--chip-bg)] px-3 py-1.5">
              <Tag className="w-3.5 h-3.5 text-[var(--brand)]" />
              <span
                className="text-xs sm:text-sm text-[var(--text-primary)] font-['Inter',sans-serif]"
                style={{ fontWeight: 600 }}
              >
                {release.version}
              </span>
              {release.isPrerelease && (
                <span
                  className="ml-1 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-2 py-0.5 text-[10px] sm:text-xs font-['Inter',sans-serif] text-yellow-600 dark:text-yellow-400"
                  style={{ fontWeight: 600 }}
                >
                  Pre-release
                </span>
              )}
            </div>
          )}

          {release?.date && (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[var(--divider)] bg-[var(--chip-bg)] px-3 py-1.5">
              <Calendar className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
              <span
                className="text-xs sm:text-sm text-[var(--text-secondary)] font-['Inter',sans-serif]"
                style={{ fontWeight: 500 }}
              >
                {formatDate(release.date)}
              </span>
            </div>
          )}

          {typeof release?.downloads === 'number' && release.downloads > 0 && (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[var(--divider)] bg-[var(--chip-bg)] px-3 py-1.5">
              <DownloadIcon className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
              <span
                className="text-xs sm:text-sm text-[var(--text-secondary)] font-['Inter',sans-serif]"
                style={{ fontWeight: 500 }}
              >
                {formatDownloadCount(release.downloads)}
              </span>
            </div>
          )}
        </div>
      )}

      {showSkeleton && (
        <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-8 w-24 rounded-full border border-[var(--divider)] bg-[var(--chip-bg)] animate-pulse"
            ></div>
          ))}
        </div>
      )}
    </div>
  );
}
