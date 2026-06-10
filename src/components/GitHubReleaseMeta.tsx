import React from 'react';
import { Calendar, Tag, Download as DownloadIcon } from 'lucide-react';
import type { ReleaseData } from '../hooks/useGitHubRelease';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';

interface GitHubReleaseMetaProps {
  release: ReleaseData | null;
  loading?: boolean;
  formatDate: (date?: string) => string;
  className?: string;
  justify?: 'start' | 'center' | 'end';
}

export function GitHubReleaseMeta({
  release,
  loading = false,
  formatDate,
  className = 'mb-4',
  justify = 'start',
}: GitHubReleaseMetaProps) {
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

  // Only show skeleton if we have NO data and we are loading
  const showSkeleton = loading && !release;

  if (!release && !loading) {
    return null;
  }

  return (
    <div className={className}>
      {release && (
        <div className={`flex flex-wrap items-center justify-center gap-1 sm:justify-${justify}`}>
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

interface GitHubReleaseNotesProps {
  notes?: string;
  releaseUrl?: string;
  maxLines?: number;
  className?: string;
}

function normalizeNotes(input: string) {
  try {
    const processed = unified()
      .use(remarkParse)
      .use(remarkStringify, {
        bullet: '-',
        fences: true,
        tightDefinitions: true,
      })
      .processSync(input);
    return processed.toString().trim();
  } catch (error) {
    console.warn('Failed to normalize release notes', error);
    return input.trim();
  }
}

export function GitHubReleaseNotes({
  notes,
  releaseUrl,
  maxLines = 10,
  className = '',
}: GitHubReleaseNotesProps) {
  if (!notes) {
    return null;
  }

  const normalized = normalizeNotes(notes);
  const lines = normalized.split('\n');

  const condensedLines: string[] = [];
  for (const line of lines) {
    const isEmpty = line.trim() === '';
    if (isEmpty) {
      if (condensedLines.length === 0) continue;
      if (condensedLines[condensedLines.length - 1] === '') continue;
      condensedLines.push('');
    } else {
      condensedLines.push(line);
    }
  }

  const previewLines = condensedLines.slice(0, maxLines);
  const preview = previewLines.join('\n').trimEnd();
  const hasMore = condensedLines.length > maxLines;

  const wrapperClasses = `prose prose-sm max-w-none text-[var(--text-secondary)] font-['Inter',sans-serif] ${className}`.trim();

  return (
    <div className={wrapperClasses}>
      <div
        className="release-notes"
        style={{
          fontSize: '14px',
          lineHeight: '1.6',
          wordBreak: 'break-word',
        }}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            a: (props) => (
              <a
                {...props}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--brand)] hover:text-[var(--brand-strong)] transition-colors"
              />
            ),
          }}
        >
          {preview}
        </ReactMarkdown>
      </div>
      {hasMore && releaseUrl && (
        <div className="mt-3">
          <a
            href={releaseUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--brand)] hover:text-[var(--brand-strong)] transition-colors text-sm"
          >
            Read more →
          </a>
        </div>
      )}
    </div>
  );
}
