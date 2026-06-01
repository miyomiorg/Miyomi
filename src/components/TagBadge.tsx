interface TagBadgeProps {
  tag: string;
  mobile?: boolean;
  forceFull?: boolean;
}

const tagColors: Record<string, { bg: string; text: string }> = {
  Manga: { bg: '#FFE8E8', text: '#C44545' },
  Anime: { bg: '#E8F4FF', text: '#4573C4' },
  'Light Novel': { bg: '#F4E8FF', text: '#8845C4' },
  Novel: { bg: '#F4E8FF', text: '#8845C4' },
  Movie: { bg: '#E8F4FF', text: '#4573C4' },
  Comics: { bg: '#FFF4E8', text: '#C48445' },
  Webtoon: { bg: '#E8FFE8', text: '#45C45B' },
  Multi: { bg: '#F3F4F6', text: '#4B5563' }, // Gray for Multi
};

export function TagBadge({ tag, mobile = false, forceFull = false }: TagBadgeProps) {
  const colors = tagColors[tag] || tagColors['Multi']; // Fallback

  const shortTag = (() => {
    switch (tag) {
      case 'Anime': return 'A';
      case 'Manga': return 'M';
      case 'Light Novel': return 'LN';
      case 'Novel': return 'N';
      case 'Movie': return 'MV';
      case 'Comics': return 'C';
      case 'Webtoon': return 'W';
      case 'Multi': return 'All';
      default: return typeof tag === 'string' && tag.length > 0 ? tag.charAt(0).toUpperCase() : tag;
    }
  })();

  if (forceFull) {
    return (
      <span
        className="px-2 py-0.5 rounded-md text-xs font-['Inter',sans-serif]"
        style={{
          backgroundColor: colors.bg,
          color: colors.text,
          fontWeight: 500,
        }}
      >
        <span>{tag}</span>
      </span>
    );
  }

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
