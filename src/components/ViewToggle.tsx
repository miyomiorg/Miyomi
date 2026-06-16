import { LayoutGrid, LayoutList } from 'lucide-react';

interface ViewToggleProps {
  view: 'grid' | 'list';
  onViewChange: (view: 'grid' | 'list') => void;
}

export function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  return (
    <div className="flex items-center border border-[var(--divider)] rounded-lg overflow-hidden bg-[var(--bg-surface)]">
      <button
        onClick={() => onViewChange('grid')}
        className={`p-2 transition-colors focus-visible:outline-none ${
          view === 'grid'
            ? 'text-[var(--brand)] bg-[var(--chip-bg)]'
            : 'text-[var(--text-secondary)] hover:text-[var(--brand)] hover:bg-[var(--chip-bg)]'
        }`}
        aria-label="Grid view"
        aria-pressed={view === 'grid'}
      >
        <LayoutGrid className="w-4 h-4" strokeWidth={2} />
      </button>
      <div className="w-px h-4 bg-[var(--divider)]" />
      <button
        onClick={() => onViewChange('list')}
        className={`p-2 transition-colors focus-visible:outline-none ${
          view === 'list'
            ? 'text-[var(--brand)] bg-[var(--chip-bg)]'
            : 'text-[var(--text-secondary)] hover:text-[var(--brand)] hover:bg-[var(--chip-bg)]'
        }`}
        aria-label="List view"
        aria-pressed={view === 'list'}
      >
        <LayoutList className="w-4 h-4" strokeWidth={2} />
      </button>
    </div>
  );
}
