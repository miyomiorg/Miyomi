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
        <div className="relative w-[180px] sm:w-[200px]" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full h-[42px] sm:h-[44px] flex items-center justify-between px-4 bg-[var(--bg-elev-1)] border border-transparent rounded-xl hover:border-[var(--brand)] transition-all outline-none font-['Inter',sans-serif] text-sm shadow-sm"
            >
                <div className="flex items-center gap-1.5 truncate">
                    <span className="text-[var(--text-secondary)]">Sort by:</span>
                    <span className="text-[var(--text-primary)] font-semibold">{currentLabel}</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-[var(--text-secondary)] flex-shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-[calc(100%+8px)] left-0 right-0 z-50 bg-[var(--bg-elev-1)]/60 backdrop-blur-xl border border-[var(--divider)] rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-1.5 flex flex-col gap-0.5">
                        {options.map((opt) => {
                            const isSelected = opt.value === value;
                            return (
                                <button
                                    key={opt.value}
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
