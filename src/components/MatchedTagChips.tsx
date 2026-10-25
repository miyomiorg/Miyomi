interface MatchedTagChipsProps {
  tags?: readonly string[];
  limit?: number;
  className?: string;
}

/** Small hashtag chips that explain which tag matched a global search query. */
export function MatchedTagChips({ tags, limit = 3, className = '' }: MatchedTagChipsProps) {
  if (!tags || tags.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {tags.slice(0, limit).map((tag) => (
        <span
          key={tag}
          className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--chip-bg)] text-[var(--text-secondary)]"
        >
          #{tag}
        </span>
      ))}
    </div>
  );
}
