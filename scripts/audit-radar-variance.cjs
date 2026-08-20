/* Second pass: how much does each dimension actually explain on real data?
   If one dimension dominates, the "5-dimension score" is that dimension in a lab coat. */
const path = require("path");
const REPO = process.env.REPO || path.resolve(__dirname, "..");
const jiti = require(path.join(REPO, "node_modules/jiti"))(REPO, { interopDefault: true, esmResolve: true });
const { loadSnapshotBounties } = jiti(path.join(REPO, "lib/poidh/client.ts"));

const B = loadSnapshotBounties();
const line = (s) => console.log(s);
const rule = (t) => line("\n" + "=".repeat(72) + "\n" + t + "\n" + "=".repeat(72));

const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const sd = (a) => { const m = mean(a); return Math.sqrt(mean(a.map((v) => (v - m) ** 2))); };
function pearson(a, b) {
  const ma = mean(a), mb = mean(b);
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < a.length; i++) { num += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2; }
  return da && db ? num / Math.sqrt(da * db) : 0;
}
function rank(a) {
  const idx = a.map((v, i) => [v, i]).sort((x, y) => x[0] - y[0]);
  const r = new Array(a.length);
  let i = 0;
  while (i < idx.length) { let j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    const avg = (i + j) / 2 + 1; for (let k = i; k <= j; k++) r[idx[k][1]] = avg; i = j + 1; }
  return r;
}
const spearman = (a, b) => pearson(rank(a), rank(b));

rule(`VARIANCE DECOMPOSITION over the ${B.length} real bounties in the snapshot`);
const DIMS = [["freshness", 25], ["rewardMagnitude", 30], ["statusScore", 20], ["opportunity", 15], ["activity", 10]];
const total = B.map((b) => b.radarScore);
line(`total score: mean ${mean(total).toFixed(1)}  sd ${sd(total).toFixed(2)}  range ${Math.min(...total)}..${Math.max(...total)}`);
line("");
line("dimension        | budget | observed range | sd    | share of score movement");
let sdSum = 0;
const rows = DIMS.map(([k, budget]) => {
  const v = B.map((b) => b.radarBreakdown[k]);
  const s = sd(v); sdSum += s;
  return { k, budget, lo: Math.min(...v), hi: Math.max(...v), s, uniq: new Set(v).size };
});
for (const r of rows)
  line(`${r.k.padEnd(16)} | ${String(r.budget).padStart(6)} | ${String(r.lo + ".." + r.hi).padStart(14)} | ${r.s.toFixed(2).padStart(5)} | ${((r.s / sdSum) * 100).toFixed(1)}%  ${r.s === 0 ? "<-- CONSTANT, contributes nothing" : ""}`);
line(`\nbudget says reward+freshness = 55% of the score; measured movement says they are ${(((rows[0].s + rows[1].s) / sdSum) * 100).toFixed(0)}%`);

rule("IS THE RADAR SCORE JUST A RECENCY SORT?");
const ages = B.map((b) => (Date.now() - (b.createdAt || 0)) / 86400000);
const rewards = B.map((b) => b.amountNumber);
line(`Spearman(score, -age)     = ${(-spearman(total, ages)).toFixed(3)}   <- 1.0 would mean "identical to newest-first"`);
line(`Spearman(score, reward)   = ${spearman(total, rewards).toFixed(3)}`);
line(`Spearman(score, -claims)  = ${(-spearman(total, B.map((b) => b.claimCount))).toFixed(3)}`);
const byScore = [...B].sort((a, b) => b.radarScore - a.radarScore).map((b) => b.key);
const byAge = [...B].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).map((b) => b.key);
let same = 0; for (let i = 0; i < byScore.length; i++) if (byScore[i] === byAge[i]) same++;
line(`\ntop-10 by radar score vs top-10 by newest-first: ${byScore.slice(0, 10).filter((k) => byAge.slice(0, 10).includes(k)).length}/10 identical bounties`);
line(`positions identical across the whole list: ${same}/${B.length}`);

rule("HOW MUCH OF THE ORDER IS DECIDED BY TIE-BREAK (i.e. array position)?");
const counts = {};
for (const s of total) counts[s] = (counts[s] || 0) + 1;
const tied = Object.values(counts).filter((c) => c > 1).reduce((a, c) => a + c, 0);
line(`bounties sharing a score with at least one other: ${tied}/${B.length} (${((tied / B.length) * 100).toFixed(0)}%)`);
line(`their relative order is decided by snapshot array position, not by any signal.`);
const top12 = [...B].sort((a, b) => b.radarScore - a.radarScore).slice(0, 12);
const cut = top12[11].radarScore;
const atCut = B.filter((b) => b.radarScore === cut).length;
line(`\n"Hot Right Now" style top-12 cuts at score ${cut}, and ${atCut} bounties hold exactly that score`);
line(`-> which of those ${atCut} make the shelf is arbitrary.`);

rule("SANITY PAIRS — does it rank the way a hunter would?");
const { calculateRadarScore } = jiti(path.join(REPO, "lib/scoring/radarScore.ts"));
const NOW = Date.now(), DAY = 86400000;
const eth = (n) => (BigInt(Math.round(n * 1e6)) * 10n ** 12n).toString();
const S = (o) => calculateRadarScore({ chain: "base", amountWei: eth(o.eth), currency: "ETH", status: o.status || "open", claimCount: o.claims || 0, createdAt: NOW - o.age * DAY }, NOW).score;
const pairs = [
  ["0.5 ETH (~$1,400), 45d old, 0 claims", { eth: 0.5, age: 45 }, "0.002 ETH (~$5.60), 1d old, 0 claims", { eth: 0.002, age: 1 }],
  ["1 ETH (~$2,800), 20d old, 0 claims", { eth: 1, age: 20 }, "0.01 ETH (~$28), 1d old, 0 claims", { eth: 0.01, age: 1 }],
  ["0.05 ETH, 1d old, 0 claims (wide open)", { eth: 0.05, age: 1 }, "0.05 ETH, 1d old, 9 claims (crowded)", { eth: 0.05, age: 1, claims: 9 }],
  ["0.05 ETH, 3d old, OPEN", { eth: 0.05, age: 3 }, "0.05 ETH, 1d old, PAID (dead)", { eth: 0.05, age: 1, status: "paid" }],
  ["0.02 ETH, 1d old, 2 claims", { eth: 0.02, age: 1, claims: 2 }, "0.02 ETH, 1d old, 3 claims", { eth: 0.02, age: 1, claims: 3 }],
];
for (const [la, a, lb, b] of pairs) {
  const sa = S(a), sb = S(b);
  line(`${String(sa).padStart(3)}  ${la}\n${String(sb).padStart(3)}  ${lb}\n     gap ${sa - sb >= 0 ? "+" : ""}${sa - sb}${sa <= sb ? "   <-- SECOND ONE WINS OR TIES" : ""}\n`);
}
