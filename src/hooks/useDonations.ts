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
}

interface UseDonationsReturn {
  donators: Donator[];
  goal: DonationGoal;
  paymentMethods: PaymentMethod[];
  transparencyItems: TransparencyItem[];
  showDonationAmounts: boolean;
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
    showDonationAmounts: true,
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
      let showAmounts = true;
      let lastUpdated = '';

      let jsonFallbackUsed = false;
      try {
        // 1. Fetch settings from Supabase (always)
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
            if (s.key === 'display' && val) {
              showAmounts = val.showDonationAmounts ?? true;
              lastUpdated = val.transparencyLastUpdated ?? '';
            }
          }
        }

        // 2. Fetch donations from Supabase (always)
        const { data: rows, error: rowsError } = await supabase
          .from('donations')
          .select('*')
          .eq('is_public', true)
          .order('created_at', { ascending: false });
          
        if (rowsError) throw rowsError;

        if (rows && rows.length > 0) {
          donators = rows.map((r: any) => ({
            id: r.id,
            name: r.donor_name,
            amount: Number(r.amount),
            currency: r.currency || 'USD',
            message: r.message || '',
            date: r.date || '',
            isPublic: r.is_public,
            showAmount: r.show_amount,
            paymentMethod: r.payment_method || '',
          }));
        }
      } catch (e) {
        // Supabase unavailable — use full JSON fallback
        console.warn("Using JSON fallback for donations due to Supabase error", e);
        jsonFallbackUsed = true;
      }

      // 3. JSON fallback if Supabase failed or returned zero donators
      if (jsonFallbackUsed || donators.length === 0) {
        try {
          // Try standard donations.json first
          let r = await fetch('/donations.json');
          if (!r.ok) {
            // Fallback to old donators.json if donations.json doesn't exist
            r = await fetch('/donators.json');
          }
          
          if (r.ok) {
            const json = await r.json();
            
            if (jsonFallbackUsed) {
              // Only override everything if Supabase completely failed
              if (json.goal) goal = json.goal;
              if (json.paymentMethods) methods = json.paymentMethods;
              if (json.transparencyItems) transparency = json.transparencyItems;
              if (json.display) {
                showAmounts = json.display.showDonationAmounts ?? true;
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
          showDonationAmounts: showAmounts,
          transparencyLastUpdated: lastUpdated,
          loading: false,
        });
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return data;
}
