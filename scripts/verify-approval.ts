import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { app } from '../worker/index.ts';
import { signSession } from '../worker/lib/auth.ts';
import type { Bindings } from '../worker/env';

/**
 * Regression tests for edit-suggestion / submission approval.
 * Verifies that approving an edit preserves unchanged fields (logos, links,
 * descriptions, likes, download counts, status) instead of a full-record
 * rewrite that nulls out everything the suggestion did not explicitly change.
 */

const sqlite = new DatabaseSync(':memory:');
function row(table: string, id: string): Record<string, unknown> {
  return sqlite.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id) as Record<string, unknown>;
}

// D1 shim executing real Drizzle SQL against disposable SQLite.
const env = {
  SITE_URL: 'https://miyomi.test',
  SESSION_SECRET: 'test-only-session-secret',
  ASSETS: { fetch: async () => new Response('<html><head></head></html>') },
  DB: {
    prepare(sql: string) {
      return {
        bind(...params: Array<string | number | null>) {
          return {
            async raw() { return sqlite.prepare(sql).all(...params).map((r) => Object.values(r as object)); },
            async all() { return { results: sqlite.prepare(sql).all(...params) }; },
            async run() { return { success: true, meta: sqlite.prepare(sql).run(...params) }; },
          };
        },
      };
    },
  },
} as unknown as Bindings;
Object.defineProperty(globalThis, 'caches', { configurable: true, value: { default: { async match() { return undefined; }, async put() {}, async delete() { return true; } } } });

async function request(path: string, init?: RequestInit) {
  return app.request(`https://miyomi.test${path}`, init, env, {
    waitUntil: () => {},
    passThroughOnException() {},
  } as unknown as ExecutionContext);
}

try {
  const migrations = new URL('../worker/db/drizzle/', import.meta.url);
  for (const file of readdirSync(migrations).filter((f) => f.endsWith('.sql')).sort()) {
    sqlite.exec(readFileSync(new URL(file, migrations), 'utf8'));
  }
  sqlite.exec(`
    INSERT INTO admins (id, email, totp_secret) VALUES ('admin', 'test@example.test', 'enrolled');
    INSERT INTO user_roles (id, user_id, role) VALUES ('role', 'admin', 'super_admin');
  `);
  sqlite.prepare(`INSERT INTO apps (id, name, slug, status, description, short_description, author, icon_url, icon_color, repo_url, website_url, download_url, likes_count, download_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run('app-1', 'Test App', 'test-app', 'approved', 'Original description', 'Original short', 'tester', 'https://img.example/logo.png', '#ff0000', 'https://github.com/test/app', 'https://example.com', 'https://example.com/download', 80, 10);
  sqlite.exec("UPDATE apps SET moderator_note = 'Public notice', note_severity = 'warning', notice_sticky = 1 WHERE id = 'app-1'");

  const token = await signSession({ sub: 'admin' }, env.SESSION_SECRET, 60);
  const auth = { 'Content-Type': 'application/json', Cookie: `miyomi_session=${token}` };

  async function approve(targetId: string, submittedData: Record<string, unknown>) {
    const id = `sug-${targetId}-${Math.random().toString(36).slice(2, 8)}`;
    sqlite.prepare(
      `INSERT INTO public_edit_suggestions (id, target_type, target_id, submitted_data, original_data_snapshot, status, created_at, updated_at)
       VALUES (?, 'app', ?, ?, ?, 'pending', strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'))`,
    ).run(id, targetId, JSON.stringify(submittedData), JSON.stringify({ status: 'approved', likes_count: 80, download_count: 10 }));
    const res = await request(`/api/admin/suggestions/${id}/approve`, { method: 'POST', headers: auth, body: JSON.stringify({ editedData: submittedData }) });
    return { status: res.status, body: await res.json() };
  }

  // ── Scenario 1: description-only edit (partial snake_case payload) ──
  {
    const result = await approve('app-1', { description: 'NEW description only', name: 'Test App', slug: 'test-app' });
    assert.equal(result.status, 200, JSON.stringify(result.body));
    const appRow = row('apps', 'app-1');
    assert.equal(appRow.description, 'NEW description only');
    assert.equal(appRow.name, 'Test App');
    assert.equal(appRow.slug, 'test-app');
    // logo + links + counters + status must be preserved
    assert.equal(appRow.icon_url, 'https://img.example/logo.png', 'logo lost');
    assert.equal(appRow.repo_url, 'https://github.com/test/app', 'repo link lost');
    assert.equal(appRow.website_url, 'https://example.com', 'website link lost');
    assert.equal(appRow.download_url, 'https://example.com/download', 'download link lost');
    assert.equal(appRow.likes_count, 80, 'likes were reset');
    assert.equal(appRow.download_count, 10, 'download count was reset');
    assert.equal(appRow.status, 'approved', 'status changed');
    assert.equal(appRow.moderator_note, 'Public notice', 'ordinary approval must preserve the notice');
    assert.equal(appRow.notice_sticky, 1, 'ordinary approval must preserve dismissibility');
  }

  // ── Scenario 2: full snake_case edit that changes a snake_case field ──
  {
    const result = await approve('app-1', {
      name: 'Test App', slug: 'test-app', short_description: 'NEW short desc',
      description: 'NEW description only', icon_url: 'https://img.example/logo.png',
      repo_url: 'https://github.com/test/app', website_url: 'https://example.com',
      download_url: 'https://example.com/download', icon_color: '#ff0000',
    });
    assert.equal(result.status, 200, JSON.stringify(result.body));
    const appRow = row('apps', 'app-1');
    assert.equal(appRow.short_description, 'NEW short desc', 'snake_case short_description not applied');
    assert.equal(appRow.icon_url, 'https://img.example/logo.png');
    assert.equal(appRow.repo_url, 'https://github.com/test/app');
    assert.equal(appRow.likes_count, 80, 'likes reset on a link edit');
  }

  // ── Scenario 3: explicit link removal clears only that link ──
  {
    const result = await approve('app-1', {
      name: 'Test App', slug: 'test-app', description: 'NEW description only',
      icon_url: '',
      repo_url: 'https://github.com/test/app', website_url: 'https://example.com',
    });
    assert.equal(result.status, 200, JSON.stringify(result.body));
    const appRow = row('apps', 'app-1');
    assert.ok(!appRow.icon_url, `cleared icon_url should be empty/null, got ${JSON.stringify(appRow.icon_url)}`);
    assert.equal(appRow.repo_url, 'https://github.com/test/app', 'repo_url should survive icon removal');
    assert.equal(appRow.website_url, 'https://example.com', 'website_url should survive icon removal');
    assert.equal(appRow.likes_count, 80, 'likes lost on icon removal');
  }

  // ── Scenario 4: extension edit preserves source_url + install URLs ──
  {
    sqlite.prepare(`INSERT INTO extensions (id, name, slug, status, description, source_url, repo_url, icon_url, auto_url, manual_url, likes_count, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run('ext-1', 'Test Ext', 'test-ext', 'approved', 'Original ext desc', 'https://example.com/source', 'https://github.com/test/ext', 'https://img.example/ext.png', 'https://auto.example', 'https://manual.example', 40, JSON.stringify({ git_provider: 'github', dev_status: 'active', install_urls: [{ label: 'Auto Install', url: 'https://auto.example', type: 'auto' }] }));
    const id = `sug-ext-${Math.random().toString(36).slice(2, 8)}`;
    sqlite.prepare(
      `INSERT INTO public_edit_suggestions (id, target_type, target_id, submitted_data, original_data_snapshot, status, created_at, updated_at)
       VALUES (?, 'extension', 'ext-1', ?, ?, 'pending', strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'))`,
    ).run(id, JSON.stringify({ description: 'UPDATED ext desc', name: 'Test Ext', slug: 'test-ext' }), JSON.stringify({ status: 'approved', likes_count: 40 }));
    const res = await request(`/api/admin/suggestions/${id}/approve`, { method: 'POST', headers: auth, body: JSON.stringify({ editedData: { description: 'UPDATED ext desc', name: 'Test Ext', slug: 'test-ext' } }) });
    assert.equal(res.status, 200);
    const extRow = row('extensions', 'ext-1');
    assert.equal(extRow.description, 'UPDATED ext desc');
    assert.equal(extRow.source_url, 'https://example.com/source', 'source_url lost');
    assert.equal(extRow.icon_url, 'https://img.example/ext.png', 'ext logo lost');
    assert.equal(extRow.likes_count, 40, 'ext likes reset');
    const meta = JSON.parse(extRow.metadata as string);
    assert.equal(meta.git_provider, 'github', 'metadata git_provider lost');
    assert.equal(meta.dev_status, 'active', 'metadata dev_status lost');
  }

  // ── Bug 3: newly added public donors appear in the public list ──
  {
    const res = await request('/api/admin/donations', { method: 'POST', headers: auth, body: JSON.stringify({ donorName: 'Test Donor', message: 'Thanks!', amount: 10, currency: 'USD', date: '2026-10-19', isPublic: true, showAmount: true }) });
    assert.equal(res.status, 201);
    const publicList = (await (await request('/api/donations')).json()).data as Array<{ donorName: string }>;
    assert.ok(publicList.find((d) => d.donorName === 'Test Donor'), 'public donor should appear in the public list');
    await request('/api/admin/donations', { method: 'POST', headers: auth, body: JSON.stringify({ donorName: 'Private Donor', isPublic: false }) });
    const publicList2 = (await (await request('/api/donations')).json()).data as Array<{ donorName: string }>;
    assert.ok(!publicList2.find((d) => d.donorName === 'Private Donor'), 'private donor should stay hidden');
  }

  console.log('PASS: edit approval preserves logos, links, counters, status and metadata; snake_case → camelCase mapping works; explicit clear + extension edits + donor visibility verified');
} finally {
  sqlite.close();
  Reflect.deleteProperty(globalThis, 'caches');
}
