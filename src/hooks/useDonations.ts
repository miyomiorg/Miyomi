import { useState, useEffect } from 'react';
import { donationsApi } from '@/services/api';
import type { PaymentMethod, TransparencyItem, DonationGoal } from '@/types/donations';

export interface FundAllocationItem {
  label: string;
  value: string;
}

interface UseDonationsReturn {
  goal: DonationGoal;
  paymentMethods: PaymentMethod[];
  transparencyItems: TransparencyItem[];
  whereFundsGoItems: FundAllocationItem[];
  showDonationAmounts: boolean;
  showGoal: boolean;
  transparencyLastUpdated: string;
  loading: boolean;
}

const DEFAULT_GOAL: DonationGoal = { title: '', description: '', targetAmount: 0, currentAmount: 0, currency: 'USD' };

/**
 * Loads the public donation settings only. Donation history and the ranked
 * supporter aggregate are fetched separately by `useSupportersLeaderboard`,
 * so visiting the donate page never downloads the full donation table.
 */
export function useDonations(): UseDonationsReturn {
  const [data, setData] = useState<UseDonationsReturn>({
    goal: DEFAULT_GOAL,
    paymentMethods: [],
    transparencyItems: [],
    whereFundsGoItems: [],
    showDonationAmounts: true,
    showGoal: false,
    transparencyLastUpdated: '',
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      let goal: DonationGoal = DEFAULT_GOAL;
      let methods: PaymentMethod[] = [];
      let transparency: TransparencyItem[] = [];
      let whereFundsGo: FundAllocationItem[] = [];
      let showAmounts = true;
      let showGoal = false;
      let lastUpdated = '';

      try {
        const settings = await donationsApi.settings();

        if (settings) {
          for (const s of settings) {
            const val = s.value as any;
            if (s.key === 'goal' && val) goal = val;
            if (s.key === 'payment_methods' && Array.isArray(val)) methods = val;
            if (s.key === 'transparency' && Array.isArray(val)) transparency = val;
            if (s.key === 'where_funds_go' && Array.isArray(val)) whereFundsGo = val;
            if (s.key === 'display' && val) {
              showAmounts = val.showDonationAmounts ?? true;
              showGoal = val.showGoal ?? false;
              lastUpdated = val.transparencyLastUpdated ?? '';
            }
          }
        }
      } catch (e) {
        console.warn('Failed to load donation settings:', e);
      }

      if (!cancelled) {
        setData({
          goal,
          paymentMethods: methods,
          transparencyItems: transparency,
          whereFundsGoItems: whereFundsGo,
          showDonationAmounts: showAmounts,
          showGoal,
          transparencyLastUpdated: lastUpdated,
          loading: false,
        });
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return data;
}
