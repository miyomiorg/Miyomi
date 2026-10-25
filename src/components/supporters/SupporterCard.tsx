import { Sparkles } from 'lucide-react';
import type { SupporterLeaderboardItem } from '@/types/donations';
import { SupporterAvatar } from './SupporterAvatar';
import {
  formatAbsoluteDonationDate,
  formatRelativeDonationDate,
  formatSupporterAmount,
} from './supporterUtils';

interface SupporterCardProps {
  item: SupporterLeaderboardItem;
  showAmounts: boolean;
  index: number;
}

/** Compact recent-supporter card used in the desktop grid. */
export function SupporterCard({ item, showAmounts, index }: SupporterCardProps) {
  const hidden = !showAmounts || item.amount_hidden || item.total_usd === null;
  const amount = formatSupporterAmount(item.total_usd, item.amount_hidden, showAmounts);
  const dateTitle = formatAbsoluteDonationDate(item.latest_donation_at);

  return (
    <div
      className="supporter-card-bump h-full min-w-0"
      style={{
        animationDelay: `${(index % 5) * 0.3}s`,
        animationDuration: `${6.8 + (index % 3) * 0.65}s`,
      }}
    >
      <div className="group relative flex h-full min-w-0 flex-col rounded-xl border border-[var(--divider)] bg-[var(--bg-surface)] p-3 transition-[transform,box-shadow,border-color] duration-300 group-hover:-translate-y-1 group-hover:scale-[1.015] group-hover:border-[var(--brand)]/40 group-hover:shadow-[0_8px_24px_rgba(0,0,0,0.10)]">
        <div className="flex min-w-0 items-center gap-2">
          <span className="relative inline-flex shrink-0 transition-transform duration-300 group-hover:scale-110">
            <SupporterAvatar name={item.display_name} size={32} />
            <Sparkles
              className="pointer-events-none absolute -right-1.5 -top-1.5 h-3.5 w-3.5 text-[var(--brand)] opacity-0 transition-all duration-300 group-hover:rotate-12 group-hover:scale-125 group-hover:opacity-100"
              aria-hidden="true"
            />
          </span>
          <div className="min-w-0 flex-1">
            <div
              className="truncate font-['Poppins',sans-serif] text-[13px] font-semibold text-[var(--text-primary)]"
              title={item.display_name}
            >
              {item.display_name}
            </div>
            <div className="text-[10px] text-[var(--text-secondary)]">
              {item.donation_count} donation{item.donation_count === 1 ? '' : 's'}
            </div>
          </div>
        </div>

        <div className="mt-2 flex min-w-0 items-baseline justify-between gap-2">
          <time
            className="truncate text-[10px] text-[var(--text-secondary)]"
            dateTime={item.latest_donation_at ?? undefined}
            title={dateTitle}
          >
            {formatRelativeDonationDate(item.latest_donation_at)}
          </time>
          <span
            className={`shrink-0 text-[13px] font-bold tabular-nums ${hidden ? 'text-[var(--text-secondary)] opacity-70' : 'text-[var(--text-primary)]'}`}
            title={hidden
              ? (showAmounts ? 'This supporter chose to hide their amount' : 'Donation amounts are hidden')
              : undefined}
          >
            {amount}
          </span>
        </div>
      </div>
    </div>
  );
}
