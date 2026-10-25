export interface DonationGoal {
  title: string;
  description: string;
  targetAmount: number;
  currentAmount: number;
  currency: string;
  autoCalc?: boolean;
}

export interface PaymentMethod {
  id: string;
  label: string;
  description: string;
  url: string;
  enabled: boolean;
  iconHint: string;
  type?: 'link' | 'details';
  details?: {
    number?: string;
    email?: string;
    address?: string;
    accountName?: string;
    network?: string;
    instructions?: string;
    qrCodeUrl?: string;
  };
}

export interface TransparencyItem {
  label: string;
  value: string;
}

export interface SupporterLeaderboardItem {
  /** Stable supporter key used for list keys and pagination de-duplication. */
  key: string;
  /** 1–3 for the podium; null for recent-list entries. */
  rank: number | null;
  display_name: string;
  /** Null when the supporter chose to hide their amount. */
  total_usd: number | null;
  donation_count: number;
  latest_donation_at: string | null;
  amount_hidden: boolean;
}

export type SupporterLeaderboardTopItem = SupporterLeaderboardItem & { rank: number };

export interface SupporterLeaderboardPage {
  /** Top three by lifetime total; empty on later pages. */
  top: SupporterLeaderboardTopItem[];
  /** Remaining supporters, newest donation first. */
  items: SupporterLeaderboardItem[];
  total: number;
  total_raised_usd: number;
  next_cursor: string | null;
}
