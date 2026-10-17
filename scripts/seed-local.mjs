/**
 * Add a LOCAL-ONLY dev admin on top of the migrated real data
 * (does NOT wipe anything — the real 3 admins are preserved).
 *
 *   npm run seed:local
 *
 * Local login: admin@miyomi.local / MiomiLocal123!
 * (Requires .dev.vars with SESSION_SECRET for `wrangler dev`.)
 */
import { writeFileSync, unlinkSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { hashPassword } from '../worker/lib/auth.ts';

const ADMIN_EMAIL = 'admin@miyomi.local';
const ADMIN_PASSWORD = 'MiomiLocal123!';

// Fixed ids → idempotent (safe to re-run)
const adminId = 'seed-admin-1';
const roleId = 'seed-role-local-1';
const now = new Date().toISOString();
const hash = await hashPassword(ADMIN_PASSWORD);

const sql = [
  // Upsert the local admin (refreshes the password hash each run)
  `INSERT INTO admins (id, email, password_hash, display_name, is_active, created_at, updated_at)`,
  `VALUES ('${adminId}', '${ADMIN_EMAIL}', '${hash}', 'Local Dev Admin', 1, '${now}', '${now}')`,
  `ON CONFLICT (id) DO UPDATE SET password_hash = '${hash}', is_active = 1, updated_at = '${now}';`,
  // Ensure it has a role (super_admin — local convenience)
  `INSERT INTO user_roles (id, user_id, role) VALUES ('${roleId}', '${adminId}', 'super_admin')`,
  `ON CONFLICT (id) DO NOTHING;`,
].join('\n');

const tmp = 'tmp-local-admin.sql';
writeFileSync(tmp, sql);
try {
  execSync(`npx wrangler d1 execute miyomi-db --local --file ${tmp}`, { stdio: 'inherit' });
} finally {
  unlinkSync(tmp);
}
console.log(`\nLocal dev admin ready: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD} (id ${adminId})`);
