import React from 'react';
import { Heart } from 'lucide-react';
import { useGitHubLastCommit } from '../hooks/useGitHubLastCommit';

export function Footer() {
  const { commit, loading } = useGitHubLastCommit('miyomiorg/Miyomi');

  return (
    <footer className="border-t border-[var(--divider)] mt-6 py-8 pb-[calc(2rem+4rem+env(safe-area-inset-bottom))] md:pb-8 px-4 sm:px-8 lg:px-[120px]">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[var(--text-secondary)] font-['Inter',sans-serif] text-sm">
          <div className="flex flex-col xl:flex-row items-center gap-3 sm:gap-4 flex-wrap justify-center xl:justify-start">
            <div className="flex items-center justify-center gap-2">
              <span>The Miyomi Team</span>
              <span className="hidden xl:inline text-[var(--divider)]">|</span>
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
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
              <span className="hidden xl:inline text-[var(--divider)]">|</span>
              <a
                href="/about#disclaimer"
                className="hover:text-[var(--brand)] transition-colors underline whitespace-nowrap"
              >
                Disclaimer
              </a>
              <span className="hidden sm:inline text-[var(--divider)] opacity-50 xl:opacity-100">|</span>
              <a
                href="/privacy-policy"
                className="hover:text-[var(--brand)] transition-colors underline whitespace-nowrap"
              >
                Privacy Policy
              </a>
              <span className="hidden sm:inline text-[var(--divider)] opacity-50 xl:opacity-100">|</span>
              <a
                href="/donate"
                className="inline-flex items-center gap-1 hover:text-pink-400 transition-colors group whitespace-nowrap"
              >
                <Heart className="w-3.5 h-3.5 text-pink-400 group-hover:fill-pink-400 transition-all" />
                Support Us
              </a>
            </div>
          </div>

          {/* Right side - Made with love */}
          <div className="flex items-center justify-center gap-2 text-center flex-wrap">
            <span>Made with </span>
            <Heart className="w-4 h-4 text-[var(--brand)] fill-[var(--brand)] flex-shrink-0" />
            <span>& the power of "just one more chapter"</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
