import { ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

export type SortOption = 'name-asc' | 'name-desc' | 'updated' | 'rating' | 'downloads';

interface SortDropdownProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
}

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'name-asc', label: 'Name (A-Z)' },
  { value: 'name-desc', label: 'Name (Z-A)' },
  { value: 'updated', label: 'Last Updated' },
  { value: 'rating', label: 'Top Rated' },
  { value: 'downloads', label: 'Most Popular' },
];

export function SortDropdown({ value, onChange }: SortDropdownProps) {
  const currentLabel = sortOptions.find(opt => opt.value === value)?.label || 'Sort by';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-surface)] border border-[var(--divider)] rounded-xl hover:border-[var(--brand)] transition-all text-[var(--text-primary)]">
          <span className="text-sm font-medium">{currentLabel}</span>
          <ChevronDown className="w-4 h-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-48 bg-[var(--bg-page)]/95 border border-[var(--divider)]/50 rounded-xl shadow-sm p-1"
      >
        {sortOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`cursor-pointer ${
              value === option.value
                ? 'text-[var(--brand)] bg-[var(--chip-bg)]'
                : 'text-[var(--text-primary)] hover:bg-[var(--bg-elev-1)]'
            }`}
          >
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
