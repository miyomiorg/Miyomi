/**
 * Local smoke test for the Hono worker entry — no Cloudflare auth needed.
 *
 * Run:  node scripts/smoke-worker.ts
 *
 * Exercises the same request path as `wrangler dev` (Hono routing,
 * CORS, API handlers, static/SPA fallback) against a mocked env.
 */
import worker from '../worker/index.ts';
import type { Bindings } from '../worker/env';

const env = {
  DB: { prepare: () => ({ run: async () => ({ meta: {} }) }) },
  ASSETS: {
    fetch: async (req: Request) => {
      const url = new URL(req.url);
      if (url.pathname === '/' || url.pathname === '/index.html') {
        return new Response('<html>miyomi spa shell</html>', {
          status: 200,
          headers: { 'content-type': 'text/html' },
        });
      }
      return new Response('asset not found', { status: 404 });
    },
  },
  SITE_URL: 'http://localhost:8788',
} as unknown as Bindings;

let failures = 0;

async function check(name: string, fn: () => Promise<boolean>) {
  let ok = false;
  try {
    ok = await fn();
  } catch (e) {
    console.error('  threw:', e);
  }
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) failures++;
}

// Exercise the deployed default export, including its fetch registration.
const request = (path: string, init?: RequestInit) =>
  worker.fetch(new Request(new URL(path, 'http://localhost:8788'), init), env);

const resHealth = await request('/api/health');
const body = await resHealth.clone().json();
console.log('[smoke] /api/health →', resHealth.status, JSON.stringify(body));

const resRoot = await request('/');
const rootText = await resRoot.clone().text();

const resSpa = await request('/software/some-app');
const spaText = await resSpa.clone().text();

const resMissing = await request('/nope-missing.png');

const resPreflight = await request('/api/health', {
  method: 'OPTIONS',
  headers: {
    Origin: 'https://preview.example.com',
    'Access-Control-Request-Method': 'GET',
  },
});

await check('/api/health returns 200 + success payload', async () =>
  resHealth.status === 200 && body.success === true,
);
await check('/ serves the SPA shell from assets', async () =>
  resRoot.status === 200 && rootText.includes('miyomi'),
);
await check('/software/:slug falls back to SPA shell (200)', async () =>
  resSpa.status === 200 && spaText.includes('miyomi'),
);
await check('missing static file stays a 404', async () =>
  resMissing.status === 404,
);
await check('CORS preflight sets Access-Control-Allow-Origin', async () =>
  resPreflight.headers.get('access-control-allow-origin') === 'https://preview.example.com',
);

if (failures > 0) {
  console.error(`\n[smoke] ${failures} check(s) failed`);
  process.exit(1);
}
console.log('\n[smoke] all checks passed ✓');
