import { ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect, ReactNode } from 'react';

export type FilterOption = string | { label: string; value: string; isSelected?: boolean };

interface FilterDropdownProps {
  label: string;
  value: string;
  options: readonly FilterOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  displayValue?: ReactNode;
  className?: string;
}

export function FilterDropdown({ label, value, options, onChange, placeholder, displayValue, className = '' }: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className={`relative w-full min-w-0 ${className}`} ref={dropdownRef}>
      {label && (
        <label className="block text-[var(--text-secondary)] font-['Inter',sans-serif] text-[10px] sm:text-xs mb-1 sm:mb-1.5" style={{ fontWeight: 500 }}>
          {label}
        </label>
      )}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-2 sm:px-4 py-2 sm:py-2.5 bg-[var(--bg-surface)] border border-[var(--divider)] rounded-lg sm:rounded-xl text-[var(--text-primary)] hover:border-[var(--brand)] transition-colors font-['Inter',sans-serif] text-xs sm:text-sm min-w-0"
        style={{ fontWeight: 400 }}
      >
        <span className="min-w-0 flex items-center gap-1 sm:gap-2">
          {displayValue ? displayValue : <span className="truncate">{value || placeholder || 'Select...'}</span>}
        </span>
        <ChevronDown className={`w-3 h-3 sm:w-4 sm:h-4 ml-1 sm:ml-2 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--bg-surface)]/70 backdrop-blur-md border border-[var(--divider)] rounded-lg sm:rounded-xl shadow-lg max-h-60 overflow-y-auto z-50 scrollbar-hide">
          {options.map((option) => {
            const isString = typeof option === 'string';
            const optionLabel = isString ? option : option.label;
            const optionValue = isString ? option : option.value;
            const isSelected = isString ? value === option : (option.isSelected ?? value === optionValue);

            return (
              <button
                key={optionValue}
                onClick={() => {
                  onChange(optionValue);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-2 sm:px-4 py-2 sm:py-2.5 font-['Inter',sans-serif] text-xs sm:text-sm transition-colors ${isSelected
                  ? 'bg-[var(--chip-bg)] text-[var(--brand)]'
                  : 'text-[var(--text-primary)] hover:bg-[var(--bg-elev-1)]'
                  }`}
                style={{ fontWeight: isSelected ? 600 : 400 }}
              >
                {optionLabel}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}