import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { type PaymentMethod, type TransparencyItem, type DonationGoal } from '@/integrations/supabase/types';

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
 * Fully database-driven hook.
 * Fetches all donation data from Supabase on every mount (no stale cache).
 * Falls back to local/GitHub JSON ONLY for donators if DB returns zero rows.
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

      let jsonFallbackUsed = false;
      try {
        const { data: settings, error: settingsError } = await supabase
          .from('donation_settings')
          .select('*');

        if (settingsError) throw settingsError;

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

        const { data: rows, error: rowsError } = await supabase
          .from('donations')
          .select('*')
          .eq('is_public', true)
          .order('created_at', { ascending: false });

        if (rowsError) throw rowsError;

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
            ...goal, currentAmount: donators.reduce((sum, d) => {
              const rate = currencies.find(c => c.code === d.currency)?.rate || 1;
              return sum + (d.amount / rate);
            }, 0)
          };
          goal.currentAmount = Math.round(goal.currentAmount * 100) / 100;
        }
      } catch (e) {
        console.warn("Using JSON fallback for donations due to Supabase error", e);
        jsonFallbackUsed = true;
      }

      if (jsonFallbackUsed || donators.length === 0) {
        try {
          let r = await fetch('/donations.json');
          if (!r.ok) {
            r = await fetch('/donators.json');
          }

          if (r.ok) {
            const json = await r.json();

            if (jsonFallbackUsed) {
              if (json.goal) goal = json.goal;
              if (json.paymentMethods) methods = json.paymentMethods;
              if (json.transparencyItems) transparency = json.transparencyItems;
              if (json.whereFundsGoItems) whereFundsGo = json.whereFundsGoItems;
              if (json.display) {
                showAmounts = json.display.showDonationAmounts ?? true;
                showGoal = json.display.showGoal ?? false;
                lastUpdated = json.display.transparencyLastUpdated ?? '';
              }
            }

            if (json.donators) {
              donators = json.donators
                .filter((d: any) => d.isPublic !== false)
                .map((d: any) => ({ ...d, id: undefined }));
            }
          }
        } catch { /* skip */ }
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
