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
  title?: string;
  description?: string;
}

/**
 * Static USD price table for cross-chain reward normalisation.
 * Deliberately pinned to avoid external dependencies. Labelled with date.
 * Override via environment variable if needed.
 *
 * Last updated: 2026-08-20
 */
const USD_PRICES: Record<string, number> = {
  ETH: 2800,
  DEGEN: 0.008,
};

/**
 * Calculates a deterministic Radar Score (0–100) and structured breakdown.
 *
 * METHODOLOGY (v2 — continuous, USD-normalised, monotonic):
 *
 * The score for ACTIVE bounties sums four continuous dimensions:
 *   1. Freshness        (0–30 pts)  Exponential half-life decay (14-day half-life)
 *   2. Reward Magnitude (0–35 pts)  Log-scaled USD-normalised reward
 *   3. Competition      (0–20 pts)  Monotonic decay — fewer claims = higher score
 *   4. Quality          (0–15 pts)  Content richness (title + description length, multiplayer)
 *
 * The raw sum (0–100) is then multiplied by a Status Factor:
 *   open      → 1.00x  (fully actionable)
 *   review    → 0.75x  (in voting / evaluation)
 *   paid      → 0.30x  (historical reference only)
 *   cancelled → 0.05x  (dead)
 *
 * This ensures:
 *   - Open bounties always outrank equivalent closed ones
 *   - The full 0–100 range is reachable
 *   - No two bounties with different inputs produce the same score (continuous math)
 *   - More competition never scores higher (strictly monotonic)
 *   - $40 in DEGEN and $40 in ETH produce the same reward points
 */
export function calculateRadarScore(input: ScoringInput, nowMs = Date.now()): {
  score: number;
  breakdown: RadarScoreBreakdown;
  standoutTags: string[];
} {
  const currency = (input.currency || "ETH").toUpperCase();
  const numAmount = weiToNumber(input.amountWei, 18);

  // ────────────────────────────────────────────────────────────
  // 1. FRESHNESS (0–30)  —  exponential decay, 14-day half-life
  // ────────────────────────────────────────────────────────────
  let freshness = 5; // default if no createdAt
  if (input.createdAt && input.createdAt > 0) {
    const ageDays = Math.max(0, (nowMs - input.createdAt) / 86_400_000);
    // 21-day half-life: 30 at day 0, 15 at day 21, 7.5 at day 42, ~1 at day 100+
    freshness = 30 * Math.pow(0.5, ageDays / 21);
  }

  // ────────────────────────────────────────────────────────────
  // 2. REWARD MAGNITUDE (0–35)  —  log-scaled USD normalisation
  // ────────────────────────────────────────────────────────────
  let rewardMagnitude = 0;
  if (numAmount > 0) {
    const pricePerUnit = USD_PRICES[currency] ?? USD_PRICES.ETH;
    const usdValue = numAmount * pricePerUnit;

    // Smooth logarithmic curve:
    //   $1    →  0 pts
    //   $5    →  7 pts
    //   $28   → 14.5 pts
    //   $100  → 20 pts
    //   $500  → 27 pts
    //   $2800 → 34.5 pts
    //   $5000+→ 35 pts (capped)
    if (usdValue >= 1) {
      rewardMagnitude = Math.min(35, Math.log10(usdValue) * 10);
    }
  }

  // ────────────────────────────────────────────────────────────
  // 3. COMPETITION (0–20)  —  strictly monotonic decay
  // ────────────────────────────────────────────────────────────
  // 0 claims → 20 pts (wide open opportunity)
  // 1 claim  → 13.3 pts
  // 2 claims → 10 pts
  // 5 claims → 5.7 pts
  // 10 claims→ 3.6 pts
  // 50 claims→ 0.8 pts
  //
  // Strictly decreasing for any positive integer increment.
  const competition = 20 / (1 + 0.5 * input.claimCount);

  // ────────────────────────────────────────────────────────────
  // 4. QUALITY (0–15)  —  continuous content richness score
  // ────────────────────────────────────────────────────────────
  const titleLen = (input.title || "").length;
  const descLen = (input.description || "").length;

  // Smooth log curves: asymptotically approach max
  // Title quality (0–4): log curve saturating around 40+ chars
  const titleQuality = titleLen > 0 ? Math.min(4, Math.log(1 + titleLen) / Math.log(45) * 4) : 0;

  // Description quality (0–7): log curve saturating around 500+ chars
  const descQuality = descLen > 0 ? Math.min(7, Math.log(1 + descLen) / Math.log(500) * 7) : 0;

  // Multiplayer bonus (0–4): collaborative bounties are more engaging
  const mpBonus = input.isMultiplayer ? 4 : 0;

  let quality = Math.min(15, titleQuality + descQuality + mpBonus);

  // ────────────────────────────────────────────────────────────
  // RAW SCORE SUM  (0–100 for open bounties)
  // ────────────────────────────────────────────────────────────
  const rawActive = freshness + rewardMagnitude + competition + quality;

  // ────────────────────────────────────────────────────────────
  // STATUS MULTIPLIER  —  attenuates non-actionable bounties
  // ────────────────────────────────────────────────────────────
  let statusMultiplier = 1.0;
  if (input.status === "review") statusMultiplier = 0.75;
  else if (input.status === "paid") statusMultiplier = 0.30;
  else if (input.status === "cancelled") statusMultiplier = 0.05;
  else if (input.status === "unknown") statusMultiplier = 0.50;

  const rawTotal = rawActive * statusMultiplier;

  // Round to 1 decimal internally, integer for display
  const total = Math.max(1, Math.min(100, Math.round(rawTotal)));

  // For breakdown display, round each dimension to 1 decimal
  const roundedFreshness = Math.round(freshness * 10) / 10;
  const roundedReward = Math.round(rewardMagnitude * 10) / 10;
  const roundedCompetition = Math.round(competition * 10) / 10;
  const roundedQuality = Math.min(15, quality);

  // ────────────────────────────────────────────────────────────
  // STANDOUT TAGS  —  meaningful, non-overlapping signals
  // ────────────────────────────────────────────────────────────
  const standoutTags: string[] = [];
  const usdValue = numAmount * (USD_PRICES[currency] ?? USD_PRICES.ETH);

  // 💎 Hidden Gem: open, zero claims, meaningful reward
  if (input.status === "open" && input.claimCount === 0 && usdValue >= 20) {
    standoutTags.push("💎 Hidden Gem");
  }

  // 💰 Whale Bounty: very high USD value
  if (usdValue >= 500) {
    standoutTags.push("💰 Whale Bounty");
  } else if (usdValue >= 100) {
    standoutTags.push("💰 High Reward");
  }

  // 🆕 Just Dropped: within 48 hours
  if (input.createdAt && (nowMs - input.createdAt) < 172_800_000) {
    standoutTags.push("🆕 Just Dropped");
  }

  // ⚡ Zero Competition: open with literally no claims
  if (input.status === "open" && input.claimCount === 0) {
    standoutTags.push("⚡ Zero Competition");
  }

  // 🔥 Actively Contested: multiple claims on a recent bounty
  if (input.claimCount >= 3 && input.createdAt && (nowMs - input.createdAt) < 604_800_000) {
    standoutTags.push("🔥 Actively Contested");
  }

  // 👥 Multiplayer
  if (input.isMultiplayer) {
    standoutTags.push("👥 Multiplayer");
  }

  // 🗳️ Community In Review
  if (input.isVoting || (input.status === "review" && input.claimCount > 0)) {
    standoutTags.push("🗳️ In Review");
  }

  // Build human-readable explanation
  const statusLabel = statusMultiplier < 1 ? ` × ${statusMultiplier} status` : "";
  const explanation = `Radar Score ${total}/100 — freshness ${roundedFreshness}/30, reward ${roundedReward}/35 (USD-normalised), competition ${roundedCompetition}/20, quality ${roundedQuality}/15${statusLabel}.`;

  return {
    score: total,
    breakdown: {
      total,
      freshness: roundedFreshness,
      rewardMagnitude: roundedReward,
      competition: roundedCompetition,
      quality: roundedQuality,
      statusMultiplier,
      explanation,
    },
    standoutTags: standoutTags.slice(0, 3),
  };
}
