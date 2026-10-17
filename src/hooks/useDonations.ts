import { useState, useEffect } from 'react';
import { donationsApi } from '@/services/api';
import type { PaymentMethod, TransparencyItem, DonationGoal } from '@/types/donations';

export interface Donator {
  id?: string;
  name: string;
  amount: number;
  currency: string;
  message: string;
  date: string;
  isPublic: boolean;
  showAmount: boolean;
  paymentMethod?: string;
  usdAmount?: number;
}

export interface FundAllocationItem {
  label: string;
  value: string;
}

interface UseDonationsReturn {
  donators: Donator[];
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
 * Fully database-driven hook (reads donation_settings + donations via the API).
 */
export function useDonations(): UseDonationsReturn {
  const [data, setData] = useState<UseDonationsReturn>({
    donators: [],
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
      let donators: Donator[] = [];
      let goal: DonationGoal = DEFAULT_GOAL;
      let methods: PaymentMethod[] = [];
      let transparency: TransparencyItem[] = [];
      let whereFundsGo: FundAllocationItem[] = [];
      let currencies: { code: string; rate: number }[] = [];
      let showAmounts = true;
      let showGoal = false;
      let lastUpdated = '';

      try {
        const [settings, rows] = await Promise.all([
          donationsApi.settings(),
          donationsApi.list(),
        ]);

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
            if (s.key === 'currencies' && Array.isArray(val)) currencies = val;
          }
        }

        if (rows && rows.length > 0) {
          donators = rows.map((r: any) => {
            const amt = Number(r.amount);
            const cur = r.currency || 'USD';
            const rate = currencies.find(c => c.code === cur)?.rate || 1;
            return {
              id: r.id,
              name: r.donor_name,
              amount: amt,
              currency: cur,
              message: r.message || '',
              date: r.date || '',
              isPublic: r.is_public,
              showAmount: r.show_amount,
              paymentMethod: r.payment_method || '',
              usdAmount: Math.round((amt / rate) * 100) / 100,
            };
          });
        }

        if (goal.autoCalc && donators.length > 0) {
          goal = {
            ...goal,
            currentAmount: donators.reduce((sum, d) => {
              const rate = currencies.find(c => c.code === d.currency)?.rate || 1;
              return sum + (d.amount / rate);
            }, 0),
          };
          goal.currentAmount = Math.round(goal.currentAmount * 100) / 100;
        }
      } catch (e) {
        console.warn('Failed to load donations:', e);
      }

      if (!cancelled) {
        setData({
          donators,
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
