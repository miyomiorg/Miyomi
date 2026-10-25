# D1 reads and public-data audit — 2026-10-25

## Status and evidence

The changes were tested locally before this report was committed. Production
deployment was not part of this audit. No production schema or content edits
were made. One normal public blog-detail GET incremented its view
counter as that endpoint normally does. Production investigation used Cloudflare
GraphQL analytics, Wrangler D1 insights, read-only SQL/EXPLAIN, and public HTTP GETs.

Cloudflare adaptive analytics are observations, not an authoritative billing ledger
or a log of the precise request that hit a daily quota. They identify the dominant
read source, but do not establish the exact time of quota enforcement or whether
the account plan changed during the incident.

## Historical daily usage (UTC)

| Day | Read queries | Rows read |
| --- | ---: | ---: |
| Oct 17 | 18,826 | 8,794,911 |
| Oct 18 | 47,392 | 10,532,041 |
| Oct 19 | 36,992 | 2,236,578 |
| Oct 20 | 36,538 | 2,184,112 |
| Oct 21 | 31,322 | 1,913,298 |
| Oct 22 | 32,527 | 1,927,214 |
| Oct 23 | 30,912 | 1,840,709 |
| Oct 24 | 35,533 | 2,116,427 |

The initial rebuild/incident window (Oct 17 00:00 through Oct 18 05:59:59 UTC)
had **17,521,618 rows read**. The largest individual query was:

```sql
SELECT item_id FROM likes WHERE device_fingerprint = ?;
```

It ran **1,812 times**, averaging **7,510 rows read**, for **13,609,626 reads**
(about 78% of the window). This was a repeated fingerprint table scan, not mainly
an expensive app-detail lookup. App lists contributed another 2,054,052 reads
(7,895 executions, average 260); extension lists contributed 630,209.

Commit `2825dc7` on Oct 18 introduced public caching and the covering fingerprint
index. Production now reports:

```text
SEARCH likes USING COVERING INDEX idx_likes_fingerprint_item (device_fingerprint=?)
```

A production lookup for an absent diagnostic fingerprint read **0 rows**. The
following days' 1.8–2.2 million reads are consistent with the original scan being
fixed. A cache stampede is reproducible in the old middleware, but analytics do
not prove that concurrent misses caused the original incident.

## App data first: queries, size, indexes, and reuse

There is no literal `/api/app-data` route in this repository. App data comes from
`/api/apps`, `/api/apps/:idOrSlug`, and the optional `/compatible` endpoint.

Seven-day D1 insights sampled at approximately 05:27 UTC on Oct 25:

| Query | Runs | Average rows read | Total reads | Average SQL time |
| --- | ---: | ---: | ---: | ---: |
| Current app list (including notice flag) | 18,451 | 273 | 5,037,123 | 3.20 ms |
| App counts in legacy likes registry | 22,065 | 138 | 3,044,970 | 0.45 ms |
| Current extension list | 18,133 | 97 | 1,758,901 | 1.68 ms |
| Extension counts in legacy likes registry | 21,912 | 49 | 1,073,688 | 0.27 ms |
| Guides list | 19,988 | 51 | 1,019,388 | 1.18 ms |

Older app-list SQL variants in this window add 858,312 and 56,238 reads; do not
mistake the current-variant total for all app-list traffic. These are database
executions, not all HTTP requests: cache hits do not appear as SQL executions.

The app list is one SELECT of all columns for approved rows, ordered by name.
The live response contained **136 apps and about 208 KB of JSON**. EXPLAIN shows
`idx_apps_status` followed by a temporary B-tree for ordering. A slug detail uses
`uq_apps_slug`; it does not scan the directory. UUID lookups also have a PK index.
The existing list reads both index and table entries; returning fewer columns
would primarily save payload bytes, not automatically eliminate billed row reads.
No speculative indexes were added: SQL execution itself is only a few milliseconds.

The list includes detail-oriented fields such as tutorials and SEO fields. A typed
card/search projection is a useful follow-up; the current app-list contract is still
used by several mapping/form consumers. Its biggest immediate waste was requesting
it for an unused search box, now deferred until the visitor searches.

Compatibility is a separate cost: its helper performs several membership queries
and scans reverse `compatible_with` JSON references in the opposite directory.
It is cached, and was not among the dominant observed queries. Normalizing those
reverse links should be driven by growth/measurements rather than adding an index
that cannot index arbitrary JSON-array membership.

Live sequential `/api/apps` probes from the same location returned:

- MISS: 765 ms wall time.
- HIT: 38 ms wall time, same response body.

This proves caching works for that request/location; it is not a global hit-ratio
measurement or a latency benchmark. The old code allowed all concurrent misses
to reach D1. Twenty simultaneous isolated requests reproduced **20 queries**.

## Implemented changes

1. **Existing Cache API, with single-flight.** Twenty cold or expired app-list
   requests now execute **one query** in one isolate. Only safe 200 responses are
   shared. Authorization/session-cookie requests bypass both cache and flights.
   Set-Cookie, private/no-store, errors, and non-Origin Vary responses are excluded.
   CORS headers are reconstructed per caller.
2. **Write invalidation.** Successful admin writes delete recently observed keys
   in the serving isolate/location. Generations protect both read-vs-write and
   cache.put-vs-write races. Failed/unauthorized writes do not evict entries.
   Other isolates/locations expire naturally; this is not a global purge.
3. **Likes split by privacy.** The frontend requests shared public counts and an
   indexed, private list of its own liked IDs separately. In the legacy registry,
   every visit read both complete content tables. The new warm-count path reads
   only personal matches; the two public SELECTs run once per cache fill.
   The legacy registry remains uncached for older clients. Like toggles still
   return the user's authoritative new count; shared counts can lag up to 60s.
4. **Avoid unused search fetches.** Empty home/navbar search boxes no longer fetch
   the app, extension, and guide directories. Typing subsequent search characters
   reuses the loaded search data.
5. **Notice freshness.** Dismissal is scoped to entry + text/severity revision;
   changed notices reappear and sticky notices override dismissal. Detail hooks
   refresh expired data on visible-page checks/focus. Successful admin writes
   invalidate browser content caches, including other tabs. Old pending reads
   cannot resurrect pre-edit data. Ordinary approvals preserve notice fields.
6. **Donor pagination.** Production had **55 public donors**, but `/api/donations`
   defaults to 50 and the frontend fetched just that page. It now walks explicit
   200-row pages with stable ordering. An empty auto-calculated goal resets to 0.
   Private donors stay excluded; donations remain outside shared caching.
7. **Blog loading.** The sampled live list/detail endpoints both returned 200;
   the reported general loading failure was not reproduced live. A real frontend
   bug retained an earlier error after navigation to a successfully loaded post;
   this is fixed and regression-tested. List failures expose Retry instead of an
   unexplained empty state. Lists reuse the existing browser cache across category
   filters/related-post mounts. List responses carry summaries plus reading time,
   not complete article bodies: **333,916 → 19,461 bytes** for the sampled data
   (~94% smaller, uncompressed). SQL still reads bodies to compute reading time;
   this is a transfer saving, not a claimed SQL row-read saving.

SWR was considered but not enabled: extending stale moderation/notice visibility
would work against this incident's freshness requirements without global purge.
Single-flight retains the existing 60-second freshness bound at the edge.

## Tests and limits

`npm run verify:query-cache` runs real route SQL against disposable SQLite, cache
concurrency/race tests, and React/jsdom regression tests. Verified:

- 20 cold misses: 20 queries before, 1 after (95% fewer in that burst).
- 20 expired misses: 1 query; subsequent hit: 0 queries / 0 D1 rows.
- 20 public-count misses: 2 queries total, not 40 table queries; warm hit: 0.
- Private liked-item lookups remain one indexed query per visitor, isolated by
  fingerprint. No authenticated response can join an anonymous flight.
- Auth cookies/Bearer headers, CORS, Set-Cookie, Vary, errors/recovery, and both
  write invalidation races are covered.
- Warm app list + detail both reflect successful note writes; failed writes keep
  the good cached response.
- 55 public donors + private donor exclusion; newly created donor appears.
- Browser pagination fixture: all 205 donors loaded, total 410, not first-page total.
- Notice dismissal/revision/sticky/remount behavior, mounted cache expiry,
  late-response invalidation, blog navigation recovery and filter reuse, and
  deferred search requests.

`npm run verify:approval`, frontend/Worker typechecks, and `npm run build` pass.
No database migration is needed. The desktop browser tool was unavailable, so
visual/browser-network end-to-end validation remains outstanding. The build also
shows a ~2.45 MB minified JS entry (~692 KB gzip): all admin pages/editors are
eagerly imported in `src/App.tsx`. Route splitting is a separate high-value
page-load improvement; the current patch does not claim to fix all slowness.

The tests demonstrate reduced database work for controlled requests, not a measured
production daily reduction. After approval/deployment, compare the same daily
analytics, count-query executions, and HIT/MISS/COALESCED distribution. Cross-isolate
coalescing/global invalidation would require additional coordination; it is not
provided by an in-memory promise map.

## Capacity target: 100 daily users on Workers Paid

Pricing checked against Cloudflare's official documentation on Oct 25, 2026:

- Workers Paid: $5/month minimum; D1 includes **25 billion rows read/month**.
- Additional D1 reads: **$0.001 per million rows** above that allowance.
- The Free plan's 5-million-reads/day enforcement does not apply once this
  account is on Workers Paid. Included usage is shared by the account's databases.
- Worker requests/CPU and other services have separate usage allowances; this
  is a D1-read estimate, not a guarantee of the whole account's final bill.

The follow-up `wrangler d1 info miyomi-db --json` reported **2,159,805 rows read
in 24 hours**. At the same rate for 30 days: **64,794,150 reads**, about **0.259%**
of the paid D1 read allowance, with **$0 additional D1 read charges** provided
other account usage does not exhaust the allowance. This is a projection of all
current database traffic, not a measured per-100-users estimate.

For planning, assume one visit per user per day and five page views per visit:
100 × 30 × 5 = **15,000 page views/month**. Illustrative read budgets:

| Assumed average rows read per page view | Monthly reads | Paid read allowance used |
| --- | ---: | ---: |
| 250 | 3,750,000 | 0.015% |
| 1,000 | 15,000,000 | 0.06% |
| 10,000 | 150,000,000 | 0.6% |

These are scenarios, not benchmark results. Bots, admin activity, background
refreshes, repeat visits, and other databases must be counted separately. A
60-second cache is less reusable for 100 visits spread throughout the day than
for a burst; do not extrapolate the 95% concurrent-test reduction to all traffic.

Priority remains eliminating unnecessary search/list requests and repeated
public-count scans using the already-tested changes. Preserve the indexed private
lookup and freshness for notices. Further indexes or longer cache lifetimes should
follow post-deployment measurements, rather than sacrificing correctness to reach
an arbitrary read count. No additional infrastructure is needed for this target.

Local runtime follow-up: **53 Worker integration checks passed**. A 20-request
detail burst against local workerd returned **1 MISS + 19 HIT**, all successful;
this verifies real-runtime cache reuse but does not measure production row savings.

Sources:
- https://developers.cloudflare.com/d1/platform/pricing/
- https://developers.cloudflare.com/workers/platform/pricing/
