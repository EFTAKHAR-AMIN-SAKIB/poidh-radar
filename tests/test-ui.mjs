/* UI smoke test: executes the shipped UI script against a DOM shim and a
   localhost mock POIDH API, so runtime errors and render bugs surface without
   a browser. This verifies the code RUNS and builds the right structure; it
   does not verify visual appearance. */
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

/* ---------------- mock POIDH ---------------- */
const MAX_ID = 137;
function bountyJson(id) {
  return {
    id, title: "Bounty number " + id,
    description: "Prove it happened. #" + id,
    issuer: "0x" + String(id).padStart(40, "1"),
    amount: (BigInt(id) * 10n ** 16n).toString(),
    createdAt: 1700000000 + id * 60,
    claims: id % 3 === 0
      ? [{ id: id * 10, title: "proof " + id, issuer: "0x" + String(id).padStart(40, "2"),
           imageUrl: "ipfs://QmProof" + id, accepted: id % 6 === 0 }]
      : []
  };
}
const server = http.createServer((req, res) => {
  const m = new URL(req.url, "http://x").pathname.match(/^\/([a-z]+)\/bounty\/(\d+)\/data$/);
  if (!m) { res.writeHead(404); return res.end("no"); }
  const [, route, ids] = m, id = Number(ids);
  if (route !== "base" || id > MAX_ID) { res.writeHead(404); return res.end("nf"); }
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify(bountyJson(id)));
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const BASE = "http://127.0.0.1:" + server.address().port;

/* ---------------- boot the app ---------------- */
installGlobals();
mountIds(["barStats", "rail", "subhead", "loadbar", "notices", "sheet", "ledger", "loupe", "diag", "diagBody", "btnShare"]);
globalThis.POIDH_API_BASE = BASE;

import { HTML as src } from "./paths.mjs";
const blocks = [...src.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
eq("html contains exactly three inline scripts", blocks.length, 3);

for (const [i, code] of blocks.entries()) {
  try { new Function(code)(); }
  catch (e) { ok("script block " + (i + 1) + " evaluates", false, e.message); }
}
ok("core exported", !!globalThis.PoidhCore);
ok("net exported", !!globalThis.PoidhNet);
const C = globalThis.PoidhCore;

/* wait for the crawl to settle (progress() stamps data-done when finished) */
const t0 = Date.now();
while (doc._byId.loadbar.getAttribute("data-done") !== "1" && Date.now() - t0 < 30000) {
  await new Promise(r => setTimeout(r, 100));
}
ok("crawl finished within 30s", doc._byId.loadbar.getAttribute("data-done") === "1",
   (Date.now() - t0) + "ms elapsed");
console.log("   crawl+render completed in " + (Date.now() - t0) + "ms");

const sheet = doc._byId.sheet;
const q = (root, sel) => root.querySelectorAll(sel);

/* ---------------- structure ---------------- */
section("sheet structure");
eq("one frame per bounty", q(sheet, ".frame").length, MAX_ID);
eq("no skeletons left after load", q(sheet, ".skel").length, 0);
eq("no empty-state after a successful load", q(sheet, ".empty").length, 0);

const framesWithImg = q(sheet, "img").length;
eq("developed frames = bounties with a proof image", framesWithImg, Math.floor(MAX_ID / 3));
eq("unexposed frames = bounties without proof", q(sheet, ".unexposed").length, MAX_ID - Math.floor(MAX_ID / 3));
eq("unexposed + developed = all frames", q(sheet, ".unexposed").length + framesWithImg, MAX_ID);
eq("keeper ring only on paid frames", q(sheet, ".keeper").length, Math.floor(MAX_ID / 6));

{
  const f = q(sheet, ".frame")[0];
  ok("frame is a button (keyboard reachable)", f.tagName === "BUTTON", f.tagName);
  ok("frame has an aria-label", !!f.getAttribute("aria-label"));
  ok("frame carries its state", ["open", "review", "paid", "cancelled", "unknown"].includes(f.getAttribute("data-state")));
  eq("frame has a sprocket margin", q(f, ".sprock").length, 1);
  eq("frame has a caption", q(f, ".cap").length, 1);
  ok("frame number shown in sprocket", q(f, ".fno")[0].textContent.startsWith("#"));
}
{
  // default sort is reward-desc, so the richest (id 137) prints first
  const first = q(sheet, ".frame")[0];
  ok("richest bounty prints first", first.getAttribute("aria-label").includes("Bounty number " + MAX_ID),
     first.getAttribute("aria-label"));
}
{
  const un = q(sheet, ".unexposed")[0];
  eq("unexposed frame carries a latent title", q(un, ".latent-title").length, 1);
  ok("unexposed frame is stamped", q(un, ".stamp")[0].textContent === "not yet exposed",
     q(un, ".stamp")[0].textContent);
}
{
  const imgs = q(sheet, "img");
  ok("proof images resolve to https gateways",
     imgs.every(i => (i.getAttribute("src") || "").startsWith("https://")),
     imgs[0] && imgs[0].getAttribute("src"));
  ok("proof images are lazy", imgs.every(i => i.getAttribute("loading") === "lazy"));
  ok("proof images have alt text", imgs.every(i => !!i.getAttribute("alt")));
}

/* ---------------- XSS: untrusted strings must never become markup ---------------- */
section("untrusted content handling");
{
  const nasty = '<img src=x onerror=alert(1)>"\'&';
  const b = C.normalizeBounty({ id: 999, title: nasty, description: nasty,
    claims: [{ id: 1, title: nasty, imageUrl: "javascript:alert(1)" }] }, "base", 999);
  eq("javascript: image url rejected", b.proofImage, null);
  eq("title preserved verbatim as data", b.title, nasty);
  // render it and confirm nothing was parsed as HTML
  const before = q(sheet, ".frame").length;
  ok("adapter kept the payload inert", b.proofImage === null && b.title.includes("<img"));
  eq("sheet unchanged by normalisation alone", q(sheet, ".frame").length, before);
  const anyRawHtml = q(sheet, ".frame").some(f => (f.innerHTML || "").includes("onerror"));
  ok("no frame contains raw event-handler markup", !anyRawHtml);
}

/* ---------------- bar + ledger ---------------- */
section("bar and ledger");
{
  const stats = doc._byId.barStats.children;
  ok("bar shows stats", stats.length >= 3, "got " + stats.length);
  const txt = doc._byId.barStats.textContent;
  ok("bar mentions frame count", txt.includes(String(MAX_ID)), txt);
  ok("bar reports a currency total", /ETH posted/i.test(txt), txt);
}
{
  const led = doc._byId.ledger;
  ok("ledger is visible after load", led.hidden === false);
  eq("four ledger boards", q(led, ".board").length, 4);
  const t = led.textContent;
  ok("ledger names the biggest-reward board", t.includes("Biggest rewards"));
  ok("ledger names the funder board", t.includes("Most bounties posted"));
  ok("ledger lists rows", q(led, ".row").length > 4, String(q(led, ".row").length));
}
{
  const sub = doc._byId.subhead.textContent;
  ok("subhead reports the count", sub.includes(String(MAX_ID)), sub);
  ok("subhead names the chain scope", /chain/i.test(sub), sub);
}

/* ---------------- diagnostics ---------------- */
section("diagnostics");
{
  const d = doc._byId.diagBody.textContent;
  ok("diagnostics report the cache backend", d.includes("memory"), d.slice(0, 200));
  ok("diagnostics report onchain state", d.includes("not configured"), d.slice(0, 200));
  ok("diagnostics report the discovered max id", d.includes(String(MAX_ID)), d.slice(0, 300));
}

/* ---------------- filters ---------------- */
section("filter interactions");
function opts() { return q(doc._byId.rail, ".opt"); }
function findOpt(label) { return opts().find(o => o.textContent.includes(label)); }

{
  const paidOpt = findOpt("Fixed");
  ok("status filter for paid exists", !!paidOpt);
  paidOpt.click();
  eq("filtering to paid shows only paid frames", q(sheet, ".frame").length, Math.floor(MAX_ID / 6));
  eq("every shown frame is paid", q(sheet, ".frame").filter(f => f.getAttribute("data-state") === "paid").length,
     Math.floor(MAX_ID / 6));
  ok("url records the filter", loc.hash.includes("s=paid"), loc.hash);
  findOpt("Fixed").click();  // toggle back off
  eq("un-toggling restores the full roll", q(sheet, ".frame").length, MAX_ID);
}
{
  const proofOpt = findOpt("Only developed frames");
  ok("proof-only toggle exists", !!proofOpt);
  proofOpt.click();
  eq("proof-only shows only developed frames", q(sheet, ".frame").length, Math.floor(MAX_ID / 3));
  eq("no unexposed frames remain", q(sheet, ".unexposed").length, 0);
  findOpt("Only developed frames").click();
  eq("toggling back restores everything", q(sheet, ".frame").length, MAX_ID);
}
{
  // All three chains start selected, so a click DESELECTS. Narrow to Degen
  // (which the mock serves nothing for) by dropping the other two.
  findOpt("Base").click();
  eq("deselecting Base hides its frames", q(sheet, ".frame").length, 0);
  eq("empty-state explains itself", q(sheet, ".empty").length, 1);
  ok("empty-state names the reason", /No frames match/i.test(q(sheet, ".empty")[0].textContent),
     q(sheet, ".empty")[0].textContent.slice(0, 120));
  ok("url records the surviving chains", /c=degen%2Carbitrum|c=degen,arbitrum/.test(loc.hash), loc.hash);
  findOpt("Base").click();
  eq("reselecting Base restores the roll", q(sheet, ".frame").length, MAX_ID);

  // "never show nothing": dropping the last chain falls back to all chains
  findOpt("Base").click(); findOpt("Degen").click(); findOpt("Arbitrum").click();
  eq("deselecting every chain falls back to all", q(sheet, ".frame").length, MAX_ID);
  eq("fallback clears the chain filter from the url", /c=/.test(loc.hash), false);
}
{
  const input = doc._byId.rail.querySelector("input");
  ok("search field present", !!input);
  input.value = "number 50";
  input.dispatchEvent({ type: "input", target: input });
  await new Promise(r => setTimeout(r, 350));
  eq("search narrows to one frame", q(sheet, ".frame").length, 1);
  ok("the right frame matched", q(sheet, ".frame")[0].getAttribute("aria-label").includes("Bounty number 50"));

  const input2 = doc._byId.rail.querySelector("input");
  input2.value = "";
  input2.dispatchEvent({ type: "input", target: input2 });
  await new Promise(r => setTimeout(r, 350));
  eq("clearing search restores the roll", q(sheet, ".frame").length, MAX_ID);
}
{
  const sel = doc._byId.rail.querySelector("select");
  ok("sort control present", !!sel);
  sel.value = "id-asc";
  sel.dispatchEvent({ type: "change", target: sel });
  ok("sorting by frame number puts #1 first",
     q(sheet, ".frame")[0].getAttribute("aria-label").includes("Bounty number 1 "),
     q(sheet, ".frame")[0].getAttribute("aria-label"));
  const sel2 = doc._byId.rail.querySelector("select");
  sel2.value = "reward-desc";
  sel2.dispatchEvent({ type: "change", target: sel2 });
}
{
  const mins = doc._byId.rail.querySelectorAll("input").filter(i => i.getAttribute("inputmode") === "decimal");
  ok("minimum-reward field present", mins.length === 1);
  mins[0].value = "1";
  mins[0].dispatchEvent({ type: "input", target: mins[0] });
  await new Promise(r => setTimeout(r, 400));
  // amounts are id * 0.01, so >= 1 ETH means id >= 100
  eq("minimum reward filters correctly", q(sheet, ".frame").length, MAX_ID - 99);
  const m2 = doc._byId.rail.querySelectorAll("input").filter(i => i.getAttribute("inputmode") === "decimal")[0];
  m2.value = "";
  m2.dispatchEvent({ type: "input", target: m2 });
  await new Promise(r => setTimeout(r, 400));
  eq("clearing minimum restores the roll", q(sheet, ".frame").length, MAX_ID);
}
{
  const clear = q(doc._byId.rail, ".btn").find(b => b.textContent === "Clear filters");
  ok("clear-filters button present", !!clear);
  findOpt("Fixed").click();
  q(doc._byId.rail, ".btn").find(b => b.textContent === "Clear filters").click();
  eq("clear filters restores the full roll", q(sheet, ".frame").length, MAX_ID);
  eq("clear filters empties the url state", loc.hash, "");
}

/* ---------------- loupe ---------------- */
section("loupe detail view");
{
  const paidFrame = q(sheet, ".frame").find(f => f.getAttribute("data-state") === "paid");
  ok("found a paid frame to open", !!paidFrame);
  paidFrame.click();
  const lp = doc._byId.loupe;
  ok("loupe opens", lp.hasAttribute("open"));
  const t = lp.textContent;
  ok("loupe shows the title", /Bounty number \d+/.test(t), t.slice(0, 120));
  ok("loupe shows the reward", /reward/i.test(t));
  ok("loupe shows the poster address", /posted by/i.test(t));
  ok("loupe links out to poidh.xyz",
     q(lp, "a").some(a => (a.getAttribute("href") || "").startsWith("https://poidh.xyz/base/bounty/")),
     q(lp, "a").map(a => a.getAttribute("href")).join(" | "));
  eq("accepted proof is marked", q(lp, ".proof.accepted").length, 1);
  ok("loupe includes the raw response", /Raw response/i.test(t));
  ok("body scroll locked while open", doc.body.style.overflow === "hidden");
  ok("url records the open bounty", loc.hash.includes("b=base"), loc.hash);

  doc.dispatchEvent({ type: "keydown", key: "Escape" });
  ok("Escape closes the loupe", !lp.hasAttribute("open"));
  ok("body scroll restored", doc.body.style.overflow === "");
  ok("url drops the open bounty", !loc.hash.includes("b=base"), loc.hash);
}
{
  // an unexposed bounty should say so rather than showing a broken gallery
  const openFrame = q(sheet, ".frame").find(f => f.getAttribute("data-state") === "open");
  openFrame.click();
  const t = doc._byId.loupe.textContent;
  ok("unexposed bounty explains the absence of proof", /No proof yet/i.test(t), t.slice(0, 200));
  eq("no proof tiles rendered", q(doc._byId.loupe, ".proof").length, 0);
  doc.dispatchEvent({ type: "keydown", key: "Escape" });
}
{
  // deep link restore
  const key = "base:" + MAX_ID;
  loc.hash = "#b=" + encodeURIComponent(key);
  win.dispatchEvent({ type: "hashchange" });
  ok("deep link reopens a bounty", doc._byId.loupe.hasAttribute("open"));
  ok("deep-linked bounty is the right one", doc._byId.loupe.textContent.includes("Bounty number " + MAX_ID));
  doc.dispatchEvent({ type: "keydown", key: "Escape" });
}

/* ---------------- share ---------------- */
section("share link");
{
  const btn = doc._byId.btnShare;
  btn.textContent = "Copy view link";
  btn.dispatchEvent({ type: "click", target: btn });
  await new Promise(r => setTimeout(r, 30));
  ok("share button confirms the copy", btn.textContent === "Link copied", btn.textContent);
}

/* ---------------- errors ---------------- */
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
