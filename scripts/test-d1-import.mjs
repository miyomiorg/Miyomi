import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { getTableName, isTable } from 'drizzle-orm';
import * as schema from '../worker/db/schema.ts';

const script = fileURLToPath(new URL('./migrate-supabase-to-d1.mjs', import.meta.url));
const ddl = readFileSync(new URL('../worker/db/drizzle/0000_supabase_schema.sql', import.meta.url), 'utf8');
const names = Object.values(schema).filter(isTable).map(getTableName);
const csvRow = (values) => values.map(value => value === null ? '' : `"${String(value).replaceAll('"', '""')}"`).join(',') + '\n';

function fixture(t) {
  const root = mkdtempSync(join(process.env.TEMP || tmpdir(), 'miyomi-import-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const input = join(root, 'CSV input');
  const output = join(root, 'SQL output');
  mkdirSync(input);
  for (const name of [...names, 'auth_users']) writeFileSync(join(input, `${name}.csv`), '');
  return {
    output,
    write: (name, rows) => writeFileSync(join(input, `${name}.csv`), rows.map(csvRow).join('')),
    remove: name => rmSync(join(input, `${name}.csv`)),
    raw: (name, value) => writeFileSync(join(input, `${name}.csv`), value),
    run: () => spawnSync(process.execPath, [script, '--export-dir', input, '--out-dir', output], {
      cwd: root, encoding: 'utf8',
    }),
  };
}

test('portable import preserves auth links, JSON, timestamps and SQL quoting in SQLite', t => {
  const f = fixture(t);
  const timestamp = '2026-10-16 12:30:45.123456+06';
  f.write('admins', [['admin-id', 'auth-id', 'fixture@example.com', "O'Brien, Admin", null, 't', timestamp, timestamp]]);
  f.write('auth_users', [['auth-id', '$2b$fixture-hash']]);
  f.write('user_roles', [['role-id', 'auth-id', 'super_admin']]);
  f.write('settings', [['fixture', JSON.stringify({ message: 'quoted "value"\nnext line' }), 'general', 'f', null, null, timestamp]]);
  const result = f.run();
  assert.equal(result.status, 0, result.stderr);
  const db = new DatabaseSync(':memory:');
  t.after(() => db.close());
  db.exec(ddl);
  db.exec(readFileSync(join(f.output, 'ALL.sql'), 'utf8'));
  const admin = db.prepare('SELECT * FROM admins').get();
  assert.equal(admin.display_name, "O'Brien, Admin");
  assert.equal(admin.password_hash, '$2b$fixture-hash');
  assert.equal(admin.created_at, '2026-10-16T06:30:45.123Z');
  assert.equal(admin.is_active, 1);
  assert.equal(db.prepare('SELECT user_id FROM user_roles').get().user_id, 'admin-id');
  assert.deepEqual(JSON.parse(db.prepare('SELECT value FROM settings').get().value), { message: 'quoted "value"\nnext line' });
  assert.equal(JSON.parse(readFileSync(join(f.output, 'manifest.json'), 'utf8')).length, 27);
});

test('empty tables replace stale SQL and never reappear in the combined import', t => {
  const f = fixture(t);
  f.write('donation_settings', [['old-setting', 'true', null]]);
  assert.equal(f.run().status, 0);
  f.write('donation_settings', []);
  assert.equal(f.run().status, 0);
  assert.equal(readFileSync(join(f.output, 'donation_settings.sql'), 'utf8'), '-- donation_settings: 0 rows\n');
  assert.ok(!readFileSync(join(f.output, 'ALL.sql'), 'utf8').includes('old-setting'));
});

for (const [label, corrupt, expected] of [
  ['missing CSV', f => f.remove('auth_users'), /Cannot read required CSV/],
  ['wrong column count', f => f.write('admins', [['only-one-column']]), /expected 8 columns/],
  ['unclosed quote', f => f.raw('admins', '"unfinished'), /Unterminated quoted CSV/],
  ['invalid JSON', f => f.write('donation_settings', [['invalid', '{broken', null]]), /Invalid JSON/],
  ['oversized SQL row', f => f.write('donation_settings', [['huge', JSON.stringify('a'.repeat(80_000)), null]]), /exceeds the 80000-byte/],
]) {
  test(`${label} fails without overwriting a previously validated import`, t => {
    const f = fixture(t);
    assert.equal(f.run().status, 0);
    const previous = readFileSync(join(f.output, 'ALL.sql'), 'utf8');
    corrupt(f);
    const result = f.run();
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, expected);
    assert.equal(readFileSync(join(f.output, 'ALL.sql'), 'utf8'), previous);
  });
}
