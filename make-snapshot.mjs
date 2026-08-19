#!/usr/bin/env node
/* Build snapshot.json — the app's offline safety net.
 *
 * WHY THIS EXISTS
 * index.html reads bounties straight from poidh.xyz in the visitor's browser.
 * Two things can break that, and neither is under your control:
 *   1. CORS. If poidh.xyz does not send Access-Control-Allow-Origin, a browser
 *      on your domain is blocked outright. curl works; the browser does not.
 *   2. The endpoint being down.
 *
 * If snapshot.json sits next to index.html, the app loads it from your own
 * origin first (no CORS involved, since it is same-origin) and paints a full
 * sheet immediately, then tries to refresh from live data on top. So the app
 * keeps showing real bounties even when the upstream API is unreachable —
 * which is the "resilient and unstoppable" property the bounty asks for.
 *
 *   node make-snapshot.mjs                       # all chains, up to 1500 each
 *   node make-snapshot.mjs --chain base --max 400
 *   node make-snapshot.mjs --concurrency 6       # be gentler
 *
 * Re-run it whenever you want the baseline refreshed, then redeploy.
 * Node 18+ (needs global fetch). No dependencies.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HTML = process.env.POIDH_HTML || path.join(HERE, "index.html");
const BASE = process.env.POIDH_API_BASE || "https://poidh.xyz";
const OUT = path.join(HERE, "snapshot.json");

const src = fs.readFileSync(HTML, "utf8");
function extract(tag) {
  const m = src.match(new RegExp("/\\* @" + tag + "-begin \\*/([\\s\\S]*?)/\\* @" + tag + "-end \\*/"));
  if (!m) { console.error("Could not find @" + tag + " markers in " + HTML); process.exit(1); }
  return m[1];
}
new Function(extract("core"))();
new Function(extract("net"))();
const C = globalThis.PoidhCore, N = globalThis.PoidhNet;

const args = process.argv.slice(2);
const arg = (k, d) => { const i = args.indexOf("--" + k); return i === -1 ? d : args[i + 1]; };
const CHAINS = arg("chain") ? [arg("chain")] : C.CHAIN_ORDER.slice();
const MAX = Number(arg("max", 1500));
const CONC = Number(arg("concurrency", 8));

const ds = N.createDataSource({ base: BASE, timeoutMs: 20000 });
const rows = [];
const now = Date.now();
const summary = [];

for (const chain of CHAINS) {
  process.stdout.write(chain + ": discovering highest id … ");
  let maxId = 0;
  try { maxId = await C.discoverMaxId(id => ds.exists(chain, id), { max: 200000 }); }
  catch (e) { console.log("failed (" + (e.code || e.message) + ")"); summary.push([chain, 0, 0]); continue; }
  if (!maxId) { console.log("no bounties found"); summary.push([chain, 0, 0]); continue; }
  console.log(maxId);

  const lo = Math.max(1, maxId - MAX + 1);
  const ids = [];
  for (let id = maxId; id >= lo; id--) ids.push(id);

  let done = 0, ok = 0, missing = 0;
  const t0 = Date.now();
  await C.pool(ids, id => ds.get(chain, id), {
    concurrency: CONC, retries: 2, backoffMs: 400,
    onResult(r, id) {
      ok++; done++;
      rows.push({ chain, id, raw: r.raw, fetchedAt: now,
                  status: C.normalizeBounty(r.raw, chain, id).status });
      if (done % 25 === 0 || done === ids.length) {
        process.stdout.write("\r  " + done + "/" + ids.length + "  ok=" + ok + " missing=" + missing + "   ");
      }
    },
    onError(err, id) {
      done++;
      if (err && err.code === "not-found") missing++;
      else process.stderr.write("\n  #" + id + " " + (err.code || err.message) + "\n");
      if (done % 25 === 0 || done === ids.length) {
        process.stdout.write("\r  " + done + "/" + ids.length + "  ok=" + ok + " missing=" + missing + "   ");
      }
    }
  });
  console.log("\n  " + ok + " bounties in " + ((Date.now() - t0) / 1000).toFixed(1) + "s");
  summary.push([chain, ok, maxId]);
}

if (!rows.length) {
  console.error("\nNothing fetched — snapshot.json NOT written (an empty snapshot would be worse than none).");
  process.exit(1);
}

/* Sorted by chain then id so the file diffs cleanly between runs. */
rows.sort((a, b) => a.chain < b.chain ? -1 : a.chain > b.chain ? 1 : b.id - a.id);

const payload = {
  generatedAt: new Date(now).toISOString(),
  source: BASE + "/[chain]/bounty/[id]/data",
  note: "Baseline for the POIDH Contact Sheet. The app loads this from its own "
      + "origin, then refreshes from live data on top. Raw payloads are stored "
      + "verbatim so an adapter fix reaches these rows too.",
  counts: Object.fromEntries(summary.map(([c, n]) => [c, n])),
  bounties: rows
};
fs.writeFileSync(OUT, JSON.stringify(payload));

const kb = (fs.statSync(OUT).size / 1024).toFixed(0);
console.log("\nwrote " + OUT);
console.log("  " + rows.length + " bounties, " + kb + "KB");
for (const [c, n, m] of summary) console.log("  " + c.padEnd(9) + n + " of " + m + " ids");
console.log("\nDeploy snapshot.json next to index.html. The app picks it up automatically.");
if (kb > 4000) console.log("NOTE: that is a large file. Consider --max to trim it.");
