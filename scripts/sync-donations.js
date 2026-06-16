import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import * as fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from root
dotenv.config({ path: resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const DEFAULT_GOAL = { title: '', description: '', targetAmount: 0, currentAmount: 0, currency: 'USD' };

async function sync() {
  console.log('Fetching donation data from Supabase...');
  try {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      throw new Error('Missing Supabase credentials (VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in environment).');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    let goal = DEFAULT_GOAL;
    let methods = [];
    let transparency = [];
    let showAmounts = true;
    let lastUpdated = '';
    let donators = [];

    const { data: settings, error: settingsError } = await supabase
      .from('donation_settings')
      .select('*');

    if (settingsError) throw settingsError;

    if (settings) {
      for (const s of settings) {
        const val = s.value;
        if (s.key === 'goal' && val) goal = val;
        if (s.key === 'payment_methods' && Array.isArray(val)) methods = val;
        if (s.key === 'transparency' && Array.isArray(val)) transparency = val;
        if (s.key === 'display' && val) {
          showAmounts = val.showDonationAmounts ?? true;
          lastUpdated = val.transparencyLastUpdated ?? '';
        }
      }
    }

    const { data: rows, error: donatorsError } = await supabase
      .from('donations')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    if (donatorsError) throw donatorsError;

    if (rows && rows.length > 0) {
      donators = rows.map((r) => ({
        // We omit id to keep JSON smaller, and the frontend doesn't need it if we're just reading
        name: r.donor_name,
        amount: Number(r.amount),
        currency: r.currency || 'USD',
        message: r.message || '',
        date: r.date || '',
        isPublic: r.is_public,
        showAmount: r.show_amount,
      }));
    }

    const outputPath = resolve(__dirname, '../public/donations.json');
    
    const outputData = {
      goal,
      paymentMethods: methods,
      transparencyItems: transparency,
      display: {
        showDonationAmounts: showAmounts,
        transparencyLastUpdated: lastUpdated
      },
      donators
    };

    fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2), 'utf-8');
    console.log(`Successfully wrote donation data to ${outputPath}`);

  } catch (err) {
    console.error('Failed to sync donations from Supabase:', err.message || err);
    console.log('Skipping sync. Existing public/donations.json will be used as fallback.');
    const outputPath = resolve(__dirname, '../public/donations.json');
    if (!fs.existsSync(outputPath)) {
        console.log('No existing donations.json found. Creating a default empty one.');
        fs.writeFileSync(outputPath, JSON.stringify({
            goal: DEFAULT_GOAL,
            paymentMethods: [],
            transparencyItems: [],
            display: { showDonationAmounts: true, transparencyLastUpdated: '' },
            donators: []
        }, null, 2), 'utf-8');
    }
  }
}

sync();
