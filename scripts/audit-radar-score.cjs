/* Audit of lib/scoring/radarScore.ts — measures behaviour instead of trusting the docstring.
   Run:  node audit-score.cjs   (uses jiti from the repo's node_modules to load TS) */
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
    },
    NOW
  );
}

const line = (s) => console.log(s);
const rule = (t) => line("\n" + "=".repeat(72) + "\n" + t + "\n" + "=".repeat(72));

/* ------------------------------------------------------------------ 1 */
rule("1. TRUE ATTAINABLE RANGE  (brute force over the whole input grid)");

const STATUSES = ["open", "review", "paid", "cancelled", "unknown"];
const AGES = [null, 0, 1, 2, 2.01, 5, 7, 7.01, 10, 14, 20, 30, 45, 90, 120, 180, 200, 400, 1000];
const CLAIMS = Array.from({ length: 61 }, (_, i) => i).concat([100, 250, 1000]);
const AMOUNTS = [
  ["ETH", null], ["ETH", eth(0)], ["ETH", eth(0.0001)], ["ETH", eth(0.001)], ["ETH", eth(0.005)],
  ["ETH", eth(0.02)], ["ETH", eth(0.05)], ["ETH", eth(0.1)], ["ETH", eth(0.5)], ["ETH", eth(1)], ["ETH", eth(50)],
  ["DEGEN", eth(1)], ["DEGEN", eth(100)], ["DEGEN", eth(1000)], ["DEGEN", eth(5000)],
  ["DEGEN", eth(20000)], ["DEGEN", eth(50000)], ["DEGEN", eth(119000)], ["DEGEN", eth(5e6)],
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
line(`distinct integer scores: ${seen.size} of the 100 the UI advertises`);
line(`unreachable at the top : ${100 - max.score} points  (UI renders "${max.score} / 100" as if 100 were possible)`);

/* ------------------------------------------------------------------ 2 */
rule("2. DO 'OPPORTUNITY' AND 'ACTIVITY' ACTUALLY DISCRIMINATE?  (25 of 100 pts)");
line("claims | opportunity | activity | sum | total score (open, fresh, 0.1 ETH)");
const sums = [];
for (const c of [0, 1, 2, 3, 4, 5, 6, 7, 10, 15, 31, 100]) {
  const r = score({ status: "open", age: 1, claims: c, wei: eth(0.1) });
  const b = r.breakdown;
  sums.push({ c, sum: b.opportunity + b.activity, total: r.score });
  line(
    String(c).padStart(6) + " | " + String(b.opportunity).padStart(11) + " | " +
    String(b.activity).padStart(8) + " | " + String(b.opportunity + b.activity).padStart(3) +
    " | " + r.score
  );
}
const lo = Math.min(...sums.map((s) => s.sum)), hi = Math.max(...sums.map((s) => s.sum));
line(`\ncombined spread across the ENTIRE competition spectrum: ${lo}..${hi}  (${hi - lo} pts of the 25 allocated)`);
const inversions = [];
for (let i = 1; i < sums.length; i++)
  if (sums[i].sum > sums[i - 1].sum) inversions.push(`${sums[i - 1].c}->${sums[i].c} claims: ${sums[i - 1].sum} -> ${sums[i].sum}`);
line(inversions.length
  ? `NON-MONOTONIC — more competition scores HIGHER here:\n  ` + inversions.join("\n  ")
  : "monotonic: more competition never scores higher");

/* ------------------------------------------------------------------ 3 */
rule("3. CROSS-CHAIN FAIRNESS  (app's own fallbacks: ETH $2,800 / DEGEN $0.008)");
const ETH_USD = 2800, DEGEN_USD = 0.008;
line("        USD |  ETH pts | DEGEN pts | verdict");
for (const usd of [5, 10, 20, 40, 56, 100, 280, 500, 1000, 2800]) {
  const e = score({ currency: "ETH", wei: eth(usd / ETH_USD) }).breakdown.rewardMagnitude;
  const d = score({ currency: "DEGEN", wei: eth(usd / DEGEN_USD) }).breakdown.rewardMagnitude;
  line(
    ("$" + usd).padStart(11) + " | " + String(e).padStart(8) + " | " + String(d).padStart(9) +
    " | " + (e === d ? "equal" : d > e ? `DEGEN favoured by ${d - e}` : `ETH favoured by ${e - d}`)
  );
}
line("\nDEGEN curve: code comment vs actual");
for (const [amt, claimed] of [[100, 6], [1000, 14], [5000, 20], [20000, 26], [50000, 30]]) {
  const got = score({ currency: "DEGEN", wei: eth(amt) }).breakdown.rewardMagnitude;
  line(`  ${String(amt).padStart(6)} DEGEN  comment/doc says ${String(claimed).padStart(2)}  actual ${String(got).padStart(2)}  ${got === claimed ? "ok" : "MISMATCH"}`);
}

/* ------------------------------------------------------------------ 4 */
rule("4. BEHAVIOUR ON THE REAL SNAPSHOT");
const bounties = loadSnapshotBounties();
line(`snapshot rows normalised: ${bounties.length}`);
if (bounties.length) {
  const nullCreated = bounties.filter((b) => !b.createdAt).length;
  line(`rows with NO createdAt   : ${nullCreated} (${((nullCreated / bounties.length) * 100).toFixed(1)}%) -> freshness silently pinned to 8/25`);

  const byStatus = {};
  for (const b of bounties) byStatus[b.status] = (byStatus[b.status] || 0) + 1;
  line(`status mix               : ${JSON.stringify(byStatus)}`);

  const scores = bounties.map((b) => b.radarScore);
  const uniq = new Set(scores);
  line(`\ndistinct scores present  : ${uniq.size} across ${bounties.length} bounties`);
  const counts = {};
  for (const s of scores) counts[s] = (counts[s] || 0) + 1;
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  line("biggest tie clusters     : " + top.map(([s, c]) => `${s}pts x${c}`).join(", "));
  const biggest = top[0];
  line(`largest single tie       : ${biggest[1]} bounties (${((biggest[1] / bounties.length) * 100).toFixed(1)}%) share score ${biggest[0]} — ordered arbitrarily`);

  const sorted = [...bounties].sort((a, b) => b.radarScore - a.radarScore);
  const top20 = sorted.slice(0, 20);
  const notOpen = top20.filter((b) => b.status !== "open");
  line(`\ntop 20 by radar score    : ${top20.filter((b) => b.status === "open").length} open, ${notOpen.length} NOT actionable`);
  for (const b of top20.slice(0, 12))
    line(`  ${String(b.radarScore).padStart(3)}  ${b.status.padEnd(9)} ${b.chain.padEnd(9)} #${String(b.id).padEnd(5)} ${String(b.amountDisplay + " " + b.currency).padEnd(16)} claims ${String(b.claimCount).padEnd(3)} ${(b.title || "").slice(0, 34)}`);

  const openB = bounties.filter((b) => b.status === "open");
  if (openB.length) {
    const os = openB.map((b) => b.radarScore);
    line(`\nopen bounties            : ${openB.length}, score range ${Math.min(...os)}..${Math.max(...os)}, distinct ${new Set(os).size}`);
    const bestNonOpen = Math.max(...bounties.filter((b) => b.status !== "open").map((b) => b.radarScore));
    const openBelow = openB.filter((b) => b.radarScore < bestNonOpen).length;
    line(`best NON-open score      : ${bestNonOpen} -> outranks ${openBelow} of ${openB.length} genuinely claimable bounties (${((openBelow / openB.length) * 100).toFixed(0)}%)`);
  }

  const tagCounts = {};
  for (const b of bounties) for (const t of b.standoutTags) tagCounts[t] = (tagCounts[t] || 0) + 1;
  line(`\ntag frequency            : ${JSON.stringify(tagCounts)}`);
  const mp = bounties.filter((b) => b.isMultiplayer);
  const mpShown = mp.filter((b) => b.standoutTags.some((t) => /Multiplayer/.test(t))).length;
  line(`multiplayer bounties     : ${mp.length}, of which ${mpShown} actually show the Multiplayer tag (slice(0,3) drops the rest)`);
  const vt = bounties.filter((b) => b.isVoting || (b.status === "review" && b.claimCount > 0));
  const vtShown = vt.filter((b) => b.standoutTags.some((t) => /Review/.test(t))).length;
  line(`in-review/voting         : ${vt.length}, of which ${vtShown} show the Community In Review tag`);
} else {
  line("!! snapshot produced 0 rows — cannot measure real behaviour");
}

/* ------------------------------------------------------------------ 5 */
rule("5. TAG LABEL SANITY");
const gem = score({ status: "open", age: 1, claims: 0, wei: eth(0.5) });
line(`fresh, 0 claims, 0.5 ETH -> score ${gem.score}, tags ${JSON.stringify(gem.standoutTags)}`);
line(`  breakdown activity = ${gem.breakdown.activity}/10  <- "High Momentum" fires with zero activity`);

/* ------------------------------------------------------------------ 6 */
rule("6. weiToNumber ROBUSTNESS");
const { weiToNumber, formatWei } = jiti(path.join(REPO, "lib/utils/format.ts"));
for (const s of ["1000000000000000000", "1500000000000000000.0", "1e18", "0x16345785d8a0000", " 20000000000000000 "]) {
  const v = weiToNumber(s, 18);
  line(`  weiToNumber(${JSON.stringify(s)}) = ${v}   formatWei -> ${formatWei(s, 18)}   rewardPts -> ${score({ currency: "ETH", wei: s }).breakdown.rewardMagnitude}`);
}
