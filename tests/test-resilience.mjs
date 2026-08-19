/* Resilience suite: what happens when poidh.xyz cannot be read at all.
 *
 * This is the claim the bounty brief cares most about — "decentralized,
 * resilient, unstoppable" — so it gets its own suite rather than a footnote in
 * the happy-path UI test. The scenario: the live /data endpoint drops every
 * connection (an outage, or a CORS block, which looks identical to JS), while a
 * same-origin snapshot.json produced by make-snapshot.mjs sits next to
 * index.html. The app must still paint real bounties and must describe
 * accurately where they came from.
 */
import fs from "node:fs";
import http from "node:http";
import { installGlobals, mountIds, doc, win, loc } from "./dom-shim.mjs";

const errors = [];
process.on("uncaughtException", e => errors.push("uncaught: " + e.stack));
process.on("unhandledRejection", e => errors.push("unhandled: " + (e && e.stack || e)));

let pass = 0, fail = 0; const fails = [];
function ok(n, c, e) { if (c) pass++; else { fail++; fails.push(n + (e ? "  → " + e : "")); } }
function eq(n, g, w) { ok(n, JSON.stringify(g) === JSON.stringify(w), "got " + JSON.stringify(g) + ", want " + JSON.stringify(w)); }
function section(s) { console.log("\n── " + s); }

/* ---------------- the snapshot make-snapshot.mjs would produce ---------------- */
const SNAP_N = 40;
const SNAP_TOP = 200;                       // ids SNAP_TOP-39 … SNAP_TOP
function bountyJson(id) {
  return {
    id, title: "Snapshot bounty " + id,
    description: "Archived proof request #" + id,
    issuer: "0x" + String(id).padStart(40, "3"),
    amount: (BigInt(id) * 10n ** 16n).toString(),
    createdAt: 1700000000 + id * 60,
    claims: id % 4 === 0
      ? [{ id: id * 10, title: "proof " + id, issuer: "0x" + String(id).padStart(40, "4"),
           imageUrl: "ipfs://QmSnap" + id, accepted: id % 8 === 0 }]
      : []
  };
}
const snapshotRows = [];
for (let id = SNAP_TOP; id > SNAP_TOP - SNAP_N; id--) {
  snapshotRows.push({ chain: "base", id, raw: bountyJson(id), fetchedAt: Date.now() });
}
const snapshotBody = JSON.stringify({
  generatedAt: new Date().toISOString(),
  source: "https://poidh.xyz/[chain]/bounty/[id]/data",
  counts: { base: SNAP_N },
  bounties: snapshotRows
});

/* ---------------- server: snapshot works, live data is dead ---------------- */
let liveAttempts = 0, snapshotServed = 0;
const server = http.createServer((req, res) => {
  const p = new URL(req.url, "http://x").pathname;
  if (p === "/snapshot.json") {
    snapshotServed++;
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(snapshotBody);
  }
  // Every live read dies at the socket. In a browser this is indistinguishable
  // from a CORS rejection, which is the failure mode we actually expect.
  liveAttempts++;
  req.destroy();
  res.destroy();
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const ORIGIN = "http://127.0.0.1:" + server.address().port;

/* ---------------- boot ---------------- */
installGlobals();
mountIds(["barStats", "rail", "subhead", "loadbar", "notices", "sheet", "ledger", "loupe", "diag", "diagBody", "btnShare"]);
globalThis.POIDH_API_BASE = ORIGIN;

/* Browsers resolve "./snapshot.json" against the page origin; Node's fetch
   throws on a relative URL. Resolving here is what makes the shim faithful to
   the environment the app actually ships into. */
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
const C = globalThis.PoidhCore;
ok("core exported", !!C);

const t0 = Date.now();
while (doc._byId.loadbar.getAttribute("data-done") !== "1" && Date.now() - t0 < 60000) {
  await new Promise(r => setTimeout(r, 100));
}
ok("boot settles even with the live source dead", doc._byId.loadbar.getAttribute("data-done") === "1",
   (Date.now() - t0) + "ms elapsed");
console.log("   settled in " + (Date.now() - t0) + "ms  (live attempts: " + liveAttempts + ")");

const sheet = doc._byId.sheet;
const q = (root, sel) => root.querySelectorAll(sel);

/* ---------------- the sheet still shows real bounties ---------------- */
section("snapshot fallback");
eq("snapshot.json was requested", snapshotServed, 1);
ok("live reads were genuinely attempted and failed", liveAttempts > 0, String(liveAttempts));
eq("every snapshot bounty is on the sheet", q(sheet, ".frame").length, SNAP_N);
eq("no empty state when a snapshot is present", q(sheet, ".empty").length, 0);
eq("no skeletons left behind", q(sheet, ".skel").length, 0);
ok("frames carry snapshot titles",
   q(sheet, ".frame")[0].getAttribute("aria-label").includes("Snapshot bounty"),
   q(sheet, ".frame")[0].getAttribute("aria-label"));
eq("proof images survive the snapshot round-trip", q(sheet, "img").length, SNAP_N / 4);
eq("keeper ring still derives from accepted claims", q(sheet, ".keeper").length, SNAP_N / 8);

section("stats are computed from snapshot data");
{
  const txt = doc._byId.barStats.textContent;
  ok("bar counts the snapshot bounties", txt.includes(String(SNAP_N)), txt);
  ok("bar still totals a currency", /ETH posted/i.test(txt), txt);
  ok("ledger is populated", q(doc._byId.ledger, ".row").length > 4,
     String(q(doc._byId.ledger, ".row").length));
}

/* ---------------- honesty: the notice must not misattribute the source ---------------- */
section("failure notice accuracy");
{
  const n = doc._byId.notices.textContent;
  ok("a failure notice is shown", /Live read failed/i.test(n), n.slice(0, 200));
  ok("the notice points at the diagnostics panel", /Data sources/i.test(n), n.slice(0, 200));
  // The rows came from snapshot.json, not from a previous visit's cache.
  // Saying "from cache" here would be a false statement about provenance.
  ok("the notice credits the snapshot, not the cache",
     /snapshot/i.test(n) && !/from cache/i.test(n), n.slice(0, 300));
  ok("the notice does not claim the sheet is empty", !/sheet is empty/i.test(n), n.slice(0, 200));
}
section("diagnostics tell the truth about what failed");
{
  const d = doc._byId.diagBody.textContent;
  ok("diagnostics record the snapshot load", /snapshot/i.test(d), d.slice(0, 300));
  ok("diagnostics record the live failure", /fail|stopped|error/i.test(d), d.slice(0, 300));
}

/* ---------------- the app is still usable, not just visible ---------------- */
section("interaction still works offline");
{
  const opts = () => q(doc._byId.rail, ".opt");
  const findOpt = l => opts().find(o => o.textContent.includes(l));
  findOpt("Only developed frames").click();
  eq("proof filter works on snapshot data", q(sheet, ".frame").length, SNAP_N / 4);
  findOpt("Only developed frames").click();
  eq("toggling back restores the roll", q(sheet, ".frame").length, SNAP_N);

  const input = doc._byId.rail.querySelector("input");
  input.value = "bounty " + SNAP_TOP;
  input.dispatchEvent({ type: "input", target: input });
  await new Promise(r => setTimeout(r, 350));
  eq("search works on snapshot data", q(sheet, ".frame").length, 1);
  input.value = "";
  input.dispatchEvent({ type: "input", target: input });
  await new Promise(r => setTimeout(r, 350));
}
{
  const f = q(sheet, ".frame")[0];
  f.click();
  const lp = doc._byId.loupe;
  ok("loupe opens on a snapshot bounty", lp.hasAttribute("open"));
  ok("loupe still links out to poidh.xyz for transactions",
     q(lp, "a").some(a => (a.getAttribute("href") || "").startsWith("https://poidh.xyz/base/bounty/")),
     q(lp, "a").map(a => a.getAttribute("href")).join(" | "));
  ok("loupe shows the archived raw payload", /Raw response/i.test(lp.textContent));
  doc.dispatchEvent({ type: "keydown", key: "Escape" });
  ok("loupe closes", !lp.hasAttribute("open"));
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
