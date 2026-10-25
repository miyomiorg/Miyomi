const DAY_MS = 86_400_000;
const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatUsdAmount(value: number): string {
  return usdFormatter.format(Number.isFinite(value) ? value : 0);
}

export function formatSupporterAmount(
  totalUsd: number | null,
  amountHidden: boolean,
  showAmounts: boolean,
): string {
  if (!showAmounts) return 'Hidden';
  if (amountHidden || totalUsd === null) return 'Private';
  return formatUsdAmount(totalUsd);
}

export function parseDonationDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00Z` : value;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatRelativeDonationDate(value: string | null | undefined): string {
  const date = parseDonationDate(value);
  if (!date) return 'Date unavailable';

  const days = Math.floor(Math.max(0, Date.now() - date.getTime()) / DAY_MS);
  if (days < 1) return 'today';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export function formatAbsoluteDonationDate(value: string | null | undefined): string {
  const date = parseDonationDate(value);
  if (!date) return 'Date unavailable';
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function supporterAvatarUrl(name: string): string {
  const seed = encodeURIComponent(name.trim().toLowerCase());
  return `https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
}

export function supporterInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const letters = parts.length > 1
    ? `${Array.from(parts[0])[0] ?? ''}${Array.from(parts[parts.length - 1])[0] ?? ''}`
    : Array.from(parts[0]).slice(0, 2).join('');
  return letters.toUpperCase() || '?';
}
