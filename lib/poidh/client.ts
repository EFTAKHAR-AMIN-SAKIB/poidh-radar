import { CHAINS, CHAIN_ORDER } from "./chains";
import { fetchMaxFrontendId } from "./contracts";
import { normalizeBounty } from "./normalize";
import { Bounty, ChainSlug, PulseStats } from "./types";

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const CACHE_TTL_MS = 30 * 1000; // 30 seconds

// In-memory master bounty store
let bountyStore: Map<string, Bounty> = new Map();
let storeInitialized = false;
let lastSyncTimestamp = 0;
let isSyncing = false;

// Highest known ID per chain (initialized with verified baseline bounds)
const maxKnownIds: Record<ChainSlug, number> = {
  base: 1350,
  arbitrum: 329,
  degen: 1394,
  mainnet: 25,
};

/**
 * Load offline backup snapshot into memory
 */
export function loadSnapshotBounties(): Bounty[] {
  try {
    const snapshot = require("./snapshot.json");
    if (snapshot && Array.isArray(snapshot.bounties)) {
      return snapshot.bounties
        .map((item: any) => normalizeBounty(item.raw, item.chain as ChainSlug, item.id))
        .filter((b: Bounty) => b && b.title);
    }
  } catch {
    // Snapshot not found or unparseable
  }
  return [];
}

/**
 * Initialize bounty store with baseline snapshot
 */
function initStoreIfNeeded() {
  if (storeInitialized) return;
  const snapshot = loadSnapshotBounties();
  for (const b of snapshot) {
    bountyStore.set(b.key, b);
    if (b.id > (maxKnownIds[b.chain] || 0)) {
      maxKnownIds[b.chain] = b.id;
    }
  }
  storeInitialized = true;
}

/**
 * Fetch a single live bounty directly from canonical POIDH protocol endpoint:
 * https://poidh.xyz/[chain]/bounty/[id]/data
 */
export async function fetchLiveBounty(chain: ChainSlug, id: number): Promise<Bounty | null> {
  initStoreIfNeeded();
  const key = `${chain}:${id}`;

  // 1. Direct fetch from canonical POIDH protocol endpoint
  try {
    const poidhDataUrl = `https://poidh.xyz/${chain}/bounty/${id}/data`;
    const res = await fetch(poidhDataUrl, {
      headers: {
        "User-Agent": BROWSER_UA,
        Accept: "application/json, text/plain, */*",
      },
      next: { revalidate: 30 },
    });

    if (res.ok) {
      const text = await res.text();
      if (text && text.trim().startsWith("{")) {
        const raw = JSON.parse(text);
        if (raw && typeof raw === "object" && (raw.title || raw.id || raw.amount || raw.name)) {
          const normalized = normalizeBounty(raw, chain, id);
          bountyStore.set(key, normalized);
          if (id > (maxKnownIds[chain] || 0)) {
            maxKnownIds[chain] = id;
          }
          return normalized;
        }
      }
    }
  } catch (err) {
    console.error(`[POIDH Client] Protocol /data error for ${chain} #${id}:`, err);
  }

  // 2. Fallback to existing memory store
  if (bountyStore.has(key)) {
    return bountyStore.get(key)!;
  }

  return null;
}

/**
 * Discover brand-new bounties created on POIDH by high-watermark probing
 * Checks N_max + 1, N_max + 2 ... on each chain
 */
async function discoverNewBountiesForChain(chain: ChainSlug, maxProbes = 25): Promise<Bounty[]> {
  const currentMax = maxKnownIds[chain] || 1;
  const discovered: Bounty[] = [];

  // 1. Try to get on-chain counter via RPC first to know the exact target bound
  let targetMax = currentMax + maxProbes;
  try {
    const onChainMax = await fetchMaxFrontendId(chain);
    if (onChainMax && onChainMax > currentMax) {
      targetMax = Math.min(onChainMax, currentMax + maxProbes);
    }
  } catch {
    // Fall back to blind probing
  }

  // 2. Probe sequentially from currentMax + 1 onwards
  for (let id = currentMax + 1; id <= targetMax; id++) {
    try {
      const poidhDataUrl = `https://poidh.xyz/${chain}/bounty/${id}/data`;
      const res = await fetch(poidhDataUrl, {
        headers: {
          "User-Agent": BROWSER_UA,
          Accept: "application/json, text/plain, */*",
        },
      });

      if (res.ok) {
        const text = await res.text();
        if (text && text.trim().startsWith("{")) {
          const raw = JSON.parse(text);
          if (raw && typeof raw === "object" && (raw.title || raw.name || raw.amount || raw.id)) {
            const normalized = normalizeBounty(raw, chain, id);
            bountyStore.set(normalized.key, normalized);
            maxKnownIds[chain] = id;
            discovered.push(normalized);
            continue;
          }
        }
      }
      // If 404 or empty, we've reached the current top boundary for this chain
      break;
    } catch {
      break;
    }
  }

  return discovered;
}

/**
 * Refresh recent and open bounties from the canonical POIDH protocol endpoints
 */
async function syncProtocolBounties() {
  if (isSyncing) return;
  isSyncing = true;

  try {
    // 1. High-watermark discovery across all 4 chains concurrently
    await Promise.allSettled(CHAIN_ORDER.map((c) => discoverNewBountiesForChain(c)));

    // Helper to live-refresh a bounty from canonical endpoint
    const refreshSingle = async (chain: ChainSlug, id: number) => {
      try {
        const res = await fetch(`https://poidh.xyz/${chain}/bounty/${id}/data`, {
          headers: {
            "User-Agent": BROWSER_UA,
            Accept: "application/json, text/plain, */*",
          },
        });
        if (res.ok) {
          const text = await res.text();
          if (text && text.trim().startsWith("{")) {
            const raw = JSON.parse(text);
            if (raw && (raw.title || raw.name || raw.id || raw.amount)) {
              const refreshed = normalizeBounty(raw, chain, id);
              bountyStore.set(refreshed.key, refreshed);
            }
          }
        }
      } catch {
        // Ignore transient timeout
      }
    };

    // 2. Refresh top 50 recent bounties per chain directly from poidh.xyz
    const refreshTasks: Promise<void>[] = [];
    for (const chain of CHAIN_ORDER) {
      const top = maxKnownIds[chain] || 100;
      for (let id = top; id >= Math.max(1, top - 50); id--) {
        refreshTasks.push(refreshSingle(chain, id));
      }
    }
    await Promise.allSettled(refreshTasks);

    // 3. Refresh all active open / review bounties in memory to capture state updates
    const activeBounties = Array.from(bountyStore.values()).filter(
      (b) => b.status === "open" || b.status === "review"
    );

    await Promise.allSettled(activeBounties.map((b) => refreshSingle(b.chain, b.id)));

    lastSyncTimestamp = Date.now();
  } catch (err) {
    console.error("[POIDH Client] Sync protocol bounties error:", err);
  } finally {
    isSyncing = false;
  }
}

/**
 * Fetch and return all live POIDH bounties across all chains
 */
export async function getAllBounties(forceRefresh = false): Promise<Bounty[]> {
  initStoreIfNeeded();

  const now = Date.now();
  if (forceRefresh || now - lastSyncTimestamp > CACHE_TTL_MS) {
    await syncProtocolBounties();
  }

  const allBounties = Array.from(bountyStore.values());
  // Sort by Radar score descending
  allBounties.sort((a, b) => b.radarScore - a.radarScore);

  return allBounties;
}

/**
 * Fetch live ecosystem statistics directly from protocol pool & chain stats
 */
export async function fetchLiveStats(): Promise<PulseStats | null> {
  const bounties = await getAllBounties();
  return calculatePulseStats(bounties);
}

/**
 * Calculate ecosystem metrics using sovereign protocol data
 */
export function calculatePulseStats(bounties: Bounty[], _overrideStats?: PulseStats | null): PulseStats {
  let active = 0;
  let review = 0;
  let completed = 0;
  let cancelled = 0;
  let activeEth = 0;
  let activeDegen = 0;
  let totalEth = 0;
  let totalDegen = 0;
  let withClaims = 0;
  let zeroClaims = 0;
  let activeZeroClaims = 0;

  const chainCounts: Record<ChainSlug, number> = {
    base: 0,
    degen: 0,
    arbitrum: 0,
    mainnet: 0,
  };

  const activeChainCounts: Record<ChainSlug, number> = {
    base: 0,
    degen: 0,
    arbitrum: 0,
    mainnet: 0,
  };

  let highestActiveEth: { title: string; amount: number; chain: ChainSlug; id: number } | null = null;
  let highestActiveDegen: { title: string; amount: number; chain: ChainSlug; id: number } | null = null;
  let highestEth: { title: string; amount: number; chain: ChainSlug; id: number } | null = null;
  let highestDegen: { title: string; amount: number; chain: ChainSlug; id: number } | null = null;

  for (const b of bounties) {
    chainCounts[b.chain] = (chainCounts[b.chain] || 0) + 1;

    const isActive = b.status === "open" || b.status === "review";

    if (b.status === "open") {
      active++;
      activeChainCounts[b.chain] = (activeChainCounts[b.chain] || 0) + 1;
      if (b.claimCount === 0) activeZeroClaims++;
    } else if (b.status === "review") {
      review++;
      activeChainCounts[b.chain] = (activeChainCounts[b.chain] || 0) + 1;
    } else if (b.status === "paid") {
      completed++;
    } else if (b.status === "cancelled") {
      cancelled++;
    }

    if (b.claimCount > 0) withClaims++;
    else zeroClaims++;

    const isDegen = b.currency.toUpperCase() === "DEGEN";
    if (isDegen) {
      totalDegen += b.amountNumber;
      if (!highestDegen || b.amountNumber > highestDegen.amount) {
        highestDegen = { title: b.title, amount: b.amountNumber, chain: b.chain, id: b.id };
      }
      if (isActive) {
        activeDegen += b.amountNumber;
        if (!highestActiveDegen || b.amountNumber > highestActiveDegen.amount) {
          highestActiveDegen = { title: b.title, amount: b.amountNumber, chain: b.chain, id: b.id };
        }
      }
    } else {
      totalEth += b.amountNumber;
      if (!highestEth || b.amountNumber > highestEth.amount) {
        highestEth = { title: b.title, amount: b.amountNumber, chain: b.chain, id: b.id };
      }
      if (isActive) {
        activeEth += b.amountNumber;
        if (!highestActiveEth || b.amountNumber > highestActiveEth.amount) {
          highestActiveEth = { title: b.title, amount: b.amountNumber, chain: b.chain, id: b.id };
        }
      }
    }
  }

  // Sum total on-chain indexed volumes across all 4 contract counters
  const totalCount =
    (maxKnownIds.base || 1350) +
    (maxKnownIds.arbitrum || 329) +
    (maxKnownIds.degen || 1394) +
    (maxKnownIds.mainnet || 25);

  return {
    totalBounties: totalCount,
    activeBounties: active,
    reviewBounties: review,
    completedBounties: completed > 0 ? completed : Math.max(0, totalCount - active - review),
    cancelledBounties: cancelled,
    activeEthRewards: activeEth,
    activeDegenRewards: activeDegen,
    totalEthRewards: totalEth,
    totalDegenRewards: totalDegen,
    withClaimsCount: withClaims,
    zeroClaimsCount: zeroClaims,
    activeZeroClaimsCount: activeZeroClaims,
    highestActiveEth: highestActiveEth || highestEth,
    highestActiveDegen: highestActiveDegen || highestDegen,
    highestBountyEth: highestEth,
    highestBountyDegen: highestDegen,
    chainCounts: {
      base: maxKnownIds.base,
      arbitrum: maxKnownIds.arbitrum,
      mainnet: maxKnownIds.mainnet,
      degen: maxKnownIds.degen,
    },
    activeChainCounts,
  };
}
