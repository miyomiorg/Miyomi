import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env logic exactly like Vite does for consistency
const envPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

// Ensure local overrides can also be loaded if needed (.env.local)
const envLocalPath = path.resolve(__dirname, '../../.env.local');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath, override: true });
}

export function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.');
    process.exit(1);
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

export async function fetchApps(supabase) {
  const { data, error } = await supabase
    .from('apps')
    .select('slug, name, description, short_description, icon_url, seo_title, seo_description, og_image_url, updated_at, status, download_count, likes_count, author')
    .eq('status', 'approved');

  if (error) throw error;
  return data;
}

export async function fetchExtensions(supabase) {
  const { data, error } = await supabase
    .from('extensions')
    .select('slug, name, description, short_description, icon_url, seo_title, seo_description, og_image_url, updated_at, status, download_count, likes_count, author, language')
    .eq('status', 'approved');

  if (error) throw error;
  return data;
}

export async function fetchGuides(supabase) {
  const { data, error } = await supabase
    .from('guides')
    .select('slug, title, description, content, content_html, author, author_name, seo_title, seo_description, og_image_url, updated_at, status, category')
    .neq('status', 'draft');

  if (error) throw error;
  return data;
}
