import { Search, X } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

interface SearchBarProps {
  placeholder?: string;
  onSearch?: (value: string) => void;
}

export function SearchBar({ placeholder = 'Search apps or extensions', onSearch }: SearchBarProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [value, setValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    const queryParam = searchParams.get('q');
    setValue(queryParam || '');
  }, [searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    onSearch?.(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && value.trim()) {
      navigate(`/search?q=${encodeURIComponent(value.trim())}`);
    }
  };

  return (
    <div
      className={`flex items-center gap-3 h-12 px-4 bg-[var(--bg-surface)] border rounded-xl transition-all ${
        isFocused
          ? 'border-[var(--brand)] ring-2 ring-[var(--focus-ring)] ring-opacity-50'
          : 'border-[var(--divider)] hover:border-[var(--brand-strong)]'
      }`}
      style={{ boxShadow: '0 6px 20px 0 rgba(0,0,0,0.08)' }}
    >
      <Search className="w-5 h-5 text-[var(--text-secondary)] flex-shrink-0" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className="flex-1 bg-transparent outline-none text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] text-sm"
      />
      {value && (
        <button
          onClick={() => {
            setValue('');
            onSearch?.('');
          }}
          className="p-1 hover:bg-[var(--chip-bg)] rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors focus:outline-none cursor-pointer"
          aria-label="Clear search"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
