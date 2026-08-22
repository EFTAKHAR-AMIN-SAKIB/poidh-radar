import { calculateRadarScore } from "../scoring/radarScore";
import { formatWei, weiToNumber } from "../utils/format";
import { CHAINS } from "./chains";
import { Bounty, BountyStatus, ChainSlug, Claim } from "./types";

export const IPFS_GATEWAYS = [
  "https://beige-impossible-dragon-883.mypinata.cloud/ipfs/",
  "https://ipfs.io/ipfs/",
  "https://dweb.link/ipfs/",
  "https://w3s.link/ipfs/",
  "https://4everland.io/ipfs/",
];

export const CHAIN_ID_TO_SLUG: Record<number | string, ChainSlug> = {
  8453: "base",
  42161: "arbitrum",
  1: "mainnet",
  666666666: "degen",
  "0x27bc86aa": "degen",
  base: "base",
  arbitrum: "arbitrum",
  mainnet: "mainnet",
  ethereum: "mainnet",
  degen: "degen",
};

export function resolveImageUrl(url: string | null | undefined, gatewayIndex = 0): string | null {
  if (!url || typeof url !== "string") return null;
  const s = url.trim();
  if (s === "") return null;

  const gw = IPFS_GATEWAYS[gatewayIndex] || IPFS_GATEWAYS[0];

  if (s.startsWith("data:image/")) return s;
  if (s.startsWith("ipfs://")) return gw + s.replace(/^ipfs:\/\/(ipfs\/)?/i, "");
  if (/^(Qm[1-9A-HJ-NP-Za-km-z]{44}|baf[0-9a-z]{20,})$/.test(s)) return gw + s;
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  if (s.startsWith("//")) return "https:" + s;

  return null;
}

export function parseTimestamp(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === "number") {
    if (!isFinite(val) || val <= 0) return null;
    return val < 1e11 ? Math.round(val * 1000) : Math.round(val);
  }
  if (typeof val === "string") {
    const s = val.trim();
    if (/^\d+$/.test(s)) {
      const n = Number(s);
      return n < 1e11 ? Math.round(n * 1000) : Math.round(n);
    }
    const t = Date.parse(s);
    return isNaN(t) ? null : t;
  }
  return null;
}

export function deriveStatus(raw: Record<string, any>, claims: Claim[] = []): BountyStatus {
  // 1. If explicitly cancelled
  if (raw.isCanceled === true || raw.cancelled === true || raw.canceled === true) {
    return "cancelled";
  }
  // 2. If explicitly paid/claimed or has accepted claim
  if (raw.isPaid === true || raw.paid === true || raw.claimed === true || raw.isClaimed === true) {
    return "paid";
  }
  for (const c of claims) {
    if (c.accepted) return "paid";
  }

  // 3. If in voting / deliberation period
  if (raw.isVoting === true) {
    return "review";
  }

  // 4. If explicit status string
  const s = raw.status || raw.state || raw.bountyStatus;
  if (typeof s === "string") {
    const t = s.toLowerCase();
    if (/paid|complete|closed|settled|award|accept/.test(t)) return "paid";
    if (/cancel|refund|withdraw|expired/.test(t)) return "cancelled";
    if (/voting|decision|review/.test(t)) return "review";
    if (/open|active|live/.test(t)) return "open";
  }

  // 5. In progress = Open for claims
  if (raw.inProgress === true || raw.isOpen === true) {
    return "open";
  }

  return "open";
}

export function normalizeClaim(raw: Record<string, any>, defaultGatewayIndex = 0): Claim | null {
  if (!raw || typeof raw !== "object") return null;

  const id = raw.claimId ?? raw.id ?? 0;
  const title = (raw.title || raw.name || "").toString().trim();
  const description = (raw.description || raw.desc || "").toString().trim();
  const claimant = raw.issuerAddress || raw.claimant || raw.issuer || null;
  const imageRaw = raw.imageUrl || raw.image || raw.uri || raw.url || null;
  const accepted = raw.accepted === true || raw.isAccepted === true || raw.isWinner === true;
  const createdAt = parseTimestamp(raw.createdAt || raw.created_at || raw.timestamp);

  return {
    id,
    title: title || "Submitted Claim",
    description,
    claimant,
    claimantName: raw.issuerName || null,
    farcasterHandle: raw.farcasterHandle || null,
    twitterHandle: raw.twitterHandle || null,
    image: resolveImageUrl(imageRaw, defaultGatewayIndex),
    accepted,
    createdAt,
  };
}

export function normalizeBounty(
  rawIn: any,
  chainSlugOverride?: ChainSlug,
  fallbackId?: number
): Bounty {
  let raw = rawIn;
  if (Array.isArray(raw)) raw = raw[0];
  if (raw && typeof raw === "object") {
    if (raw.bounty && typeof raw.bounty === "object") raw = raw.bounty;
    else if (raw.data && typeof raw.data === "object") raw = raw.data;
  }
  if (!raw || typeof raw !== "object") raw = {};

  const detectedChain: ChainSlug =
    chainSlugOverride ||
    (raw.chainId ? CHAIN_ID_TO_SLUG[raw.chainId] : null) ||
    (raw.chain ? CHAIN_ID_TO_SLUG[raw.chain] : null) ||
    "base";

  const chain = CHAINS[detectedChain] || CHAINS.base;
  
  let numId: number;
  if (raw.id !== undefined && raw.id !== null) {
    numId = Number(raw.id);
  } else if (raw.onChainId !== undefined && raw.onChainId !== null) {
    numId = Number(raw.onChainId) + (chain.v2Offset || 0);
  } else {
    numId = Number(fallbackId ?? 1);
  }

  // Normalize claims
  const rawClaims: any[] = Array.isArray(raw.claims)
    ? raw.claims
    : Array.isArray(raw.submissions)
    ? raw.submissions
    : [];

  const claims: Claim[] = [];
  for (const rc of rawClaims) {
    const norm = normalizeClaim(rc);
    if (norm) claims.push(norm);
  }

  const title = (raw.title || raw.name || `Bounty #${numId}`).toString().trim();
  const description = (raw.description || raw.desc || "").toString().trim();
  const issuer = raw.issuer || raw.creator || raw.funder || null;

  let amountWei: string | null = null;
  if (raw.amount !== undefined && raw.amount !== null) {
    amountWei = raw.amount.toString();
  } else if (raw.amountWei !== undefined && raw.amountWei !== null) {
    amountWei = raw.amountWei.toString();
  } else if (raw.reward !== undefined && raw.reward !== null) {
    amountWei = raw.reward.toString();
  }

  const currency = raw.currency ? raw.currency.toUpperCase() : chain.nativeCurrency;
  const status = deriveStatus(raw, claims);
  let createdAt = parseTimestamp(raw.createdAt || raw.created_at || raw.timestamp);
  if (!createdAt && (status === "open" || status === "review")) {
    createdAt = Date.now();
  }
  const isMultiplayer = raw.isMultiplayer === true || raw.multiplayer === true;
  const isVoting = raw.isVoting === true || raw.voting === true;
  const priceUsd = typeof raw.priceUsd === "number" ? raw.priceUsd : null;

  // Proof Image resolution
  let proofImage: string | null = null;
  if (raw.image && typeof raw.image === "string") {
    proofImage = resolveImageUrl(raw.image);
  } else if (raw.proofImage && typeof raw.proofImage === "string") {
    proofImage = resolveImageUrl(raw.proofImage);
  }

  if (!proofImage) {
    for (const c of claims) {
      if (c.accepted && c.image) {
        proofImage = c.image;
        break;
      }
    }
  }
  if (!proofImage) {
    for (const c of claims) {
      if (c.image) {
        proofImage = c.image;
        break;
      }
    }
  }

  const claimCount =
    typeof raw.submissions === "number"
      ? raw.submissions
      : typeof raw.claimCount === "number"
      ? raw.claimCount
      : claims.length > 0
      ? claims.length
      : raw.hasClaims
      ? 1
      : 0;

  const amountDisplay = formatWei(amountWei, 18);
  const amountNumber = weiToNumber(amountWei, 18);

  const { score: radarScore, breakdown: radarBreakdown, standoutTags } = calculateRadarScore({
    chain: detectedChain,
    amountWei,
    currency,
    status,
    claimCount,
    createdAt,
    isMultiplayer,
    isVoting,
    title,
    description,
  });

  return {
    id: numId,
    chain: detectedChain,
    chainLabel: chain.name,
    key: `${detectedChain}:${numId}`,
    title,
    description,
    issuer,
    amountWei,
    amountDisplay,
    amountNumber,
    currency,
    priceUsd,
    status,
    claims,
    claimCount,
    proofImage,
    createdAt,
    isMultiplayer,
    isVoting,
    url: raw.url || `https://poidh.xyz/${detectedChain}/bounty/${numId}`,
    radarScore,
    radarBreakdown,
    standoutTags,
    raw: rawIn,
  };
}
