import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import worker from '../worker/index.ts';
import type { Bindings } from '../worker/env';

// Run the registered default handler against an isolated SQLite database.
// The D1 shim executes the real Drizzle SQL; no migrated local data is touched.
const sqlite = new DatabaseSync(':memory:');
try {
  sqlite.exec(readFileSync(new URL('../worker/db/drizzle/0000_supabase_schema.sql', import.meta.url), 'utf8'));
  const ago = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString();
  for (const [id, hours] of [['expired', 49], ['recent', 47]] as const) {
    sqlite.prepare('INSERT INTO rate_limits (id, ip_address, endpoint, created_at) VALUES (?, ?, ?, ?)')
      .run(id, id, '/fixture', ago(hours));
  }
  for (const [id, status, hours] of [
    ['old-rejected', 'rejected', 31 * 24],
    ['recent-rejected', 'rejected', 29 * 24],
    ['old-pending', 'pending', 31 * 24],
    ['old-approved', 'approved', 31 * 24],
  ] as const) {
    sqlite.prepare("INSERT INTO submissions (id, submission_type, status, submitted_data, created_at) VALUES (?, 'app', ?, '{}', ?)")
      .run(id, status, ago(hours));
    sqlite.prepare("INSERT INTO public_edit_suggestions (id, target_type, target_id, status, submitted_data, original_data_snapshot, created_at) VALUES (?, 'app', 'fixture', ?, '{}', '{}', ?)")
      .run(id, status, ago(hours));
  }
  const env = {
    DB: {
      prepare(sql: string) {
        return {
          bind(...params: Array<string | number | null>) {
            return { run: async () => ({ success: true, meta: sqlite.prepare(sql).run(...params) }) };
          },
        };
      },
    },
  } as unknown as Bindings;

  await worker.scheduled({} as ScheduledEvent, env);
  const ids = (table: string) => sqlite.prepare(`SELECT id FROM ${table} ORDER BY id`).all().map(row => row.id);
  assert.deepEqual(ids('rate_limits'), ['recent']);
  for (const table of ['submissions', 'public_edit_suggestions']) {
    assert.deepEqual(ids(table), ['old-approved', 'old-pending', 'recent-rejected']);
  }
  console.log('PASS: default scheduled handler expires only old rate limits and old rejected records');
} finally {
  sqlite.close();
}
