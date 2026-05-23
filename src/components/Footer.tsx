import React from 'react';
import { Heart } from 'lucide-react';
import { useGitHubLastCommit } from '../hooks/useGitHubLastCommit';

export function Footer() {
  const { commit, loading } = useGitHubLastCommit('tas33n/miyomi');

  return (
    <footer className="border-t border-[var(--divider)] mt-16 py-8 px-4 sm:px-8 lg:px-[120px]">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[var(--text-secondary)] font-['Inter',sans-serif] text-sm">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span>The Miyomi Team</span>
              <span className="hidden sm:inline">|</span>
              {commit?.url ? (
                <a
                  href={commit.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs bg-[var(--chip-bg)] px-2 py-1 rounded hover:bg-[var(--chip-bg-hover)] transition-colors"
                  title={commit.message}
                >
                  {loading ? '•••••••' : commit.sha || 'loading'}
                </a>
              ) : (
                <span className="font-mono text-xs bg-[var(--chip-bg)] px-2 py-1 rounded">
                  {loading ? '•••••••' : commit?.sha || 'a4aded9'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline">|</span>
              <a
                href="/about#disclaimer"
                className="hover:text-[var(--brand)] transition-colors underline"
              >
                Disclaimer
              </a>
              <span>|</span>
              <a
                href="/donate"
                className="inline-flex items-center gap-1 hover:text-pink-400 transition-colors group"
              >
                <Heart className="w-3.5 h-3.5 text-pink-400 group-hover:fill-pink-400 transition-all" />
                Support Us
              </a>
            </div>
          </div>

          {/* Right side - Made with love */}
          <div className="flex items-center gap-2">
            <span>Made with </span>
            <Heart className="w-4 h-4 text-[var(--brand)] fill-[var(--brand)]" />
            <span>& the power of "just one more chapter"</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
