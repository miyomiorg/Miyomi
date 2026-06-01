interface TagBadgeProps {
  tag: 'Manga' | 'Anime' | 'Light Novel' | 'Multi';
  mobile?: boolean;
}

const tagColors = {
  Manga: { bg: '#FFE8E8', text: '#C44545' },
  Anime: { bg: '#E8F4FF', text: '#4573C4' },
  'Light Novel': { bg: '#F4E8FF', text: '#8845C4' },
  Multi: { bg: '#F3F4F6', text: '#4B5563' }, // Gray for Multi
};

export function TagBadge({ tag, mobile = false }: TagBadgeProps) {
  const colors = tagColors[tag] || tagColors['Multi']; // Fallback

  const shortTag = (() => {
    switch (tag) {
      case 'Anime': return 'A';
      case 'Manga': return 'M';
      case 'Light Novel': return 'LN';
      case 'Multi': return 'All';
      default: return tag;
    }
  })();

  return (
    <span
      className="px-2 py-0.5 rounded-md text-xs font-['Inter',sans-serif]"
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
        fontWeight: 500,
      }}
    >
      <span className="sm:hidden">{shortTag}</span>
      <span className="hidden sm:inline">{tag}</span>
    </span>
  );
}
