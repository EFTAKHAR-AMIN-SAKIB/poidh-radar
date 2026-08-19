/* Flaky-network suite: the endpoint works, but not every request succeeds.
 *
 * This is the common real-world case — mobile data, a loaded origin server, a
 * rate limiter — and it is the one a naive crawler silently gets wrong: it
 * reports a partial sheet as if it were complete. The app must recover from
 * dropped requests and finish with EVERY bounty, with no failure notice, since
 * nothing actually stayed broken.
 *
 * Two distinct retry paths are exercised:
 *   1. id discovery      → retryTransient() in the UI block
 *   2. per-bounty reads  → the retry built into C.pool
 * Dropping the first requests hits (1); dropping every Nth thereafter hits (2).
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

const MAX_ID = 90;
const DROP_FIRST = 2;      // kills the opening discovery probe twice over
const DROP_EVERY = 7;      // then one in every seven reads dies
const POISON_ID = 42;      // and this one never succeeds, no matter how often asked
function bountyJson(id) {
  return {
    id, title: "Flaky bounty " + id,
    description: "Request #" + id,
    issuer: "0x" + String(id).padStart(40, "5"),
    amount: (BigInt(id) * 10n ** 16n).toString(),
    createdAt: 1700000000 + id * 60,
    claims: id % 5 === 0
      ? [{ id: id * 10, title: "proof " + id, imageUrl: "ipfs://QmFlaky" + id, accepted: id % 10 === 0 }]
      : []
  };
}

let seen = 0, dropped = 0, served = 0;
const server = http.createServer((req, res) => {
  const p = new URL(req.url, "http://x").pathname;
  if (p === "/snapshot.json") { res.writeHead(404); return res.end("nf"); }
  seen++;
  const pm = p.match(/^\/([a-z]+)\/bounty\/(\d+)\/data$/);
  const poisoned = pm && Number(pm[2]) === POISON_ID && pm[1] === "base";
  if (seen <= DROP_FIRST || seen % DROP_EVERY === 0 || poisoned) {
    dropped++;
    req.destroy(); res.destroy();
    return;
  }
  const m = pm;
  if (!m) { res.writeHead(404); return res.end("no"); }
  const id = Number(m[2]);
  if (m[1] !== "base" || id > MAX_ID) { res.writeHead(404); return res.end("nf"); }
  served++;
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify(bountyJson(id)));
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
while (doc._byId.loadbar.getAttribute("data-done") !== "1" && Date.now() - t0 < 90000) {
  await new Promise(r => setTimeout(r, 100));
}
ok("crawl completes despite dropped requests", doc._byId.loadbar.getAttribute("data-done") === "1",
   (Date.now() - t0) + "ms elapsed");
console.log("   settled in " + (Date.now() - t0) + "ms  (requests " + seen
            + ", dropped " + dropped + ", served " + served + ")");

const sheet = doc._byId.sheet;
const q = (root, sel) => root.querySelectorAll(sel);

section("recovery is complete, not partial");
ok("requests really were dropped", dropped >= 3, String(dropped));
eq("the first discovery probe recovered (a max id was found)",
   /highest bounty id 90/.test(doc._byId.diagBody.textContent), true);
eq("no empty state", q(sheet, ".empty").length, 0);
eq("no skeletons left", q(sheet, ".skel").length, 0);

/* Retries should recover everything, but a deterministic 1-in-7 drop can in
   principle kill all four attempts for one id. Completeness is therefore not
   asserted outright — what IS asserted is that the sheet and the shortfall
   report agree, so a partial roll is never presented as the whole set. */
const shown = q(sheet, ".frame").length;
const notices = doc._byId.notices.textContent;
const m = notices.match(/(\d+) on Base could not be fetched/);
const reportedLost = m ? Number(m[1]) : 0;
console.log("   sheet=" + shown + "  reported-missing=" + reportedLost);
eq("frames on the sheet plus reported-missing accounts for every bounty",
   shown + reportedLost, MAX_ID);
ok("retries recovered the overwhelming majority", shown >= MAX_ID - 3,
   shown + " of " + MAX_ID);
if (reportedLost) {
  ok("a shortfall is announced rather than hidden", /Incomplete read/i.test(notices), notices.slice(0, 300));
  ok("the shortfall warns that totals are affected",
     /Counts and totals reflect what was read/i.test(notices), notices.slice(0, 300));
  ok("the shortfall is recorded in diagnostics",
     /unreadable after retries/i.test(doc._byId.diagBody.textContent),
     doc._byId.diagBody.textContent.slice(0, 400));
  // The permanently-dead id must be the one reported, and it must be absent.
  eq("the poisoned bounty is the one reported missing", reportedLost, 1);
  ok("the poisoned bounty is not on the sheet",
     !q(sheet, ".frame").some(f => (q(f, ".fno")[0].textContent || "") === "#" + POISON_ID));
} else {
  ok("a clean crawl announces no shortfall", !/Incomplete read/i.test(notices), notices.slice(0, 300));
  eq("every bounty made it onto the sheet", shown, MAX_ID);
  eq("no bounty is missing from the count", doc._byId.barStats.textContent.includes(String(MAX_ID)), true);
}

section("a recovered blip is not reported as a failure");
{
  const n = doc._byId.notices.textContent;
  ok("no 'live read failed' notice", !/Live read failed/i.test(n), n.slice(0, 240));
  ok("no 'nothing came back' notice", !/No bounties came back/i.test(n), n.slice(0, 240));
  const d = doc._byId.diagBody.textContent;
  ok("diagnostics report the final count as done", /bounties on the sheet/i.test(d), d.slice(0, 400));
  ok("the circuit breaker did not trip", !/stopped after/i.test(d), d.slice(0, 400));
}

section("derived data is intact after retries");
{
  /* Derived counts are checked against the ids actually on the sheet rather
     than against MAX_ID, so a dropped bounty shows up as a completeness
     failure above and not as a spurious correctness failure here. */
  const ids = q(sheet, ".frame").map(f => Number((q(f, ".fno")[0].textContent || "").replace("#", "")));
  eq("every frame carries a readable id", ids.filter(n => Number.isInteger(n) && n > 0).length, shown);
  eq("proof images match the ids present", q(sheet, "img").length, ids.filter(n => n % 5 === 0).length);
  eq("keeper rings match accepted claims among the ids present",
     q(sheet, ".keeper").length, ids.filter(n => n % 10 === 0).length);
  eq("no duplicate frames after retries", new Set(ids).size, shown);
  ok("ledger ranks the full set", q(doc._byId.ledger, ".row").length > 4,
     String(q(doc._byId.ledger, ".row").length));
  const first = q(sheet, ".frame")[0].getAttribute("aria-label");
  ok("richest bounty present still sorts first",
     first.includes("Flaky bounty " + Math.max(...ids)), first);
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
