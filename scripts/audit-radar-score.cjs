/* Audit of lib/scoring/radarScore.ts v2 — measures the new continuous scoring engine.
   Run:  node scripts/audit-radar-score.cjs */
const path = require("path");
const REPO = process.env.REPO || path.resolve(__dirname, "..");
const jiti = require(path.join(REPO, "node_modules/jiti"))(REPO, { interopDefault: true, esmResolve: true });

const { calculateRadarScore } = jiti(path.join(REPO, "lib/scoring/radarScore.ts"));
const { loadSnapshotBounties } = jiti(path.join(REPO, "lib/poidh/client.ts"));

const NOW = Date.parse("2026-08-19T12:00:00Z");
const DAY = 86400000;
const eth = (n) => (BigInt(Math.round(n * 1e6)) * 10n ** 12n).toString();

function score(o) {
  return calculateRadarScore(
    {
      chain: o.chain || "base",
      amountWei: o.wei,
      currency: o.currency || "ETH",
      status: o.status || "open",
      claimCount: o.claims == null ? 0 : o.claims,
      createdAt: o.age == null ? null : NOW - o.age * DAY,
      isMultiplayer: !!o.mp,
      isVoting: !!o.voting,
      title: o.title || "Example Bounty Title",
      description: o.desc || "A decent bounty description for testing purposes.",
    },
    NOW
  );
}

const line = (s) => console.log(s);
const rule = (t) => line("\n" + "=".repeat(72) + "\n" + t + "\n" + "=".repeat(72));

/* ------------------------------------------------------------------ 1 */
rule("1. TRUE ATTAINABLE RANGE (brute force)");

const STATUSES = ["open", "review", "paid", "cancelled", "unknown"];
const AGES = [null, 0, 1, 2, 5, 7, 14, 30, 90, 180, 400];
const CLAIMS = [0, 1, 2, 3, 5, 10, 25, 100];
const AMOUNTS = [
  ["ETH", null], ["ETH", eth(0)], ["ETH", eth(0.001)], ["ETH", eth(0.01)],
  ["ETH", eth(0.05)], ["ETH", eth(0.1)], ["ETH", eth(0.5)], ["ETH", eth(1)], ["ETH", eth(10)],
  ["DEGEN", eth(100)], ["DEGEN", eth(1000)], ["DEGEN", eth(10000)], ["DEGEN", eth(100000)],
];

let min = { score: Infinity }, max = { score: -Infinity };
const seen = new Set();
let n = 0;
for (const status of STATUSES)
  for (const age of AGES)
    for (const claims of CLAIMS)
      for (const [currency, wei] of AMOUNTS) {
        const r = score({ status, age, claims, currency, wei });
        seen.add(r.score);
        n++;
        if (r.score < min.score) min = { score: r.score, status, age, claims, currency, wei };
        if (r.score > max.score) max = { score: r.score, status, age, claims, currency, wei };
      }

line(`combinations evaluated : ${n.toLocaleString()}`);
line(`lowest score reachable : ${min.score}   (${min.status}, age ${min.age}d, ${min.claims} claims, ${min.currency})`);
line(`highest score reachable: ${max.score}   (${max.status}, age ${max.age}d, ${max.claims} claims, ${max.currency})`);
line(`distinct integer scores: ${seen.size}`);
line(`score range coverage   : ${max.score - min.score} pts of 100`);

/* ------------------------------------------------------------------ 2 */
rule("2. IS COMPETITION STRICTLY MONOTONIC?");
line("claims | competition | total score (open, fresh, 0.1 ETH)");
let prevTotal = Infinity;
let monotonic = true;
for (const c of [0, 1, 2, 3, 4, 5, 7, 10, 15, 25, 50, 100]) {
  const r = score({ status: "open", age: 1, claims: c, wei: eth(0.1) });
  const b = r.breakdown;
  const ok = r.score <= prevTotal ? "✓" : "✗ INVERSION";
  if (r.score > prevTotal) monotonic = false;
  line(
    String(c).padStart(6) + " | " + String(b.competition).padStart(11) +
    " | " + String(r.score).padStart(3) + "  " + ok
  );
  prevTotal = r.score;
}
line(monotonic ? "\n✅ PASSED: Competition is strictly monotonic." : "\n❌ FAILED: Competition inversions detected!");

/* ------------------------------------------------------------------ 3 */
rule("3. CROSS-CHAIN USD PARITY (ETH $2,800 / DEGEN $0.008)");
line("        USD |  ETH pts | DEGEN pts | drift | verdict");
let maxDrift = 0;
for (const usd of [5, 10, 20, 50, 100, 280, 500, 1000, 2800]) {
  const e = score({ currency: "ETH", wei: eth(usd / 2800) }).breakdown.rewardMagnitude;
  const d = score({ currency: "DEGEN", wei: eth(usd / 0.008) }).breakdown.rewardMagnitude;
  const drift = Math.abs(e - d);
  maxDrift = Math.max(maxDrift, drift);
  line(
    ("$" + usd).padStart(11) + " | " + String(e.toFixed(1)).padStart(8) + " | " + String(d.toFixed(1)).padStart(9) +
    " | " + drift.toFixed(2).padStart(5) + " | " + (drift < 1 ? "✅ parity" : drift < 2 ? "⚠️ close" : "❌ drift")
  );
}
line(`\nMax drift: ${maxDrift.toFixed(2)} pts`);

/* ------------------------------------------------------------------ 4 */
rule("4. BEHAVIOUR ON THE REAL SNAPSHOT");
const bounties = loadSnapshotBounties();
line(`snapshot rows normalised: ${bounties.length}`);
if (bounties.length) {
  const scores = bounties.map((b) => b.radarScore);
  const uniq = new Set(scores);
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const sd = Math.sqrt(scores.reduce((a, b) => a + (b - mean) ** 2, 0) / scores.length);
  line(`distinct scores present  : ${uniq.size} across ${bounties.length} bounties`);
  line(`score range              : ${Math.min(...scores)}..${Math.max(...scores)}`);
  line(`mean ± sd                : ${mean.toFixed(1)} ± ${sd.toFixed(1)}`);
  line(`tie rate                 : ${((1 - uniq.size / bounties.length) * 100).toFixed(1)}%`);

  const counts = {};
  for (const s of scores) counts[s] = (counts[s] || 0) + 1;
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  line("top tie clusters         : " + top.map(([s, c]) => `${s}pts x${c}`).join(", "));

  const sorted = [...bounties].sort((a, b) => b.radarScore - a.radarScore);
  line("\ntop 12 by radar score:");
  for (const b of sorted.slice(0, 12))
    line(
      `  ${String(b.radarScore).padStart(3)}  ${b.status.padEnd(9)} ${b.chain.padEnd(9)} #${String(b.id).padEnd(5)} ` +
      `${String(b.amountDisplay + " " + b.currency).padEnd(16)} claims ${String(b.claimCount).padEnd(3)} ` +
      `${(b.title || "").slice(0, 34)}`
    );

  // Tag frequency
  const tagCounts = {};
  for (const b of bounties) for (const t of b.standoutTags) tagCounts[t] = (tagCounts[t] || 0) + 1;
  line(`\ntag frequency:`);
  for (const [t, c] of Object.entries(tagCounts).sort((a, b) => b[1] - a[1])) {
    const pct = ((c / bounties.length) * 100).toFixed(0);
    line(`  ${t}: ${c} (${pct}%) ${c === bounties.length ? "⚠️ 100% — meaningless" : ""}`);
  }
}

/* ------------------------------------------------------------------ 5 */
rule("5. SANITY PAIRS — does it rank the way a hunter would?");
const pairs = [
  [
    { label: "0.5 ETH, 45d old, 0 claims", wei: eth(0.5), age: 45, claims: 0 },
    { label: "0.002 ETH, 1d old, 0 claims", wei: eth(0.002), age: 1, claims: 0 },
    "High reward should beat fresh-but-tiny"
  ],
  [
    { label: "0.05 ETH, 1d, 0 claims (wide open)", wei: eth(0.05), age: 1, claims: 0 },
    { label: "0.05 ETH, 1d, 9 claims (crowded)", wei: eth(0.05), age: 1, claims: 9 },
    "Less competition should beat more"
  ],
  [
    { label: "0.05 ETH, 3d, OPEN", wei: eth(0.05), age: 3, claims: 0, status: "open" },
    { label: "0.05 ETH, 1d, PAID (dead)", wei: eth(0.05), age: 1, claims: 0, status: "paid" },
    "Open should beat paid"
  ],
  [
    { label: "0.02 ETH, 1d, 2 claims", wei: eth(0.02), age: 1, claims: 2 },
    { label: "0.02 ETH, 1d, 3 claims", wei: eth(0.02), age: 1, claims: 3 },
    "Fewer claims should beat more (monotonicity)"
  ],
];

for (const [a, b, reason] of pairs) {
  const sa = score(a).score, sb = score(b).score;
  const ok = sa >= sb ? "✅" : "❌ WRONG";
  line(`\n ${sa}  ${a.label}`);
  line(` ${sb}  ${b.label}`);
  line(`     gap ${sa - sb >= 0 ? "+" : ""}${sa - sb}  ${ok}  (${reason})`);
}

/* ------------------------------------------------------------------ 6 */
rule("6. weiToNumber ROBUSTNESS");
const { weiToNumber, formatWei } = jiti(path.join(REPO, "lib/utils/format.ts"));
for (const s of ["1000000000000000000", "1500000000000000000.0", "1e18", "0x16345785d8a0000", " 20000000000000000 "]) {
  const v = weiToNumber(s, 18);
  line(`  weiToNumber(${JSON.stringify(s)}) = ${v}   formatWei → ${formatWei(s, 18)}   rewardPts → ${score({ currency: "ETH", wei: s }).breakdown.rewardMagnitude.toFixed(1)}`);
}
