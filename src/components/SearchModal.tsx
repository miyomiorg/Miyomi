import { Search, X, ArrowRight } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useGlobalSearch } from '../hooks/useGlobalSearch';
import { TagBadge } from './TagBadge';
import { AppLogo } from './AppLogo';
import { FlagDisplay } from './FlagDisplay';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useGlobalSearch(query);
  const showResults = query.trim().length > 0;
  const limitedResults = results.slice(0, 10);

  // Auto-focus search input when modal opens
  useEffect(() => {
    if (isOpen) {
      // Small delay to allow the modal animation to render the input
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);


  const handleResultClick = (result: any) => {
    onClose();
    setQuery('');
    switch (result.type) {
      case 'app':
        navigate(`/software/${result.slug || result.id}`);
        break;
      case 'extension':
        navigate(`/extensions/${result.slug || result.id}`);
        break;
      case 'guide':
        navigate(`/guides/${result.slug}`);
        break;
    }
  };

  const IconForType = ({ type }: { type: string }) => {
    if (type === 'guide') return <span className="text-xl">📚</span>;
    return null;
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      onClose();
      setQuery('');
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9999] bg-black/5 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-4 sm:pt-12 md:pt-16 px-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-2xl bg-[var(--bg-surface)]/80 backdrop-blur-lg rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.1)] border border-[var(--divider)]/50 pointer-events-auto flex flex-col max-h-[85dvh]"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-[var(--divider)] flex-shrink-0">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  Global Search
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-[var(--chip-bg)] transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  aria-label="Close search"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search Input Area */}
              <div className="p-6 pb-2 flex-shrink-0">
                <form onSubmit={handleSearch}>
                  <div className="flex items-center gap-3 px-4 py-3 bg-[var(--bg-page)]/50 border-2 border-[var(--divider)] focus-within:border-[var(--brand)] rounded-xl transition-all">
                    <Search className="w-5 h-5 text-[var(--text-secondary)]" />
                    <input
                      ref={inputRef}
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search apps, extensions, or guides..."
                      className="flex-1 bg-transparent outline-none text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]"
                    />
                  </div>
                </form>
              </div>

              <div className="overflow-y-auto px-6 pb-6 custom-scrollbar">
                {showResults ? (
                  <div className="space-y-2 mt-2">
                    {limitedResults.length === 0 ? (
                      <div className="text-center py-8 text-[var(--text-secondary)]">
                        No results found for "{query}"
                      </div>
                    ) : (
                      limitedResults.map((result) => (
                        <button
                          key={`${result.type}-${result.id}`}
                          onClick={() => handleResultClick(result)}
                          className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--bg-elev-1)] transition-colors text-left group border border-transparent hover:border-[var(--divider)]"
                        >
                          {/* Icon */}
                          <div className="w-10 h-10 rounded-lg bg-[var(--bg-elev-2)] flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {result.type === 'guide' ? (
                              <IconForType type={result.type} />
                            ) : (
                              <AppLogo
                                name={result.name}
                                logoUrl={result.logoUrl}
                                iconColor={result.accentColor || result.iconColor}
                                className="w-full h-full"
                                roundedClass="rounded-none"
                                textClassName="text-sm"
                              />
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <h4 className="font-medium text-[var(--text-primary)] truncate">
                                {result.name}
                              </h4>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium uppercase
                                                ${result.type === 'app' ? 'bg-blue-500/10 text-blue-500' :
                                  result.type === 'extension' ? 'bg-purple-500/10 text-purple-500' :
                                    'bg-orange-500/10 text-orange-500'}`}>
                                {result.type}
                              </span>
                            </div>
                            {result.type === 'extension' && (
                              <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-secondary)] mb-0.5">
                                <FlagDisplay region={result.region} size="small" />
                                <span>|</span>
                                <span>{result.types?.join(' + ')}</span>
                              </div>
                            )}
                            <p className="text-xs text-[var(--text-secondary)] truncate">
                              {result.description}
                            </p>
                          </div>

                          {/* Arrow */}
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--text-secondary)]">
                            <ArrowRight className="w-4 h-4" />
                          </div>
                        </button>
                      ))
                    )}
                    {limitedResults.length > 0 && (
                      <button
                        onClick={(e) => handleSearch(e as any)}
                        className="w-full py-3 text-center text-sm text-[var(--brand)] font-medium hover:underline mt-2"
                      >
                        See all results for "{query}"
                      </button>
                    )}
                  </div>
                ) : (
                  /* Existing Hints */
                  <div className="mt-2">
                    <div className="flex flex-wrap gap-2">
                      <span className="text-sm text-[var(--text-secondary)] self-center mr-1">Try:</span>
                      {['anime', 'manga', 'extensions', 'mihon', 'aniyomi'].map((hint) => (
                        <button
                          key={hint}
                          type="button"
                          onClick={() => setQuery(hint)}
                          className="px-3 py-1 text-sm bg-[var(--chip-bg)] hover:bg-[var(--brand)] text-[var(--text-secondary)] hover:text-white rounded-lg transition-all"
                        >
                          {hint}
                        </button>
                      ))}
                    </div>
                    <div className="mt-6 flex items-center justify-between text-xs text-[var(--text-secondary)]">
                      <span>Press Enter to search</span>
                      <span>Press Esc to close</span>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
