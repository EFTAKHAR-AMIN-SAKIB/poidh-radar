import { BountyStatus, ChainSlug, RadarScoreBreakdown } from "../poidh/types";
import { weiToNumber } from "../utils/format";

interface ScoringInput {
  chain: ChainSlug;
  amountWei: string | null | undefined;
  currency: string;
  status: BountyStatus;
  claimCount: number;
  createdAt: number | null | undefined;
  isMultiplayer?: boolean;
  isVoting?: boolean;
}

/**
 * Calculates a deterministic Radar Score (0–100) and structured breakdown.
 *
 * METHODOLOGY:
 * 1. Freshness (0–25 pts): Decay curve rewarding freshly posted bounties.
 * 2. Reward Magnitude (0–30 pts): Log-scaled reward normalized against chain median.
 * 3. Status Score (0–20 pts): Open/actionable bounties given highest priority.
 * 4. Opportunity Score (0–15 pts): Low competition bonus (0-1 claims).
 * 5. Activity Score (0–10 pts): Active proof engagement velocity.
 */
export function calculateRadarScore(input: ScoringInput, nowMs = Date.now()): {
  score: number;
  breakdown: RadarScoreBreakdown;
  standoutTags: string[];
} {
  const isDegen = input.currency.toUpperCase() === "DEGEN";
  const numAmount = weiToNumber(input.amountWei, 18);

  // 1. Freshness (0–25)
  let freshness = 8;
  if (input.createdAt) {
    const ageDays = Math.max(0, (nowMs - input.createdAt) / (1000 * 60 * 60 * 24));
    if (ageDays <= 2) freshness = 25;
    else if (ageDays <= 7) freshness = 22;
    else if (ageDays <= 14) freshness = 18;
    else if (ageDays <= 30) freshness = 14;
    else if (ageDays <= 90) freshness = 10;
    else if (ageDays <= 180) freshness = 6;
    else freshness = 3;
  }

  // 2. Reward Magnitude (0–30)
  let rewardMagnitude = 5;
  if (numAmount > 0) {
    if (isDegen) {
      // 100 DEGEN -> 6, 1k DEGEN -> 14, 5k DEGEN -> 20, 20k DEGEN -> 26, 50k+ -> 30
      const logVal = Math.log10(Math.max(1, numAmount));
      rewardMagnitude = Math.min(30, Math.max(4, Math.round(logVal * 6.5 - 3)));
    } else {
      // ETH: 0.001 ETH -> 6, 0.01 ETH -> 16, 0.05 ETH -> 22, 0.2 ETH -> 26, 1+ ETH -> 30
      if (numAmount >= 1) rewardMagnitude = 30;
      else if (numAmount >= 0.5) rewardMagnitude = 28;
      else if (numAmount >= 0.1) rewardMagnitude = 25;
      else if (numAmount >= 0.05) rewardMagnitude = 22;
      else if (numAmount >= 0.02) rewardMagnitude = 19;
      else if (numAmount >= 0.005) rewardMagnitude = 14;
      else if (numAmount >= 0.001) rewardMagnitude = 10;
      else rewardMagnitude = 6;
    }
  }

  // 3. Status Score (0–20)
  let statusScore = 5;
  if (input.status === "open") statusScore = 20;
  else if (input.status === "review") statusScore = 12;
  else if (input.status === "paid") statusScore = 4;
  else if (input.status === "cancelled") statusScore = 0;

  // 4. Opportunity / Competition Ratio (0–15)
  let opportunity = 5;
  if (input.status === "open") {
    if (input.claimCount === 0) opportunity = 15; // Zero submissions yet!
    else if (input.claimCount === 1) opportunity = 12;
    else if (input.claimCount <= 3) opportunity = 9;
    else opportunity = 4;
  } else if (input.status === "review") {
    opportunity = input.claimCount <= 2 ? 8 : 4;
  }

  // 5. Activity Velocity (0–10)
  let activity = 0;
  if (input.claimCount > 0) {
    activity = Math.min(10, Math.round(Math.log2(input.claimCount + 1) * 3));
  }

  const rawTotal = freshness + rewardMagnitude + statusScore + opportunity + activity;
  const total = Math.max(1, Math.min(99, Math.round(rawTotal)));

  // Generate deterministic "Why It Stands Out" tags
  const standoutTags: string[] = [];

  if (input.status === "open" && input.claimCount === 0 && rewardMagnitude >= 14) {
    standoutTags.push("💎 Hidden Gem");
  }
  if (total >= 80) {
    standoutTags.push("🔥 High Momentum");
  }
  if (rewardMagnitude >= 22) {
    standoutTags.push("💰 High Reward");
  }
  if (freshness >= 22) {
    standoutTags.push("🆕 Fresh Drop");
  }
  if (input.status === "open" && input.claimCount <= 1) {
    standoutTags.push("⚡ Low Competition");
  }
  if (input.isMultiplayer) {
    standoutTags.push("👥 Multiplayer");
  }
  if (input.isVoting || (input.status === "review" && input.claimCount > 0)) {
    standoutTags.push("🗳️ Community In Review");
  }
  if (input.claimCount >= 5) {
    standoutTags.push("⚡ High Engagement");
  }

  let explanation = `Radar Score ${total}/100 based on freshness (${freshness}/25), reward scale (${rewardMagnitude}/30), active status (${statusScore}/20), competition level (${opportunity}/15), and activity (${activity}/10).`;

  return {
    score: total,
    breakdown: {
      total,
      freshness,
      rewardMagnitude,
      statusScore,
      opportunity,
      activity,
      explanation,
    },
    standoutTags: standoutTags.slice(0, 3), // Top 3 tags
  };
}
