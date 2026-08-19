/* Blackout suite: total data failure, and no snapshot to fall back on.
 *
 * This is the worst thing a visitor can experience — the live endpoint is
 * unreachable (outage or CORS), nothing is cached because it is their first
 * visit, and no snapshot.json was deployed. The app cannot show bounties, so
 * the only thing left to get right is honesty: say what failed, say why, point
 * at the diagnostics, and never imply data exists when it does not.
 *
 * A blank page or a permanent loading spinner would fail this suite.
 */
import fs from "node:fs";
import http from "node:http";
import { installGlobals, mountIds, doc } from "./dom-shim.mjs";

const errors = [];
process.on("uncaughtException", e => errors.push("uncaught: " + e.stack));
process.on("unhandledRejection", e => errors.push("unhandled: " + (e && e.stack || e)));

let pass = 0, fail = 0; const fails = [];
function ok(n, c, e) { if (c) pass++; else { fail++; fails.push(n + (e ? "  → " + e : "")); } }
function eq(n, g, w) { ok(n, JSON.stringify(g) === JSON.stringify(w), "got " + JSON.stringify(g) + ", want " + JSON.stringify(w)); }
function section(s) { console.log("\n── " + s); }

/* Everything fails: /data drops the socket, /snapshot.json is a genuine 404. */
let liveAttempts = 0, snapshotAttempts = 0;
const server = http.createServer((req, res) => {
  if (new URL(req.url, "http://x").pathname === "/snapshot.json") {
    snapshotAttempts++;
    res.writeHead(404, { "content-type": "text/plain" });
    return res.end("not found");
  }
  liveAttempts++;
  req.destroy();
  res.destroy();
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const ORIGIN = "http://127.0.0.1:" + server.address().port;

installGlobals();
mountIds(["barStats", "rail", "subhead", "loadbar", "notices", "sheet", "ledger", "loupe", "diag", "diagBody", "btnShare"]);
globalThis.POIDH_API_BASE = ORIGIN;

const realFetch = globalThis.fetch;
Object.defineProperty(globalThis, "fetch", {
  value: (u, o) => realFetch(new URL(String(u), ORIGIN + "/").href, o),
  writable: true, configurable: true
});

import { HTML as src } from "./paths.mjs";
for (const [i, code] of [...src.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).entries()) {
  try { new Function(code)(); }
  catch (e) { ok("script block " + (i + 1) + " evaluates", false, e.message); }
}

const t0 = Date.now();
while (doc._byId.loadbar.getAttribute("data-done") !== "1" && Date.now() - t0 < 60000) {
  await new Promise(r => setTimeout(r, 100));
}
ok("boot terminates instead of spinning forever", doc._byId.loadbar.getAttribute("data-done") === "1",
   (Date.now() - t0) + "ms elapsed");
console.log("   settled in " + (Date.now() - t0) + "ms  (live attempts: " + liveAttempts
            + ", snapshot attempts: " + snapshotAttempts + ")");

const sheet = doc._byId.sheet;
const q = (root, sel) => root.querySelectorAll(sel);

section("graceful degradation");
eq("a snapshot was looked for", snapshotAttempts, 1);
ok("live reads were attempted", liveAttempts > 0, String(liveAttempts));
/* Discovery is a single point of failure — no max id means no crawl — so a
   dropped probe must be retried rather than written off. Three chains × three
   attempts is the floor; anything at or below 3 means retries are gone. */
ok("id discovery retries transient failures instead of giving up on one probe",
   liveAttempts >= 9, "only " + liveAttempts + " attempts across 3 chains");
eq("no frames are invented", q(sheet, ".frame").length, 0);
eq("skeletons are cleared, not left spinning", q(sheet, ".skel").length, 0);
eq("an explanatory empty state is shown", q(sheet, ".empty").length, 1);
{
  const t = q(sheet, ".empty")[0].textContent;
  ok("empty state says data could not be read", /No bounty data could be read/i.test(t), t);
  ok("empty state admits nothing is cached", /nothing is cached/i.test(t), t);
  ok("empty state points at the diagnostics", /Data sources/i.test(t), t);
}

section("notice honesty");
{
  const n = doc._byId.notices.textContent;
  ok("failure is announced", /Live read failed/i.test(n), n.slice(0, 240));
  ok("the likely cause is named", /CORS|outage/i.test(n), n.slice(0, 240));
  ok("it states the sheet is empty rather than implying data", /sheet is empty/i.test(n), n.slice(0, 240));
  ok("it does not claim a cache hit", !/cached on this device/i.test(n), n.slice(0, 240));
  ok("it does not claim a snapshot", !/snapshot\.json/i.test(n), n.slice(0, 240));
}

section("no false statistics");
{
  const txt = doc._byId.barStats.textContent;
  ok("bar does not report a nonzero bounty count",
     !/[1-9]\d*\s*(frames?|bounties)/i.test(txt), JSON.stringify(txt));
  ok("ledger is hidden when there is nothing to rank",
     doc._byId.ledger.hidden === true || q(doc._byId.ledger, ".row").length === 0,
     "hidden=" + doc._byId.ledger.hidden + " rows=" + q(doc._byId.ledger, ".row").length);
}

section("diagnostics");
{
  const d = doc._byId.diagBody.textContent;
  ok("diagnostics record a failure per chain", (d.match(/fail|stopped|error/gi) || []).length >= 1, d.slice(0, 400));
  ok("diagnostics still report the cache backend", /memory|indexeddb/i.test(d), d.slice(0, 400));
}

section("the shell still works");
{
  // Controls must not throw just because there is no data behind them.
  const opt = q(doc._byId.rail, ".opt")[0];
  ok("filters are still present", !!opt);
  opt.click();
  eq("clicking a filter with no data does not crash", q(sheet, ".empty").length, 1);
  const btn = doc._byId.btnShare;
  btn.dispatchEvent({ type: "click", target: btn });
  await new Promise(r => setTimeout(r, 30));
  ok("share still works", btn.textContent === "Link copied", btn.textContent);
}

section("runtime errors");
await new Promise(r => setTimeout(r, 200));
ok("no uncaught exceptions or rejections", errors.length === 0, errors.join("\n"));

server.close();
console.log("\n" + "═".repeat(58));
console.log("PASS " + pass + "   FAIL " + fail);
if (fail) { console.log("\nFAILURES:"); fails.forEach(f => console.log("  ✗ " + f)); }
if (errors.length) { console.log("\nRUNTIME ERRORS:"); errors.forEach(e => console.log("  ! " + e)); }
console.log("═".repeat(58));
process.exit(fail || errors.length ? 1 : 0);
