interface MatchedTagChipsProps {
  tags?: readonly string[];
  limit?: number;
  className?: string;
}

/** Compact badge-style chips that explain which tag matched a global search query. */
export function MatchedTagChips({ tags, limit = 3, className = '' }: MatchedTagChipsProps) {
  if (!tags || tags.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {tags.slice(0, limit).map((tag) => (
        <span
          key={tag}
          title={`Matched tag: ${tag}`}
          className="inline-flex max-w-full items-center rounded-md border border-[var(--divider)] bg-[var(--chip-bg)] px-1.5 py-0.5 text-[10px] font-medium leading-none text-[var(--brand)]"
        >
          <span className="mr-0.5 opacity-60">#</span>
          <span className="truncate">{tag}</span>
        </span>
      ))}
    </div>
  );
}
