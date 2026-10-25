import { Star } from 'lucide-react';

export const SUPPORTER_MEDALS = {
  1: { label: 'Gold', color: '#D4A017' },
  2: { label: 'Silver', color: '#9AA6B2' },
  3: { label: 'Bronze', color: '#B87333' },
} as const;

interface SupporterRankBadgeProps {
  rank: number;
  large?: boolean;
}

export function SupporterRankBadge({ rank, large = false }: SupporterRankBadgeProps) {
  const medal = SUPPORTER_MEDALS[rank as keyof typeof SUPPORTER_MEDALS];
  const box = large ? 'h-9 w-9' : 'h-7 w-7';
  const star = large ? 'h-7 w-7' : 'h-5 w-5';

  if (medal) {
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center rounded-full bg-[var(--chip-bg)] ${box}`}
        title={`${medal.label} rank`}
        aria-label={`${medal.label} rank`}
      >
        <Star
          className={star}
          style={{ color: medal.color, fill: medal.color }}
          aria-hidden="true"
        />
      </span>
    );
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center text-sm font-semibold tabular-nums text-[var(--text-secondary)] ${box}`}
      aria-label={`Rank ${rank}`}
    >
      {rank}
    </span>
  );
}
