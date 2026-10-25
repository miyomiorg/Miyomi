// Read-only analytics. Never prints credentials or writes to D1.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'smol-toml';

const config = parse(readFileSync('wrangler.toml', 'utf8'));
const token = process.env.CLOUDFLARE_API_TOKEN || parse(readFileSync(join(process.env.APPDATA,
  'xdg.config/.wrangler/config/default.toml'), 'utf8')).oauth_token;
async function api(path, body) {
  const response = await fetch(`https://api.cloudflare.com/client/v4/${path}`, {
    method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json();
  if (!response.ok || result.errors?.length) throw new Error(JSON.stringify(result.errors));
  return result;
}
const account = config.account_id || (await api('accounts')).result[0].id;
const start = process.argv[2] || '2026-10-17T00:00:00Z';
const end = process.argv[3] || new Date().toISOString();
const filter = { datetimeHour_geq: start, datetimeHour_leq: end, databaseId: config.d1_databases[0].database_id };
const result = await api('graphql', {
  query: `query($account: string, $filter: ZoneWorkersRequestsFilter_InputObject) {
    viewer { accounts(filter: {accountTag: $account}) {
      d1AnalyticsAdaptiveGroups(limit: 10000, filter: $filter) {
        dimensions { datetimeHour } sum { readQueries writeQueries rowsRead rowsWritten }
      }
      d1QueriesAdaptiveGroups(limit: 15, filter: $filter, orderBy: [sum_rowsRead_DESC]) {
        dimensions { query } count avg { rowsRead queryDurationMs } sum { rowsRead }
      }
    } }
  }`, variables: { account, filter },
});
const hours = result.data.viewer.accounts[0].d1AnalyticsAdaptiveGroups;
const days = {};
for (const row of hours) {
  const day = row.dimensions.datetimeHour.slice(0, 10);
  const total = days[day] ||= { readQueries: 0, writeQueries: 0, rowsRead: 0, rowsWritten: 0 };
  for (const key of Object.keys(total)) total[key] += row.sum[key];
}
console.log(JSON.stringify({ start, end, days: Object.fromEntries(Object.entries(days).sort()),
  queries: result.data.viewer.accounts[0].d1QueriesAdaptiveGroups,
  hours: hours.filter(r => r.sum.rowsRead > 500000) }, null, 2));
