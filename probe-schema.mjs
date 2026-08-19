#!/usr/bin/env node
/* POIDH schema probe.
 *
 * WHY THIS EXISTS
 * The app's adapter (normalizeBounty) resolves each field by trying a list of
 * candidate key names, then falling back to a bounded deep search. That design
 * is deliberately schema-defensive because the real /data response shape could
 * not be inspected while the app was written (the build environment had no
 * network access).
 *
 * This script closes that gap. Run it anywhere with internet. It fetches real
 * bounties, runs the SHIPPED adapter on them, and tells you exactly which
 * fields resolved cleanly, which needed the deep-search fallback, and which
 * came back empty. Anything in the "NEEDS ATTENTION" section is a key list in
 * index.html that should be extended.
 *
 *   node probe-schema.mjs
 *   node probe-schema.mjs --chain base --ids 1,2,3,100
 *   node probe-schema.mjs --raw            # also dump one full raw payload
 *
 * Node 18+ (needs global fetch). No dependencies.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HTML = process.env.POIDH_HTML || path.join(HERE, "index.html");
const BASE = process.env.POIDH_API_BASE || "https://poidh.xyz";

/* ---- load the shipped core, verbatim ---- */
const src = fs.readFileSync(HTML, "utf8");
function extract(tag) {
  const m = src.match(new RegExp("/\\* @" + tag + "-begin \\*/([\\s\\S]*?)/\\* @" + tag + "-end \\*/"));
  if (!m) { console.error("Could not find @" + tag + " markers in " + HTML); process.exit(1); }
  return m[1];
}
new Function(extract("core"))();
new Function(extract("net"))();
const C = globalThis.PoidhCore, N = globalThis.PoidhNet;

/* ---- args ---- */
const args = process.argv.slice(2);
const arg = (k, d) => { const i = args.indexOf("--" + k); return i === -1 ? d : args[i + 1]; };
const DUMP_RAW = args.includes("--raw");
const CHAINS = arg("chain") ? [arg("chain")] : C.CHAIN_ORDER.slice();
const IDS = arg("ids") ? arg("ids").split(",").map(Number).filter(Boolean) : null;

const ds = N.createDataSource({ base: BASE, timeoutMs: 15000 });

/* Fields that must be right for the app to be worth looking at, and why. */
const CRITICAL = {
  title:      "frame captions and search",
  amountWei:  "reward sorting, per-currency totals, the leaderboards",
  issuer:     "the 'most bounties posted' board",
  status:     "the entire colour language (open / review / paid / cancelled)"
};
const IMPORTANT = {
  description: "the loupe detail view",
  claims:      "proof count, and whether a frame is developed or unexposed",
  proofImage:  "whether the sheet shows pictures at all",
  createdAt:   "newest/oldest sorting"
};

function shapeOf(v, depth = 0) {
  if (v === null) return "null";
  if (Array.isArray(v)) return depth > 1 ? "array(" + v.length + ")"
    : "[" + (v.length ? shapeOf(v[0], depth + 1) : "") + "]×" + v.length;
  if (typeof v === "object") {
    const ks = Object.keys(v);
    return depth > 1 ? "{" + ks.length + " keys}"
      : "{" + ks.slice(0, 14).join(",") + (ks.length > 14 ? ",…" : "") + "}";
  }
  if (typeof v === "string") return v.length > 42 ? "str(" + v.length + ")" : JSON.stringify(v);
  return String(v);
}

const problems = new Map();   // field -> Set(reason)
const note = (f, r) => { if (!problems.has(f)) problems.set(f, new Set()); problems.get(f).add(r); };

/* Per-field tallies. A single bounty legitimately having no description or no
   claims proves nothing; a field that resolves on NONE of the sample is what
   indicates a wrong key list. Verdicts are drawn at the end from these. */
const stat = {};
const tally = (f, resolved) => {
  stat[f] = stat[f] || { ok: 0, total: 0 };
  stat[f].total++;
  if (resolved) stat[f].ok++;
};

let anySuccess = false;
console.log("POIDH schema probe");
console.log("endpoint : " + BASE + "/[chain]/bounty/[id]/data");
console.log("adapter  : " + path.resolve(HTML));
console.log("");

for (const chain of CHAINS) {
  console.log("═".repeat(70));
  console.log("CHAIN: " + chain);
  console.log("═".repeat(70));

  let ids = IDS;
  if (!ids) {
    // Find the top of the range, then sample across it.
    process.stdout.write("  discovering highest bounty id … ");
    let maxId = 0;
    try {
      maxId = await C.discoverMaxId(id => ds.exists(chain, id), { max: 200000 });
    } catch (e) {
      console.log("failed (" + (e.code || e.message) + ")");
      note("_endpoint", chain + ": id discovery failed — " + (e.code || e.message));
      continue;
    }
    if (!maxId) { console.log("none found"); note("_endpoint", chain + ": no bounties found"); continue; }
    console.log(maxId);
    const picks = new Set([1, 2, maxId, maxId - 1, Math.ceil(maxId / 2), Math.ceil(maxId / 4), Math.ceil(maxId * 3 / 4)]);
    ids = [...picks].filter(n => n >= 1 && n <= maxId).sort((a, b) => a - b);
  }
  console.log("  sampling ids: " + ids.join(", ") + "\n");

  let dumped = false;
  for (const id of ids) {
    let r;
    try { r = await ds.get(chain, id); }
    catch (e) {
      console.log("  #" + id + "  ✗ " + (e.code || "error") + (e.status ? " (HTTP " + e.status + ")" : ""));
      if (e.code === "network-or-cors") note("_endpoint", chain + ": network/CORS failure");
      if (e.code === "unparseable") note("_endpoint", chain + ": response was not parseable JSON");
      continue;
    }
    anySuccess = true;
    const b = C.normalizeBounty(r.raw, chain, id);

    console.log("  #" + id + "  transport=" + r.how + "  " + r.ms + "ms");
    console.log("     raw top-level : " + shapeOf(r.raw));
    console.log("     title         : " + JSON.stringify(b.title));
    console.log("     amount        : " + (b.amountWei === null ? "‼ null" : b.amountDisplay + " " + b.currency
                                          + "  (" + b.amountWei + " wei)"));
    console.log("     issuer        : " + (b.issuer || "‼ null"));
    console.log("     status        : " + b.status + (b.status === "unknown" ? "  ‼" : ""));
    console.log("     claims        : " + b.claimCount + (b.claimCount ? "  proofImage=" + (b.proofImage ? "yes" : "‼ no") : ""));
    console.log("     createdAt     : " + (b.createdAt ? new Date(b.createdAt).toISOString().slice(0, 10) : "‼ null"));
    console.log("     multiplayer   : " + b.isMultiplayer);

    if (!b.title || /^Bounty #/.test(b.title)) note("title", "fell back to the placeholder 'Bounty #id'");
    tally("title", !!b.title && !/^Bounty #\d+$/.test(b.title));
    tally("amountWei", b.amountWei !== null);
    tally("issuer", !!b.issuer);
    tally("status", b.status !== "unknown");
    tally("description", !!b.description);
    tally("createdAt", !!b.createdAt);
    tally("claims", b.claimCount > 0);
    if (b.claimCount > 0) tally("proofImage", !!b.proofImage);

    if (DUMP_RAW && !dumped) {
      dumped = true;
      console.log("\n     ── full raw payload for #" + id + " ──");
      console.log(JSON.stringify(r.raw, null, 2).split("\n").map(l => "     " + l).join("\n"));
      console.log("     ── end raw payload ──\n");
    }
    console.log("");
  }
}

/* ---- verdict ---- */
console.log("═".repeat(70));
if (!anySuccess) {
  console.log("NO BOUNTY COULD BE READ.");
  console.log("");
  console.log("Either the endpoint pattern has changed, or this machine cannot reach it.");
  console.log("Check by hand:  curl -s " + BASE + "/base/bounty/1/data | head -c 400");
  console.log("If the shape is different, the fix is in ONE place: normalizeBounty()");
  console.log("in index.html. Add the real key names to the candidate lists there.");
  process.exit(1);
}

/* Draw conclusions from the tallies. */
const NEVER = [], SOMETIMES = [];
for (const [f, s] of Object.entries(stat)) {
  if (s.ok === 0) NEVER.push([f, s]);
  else if (s.ok < s.total) SOMETIMES.push([f, s]);
}
for (const [f, s] of NEVER) {
  if (f === "claims") note(f, "no bounty in the sample had any claims (0/" + s.total + ") — "
    + "plausible if none have proof yet, but verify the key name if the sheet looks empty");
  else if (f === "description") note(f, "empty on all " + s.total + " sampled bounties");
  else note(f, "never resolved — 0 of " + s.total + " sampled bounties");
}
for (const [f, s] of SOMETIMES) {
  if (f in CRITICAL) note(f, "resolved on only " + s.ok + " of " + s.total + " sampled bounties");
}

console.log("FIELD RESOLUTION");
for (const [f, s] of Object.entries(stat)) {
  const mark = s.ok === s.total ? "✓" : s.ok === 0 ? "✗" : "~";
  console.log("  " + mark + " " + f.padEnd(13) + s.ok + "/" + s.total);
}
console.log("");

const crit = [...problems.keys()].filter(k => k in CRITICAL);
const imp = [...problems.keys()].filter(k => k in IMPORTANT);
const other = [...problems.keys()].filter(k => k.startsWith("_"));

if (!problems.size) {
  console.log("NO SCHEMA PROBLEMS DETECTED.");
  console.log("Every field the app depends on resolved from the live payload.");
  console.log("(A partial tally like claims 1/7 is normal — it just means most of");
  console.log(" the sampled bounties have no proof submitted yet.)");
} else {
  console.log("NEEDS ATTENTION");
  console.log("");
  const show = (label, keys, map) => {
    if (!keys.length) return;
    console.log("  " + label);
    for (const k of keys) {
      console.log("    " + k + (map && map[k] ? "  — breaks: " + map[k] : ""));
      for (const r of problems.get(k)) console.log("        · " + r);
    }
    console.log("");
  };
  show("CRITICAL (the app is misleading without these)", crit, CRITICAL);
  show("IMPORTANT (features degrade)", imp, IMPORTANT);
  show("TRANSPORT", other, null);
  console.log("  How to fix: open index.html, find normalizeBounty() (or");
  console.log("  normalizeClaim / deriveStatus for claim and status fields), and add the");
  console.log("  real key names to that field's candidate array. Re-run this probe.");
  console.log("  Run --raw to see a full payload and read the real key names off it.");
}
console.log("═".repeat(70));
process.exit(crit.length || other.length ? 1 : 0);
