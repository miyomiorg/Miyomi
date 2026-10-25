import type { SupporterLeaderboardItem } from '@/types/donations';
import { SupporterAvatar } from './SupporterAvatar';
import { SupporterRankBadge } from './SupporterRankBadge';
import {
  formatAbsoluteDonationDate,
  formatRelativeDonationDate,
  formatSupporterAmount,
} from './supporterUtils';

interface SupporterRowProps {
  item: SupporterLeaderboardItem;
  showAmounts: boolean;
  counter: number;
  className?: string;
}

export function SupporterRow({ item, showAmounts, counter, className = '' }: SupporterRowProps) {
  const hidden = !showAmounts || item.amount_hidden || item.total_usd === null;
  const amount = formatSupporterAmount(item.total_usd, item.amount_hidden, showAmounts);
  const dateTitle = formatAbsoluteDonationDate(item.latest_donation_at);

  return (
    <div className={`flex min-w-0 items-center gap-2.5 rounded-lg px-2 py-3 transition-colors hover:bg-[var(--bg-elev-1)]/60 sm:gap-4 sm:px-3 ${className}`}>
      <SupporterRankBadge rank={item.rank ?? counter} />
      <SupporterAvatar name={item.display_name} size={36} />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-baseline justify-between gap-2">
          <span
            className="truncate font-['Poppins',sans-serif] text-[13px] font-semibold text-[var(--text-primary)] sm:text-sm"
            title={item.display_name}
          >
            {item.display_name}
          </span>
          <span
            className={`shrink-0 text-[13px] font-bold tabular-nums sm:text-sm ${hidden ? 'text-[var(--text-secondary)] opacity-70' : 'text-[var(--text-primary)]'}`}
            title={hidden
              ? (showAmounts ? 'This supporter chose to hide their amount' : 'Donation amounts are hidden')
              : undefined}
          >
            {amount}
          </span>
        </div>
        <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] text-[var(--text-secondary)]">
          <span className="shrink-0">
            {item.donation_count} donation{item.donation_count === 1 ? '' : 's'}
          </span>
          <span aria-hidden="true">·</span>
          <time
            className="truncate"
            dateTime={item.latest_donation_at ?? undefined}
            title={dateTitle}
          >
            {formatRelativeDonationDate(item.latest_donation_at)}
          </time>
        </div>
      </div>
    </div>
  );
}
