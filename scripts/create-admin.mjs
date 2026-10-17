/**
 * Create the first super-admin in the PRODUCTION D1 database.
 *
 *   node scripts/create-admin.mjs <email> <password>
 *
 * Supabase Auth password hashes cannot be exported, so at cutover the
 * first admin account is created here (bcrypt via worker/lib/auth.ts, so
 * the same login verification applies everywhere).
 *
 * Requires: `wrangler login` (or CLOUDFLARE_API_TOKEN in env).
 */
import { execSync } from 'node:child_process';
import { writeFileSync, unlinkSync } from 'node:fs';
import { hashPassword } from '../worker/lib/auth.ts';

const [email, password] = process.argv.slice(2);
if (!email || !email.includes('@') || !password || password.length < 8) {
  console.error('Usage: node scripts/create-admin.mjs <email> <password (min 8 chars)>');
  process.exit(1);
}
// Escape SQL string literals built from CLI input (defense in depth).
const safeEmail = email.replace(/'/g, "''");

const hash = await hashPassword(password);
const id = crypto.randomUUID();
const now = new Date().toISOString();

const sql = [
  `INSERT INTO admins (id, email, password_hash, is_active, created_at, updated_at)`,
  `VALUES ('${id}', '${safeEmail}', '${hash}', 1, '${now}', '${now}');`,
  `INSERT INTO user_roles (id, user_id, role)`,
  `VALUES ('${crypto.randomUUID()}', '${id}', 'super_admin');`,
].join('\n');

const tmp = 'tmp-admin.sql';
writeFileSync(tmp, sql);
try {
  execSync(`npx wrangler d1 execute miyomi-db --remote --file ${tmp}`, { stdio: 'inherit' });
} finally {
  unlinkSync(tmp);
}
console.log(`\nCreated super admin ${email} (id ${id}). You can now log in at /admin.`);
