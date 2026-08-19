# Verification record

What was actually measured, and what was not. The build environment had no
network access and no browser, which puts a hard limit on what could be
confirmed. That limit is stated here rather than papered over, because a claim
you cannot check is worth less than an admission you can.

Everything under "Measured" was produced by running something and reading the
result. Everything under "Not verified" is a gap — some of them closeable in
minutes on a normal machine, and the first two matter enough that they should be
closed before the app is cast publicly.

---

## Measured

### Test suite

534 assertions, 7 suites, 0 failures, 16.96s wall time. Re-run with
`bash tests/run-tests.sh`.

| Suite | Assertions | What it establishes |
| --- | --- | --- |
| `test-core` | 228 | Exact BigInt wei arithmetic, per-currency aggregation, the schema adapter, status derivation, filters, sorting, URL state round-trips, and the `imageUrl()` default-deny gate against 13 hostile URL schemes |
| `test-net` | 71 | Transport against a real localhost HTTP server, `not-found` vs. network-vs-CORS classification, cache TTL behaviour, retry and backoff, JSON → `__NEXT_DATA__` → brace-scraping payload sniffing, ABI encode/decode round-trips, RPC endpoint failover |
| `test-ui` | 88 | The shipped UI script executed against a DOM shim: 137 bounties crawled, filtered, sorted, searched, deep-linked and rendered; frame structure, ARIA labels, loupe contents, share link |
| `test-resilience` | 27 | Live API dead + `snapshot.json` present → the sheet still fills with real bounties, stats compute, filters and search still work, and the failure notice names the snapshot as the source rather than claiming a cache hit |
| `test-blackout` | 23 | Live API dead, no snapshot, empty cache → boot terminates instead of spinning, an explanatory empty state appears, no false statistics are printed, and the notice states the sheet is empty |
| `test-flaky` | 23 | 24 of 131 requests dropped, including one bounty that never succeeds → 89 of 90 recovered, and the 1 that did not is reported as missing instead of silently shrinking the sheet |
| `test-static` | 74 | Self-containment, embed metadata validity, `og.png` dimensions, byte size, absence of storage APIs, and provenance of every `img.src` assignment |

The suites extract and execute the code from the shipped `index.html` — not a
copy — so a green run describes the file that gets deployed.

### Sizes

| File | Bytes | Note |
| --- | --- | --- |
| `index.html` | 97,602 (95.3 KB) | 29,649 (29.0 KB) gzipped |
| `og.png` | 117,756 | 1200×630, 1.905:1 |

### Timings, from the test runs

- 137 bounties discovered, fetched and normalised in **109 ms** at concurrency 10
- Highest bounty id found in **18 HTTP requests** (exponential ramp, then binary search)
- Full crawl plus render in the DOM shim: **303 ms**
- Dead-endpoint boot settles in **~100 ms**; blackout boot in **99 ms**
- Flaky-network crawl, 90 bounties with 24 dropped requests: **4.5 s**

### Self-containment

Asserted, not assumed: no `<script src>`, no remote stylesheet, no `@import`, no
webfont, no `<iframe>`, no JSX or ESM syntax, exactly three inline `<script>`
blocks, and no `localStorage` / `sessionStorage` anywhere. The app opens from a
`file://` path with no server.

### Security

`imageUrl()` is the single gate every `img.src` passes through, and
`test-static` verifies by provenance that no assignment bypasses it. It is
default-deny and was hardened during testing after a test caught it accepting
`data:image/svg+xml` — an SVG can carry script, and no legitimate proof image is
an inline SVG. Rejected and asserted: `javascript:` in several casings and with
embedded whitespace, `vbscript:`, `data:text/html`, `data:image/svg+xml`,
`file://`, `blob:`, `about:`, UNC paths, and raw HTML.

Untrusted bounty strings reach the DOM only through `textContent`. `innerHTML` is
assigned exactly once in the file, and only ever the constant inline SVG for the
keeper ring.

### Bugs found by testing, and fixed

Listed because they are evidence the tests do something. Each was found by a
suite, not by reading.

1. **SVG data URLs were accepted as proof images.** A script-carrying `data:` URL
   could be set as an `img.src`. Narrowed to a raster-only allowlist.
2. **The failure notice misattributed data provenance.** With a snapshot
   deployed, a failed live read announced "the sheet below is from cache" —
   false, and it implies a previous visit. Now reports snapshot and cache
   separately.
3. **A single dropped probe killed an entire chain.** Id discovery had no retry,
   so one transient failure at boot meant that chain showed nothing. Now retried
   with exponential backoff.
4. **Permanently unreadable bounties vanished silently.** A partial crawl
   rendered as though it were the complete roll — 88 of 90 bounties presented as
   "88 bounties" with no indication anything was missing. Now counted per chain
   and announced, with an explicit warning that totals reflect what was read.
5. **A dead IPFS gateway was in the failover list.** Cloudflare sunset its public
   gateway; the entry was removed.
6. **A code comment claimed a test existed that did not.** The comment was made
   true by writing the assertions rather than by deleting the sentence.

### The share card

`og.png` was rendered and then visually inspected — the only part of this project
that was. Two layout collisions were found that way and fixed: frame numbers
overlapping the sprocket row, and a vertical rule overdrawing the final glyph of
the motto. Clearances were then measured numerically rather than eyeballed.

---

## Not verified

### 1. The live `/data` field names — UNVERIFIED

The single largest gap. The real response shape was never seen, so the adapter
resolves every field through candidate key lists plus a bounded deep search. That
is defensive, not correct: if POIDH names a field something the lists do not
contain, the app shows a placeholder where a real value should be, and it will
look plausible while doing it.

**Close it with:** `node probe-schema.mjs` on any networked machine. It runs the
shipped adapter against real bounties and names any field that failed to resolve,
along with what that field breaks. Fixes go in one function.

Until that has been run, treat every number the app displays as unconfirmed.

### 2. Visual appearance — COMPLETELY UNVERIFIED

There was no browser, no headless Chrome, and no screenshot capability in the
build environment. **The app has never been rendered.** The tests confirm the code
runs, builds the expected DOM structure, and sets the expected classes and
attributes — they say nothing about whether it looks right. Layout, spacing,
colour rendering, responsive behaviour, font fallback, the loupe overlay, and the
proof-image grid are all unseen.

**Close it with:** opening `index.html` in a browser. Any deviation is a CSS
problem in a file with no build step, so it is directly editable.

### 3. Farcaster embed and Mini App handshake — UNVERIFIED

The `fc:miniapp` and `fc:frame` meta tags are present and their JSON is asserted
valid, with button title and app name within the 32-character limits. But no
Farcaster host was available to test against, so:

- whether Warpcast renders the embed as intended is unconfirmed
- the "ready" handshake is a dependency-free best-effort `postMessage` shim that
  posts three envelope shapes, because the SDK could not be installed and the
  exact expected message could not be checked. It may be ignored entirely.

The app does not depend on the handshake — it works as a plain web page — so the
downside is a loading splash that does not dismiss inside a Mini App frame.

**Close it with:** the Warpcast embed debug tool, before casting.

### 4. IPFS gateway liveness — UNVERIFIED

Four gateways are configured with automatic failover on image error, so a dead
gateway costs at most one failed request per image. Which of them are currently
alive was not checked.

### 5. The onchain fallback is DISARMED, deliberately

The ABI codec and `eth_call` client are complete and unit-tested, but `contract`
is `null` for all three chains and `ONCHAIN.selector` is `null`. The real contract
addresses and the bounty getter signature were not available, and guessing them
would be worse than shipping nothing: a wrong selector returns bytes that decode
into plausible-looking numbers. See the README for how to arm it via URL
overrides.

### 6. Real-world scale and rate limiting — UNVERIFIED

All crawl measurements come from a localhost mock. Actual bounty counts, response
latency, and whether poidh.xyz rate-limits a 12-way concurrent crawl are unknown.
`SOFT_CAP`, `CONCURRENCY` and `BREAKER` are tunable at the top of the third script
block if the real endpoint objects.

### 7. CORS behaviour of poidh.xyz — UNVERIFIED

Whether the endpoint sends `Access-Control-Allow-Origin` could not be tested. If
it does not, browser reads fail even though `curl` succeeds — which is precisely
why `make-snapshot.mjs` exists and why deploying `snapshot.json` is recommended
rather than optional.

---

## Before casting this publicly

1. `node probe-schema.mjs` — and fix anything under CRITICAL
2. Open `index.html` in a browser and look at it
3. `node make-snapshot.mjs` and deploy `snapshot.json` alongside
4. Replace `__APP_URL__`, then `grep -o __APP_URL__ index.html | wc -l` → 0
5. `bash tests/run-tests.sh` → 534 pass, 0 fail
6. Check the embed in Warpcast's debug tool

Steps 1 and 2 are the ones that turn "should work" into "does work".
