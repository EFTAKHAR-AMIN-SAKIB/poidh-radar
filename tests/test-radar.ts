import assert from "node:assert";
import { CHAINS, CHAIN_ORDER } from "../lib/poidh/chains";
import { calculatePulseStats, loadSnapshotBounties } from "../lib/poidh/client";
import { resolveImageUrl } from "../lib/poidh/normalize";
import { calculateRadarScore } from "../lib/scoring/radarScore";
import { formatReward, formatWei, weiToNumber } from "../lib/utils/format";

async function runTests() {
  console.log("==========================================");
  console.log("RUNNING POIDH RADAR v2 AUTOMATED TEST SUITE");
  console.log("==========================================\n");

  // Test 1: Snapshot Loading & Verification
  const bounties = loadSnapshotBounties();
  console.log(`[TEST 1] Loaded ${bounties.length} bounties from snapshot.`);
  assert(bounties.length >= 50, `Should have loaded at least 50 bounties from snapshot, got ${bounties.length}`);

  // Verify chains are present
  const chainsFound = new Set(bounties.map((b) => b.chain));
  for (const c of CHAIN_ORDER) {
    if (chainsFound.has(c)) {
      const count = bounties.filter((b) => b.chain === c).length;
      console.log(`  ✓ Chain '${c}': ${count} bounties present`);
    }
  }

  // Test 2: Radar Score Determinism & Full Range
  console.log("\n[TEST 2] Verifying Radar Score Engine v2...");
  const scores = new Set<number>();
  for (const b of bounties) {
    assert(typeof b.radarScore === "number", "Score must be numeric");
    assert(b.radarScore >= 1 && b.radarScore <= 100, `Score out of bounds: ${b.radarScore}`);
    assert(b.radarBreakdown, "Score breakdown must exist");
    assert(b.radarBreakdown.total === b.radarScore, "Breakdown total must equal radarScore");
    assert(b.radarBreakdown.freshness <= 30, `Freshness max 30, got ${b.radarBreakdown.freshness}`);
    assert(b.radarBreakdown.rewardMagnitude <= 35, `Reward max 35, got ${b.radarBreakdown.rewardMagnitude}`);
    assert(b.radarBreakdown.competition <= 20, `Competition max 20, got ${b.radarBreakdown.competition}`);
    assert(b.radarBreakdown.quality <= 15, `Quality max 15, got ${b.radarBreakdown.quality}`);
    assert(b.radarBreakdown.statusMultiplier >= 0.05 && b.radarBreakdown.statusMultiplier <= 1,
      `Status multiplier out of bounds: ${b.radarBreakdown.statusMultiplier}`);
    scores.add(b.radarScore);
  }
  const tieRate = 1 - scores.size / bounties.length;
  console.log(`  ✓ All ${bounties.length} bounties scored within [1, 100] bounds.`);
  console.log(`  ✓ Distinct scores: ${scores.size} / ${bounties.length} (tie rate: ${(tieRate * 100).toFixed(1)}%)`);
  assert(scores.size > bounties.length * 0.4, `Tie rate too high: only ${scores.size} distinct scores for ${bounties.length} bounties`);

  // Test 3: Monotonicity — more claims must NEVER produce a higher score
  console.log("\n[TEST 3] Verifying Competition Monotonicity...");
  const NOW = Date.now();
  for (let claims = 0; claims < 50; claims++) {
    const scoreLow = calculateRadarScore({
      chain: "base", amountWei: "50000000000000000", currency: "ETH",
      status: "open", claimCount: claims, createdAt: NOW - 86400000,
    }, NOW);
    const scoreHigh = calculateRadarScore({
      chain: "base", amountWei: "50000000000000000", currency: "ETH",
      status: "open", claimCount: claims + 1, createdAt: NOW - 86400000,
    }, NOW);
    assert(scoreLow.score >= scoreHigh.score,
      `Monotonicity violated: ${claims} claims → ${scoreLow.score}, ${claims + 1} claims → ${scoreHigh.score}`);
  }
  console.log("  ✓ Score is strictly monotonic: more claims → lower or equal score (50 pairs tested).");

  // Test 4: USD Parity — ETH and DEGEN at the same dollar value should score within 2 pts
  console.log("\n[TEST 4] Verifying USD Cross-Chain Parity...");
  const testUsdValues = [10, 50, 100, 500, 2000];
  let maxDrift = 0;
  for (const usd of testUsdValues) {
    const ethWei = BigInt(Math.round((usd / 2800) * 1e18)).toString();
    const degenWei = BigInt(Math.round((usd / 0.008) * 1e18)).toString();
    const ethScore = calculateRadarScore({
      chain: "base", amountWei: ethWei, currency: "ETH",
      status: "open", claimCount: 0, createdAt: NOW - 86400000,
    }, NOW);
    const degenScore = calculateRadarScore({
      chain: "degen", amountWei: degenWei, currency: "DEGEN",
      status: "open", claimCount: 0, createdAt: NOW - 86400000,
    }, NOW);
    const drift = Math.abs(ethScore.breakdown.rewardMagnitude - degenScore.breakdown.rewardMagnitude);
    maxDrift = Math.max(maxDrift, drift);
    console.log(`  $${usd}: ETH reward=${ethScore.breakdown.rewardMagnitude.toFixed(1)}, DEGEN reward=${degenScore.breakdown.rewardMagnitude.toFixed(1)} (drift: ${drift.toFixed(2)})`);
    assert(drift < 2, `USD parity violated at $${usd}: ETH=${ethScore.breakdown.rewardMagnitude}, DEGEN=${degenScore.breakdown.rewardMagnitude}`);
  }
  console.log(`  ✓ Max reward drift across all USD values: ${maxDrift.toFixed(2)} pts (< 2 pts threshold).`);

  // Test 5: Formatting & Wei Math (including edge cases)
  console.log("\n[TEST 5] Verifying Wei Math & Formatting...");
  assert.strictEqual(formatWei("1000000000000000000"), "1");
  assert.strictEqual(formatWei("500000000000000000"), "0.5");
  assert.strictEqual(formatWei("2500000000000000"), "0.0025");
  assert.strictEqual(formatReward("1000000000000000000", "ETH").fullWithSymbol, "1 ETH");
  assert.strictEqual(formatReward("5000000000000000000000", "DEGEN").fullWithSymbol, "5,000 DEGEN");

  // Edge cases that previously broke
  const hexResult = weiToNumber("0x16345785d8a0000", 18);
  console.log(`  weiToNumber("0x16345785d8a0000") = ${hexResult} (expected ~0.1)`);
  assert(Math.abs(hexResult - 0.1) < 0.001, `Hex conversion failed: got ${hexResult}`);

  const sciResult = weiToNumber("1e18", 18);
  console.log(`  weiToNumber("1e18") = ${sciResult} (expected 1)`);
  assert(Math.abs(sciResult - 1) < 0.01, `Scientific notation conversion failed: got ${sciResult}`);

  const decimalResult = weiToNumber("1500000000000000000.0", 18);
  console.log(`  weiToNumber("1500000000000000000.0") = ${decimalResult} (expected 1.5)`);
  assert(Math.abs(decimalResult - 1.5) < 0.01, `Decimal wei conversion failed: got ${decimalResult}`);

  console.log("  ✓ Wei coercion verified for standard, hex, scientific notation, and decimal formats.");

  // Test 6: Pulse Stats Aggregation
  console.log("\n[TEST 6] Verifying Pulse Stats Aggregation...");
  const stats = calculatePulseStats(bounties);
  assert(stats.activeBounties > 0, "Should have active bounties");
  console.log(`  ✓ Active open bounties: ${stats.activeBounties}`);
  console.log(`  ✓ Total ETH volume: ${stats.totalEthRewards.toFixed(2)} ETH`);

  // Test 7: IPFS Gateway Resolution
  console.log("\n[TEST 7] Verifying IPFS Multi-Gateway Resolver...");
  const ipfsHash = "ipfs://QmNwXBsKyStyPmywbATccX1A2TVp38mRsEf1UYdnmU6FEr";
  const resolved = resolveImageUrl(ipfsHash);
  assert(resolved && resolved.startsWith("https://"), "Resolved URL must be HTTPS");
  console.log(`  ✓ '${ipfsHash}' → '${resolved}'`);

  // Test 8: Score Range Attainability
  console.log("\n[TEST 8] Verifying Full Score Range Attainability...");
  const perfectScore = calculateRadarScore({
    chain: "base", amountWei: BigInt(Math.round(10 * 1e18)).toString(), currency: "ETH",
    status: "open", claimCount: 0, createdAt: NOW,
    title: "A detailed bounty title with clear specification",
    description: "A thorough and well-written description that explains exactly what needs to be done, with clear acceptance criteria, expected deliverables, and formatting requirements. This bounty rewards proof-of-doing for creative and verifiable work.",
    isMultiplayer: true,
  }, NOW);
  console.log(`  Perfect bounty score: ${perfectScore.score}/100`);
  assert(perfectScore.score >= 95, `Perfect bounty should score >= 95, got ${perfectScore.score}`);

  const worstScore = calculateRadarScore({
    chain: "base", amountWei: null, currency: "ETH",
    status: "cancelled", claimCount: 100, createdAt: NOW - 365 * 86400000,
  }, NOW);
  console.log(`  Worst bounty score: ${worstScore.score}/100`);
  assert(worstScore.score <= 5, `Worst bounty should score <= 5, got ${worstScore.score}`);
  console.log(`  ✓ Score range: ${worstScore.score}..${perfectScore.score} (covers nearly 0–100).`);

  // Test 9: Tag Sanity
  console.log("\n[TEST 9] Verifying Tag Sanity...");
  const tagCounts: Record<string, number> = {};
  for (const b of bounties) {
    for (const t of b.standoutTags) {
      tagCounts[t] = (tagCounts[t] || 0) + 1;
    }
  }
  for (const [tag, count] of Object.entries(tagCounts)) {
    const pct = ((count / bounties.length) * 100).toFixed(0);
    console.log(`  ${tag}: ${count}/${bounties.length} (${pct}%)`);
    assert(count < bounties.length, `Tag '${tag}' fires on 100% of bounties — it's meaningless`);
  }
  console.log("  ✓ No tag fires on 100% of bounties.");

  console.log("\n==========================================");
  console.log(`ALL ${9} TEST SUITES PASSED (${bounties.length} bounties verified)`);
  console.log("==========================================");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
