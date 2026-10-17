/**
 * Fetches approved content for OG image generation from the Miyomi Worker
 * API — the same `/api` the SPA uses — instead of the retired Supabase DB.
 *
 * API base resolution:  OG_API_URL  →  SITE_URL  →  https://miyomi.app
 *
 * The Worker returns camelCase (Drizzle); this module snake_cases each row
 * so the existing card templates (which still read snake_case) keep working.
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { parse } from 'smol-toml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mirror Vite's env loading for consistency.
const envPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(envPath)) dotenv.config({ path: envPath });
const envLocalPath = path.resolve(__dirname, '../../.env.local');
if (fs.existsSync(envLocalPath)) dotenv.config({ path: envLocalPath, override: true });

/** camelCase (Worker) → snake_case (templates). Nested objects left as-is. */
function snakeify(value) {
  if (Array.isArray(value)) return value.map(snakeify);
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`)] = v;
    }
    return out;
  }
  return value;
}

export function getApiBase() {
  let siteUrl = process.env.SITE_URL;
  if (!siteUrl) {
    try {
      const doc = parse(fs.readFileSync(path.resolve(__dirname, '../../wrangler.toml'), 'utf8'));
      siteUrl = typeof doc?.vars?.SITE_URL === 'string' ? doc.vars.SITE_URL : undefined;
    } catch { /* fall through to default */ }
  }
  const base = process.env.OG_API_URL || siteUrl || 'https://miyomi.app';
  return `${base.replace(/\/$/, '')}/api`;
}

async function getList(pathname) {
  const url = `${getApiBase()}${pathname}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} → HTTP ${res.status}`);
  const body = await res.json();
  return Array.isArray(body?.data) ? body.data.map(snakeify) : [];
}

export const fetchApps = () => getList('/apps');
export const fetchExtensions = () => getList('/extensions');
export const fetchGuides = () => getList('/guides');
