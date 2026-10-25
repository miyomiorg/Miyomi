import { Heart, Loader2, RefreshCw, Users } from 'lucide-react';
import type {
  SupporterLeaderboardItem,
  SupporterLeaderboardTopItem,
} from '@/types/donations';
import { SupporterAvatar } from './SupporterAvatar';
import { SupporterCard } from './SupporterCard';
import { SupporterRankBadge, SUPPORTER_MEDALS } from './SupporterRankBadge';
import { SupporterRow } from './SupporterRow';
import { SupporterRowsSkeleton } from './SupporterRowsSkeleton';
import {
  formatAbsoluteDonationDate,
  formatRelativeDonationDate,
  formatSupporterAmount,
} from './supporterUtils';

interface SupportersLeaderboardProps {
  top: SupporterLeaderboardTopItem[];
  items: SupporterLeaderboardItem[];
  total: number;
  loading: boolean;
  loadingMore: boolean;
  error: Error | null;
  moreError: Error | null;
  hasMore: boolean;
  onLoadMore: () => void;
  onRetry: () => void;
  showAmounts: boolean;
}

function PodiumCard({ item, showAmounts }: { item: SupporterLeaderboardTopItem; showAmounts: boolean }) {
  const medal = SUPPORTER_MEDALS[item.rank as keyof typeof SUPPORTER_MEDALS];
  const hidden = !showAmounts || item.amount_hidden || item.total_usd === null;
  const amount = formatSupporterAmount(item.total_usd, item.amount_hidden, showAmounts);
  const dateTitle = formatAbsoluteDonationDate(item.latest_donation_at);

  return (
    <div
      className="flex h-full flex-col items-center rounded-2xl border border-[var(--divider)] bg-[var(--bg-surface)] p-4 text-center shadow-[0_4px_14px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
      style={medal ? { borderTopColor: medal.color, borderTopWidth: 2 } : undefined}
    >
      <SupporterRankBadge rank={item.rank} large />
      <SupporterAvatar name={item.display_name} size={56} className="mt-3" />
      <div
        className="mt-3 w-full truncate font-['Poppins',sans-serif] text-sm font-semibold text-[var(--text-primary)]"
        title={item.display_name}
      >
        {item.display_name}
      </div>
      <div
        className={`mt-1 text-base font-bold tabular-nums ${hidden ? 'text-[var(--text-secondary)] opacity-70' : 'text-[var(--text-primary)]'}`}
        title={hidden
          ? (showAmounts ? 'This supporter chose to hide their amount' : 'Donation amounts are hidden')
          : undefined}
      >
        {amount}
      </div>
      <div className="mt-1 flex flex-wrap items-center justify-center gap-1 text-[11px] text-[var(--text-secondary)]">
        <span>{item.donation_count} donation{item.donation_count === 1 ? '' : 's'}</span>
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
  );
}

export function SupportersLeaderboard({
  top,
  items,
  total,
  loading,
  loadingMore,
  error,
  moreError,
  hasMore,
  onLoadMore,
  onRetry,
  showAmounts,
}: SupportersLeaderboardProps) {
  const hasAny = top.length > 0 || items.length > 0;
  const mobileItems: SupporterLeaderboardItem[] = [...top, ...items];
  const podiumSlots = [
    { item: top[1], className: 'md:col-start-1' },
    { item: top[0], className: 'md:col-start-2 md:mb-4' },
    { item: top[2], className: 'md:col-start-3' },
  ];

  return (
    <>
      <div className="mb-4 min-w-0">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-[var(--brand)]" />
          <h2 className="font-['Poppins',sans-serif] text-lg font-semibold text-[var(--text-primary)]">
            Supporters
          </h2>
        </div>
        <p className="text-sm text-[var(--text-secondary)]">
          Top 3 by lifetime support, followed by the latest donations.
        </p>
        {total > 0 && (
          <p className="mt-1 text-xs text-[var(--text-secondary)] opacity-70">
            {total} supporter{total === 1 ? '' : 's'}
          </p>
        )}
      </div>

      {loading && !hasAny ? (
        <SupporterRowsSkeleton rows={6} />
      ) : error && !hasAny ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--divider)] px-4 py-10 text-center">
          <p className="text-sm text-[var(--text-secondary)]">Couldn’t load supporters.</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-[var(--divider)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--chip-bg)]"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Try again
          </button>
        </div>
      ) : !hasAny ? (
        <div className="rounded-xl border border-[var(--divider)] py-8 text-center">
          <Heart className="mx-auto mb-2 h-8 w-8 text-[var(--text-secondary)] opacity-30" />
          <p className="text-sm text-[var(--text-secondary)]">No supporters yet. Be the first!</p>
        </div>
      ) : (
        <>
          <div className="hidden md:block">
            <div className="grid grid-cols-3 items-end gap-4">
              {podiumSlots.map(({ item, className }) => item ? (
                <div key={item.key} className={className}>
                  <PodiumCard item={item} showAmounts={showAmounts} />
                </div>
              ) : null)}
            </div>

            {items.length > 0 && (
              <div className="mt-6 grid gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {items.map((item, index) => (
                  <SupporterCard
                    key={item.key}
                    item={item}
                    showAmounts={showAmounts}
                    index={index}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="divide-y divide-[var(--divider)]/60 md:hidden">
            {mobileItems.map((item, index) => (
              <SupporterRow
                key={item.key}
                item={item}
                showAmounts={showAmounts}
                counter={index + 1}
              />
            ))}
          </div>

          {moreError && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--divider)] px-3 py-2 text-xs text-[var(--text-secondary)]">
              <span>Couldn’t load more supporters.</span>
              <button
                type="button"
                onClick={onLoadMore}
                className="font-medium text-[var(--brand)] hover:underline"
              >
                Try again
              </button>
            </div>
          )}

          {hasMore && (
            <div className="mt-4 border-t border-[var(--divider)] pt-4">
              <button
                type="button"
                onClick={onLoadMore}
                disabled={loadingMore}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--divider)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--chip-bg)] disabled:cursor-wait disabled:opacity-70"
              >
                {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                {loadingMore ? 'Loading…' : 'Load more supporters'}
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
