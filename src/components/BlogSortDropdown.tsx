import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export type SortMode = 'newest' | 'oldest' | 'popular';

interface BlogSortDropdownProps {
    value: SortMode;
    onChange: (val: SortMode) => void;
}

export function BlogSortDropdown({ value, onChange }: BlogSortDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const options: { value: SortMode; label: string }[] = [
        { value: 'newest', label: 'Newest' },
        { value: 'oldest', label: 'Oldest' },
        { value: 'popular', label: 'Popular' },
    ];

    const currentLabel = options.find(o => o.value === value)?.label || 'Newest';

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    return (
        <div className="relative w-[120px] sm:w-[200px]" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-label={`Sort blog posts: ${currentLabel}`}
                className="w-full h-[42px] sm:h-[44px] flex items-center justify-between gap-1.5 px-3 sm:px-4 bg-[var(--bg-elev-1)] border border-transparent rounded-xl hover:border-[var(--brand)] transition-all outline-none font-['Inter',sans-serif] text-sm shadow-sm"
            >
                <div className="flex items-center gap-1.5 min-w-0">
                    <span className="hidden sm:inline text-[var(--text-secondary)] whitespace-nowrap">Sort by:</span>
                    <span className="text-[var(--text-primary)] font-semibold truncate">{currentLabel}</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-[var(--text-secondary)] flex-shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div
                    role="listbox"
                    aria-label="Sort blog posts"
                    className="absolute top-full mt-2 left-0 right-0 z-50 bg-[var(--bg-elev-1)]/60 backdrop-blur-xl border border-[var(--divider)] rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
                >
                    <div className="p-1.5 flex flex-col gap-0.5">
                        {options.map((opt) => {
                            const isSelected = opt.value === value;
                            return (
                                <button
                                    key={opt.value}
                                    type="button"
                                    role="option"
                                    aria-selected={isSelected}
                                    onClick={() => {
                                        onChange(opt.value);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all font-['Inter',sans-serif] ${
                                        isSelected 
                                            ? 'bg-[var(--brand)]/10 text-[var(--brand)] font-semibold' 
                                            : 'text-[var(--text-primary)] hover:bg-[var(--bg-elev-2)]'
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
