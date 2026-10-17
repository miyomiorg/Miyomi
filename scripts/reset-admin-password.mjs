/**
 * Reset an admin's password in the PRODUCTION D1 database.
 *
 *   node scripts/reset-admin-password.mjs <email> [password]
 *
 * If <password> is omitted you are prompted (input hidden). The password is
 * hashed with the Worker's own bcrypt implementation (worker/lib/auth.ts), so
 * the result always verifies against the login endpoint.
 *
 * Requires: `wrangler login` (or CLOUDFLARE_API_TOKEN in env).
 */
import { execSync } from 'node:child_process';
import { writeFileSync, unlinkSync } from 'node:fs';
import readline from 'node:readline';
import { hashPassword } from '../worker/lib/auth.ts';

const [email, passwordArg] = process.argv.slice(2);
if (!email || !email.includes('@')) {
  console.error('Usage: node scripts/reset-admin-password.mjs <email> [password]');
  process.exit(1);
}

function hiddenPrompt(question) {
  return new Promise((resolve) => {
    const { stdin, stdout } = process;
    stdout.write(question);
    stdin.resume();
    stdin.setRawMode?.(true);
    let buf = '';
    const onData = (chunk) => {
      const s = chunk.toString();
      if (s.includes('\u0003')) { // Ctrl-C
        stdin.setRawMode?.(false);
        stdout.write('\n');
        process.exit(0);
      }
      if (s.includes('\r') || s.includes('\n')) {
        stdin.setRawMode?.(false);
        stdin.off('data', onData);
        stdout.write('\n');
        resolve(buf);
        return;
      }
      if (s.includes('\u007f') || s.includes('\b')) {
        buf = buf.slice(0, -1);
        return;
      }
      buf += s;
    };
    stdin.on('data', onData);
  });
}

const password = passwordArg ?? (await hiddenPrompt(`New password for ${email}: `));
if (!password || password.length < 8) {
  console.error('Password must be at least 8 characters.');
  process.exit(1);
}

const hash = await hashPassword(password);
const now = new Date().toISOString();
const safeEmail = email.replace(/'/g, "''");

const sql = [
  // Password reset via CLI is also the 2FA recovery path: clear totp_secret so
  // the account can re-enrol if the authenticator was lost.
  `UPDATE admins SET password_hash = '${hash}', totp_secret = NULL, updated_at = '${now}' WHERE email = '${safeEmail}';`,
  `SELECT id, email, password_hash IS NOT NULL AS has_hash, totp_secret IS NULL AS has_no_totp FROM admins WHERE email = '${safeEmail}';`,
].join('\n');

const tmp = 'tmp-admin-password.sql';
writeFileSync(tmp, sql);
try {
  execSync(`npx wrangler d1 execute miyomi-db --remote --file ${tmp}`, { stdio: 'inherit' });
} finally {
  unlinkSync(tmp);
}
console.log(`\nPassword updated for ${email}. Log in at /admin to confirm.`);