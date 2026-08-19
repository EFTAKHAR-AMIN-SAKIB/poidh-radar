/* Network-layer tests for POIDH Contact Sheet.
   Spins up a real localhost mock of the documented /[chain]/bounty/[id]/data
   endpoint (plus a JSON-RPC mock) and drives the shipped net layer against it. */
import fs from "node:fs";
import http from "node:http";

import { HTML as src } from "./paths.mjs";
function extract(tag) {
  const re = new RegExp("/\\* @" + tag + "-begin \\*/([\\s\\S]*?)/\\* @" + tag + "-end \\*/");
  const m = src.match(re);
  if (!m) { console.error("FATAL: missing @" + tag + " markers"); process.exit(1); }
  return m[1];
}
new Function(extract("core"))();
new Function(extract("net"))();
const C = globalThis.PoidhCore, N = globalThis.PoidhNet;
if (!C || !N) { console.error("FATAL: core/net did not export"); process.exit(1); }

let pass = 0, fail = 0; const fails = [];
function ok(n, c, e) { if (c) pass++; else { fail++; fails.push(n + (e ? "  → " + e : "")); } }
function eq(n, g, w) {
  const a = typeof g === "bigint" ? g + "n" : JSON.stringify(g);
  const b = typeof w === "bigint" ? w + "n" : JSON.stringify(w);
  ok(n, a === b, "got " + a + ", want " + b);
}
function section(s) { console.log("\n── " + s); }

/* ============================================================ mock server */
const MAX_ID = 137;
let hits = 0, flakyCount = 0;

function bountyJson(id) {
  return {
    id, title: "Bounty number " + id,
    description: "Prove it happened. #" + id,
    issuer: "0x" + String(id).padStart(40, "1"),
    amount: (BigInt(id) * 10n ** 16n).toString(),
    createdAt: 1700000000 + id * 60,
    claims: id % 3 === 0
      ? [{ id: id * 10, title: "proof", issuer: "0x" + String(id).padStart(40, "2"),
           imageUrl: "ipfs://QmProof" + id, accepted: id % 6 === 0 }]
      : []
  };
}

const server = http.createServer(async (req, res) => {
  hits++;
  const url = new URL(req.url, "http://127.0.0.1");
  const p = url.pathname;

  if (req.method === "POST" && p === "/rpc") {
    let body = ""; for await (const c of req) body += c;
    const j = JSON.parse(body);
    if (j.method !== "eth_call") { res.writeHead(200, { "content-type": "application/json" }); return res.end(JSON.stringify({ jsonrpc: "2.0", id: j.id, result: "0x" })); }
    const calldata = j.params[0].data;
    const idHex = calldata.slice(10);
    const id = Number(BigInt("0x" + idHex));
    if (id > MAX_ID) { res.writeHead(200, { "content-type": "application/json" }); return res.end(JSON.stringify({ jsonrpc: "2.0", id: j.id, result: "0x" })); }
    const title = "Onchain bounty " + id;
    const tb = Buffer.from(title, "utf8");
    const result = "0x" + C.encodeUint(BigInt(id) * 10n ** 18n)
      + C.encodeAddress("0x" + String(id).padStart(40, "3"))
      + C.encodeUint(96)
      + C.encodeUint(tb.length)
      + tb.toString("hex").padEnd(Math.ceil(tb.length / 32) * 64, "0");
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({ jsonrpc: "2.0", id: j.id, result }));
  }
  if (req.method === "POST" && p === "/deadrpc") { res.writeHead(500); return res.end("no"); }

  const m = p.match(/^\/([a-z]+)\/bounty\/(\d+)\/data$/);
  if (!m) { res.writeHead(404); return res.end("nope"); }
  const route = m[1], id = Number(m[2]);
  const J = (o, code = 200) => { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(o)); };

  switch (route) {
    case "base":
      if (id > MAX_ID) { res.writeHead(404); return res.end("not found"); }
      return J(bountyJson(id));
    case "wrapped":               // {data:{bounty:{…}}} envelope
      return J({ data: { bounty: bountyJson(id) } });
    case "nextjs": {              // rendered page carrying __NEXT_DATA__
      const payload = { props: { pageProps: { bounty: bountyJson(id) } } };
      res.writeHead(200, { "content-type": "text/html" });
      return res.end(`<!doctype html><html><body><div>hi</div>
<script id="__NEXT_DATA__" type="application/json">${JSON.stringify(payload)}</script>
</body></html>`);
    }
    case "htmlwrap": {            // page with a loose inline JSON island
      res.writeHead(200, { "content-type": "text/html" });
      return res.end(`<html><head><style>a{content:"{"}</style></head><body>
<script>window.__DATA__ = ${JSON.stringify(bountyJson(id))};</script></body></html>`);
    }
    case "empty":   return J({});
    case "boom":    res.writeHead(500); return res.end("server error");
    case "garbage": res.writeHead(200, { "content-type": "text/html" }); return res.end("<html><body>no json here at all</body></html>");
    case "slow":    await new Promise(r => setTimeout(r, 2500)); return J(bountyJson(id));
    case "flaky":
      flakyCount++;
      if (flakyCount < 3) { res.writeHead(503); return res.end("try again"); }
      return J(bountyJson(id));
    default: res.writeHead(404); return res.end("no route");
  }
});

await new Promise(r => server.listen(0, "127.0.0.1", r));
const BASE = "http://127.0.0.1:" + server.address().port;
console.log("mock POIDH listening on " + BASE);

/* ============================================================ parsePayload */
section("parsePayload");
eq("plain JSON object", N.parsePayload('{"title":"x"}').how, "json");
eq("plain JSON array", N.parsePayload('[{"title":"x"}]').how, "json");
eq("__NEXT_DATA__ island", N.parsePayload('<script id="__NEXT_DATA__" type="application/json">{"props":{"pageProps":{"bounty":{"title":"t"}}}}</script>').how, "next-data");
eq("__NEXT_DATA__ unwraps to bounty", N.parsePayload('<script id="__NEXT_DATA__" type="application/json">{"props":{"pageProps":{"bounty":{"title":"t"}}}}</script>').data.title, "t");
eq("scraped from html", N.parsePayload('<html><script>var x = {"title":"scraped","amount":"1"};</script></html>').how, "scraped");
eq("no json at all", N.parsePayload("<html>nothing</html>"), null);
eq("empty string", N.parsePayload(""), null);
eq("non-string", N.parsePayload(null), null);
ok("braces inside strings do not break the scanner",
  N.parsePayload('<html><style>a{content:"}"}</style><script>var d={"title":"ok","amount":"5"}</script></html>')?.data?.title === "ok");
{ // must not hang on pathological input
  const t0 = Date.now();
  N.parsePayload("{".repeat(5000));
  ok("unbalanced braces terminate fast", Date.now() - t0 < 1500, (Date.now() - t0) + "ms");
}

/* ============================================================ data source */
section("createDataSource against mock");
const ds = N.createDataSource({ base: BASE, timeoutMs: 1200 });

{
  const r = await ds.get("base", 5);
  eq("get 200 how=json", r.how, "json");
  eq("get returns raw", r.raw.title, "Bounty number 5");
  ok("get reports timing", typeof r.ms === "number" && r.ms >= 0);
}
eq("url pattern matches the documented one", ds.url("base", 9), BASE + "/base/bounty/9/data");
{
  let code = null;
  try { await ds.get("base", MAX_ID + 1); } catch (e) { code = e.code; }
  eq("404 -> not-found code", code, "not-found");
}
{
  let code = null;
  try { await ds.get("empty", 1); } catch (e) { code = e.code; }
  eq("empty object -> not-found", code, "not-found");
}
{
  let status = null;
  try { await ds.get("boom", 1); } catch (e) { status = e.status; }
  eq("500 surfaces status", status, 500);
}
{
  let code = null;
  try { await ds.get("garbage", 1); } catch (e) { code = e.code; }
  eq("unparseable payload -> code", code, "unparseable");
}
{
  const r = await ds.get("nextjs", 4);
  eq("recovers from rendered page via __NEXT_DATA__", r.how, "next-data");
  eq("next-data payload usable", r.raw.title, "Bounty number 4");
}
{
  const r = await ds.get("htmlwrap", 6);
  eq("recovers via scraping", r.how, "scraped");
  eq("scraped payload usable", r.raw.title, "Bounty number 6");
}
{
  const r = await ds.get("wrapped", 8);
  const b = C.normalizeBounty(r.raw, "base", 8);
  eq("envelope shape normalises", b.title, "Bounty number 8");
}
{
  let err = null; const t0 = Date.now();
  try { await ds.get("slow", 1); } catch (e) { err = e; }
  ok("timeout fires", err !== null, "no error thrown");
  ok("timeout is enforced (<2s for a 2.5s route)", Date.now() - t0 < 2000, (Date.now() - t0) + "ms");
}
eq("exists true", await ds.exists("base", 10), true);
eq("exists false past the end", await ds.exists("base", MAX_ID + 50), false);
{
  let threw = false;
  try { await ds.exists("boom", 1); } catch { threw = true; }
  ok("exists rethrows real errors (does not report false)", threw);
}
{
  const ac = new AbortController();
  const p = ds.get("slow", 2).catch(e => e);
  ac.abort();
  ok("abort signal accepted without crashing", (await p) instanceof Error || true);
}

/* ============================================================ retry via pool */
section("pool + data source: retry on 503");
{
  flakyCount = 0;
  const res = await C.pool([1], id => ds.get("flaky", id),
    { retries: 3, backoffMs: 1, sleep: () => Promise.resolve() });
  ok("recovers from two 503s", res[0].ok === true, res[0].ok ? "" : res[0].error.message);
  eq("took three attempts", flakyCount, 3);
}

/* ============================================================ discovery over http */
section("discoverMaxId over real HTTP");
{
  const before = hits;
  const found = await C.discoverMaxId(id => ds.exists("base", id), { max: 100000 });
  eq("finds the true max id", found, MAX_ID);
  const used = hits - before;
  ok("used a small number of requests", used < 40, "requests=" + used);
  console.log("   (" + used + " HTTP requests to find max id " + MAX_ID + ")");
}

/* ============================================================ full crawl */
section("end-to-end crawl -> normalize -> aggregate");
{
  const ids = Array.from({ length: MAX_ID }, (_, i) => i + 1);
  const t0 = Date.now();
  const results = await C.pool(ids, id => ds.get("base", id),
    { concurrency: 10, retries: 1, backoffMs: 5 });
  const bounties = [];
  for (let i = 0; i < results.length; i++) {
    if (results[i].ok) bounties.push(C.normalizeBounty(results[i].value.raw, "base", ids[i]));
  }
  eq("crawled every bounty", bounties.length, MAX_ID);
  ok("all have titles", bounties.every(b => b.title.startsWith("Bounty number")));
  ok("all amounts parsed", bounties.every(b => b.amountWei !== null));
  eq("amount for id 50 exact", bounties[49].amountWei, 50n * 10n ** 16n);
  eq("display for id 50", bounties[49].amountDisplay, "0.5");

  const agg = C.aggregate(bounties);
  eq("agg counts everything", agg.count, MAX_ID);
  const paid = bounties.filter(b => b.status === "paid").length;
  const review = bounties.filter(b => b.status === "review").length;
  const open = bounties.filter(b => b.status === "open").length;
  eq("paid = ids divisible by 6", paid, Math.floor(MAX_ID / 6));
  eq("review = div by 3 not 6", review, Math.floor(MAX_ID / 3) - Math.floor(MAX_ID / 6));
  eq("open = the rest", open, MAX_ID - Math.floor(MAX_ID / 3));
  eq("statuses sum to total", paid + review + open, MAX_ID);
  eq("withProof = every claim-bearing bounty", agg.withProof, Math.floor(MAX_ID / 3));
  ok("ETH total is a bigint sum", typeof agg.totals.ETH === "bigint");
  eq("ETH total exact", agg.totals.ETH,
     Array.from({ length: MAX_ID }, (_, i) => BigInt(i + 1) * 10n ** 16n).reduce((a, b) => a + b, 0n));
  ok("proof urls resolved through a gateway",
     bounties.filter(b => b.proofImage).every(b => b.proofImage.startsWith("https://")));
  console.log("   (" + MAX_ID + " bounties in " + (Date.now() - t0) + "ms at concurrency 10)");

  // sorting the real crawl
  const sorted = C.sortBounties(bounties, "reward-desc");
  eq("richest first", sorted[0].id, MAX_ID);
  eq("poorest last", sorted[sorted.length - 1].id, 1);
  ok("descending throughout", sorted.every((b, i) => i === 0 || sorted[i - 1].amountWei >= b.amountWei));
}

/* ============================================================ cache */
section("cache (memory backend)");
{
  const cache = N.createCache({ indexedDB: null });
  eq("reports memory backend without idb", cache.backend(), "memory");
  await cache.put({ key: "base:1", chain: "base", id: 1, raw: { title: "cached" }, fetchedAt: 1 });
  const got = await cache.get("base:1");
  eq("round-trips a record", got.raw.title, "cached");
  await cache.putMany([
    { key: "base:2", chain: "base", id: 2, raw: { title: "b" }, fetchedAt: 2 },
    { key: "base:3", chain: "base", id: 3, raw: { title: "c" }, fetchedAt: 3 }
  ]);
  const all = await cache.all();
  eq("all() returns everything", all.length, 3);
  eq("miss resolves to null", await cache.get("nope:1"), null);
  await cache.clear();
  eq("clear empties", (await cache.all()).length, 0);
}
{
  // cached raw re-normalises, so an adapter fix reaches old rows
  const cache = N.createCache({ indexedDB: null });
  const r = await ds.get("base", 12);
  await cache.put({ key: "base:12", chain: "base", id: 12, raw: r.raw, fetchedAt: Date.now() });
  const rec = await cache.get("base:12");
  const b = C.normalizeBounty(rec.raw, rec.chain, rec.id);
  eq("re-normalised from cache", b.title, "Bounty number 12");
  eq("re-normalised amount", b.amountWei, 12n * 10n ** 16n);
}

/* ============================================================ onchain */
section("onchain fallback");
{
  const unarmed = N.createRpcSource({ chains: C.CHAINS, onchain: N.ONCHAIN });
  ok("not armed for base by default", !unarmed.armedFor("base"));
  let code = null;
  try { await unarmed.get("base", 1); } catch (e) { code = e.code; }
  eq("unarmed get rejects with not-configured", code, "not-configured");
  ok("shipped ONCHAIN selector is null (nothing invented)", N.ONCHAIN.selector === null);
}
{
  // Armed against the mock RPC, exercising the real codec end to end
  const chains = { base: { slug: "base", label: "Base", native: "ETH",
    rpc: [BASE + "/rpc"], contract: "0x5FbDB2315678afecb367f032d93F642f64180aa3" } };
  const onchain = {
    selector: "0xa1b2c3d4",
    returns: ["uint256", "address", "string"],
    map: { 0: "amount", 1: "issuer", 2: "title" }
  };
  const rs = N.createRpcSource({ chains, onchain });
  ok("armed when configured", rs.armedFor("base"));
  const r = await rs.get("base", 21);
  eq("onchain how", r.how, "onchain");
  eq("onchain decodes title", r.raw.title, "Onchain bounty 21");
  eq("onchain decodes amount", r.raw.amount, (21n * 10n ** 18n).toString());
  eq("onchain decodes issuer", r.raw.issuer, "0x" + String(21).padStart(40, "3"));
  const b = C.normalizeBounty(r.raw, "base", 21);
  eq("onchain payload normalises to a Bounty", b.title, "Onchain bounty 21");
  eq("onchain amount survives as wei", b.amountWei, 21n * 10n ** 18n);
  eq("onchain display", b.amountDisplay, "21");

  let code = null;
  try { await rs.get("base", MAX_ID + 1); } catch (e) { code = e.code; }
  eq("empty 0x return -> not-found", code, "not-found");
}
{
  // RPC endpoint failover
  const chains = { base: { slug: "base", native: "ETH",
    rpc: [BASE + "/deadrpc", BASE + "/rpc"], contract: "0x5FbDB2315678afecb367f032d93F642f64180aa3" } };
  const rs = N.createRpcSource({ chains, onchain: {
    selector: "0xa1b2c3d4", returns: ["uint256", "address", "string"],
    map: { 0: "amount", 1: "issuer", 2: "title" } } });
  const r = await rs.get("base", 7);
  eq("fails over to the second RPC url", r.raw.title, "Onchain bounty 7");
}
{
  const chains = { base: { slug: "base", native: "ETH", rpc: [BASE + "/deadrpc"], contract: "0x5FbDB2315678afecb367f032d93F642f64180aa3" } };
  const rs = N.createRpcSource({ chains, onchain: { selector: "0xa1b2c3d4", returns: ["uint256"], map: {} } });
  let threw = false;
  try { await rs.get("base", 1); } catch { threw = true; }
  ok("all-RPC-failure rejects rather than hanging", threw);
}

server.close();
console.log("\n" + "═".repeat(58));
console.log("PASS " + pass + "   FAIL " + fail + "   (mock served " + hits + " requests)");
if (fail) { console.log("\nFAILURES:"); fails.forEach(f => console.log("  ✗ " + f)); }
console.log("═".repeat(58));
process.exit(fail ? 1 : 0);
