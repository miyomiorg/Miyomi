import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { readFileSync } from 'fs';
import { parse } from 'smol-toml';

// ── Single source of truth ─────────────────────────────────────────
// Non-secret configuration lives in wrangler.toml [vars]. Vite reads the
// VITE_* keys (and SITE_URL) from there so the frontend build can never
// drift from the Worker's runtime config. Any value already present in
// process.env takes precedence (still permits one-off overrides).
const wranglerPath = new URL('wrangler.toml', import.meta.url);
try {
  const doc = parse(readFileSync(wranglerPath, 'utf8'));
  const vars = (doc as { vars?: Record<string, unknown> }).vars ?? {};
  for (const [key, value] of Object.entries(vars)) {
    if (typeof value === 'string' && !(key in process.env)) {
      process.env[key] = value;
    }
  }
} catch {
  // Keep building even if the TOML cannot be read; Vite falls back to .env.
}

export default defineConfig({
  plugins: [react()],
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  css: {
    postcss: './postcss.config.js',
  },
  build: {
    target: 'esnext',
  },
  server: {
    host: '::',
    port: 8080,
    proxy: {
      '/api': 'http://127.0.0.1:8787',
    },
  },
});