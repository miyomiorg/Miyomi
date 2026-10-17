import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

/**
 * Drizzle Kit configuration — Cloudflare D1 (SQLite).
 *
 * Driver `d1-http` talks to the REMOTE D1 database directly (D1 HTTP API),
 * so `db:push`, `db:migrate` and `db:studio` all operate on production
 * `miyomi-db`. Credentials come from the local `.env` (see .env.example):
 *
 *   CLOUDFLARE_ACCOUNT_ID   — your Cloudflare account ID
 *   CLOUDFLARE_D1_TOKEN     — API token with D1 Edit permission on miyomi-db
 *
 * The local dev database (created by `wrangler dev` under
 * .wrangler/state/v3/d1/) is kept in sync with:
 *   npm run d1:migrate:local
 */
export default defineConfig({
  schema: './worker/db/schema.ts',
  out: './worker/db/drizzle',
  dialect: 'sqlite',
  driver: 'd1-http',
  dbCredentials: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID ?? '',
    databaseId: '0d70949a-e439-41fc-a0a1-78b99d17b9af',
    token: process.env.CLOUDFLARE_D1_TOKEN ?? '',
  },
  strict: true,
  verbose: true,
});
