/**
 * Migrate the Supabase (Postgres) backup data into Cloudflare D1 (SQLite).
 *
 * Pipeline:
 *   1. Restore the Supabase cluster dump into a throwaway local Postgres 17
 *      (initdb + psql -f <backup>). The dump \connects to database "postgres".
 *   2. COPY each public.* table out as CSV (done separately via psql).
 *   3. THIS SCRIPT: reads the CSVs from .wrangler/export/, converts PG text
 *      types to the D1 storage conventions, and writes one .sql file per
 *      table into .wrangler/export/sql/.
 *      Optional: --export-dir <CSV directory> --out-dir <SQL directory>.
 *      All 27 table CSVs and auth_users.csv are required (empty files are valid).
 *   4. Apply: npx wrangler d1 execute miyomi-db --local --file <each sql>
 *      (or --remote for production, after `wrangler login`).
 *
 * Type conversions (Postgres text representation → D1):
 *   NULL (empty CSV field)            → NULL
 *   timestamptz '2026-02-10 17:02:01.712343+00' → '2026-02-10T17:02:01.712Z'
 *   date '2026-02-10'                 → '2026-02-10'
 *   boolean t/f                       → 1/0
 *   text[]  '{a,b}' / '{"a,b","c"}'   → JSON array text '["a","b"]'
 *   jsonb                             → kept as JSON text (validated)
 *   uuid / text / int / real          → as-is
 *
 * Special handling:
 *   - user_roles.user_id & moderator_permissions.user_id/granted_by
 *     referenced Supabase auth.users ids → remapped to admins.id
 *     (via admins.user_id), matching the Worker's auth model.
 *   - admins.password_hash ← auth.users.encrypted_password (bcrypt),
 *     so existing admin passwords keep working after cutover.
 *   - rate_limits deduped on (ip, endpoint, window_start) keeping the max
 *     request_count (D1 keeps the unique index the rate limiter relies on).
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    'export-dir': { type: 'string' },
    'out-dir': { type: 'string' },
  },
});
const EXPORT_DIR = values['export-dir']
  ? resolve(values['export-dir'])
  : fileURLToPath(new URL('../.wrangler/export/', import.meta.url));
const OUT_DIR = resolve(values['out-dir'] || `${EXPORT_DIR}/sql`);

// ── CSV parsing (RFC 4180) ─────────────────────────────────────────

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      field = '';
      rows.push(row);
      row = [];
    } else if (ch === '\r') {
      // ignore (handle \r\n)
    } else {
      field += ch;
    }
  }
  if (inQuotes) throw new Error('Unterminated quoted CSV field');
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  // drop trailing empty row
  if (rows.length && rows[rows.length - 1].length === 1 && rows[rows.length - 1][0] === '') {
    rows.pop();
  }
  return rows;
}

// ── Value conversions ──────────────────────────────────────────────

// Postgres COPY outputs timestamptz as 'YYYY-MM-DD HH:MM:SS[.uuuuuu][+HH[:MM]]'
// (hour-only offsets, e.g. +00 / +06)
const TS_RE = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})(?:\.(\d+))?(Z|[+-]\d{2}(?::?\d{2})?)?$/;

/** '2026-02-10 17:02:01.712343+00' → '2026-02-10T17:02:01.712Z' */
function pgTimestampToIso(s) {
  const m = TS_RE.exec(s.trim());
  if (!m) return s; // leave unexpected formats untouched
  const [, date, time, frac, offset] = m;
  const ms = frac ? frac.slice(0, 3).padEnd(3, '0') : '000';
  if (offset && offset !== 'Z' && !/^\+00:00?$/.test(offset)) {
    // non-UTC offset — let Date normalize it (pad to ±HH:MM for parsers)
    let off = offset.replace(':', '');
    if (/^[+-]\d{2}$/.test(off)) off += ':00';
    return new Date(`${date}T${time}.${ms}${off}`).toISOString();
  }
  return `${date}T${time}.${ms}Z`;
}

/** PG array literal → JSON array string */
function pgArrayToJson(s) {
  const t = s.trim();
  if (t === '{}') return '[]';
  const inner = t.slice(1, -1);
  const out = [];
  let cur = '';
  let inQ = false;
  let hasField = false;
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (inQ) {
      if (ch === '\\') {
        cur += inner[i + 1] ?? '';
        i++;
      } else if (ch === '"') {
        inQ = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQ = true;
      hasField = true;
    } else if (ch === ',') {
      out.push(cur);
      cur = '';
      hasField = false;
    } else {
      cur += ch;
      hasField = true;
    }
  }
  if (hasField || cur !== '') out.push(cur);
  return JSON.stringify(out);
}

function sqlLiteral(v) {
  return v === null ? 'NULL' : `'${v.replace(/'/g, "''")}'`;
}

// ── Column specs: [dbColumn, type]
// type: text | uuid | tstz | date | bool | int | real | json | arr
//      (uuid treated as text for output)

const TABLES = {
  admins: {
    cols: [
      ['id', 'text'], ['user_id', 'uuid'], ['email', 'text'], ['display_name', 'text'],
      ['avatar_url', 'text'], ['is_active', 'bool'], ['created_at', 'tstz'], ['updated_at', 'tstz'],
    ],
    extra: ['password_hash'],
  },
  admin_sessions: {
    cols: [
      ['id', 'text'], ['admin_id', 'uuid'], ['session_type', 'text'], ['ip_address', 'text'],
      ['user_agent', 'text'], ['browser', 'text'], ['browser_version', 'text'], ['os', 'text'],
      ['os_version', 'text'], ['device_type', 'text'], ['device_vendor', 'text'], ['device_model', 'text'],
      ['device_fingerprint', 'text'], ['country', 'text'], ['city', 'text'], ['created_at', 'tstz'],
    ],
  },
  admin_logs: {
    cols: [
      ['id', 'text'], ['admin_id', 'uuid'], ['action', 'text'], ['resource_type', 'text'],
      ['resource_id', 'uuid'], ['resource_name', 'text'], ['details', 'json'], ['created_at', 'tstz'],
    ],
  },
  unauthorized_login_attempts: {
    cols: [
      ['id', 'text'], ['email', 'text'], ['auth_provider', 'text'], ['ip_address', 'text'],
      ['user_agent', 'text'], ['browser', 'text'], ['browser_version', 'text'], ['os', 'text'],
      ['os_version', 'text'], ['device_type', 'text'], ['device_vendor', 'text'], ['device_model', 'text'],
      ['device_fingerprint', 'text'], ['country', 'text'], ['city', 'text'], ['created_at', 'tstz'],
    ],
  },
  apps: {
    cols: [
      ['id', 'text'], ['slug', 'text'], ['name', 'text'], ['description', 'text'], ['icon_url', 'text'],
      ['icon_color', 'text'], ['category', 'text'], ['platforms', 'arr'], ['tags', 'arr'],
      ['repo_url', 'text'], ['download_url', 'text'], ['website_url', 'text'], ['version', 'text'],
      ['download_count', 'int'], ['author', 'text'], ['status', 'text'], ['metadata', 'json'],
      ['created_at', 'tstz'], ['updated_at', 'tstz'], ['accent_color', 'text'], ['content_types', 'arr'],
      ['compatible_with', 'arr'], ['discord_url', 'text'], ['fork_of', 'text'], ['upstream_url', 'text'],
      ['tutorials', 'json'], ['last_release_date', 'date'], ['short_description', 'text'],
      ['likes_count', 'int'], ['social_urls', 'json'], ['seo_title', 'text'], ['seo_description', 'text'],
      ['og_image_url', 'text'],
    ],
  },
  extensions: {
    cols: [
      ['id', 'text'], ['slug', 'text'], ['name', 'text'], ['description', 'text'], ['icon_url', 'text'],
      ['icon_color', 'text'], ['language', 'text'], ['category', 'text'], ['platforms', 'arr'],
      ['tags', 'arr'], ['compatible_with', 'arr'], ['source_url', 'text'], ['repo_url', 'text'],
      ['author', 'text'], ['status', 'text'], ['metadata', 'json'], ['created_at', 'tstz'],
      ['updated_at', 'tstz'], ['region', 'text'], ['types', 'arr'], ['auto_url', 'text'],
      ['manual_url', 'text'], ['info', 'text'], ['last_updated', 'date'], ['accent_color', 'text'],
      ['website_url', 'text'], ['short_description', 'text'], ['likes_count', 'int'],
      ['download_count', 'int'], ['discord_url', 'text'], ['tutorials', 'json'], ['social_urls', 'json'],
      ['seo_title', 'text'], ['seo_description', 'text'], ['og_image_url', 'text'],
    ],
  },
  guides: {
    cols: [
      ['id', 'text'], ['slug', 'text'], ['title', 'text'], ['description', 'text'], ['content', 'text'],
      ['category', 'text'], ['tags', 'arr'], ['related_apps', 'arr'], ['related_extensions', 'arr'],
      ['author', 'text'], ['status', 'text'], ['created_at', 'tstz'], ['updated_at', 'tstz'],
      ['metadata', 'json'], ['content_format', 'text'], ['content_html', 'text'], ['content_mode', 'text'],
      ['template_version', 'text'], ['author_name', 'text'], ['author_avatar_url', 'text'],
      ['published_at', 'tstz'], ['seo_title', 'text'], ['seo_description', 'text'], ['og_image_url', 'text'],
    ],
  },
  blog_posts: {
    cols: [
      ['id', 'text'], ['title', 'text'], ['slug', 'text'], ['excerpt', 'text'], ['content', 'text'],
      ['content_format', 'text'], ['category', 'text'], ['tags', 'arr'], ['author_id', 'uuid'],
      ['author_name', 'text'], ['author_avatar_url', 'text'], ['author_role', 'text'], ['status', 'text'],
      ['is_pinned', 'bool'], ['thumbnail_url', 'text'], ['thumbnail_alt', 'text'], ['seo_title', 'text'],
      ['seo_description', 'text'], ['og_image_url', 'text'], ['views', 'int'], ['published_at', 'tstz'],
      ['created_at', 'tstz'], ['updated_at', 'tstz'],
    ],
  },
  faqs: {
    cols: [
      ['id', 'text'], ['question', 'text'], ['answer', 'text'], ['category', 'text'],
      ['order_index', 'int'], ['created_at', 'tstz'], ['updated_at', 'tstz'], ['tags', 'arr'],
      ['legacy_id', 'text'], ['content_format', 'text'],
    ],
  },
  settings: {
    cols: [
      ['key', 'text'], ['value', 'json'], ['category', 'text'], ['is_sensitive', 'bool'],
      ['description', 'text'], ['updated_by', 'uuid'], ['updated_at', 'tstz'],
    ],
  },
  notices: {
    cols: [
      ['id', 'text'], ['title', 'text'], ['message', 'text'], ['priority', 'int'], ['type', 'text'],
      ['active', 'bool'], ['start_date', 'tstz'], ['end_date', 'tstz'], ['dismissible', 'bool'],
      ['created_by', 'uuid'], ['created_at', 'tstz'], ['updated_at', 'tstz'],
    ],
  },
  themes: {
    cols: [
      ['id', 'text'], ['name', 'text'], ['slug', 'text'], ['is_seasonal', 'bool'], ['active_from', 'tstz'],
      ['active_to', 'tstz'], ['is_active', 'bool'], ['css_variables', 'json'], ['assets', 'json'],
      ['particle_config', 'json'], ['created_at', 'tstz'], ['updated_at', 'tstz'], ['preview_image', 'text'],
    ],
  },
  donations: {
    cols: [
      ['id', 'text'], ['donor_name', 'text'], ['amount', 'real'], ['currency', 'text'], ['message', 'text'],
      ['payment_method', 'text'], ['is_public', 'bool'], ['show_amount', 'bool'], ['date', 'text'],
      ['created_at', 'tstz'], ['updated_at', 'tstz'],
    ],
  },
  donation_settings: {
    cols: [['key', 'text'], ['value', 'json'], ['updated_at', 'tstz']],
  },
  likes: {
    cols: [
      ['id', 'text'], ['item_id', 'text'], ['item_type', 'text'], ['device_fingerprint', 'text'],
      ['fingerprint_method', 'text'], ['liked_at', 'tstz'], ['ip_hash', 'text'], ['user_agent_hash', 'text'],
      ['anonymous_id', 'text'], ['ip_address', 'text'], ['browser', 'text'], ['browser_version', 'text'],
      ['os', 'text'], ['os_version', 'text'], ['device_type', 'text'], ['device_vendor', 'text'],
      ['device_model', 'text'], ['user_agent', 'text'], ['screen_resolution', 'text'], ['timezone', 'text'],
      ['language', 'text'], ['referrer', 'text'],
    ],
  },
  reports: {
    cols: [
      ['id', 'text'], ['target_type', 'text'], ['target_id', 'text'], ['page_url', 'text'],
      ['reason', 'text'], ['message', 'text'], ['reporter_name', 'text'], ['reporter_contact', 'text'],
      ['reporter_user_id', 'uuid'], ['status', 'text'], ['admin_note', 'text'], ['reviewed_at', 'tstz'],
      ['reviewed_by', 'uuid'], ['created_at', 'tstz'], ['updated_at', 'tstz'], ['device_fingerprint', 'text'],
      ['anonymous_id', 'text'], ['ip_address', 'text'], ['browser', 'text'], ['os', 'text'],
      ['device_type', 'text'], ['screen_resolution', 'text'], ['timezone', 'text'], ['language', 'text'],
    ],
  },
  feedbacks: {
    cols: [
      ['id', 'text'], ['feedback_type', 'text'], ['message', 'text'], ['page_url', 'text'],
      ['user_name', 'text'], ['user_contact', 'text'], ['user_id', 'uuid'], ['status', 'text'],
      ['admin_note', 'text'], ['reviewed_at', 'tstz'], ['reviewed_by', 'uuid'], ['created_at', 'tstz'],
      ['updated_at', 'tstz'],
    ],
  },
  submissions: {
    cols: [
      ['id', 'text'], ['submission_type', 'text'], ['submitted_data', 'json'], ['recaptcha_score', 'real'],
      ['submitter_email', 'text'], ['duplicate_check_results', 'json'], ['status', 'text'],
      ['admin_notes', 'text'], ['reviewed_by', 'uuid'], ['created_at', 'tstz'], ['updated_at', 'tstz'],
      ['submitter_name', 'text'], ['submitter_contact', 'text'], ['author', 'text'],
      ['submitter_user_id', 'uuid'], ['reviewed_at', 'tstz'],
    ],
  },
  public_edit_suggestions: {
    cols: [
      ['id', 'text'], ['target_type', 'text'], ['target_id', 'text'], ['original_data_snapshot', 'json'],
      ['submitted_data', 'json'], ['approved_data', 'json'], ['submitter_name', 'text'],
      ['submitter_contact', 'text'], ['submitter_user_id', 'uuid'], ['status', 'text'], ['admin_note', 'text'],
      ['reviewed_at', 'tstz'], ['reviewed_by', 'uuid'], ['created_at', 'tstz'], ['updated_at', 'tstz'],
    ],
  },
  compatibility_groups: {
    cols: [
      ['id', 'text'], ['name', 'text'], ['description', 'text'], ['color', 'text'], ['icon_url', 'text'],
      ['created_at', 'tstz'], ['updated_at', 'tstz'],
    ],
  },
  app_group_memberships: {
    cols: [['app_id', 'uuid'], ['group_id', 'uuid']],
  },
  extension_group_memberships: {
    cols: [['extension_id', 'uuid'], ['group_id', 'uuid']],
  },
  contributors: {
    cols: [
      ['id', 'text'], ['name', 'text'], ['email', 'text'], ['contact', 'text'], ['contributions', 'json'],
      ['created_at', 'tstz'],
    ],
  },
  user_roles: {
    cols: [['id', 'text'], ['user_id', 'remap'], ['role', 'text']],
  },
  moderator_permissions: {
    cols: [
      ['id', 'text'], ['user_id', 'remap'], ['resource', 'text'], ['can_read', 'bool'], ['can_write', 'bool'],
      ['can_delete', 'bool'], ['granted_by', 'remap'], ['created_at', 'tstz'],
    ],
  },
  rate_limits: {
    cols: [
      ['id', 'text'], ['ip_address', 'text'], ['endpoint', 'text'], ['request_count', 'int'],
      ['window_start', 'tstz'], ['created_at', 'tstz'],
    ],
  },
  bot_attack_logs: {
    cols: [
      ['id', 'text'], ['ip_address', 'text'], ['country', 'text'], ['user_agent', 'text'],
      ['headers_dump', 'json'], ['reason', 'text'], ['created_at', 'tstz'],
    ],
  },
};

// ── Load CSVs ──────────────────────────────────────────────────────

function loadTable(name, columnCount) {
  const path = `${EXPORT_DIR}/${name}.csv`;
  let text;
  try {
    text = readFileSync(path, 'utf8');
  } catch (error) {
    throw new Error(`Cannot read required CSV: ${path}. Export empty tables as empty files.`, { cause: error });
  }
  if (text.trim() === '') return [];
  const rows = parseCsv(text);
  for (const [index, row] of rows.entries()) {
    if (row.length !== columnCount) {
      throw new Error(`${name}.csv row ${index + 1}: expected ${columnCount} columns, got ${row.length}`);
    }
  }
  return rows.filter((r) => r.length > 1 || (r.length === 1 && r[0] !== ''));
}

// Validate every input before generating or replacing any SQL output.
const tables = new Map(Object.entries(TABLES).map(([name, spec]) =>
  [name, loadTable(name, spec.cols.length)],
));

// Lookups
const adminRows = tables.get('admins');
const authUsers = loadTable('auth_users', 2); // [id, encrypted_password]
const authByUuid = new Map(authUsers.map((r) => [r[0], r[1]]));
// auth users uuid → admins.id (via admins.user_id)
const adminIdByAuthUuid = new Map(
  adminRows.map((r) => [r[1] /* user_id (auth uuid) */, r[0] /* admins.id */]),
);

function convert(rawValue, type) {
  if (rawValue === '') return null;
  switch (type) {
    case 'tstz':
      return pgTimestampToIso(rawValue);
    case 'date':
      return rawValue;
    case 'bool':
      return rawValue === 't' ? '1' : rawValue === 'f' ? '0' : null;
    case 'int':
    case 'real':
      return rawValue;
    case 'json': {
      try {
        JSON.parse(rawValue); // validate only
        return rawValue;
      } catch {
        throw new Error('Invalid JSON field in CSV input');
      }
    }
    case 'arr':
      return pgArrayToJson(rawValue);
    case 'remap':
      return adminIdByAuthUuid.get(rawValue) ?? rawValue;
    default:
      return rawValue; // text/uuid
  }
}

// ── Generate SQL ───────────────────────────────────────────────────

// workerd/miniflare compiles SQLite with a 100KB max SQL length —
// stay safely under it for both local and remote D1.
const MAX_STMT_BYTES = 80_000;
const summary = [];
const generated = new Map();

for (const [name, spec] of Object.entries(TABLES)) {
  let rows = tables.get(name);

  // rate_limits: dedupe on (ip, endpoint, window_start) keeping max count
  if (name === 'rate_limits') {
    const best = new Map();
    for (const r of rows) {
      const key = `${r[1]}\u0000${r[2]}\u0000${pgTimestampToIso(r[4])}`;
      const count = parseInt(r[3] || '1', 10);
      const prev = best.get(key);
      if (!prev || count > prev.count) best.set(key, { row: r, count });
    }
    rows = [...best.values()].map((x) => x.row);
  }

  const colNames = spec.cols.map((c) => c[0]);
  const outCols = spec.extra ? [...colNames, ...spec.extra] : colNames;

  const valueRows = rows.map((r, index) => {
    const vals = spec.cols.map((c, i) => {
      try {
        return convert(r[i], c[1]);
      } catch (error) {
        throw new Error(`${name}.csv row ${index + 1}, column ${c[0]}: ${error.message}`);
      }
    });
    if (name === 'admins' && spec.extra) {
      // password_hash from auth.users (bcrypt) matched via admins.user_id
      vals.push(authByUuid.get(r[1]) ?? null);
    }
    return vals.map((v) => (v === null ? 'NULL' : sqlLiteral(String(v))));
  });

  // Note: no BEGIN/COMMIT — `wrangler d1 execute --file` wraps the whole
  // file in a single transaction itself (raw BEGIN is rejected).
  let sql = `-- ${name}: ${valueRows.length} rows\n`;
  let stmt = '';
  let stmtBytes = 0;
  let inBatch = false;
  const endStmt = () => {
    if (inBatch) {
      sql += stmt + ';\n';
      stmt = '';
      stmtBytes = 0;
      inBatch = false;
    }
  };
  for (const v of valueRows) {
    const line = `(${v.join(', ')})`;
    const lineBytes = Buffer.byteLength(line, 'utf8') + 3;
    const prefix = `INSERT INTO ${name} (${outCols.join(', ')}) VALUES\n`;
    if (Buffer.byteLength(prefix, 'utf8') + lineBytes > MAX_STMT_BYTES) {
      throw new Error(`${name}: a row exceeds the ${MAX_STMT_BYTES}-byte SQL statement limit`);
    }
    if (inBatch && stmtBytes + lineBytes > MAX_STMT_BYTES) endStmt();
    if (!inBatch) {
      stmt = prefix;
      stmtBytes = Buffer.byteLength(stmt, 'utf8');
      inBatch = true;
    } else {
      stmt += ',\n';
      stmtBytes += 2;
    }
    stmt += line + '\n';
    stmtBytes += lineBytes;
  }
  endStmt();

  generated.set(name, sql);
  summary.push({ table: name, rows: valueRows.length });
}

// Insertion order matters for FKs (D1 enforces them):
//   apps/extensions → memberships; admins → user_roles/admin_sessions/admin_logs;
//   compatibility_groups → memberships.
const ORDER = [
  'admins',
  'user_roles',
  'moderator_permissions',
  'apps',
  'extensions',
  'compatibility_groups',
  'app_group_memberships',
  'extension_group_memberships',
  'guides',
  'blog_posts',
  'faqs',
  'settings',
  'donation_settings',
  'donations',
  'notices',
  'themes',
  'likes',
  'reports',
  'feedbacks',
  'submissions',
  'public_edit_suggestions',
  'contributors',
  'rate_limits',
  'bot_attack_logs',
  'admin_logs',
  'admin_sessions',
  'unauthorized_login_attempts',
];

let combined = '-- Supabase → D1 data migration\n';
for (const t of ORDER) {
  combined += `\n-- ═══ ${t} ═══\n` + generated.get(t);
}
// Empty tables get a fresh zero-row file; ALL.sql only uses this run's output.
mkdirSync(OUT_DIR, { recursive: true });
for (const [name, sql] of generated) {
  writeFileSync(`${OUT_DIR}/${name}.sql`, sql, 'utf8');
}
writeFileSync(`${OUT_DIR}/ALL.sql`, combined, 'utf8');
writeFileSync(`${OUT_DIR}/manifest.json`, JSON.stringify(summary, null, 2) + '\n', 'utf8');

console.log('Migration SQL generated:');
for (const s of summary) console.log(`  ${s.table.padEnd(28)} ${String(s.rows).padStart(6)} rows`);
console.log(`\nTotal: ${summary.reduce((a, b) => a + b.rows, 0)} rows`);
console.log(`\nApply with:\n  npx wrangler d1 execute miyomi-db --local --file "${OUT_DIR}/ALL.sql"`);
