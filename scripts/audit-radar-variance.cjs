/* Variance decomposition for Radar Score v2.
   Run:  node scripts/audit-radar-variance.cjs */
const path = require("path");
const REPO = process.env.REPO || path.resolve(__dirname, "..");
const jiti = require(path.join(REPO, "node_modules/jiti"))(REPO, { interopDefault: true, esmResolve: true });

const { loadSnapshotBounties } = jiti(path.join(REPO, "lib/poidh/client.ts"));

const line = (s) => console.log(s);

line("========================================================================");
line("VARIANCE DECOMPOSITION over the real bounties in the snapshot (v2)");
line("========================================================================");

const bounties = loadSnapshotBounties();
if (!bounties.length) { line("No bounties loaded."); process.exit(1); }

const scores = bounties.map((b) => b.radarScore);
const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
const sd = Math.sqrt(scores.reduce((a, b) => a + (b - mean) ** 2, 0) / scores.length);
line(`total score: mean ${mean.toFixed(1)}  sd ${sd.toFixed(1)}  range ${Math.min(...scores)}..${Math.max(...scores)}\n`);

const DIMS = [["freshness", 30], ["rewardMagnitude", 35], ["competition", 20], ["quality", 15]];

line("dimension        | budget | observed range | sd    | share of score movement");
let totalSD = 0;
const dimSDs = [];
for (const [dim, budget] of DIMS) {
  const vals = bounties.map((b) => b.radarBreakdown[dim]);
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const m = vals.reduce((a, b) => a + b, 0) / vals.length;
  const s = Math.sqrt(vals.reduce((a, b) => a + (b - m) ** 2, 0) / vals.length);
  dimSDs.push(s);
  totalSD += s;
}

for (let i = 0; i < DIMS.length; i++) {
  const [dim, budget] = DIMS[i];
  const vals = bounties.map((b) => b.radarBreakdown[dim]);
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const m = vals.reduce((a, b) => a + b, 0) / vals.length;
  const s = dimSDs[i];
  const share = ((s / totalSD) * 100).toFixed(1);
  const isConst = s < 0.01;
  line(
    dim.padEnd(17) + "| " + String(budget).padStart(6) + " | " +
    `${lo.toFixed(1)}..${hi.toFixed(1)}`.padStart(14) + " | " +
    s.toFixed(2).padStart(5) + " | " + share.padStart(5) + "%" +
    (isConst ? "  <-- CONSTANT, contributes nothing" : "")
  );
}

line(`\nStatus multiplier values: ${JSON.stringify([...new Set(bounties.map((b) => b.radarBreakdown.statusMultiplier))])}`);

line("\n========================================================================");
line("IS THE RADAR SCORE JUST A RECENCY SORT?");
line("========================================================================");

// Spearman rank correlation
function rankArray(arr) {
  const sorted = arr.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]);
  const ranks = new Array(arr.length);
  sorted.forEach(([_, origIdx], rank) => { ranks[origIdx] = rank + 1; });
  return ranks;
}
function spearman(x, y) {
  const rx = rankArray(x), ry = rankArray(y);
  const n = x.length;
  const d2 = rx.reduce((sum, r, i) => sum + (r - ry[i]) ** 2, 0);
  return 1 - (6 * d2) / (n * (n * n - 1));
}

const ages = bounties.map((b) => b.createdAt ? -b.createdAt : 0);
const rewards = bounties.map((b) => b.amountNumber);
const claims = bounties.map((b) => -b.claimCount);

line(`Spearman(score, -age)     = ${spearman(scores, ages).toFixed(3)}   <- 1.0 would mean "identical to newest-first"`);
line(`Spearman(score, reward)   = ${spearman(scores, rewards).toFixed(3)}`);
line(`Spearman(score, -claims)  = ${spearman(scores, claims).toFixed(3)}`);

const byRadar = [...bounties].sort((a, b) => b.radarScore - a.radarScore).map(b => b.key);
const byNewest = [...bounties].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).map(b => b.key);
const top10radar = new Set(byRadar.slice(0, 10));
const top10newest = new Set(byNewest.slice(0, 10));
const overlap = [...top10radar].filter(k => top10newest.has(k)).length;
line(`\ntop-10 by radar score vs top-10 by newest-first: ${overlap}/10 identical bounties`);

line("\n========================================================================");
line("TIE RATE & SHELF STABILITY");
line("========================================================================");
const uniq = new Set(scores);
const tieRate = ((1 - uniq.size / bounties.length) * 100).toFixed(1);
const sharing = bounties.filter((b, _, arr) => arr.filter(x => x.radarScore === b.radarScore).length > 1).length;
line(`distinct scores: ${uniq.size}/${bounties.length} (tie rate: ${tieRate}%)`);
line(`bounties sharing a score with at least one other: ${sharing}/${bounties.length} (${((sharing / bounties.length) * 100).toFixed(0)}%)`);
