export type ChainSlug = "base" | "degen" | "arbitrum" | "mainnet";

export type BountyStatus = "open" | "review" | "paid" | "cancelled" | "unknown";

export interface ChainConfig {
  slug: ChainSlug;
  name: string;
  shortName: string;
  chainId: number;
  nativeCurrency: string;
  icon: string;
  color: string;
  accentColor: string;
  bgGlow: string;
  explorerUrl: string;
  poidhUrl: string;
  description: string;
  contractAddress: string;
  v2Offset: number;
  rpcUrls: string[];
}

export interface Claim {
  id: string | number;
  title: string;
  description: string;
  claimant: string | null;
  claimantName?: string | null;
  farcasterHandle?: string | null;
  twitterHandle?: string | null;
  image: string | null;
  accepted: boolean;
  createdAt: number | null;
}

export interface Bounty {
  id: number;
  chain: ChainSlug;
  chainLabel: string;
  key: string; // `${chain}:${id}`
  title: string;
  description: string;
  issuer: string | null;
  amountWei: string | null; // Stored as decimal string to avoid BigInt serialization issues
  amountDisplay: string;
  amountNumber: number; // approximate float for quick sorting/charts
  currency: string;
  priceUsd?: number | null;
  status: BountyStatus;
  claims: Claim[];
  claimCount: number;
  proofImage: string | null;
  createdAt: number | null;
  isMultiplayer: boolean;
  isVoting: boolean;
  url: string;
  radarScore: number;
  radarBreakdown: RadarScoreBreakdown;
  standoutTags: string[];
  raw?: unknown;
}

export interface RadarScoreBreakdown {
  total: number;
  freshness: number;     // 0-25: based on recency
  rewardMagnitude: number; // 0-30: log-normalized reward
  statusScore: number;   // 0-20: active/open priority
  opportunity: number;   // 0-15: reward-to-competition ratio
  activity: number;      // 0-10: claims & community velocity
  explanation: string;
}

export interface FilterState {
  chains: ChainSlug[];
  statuses: BountyStatus[];
  q: string;
  sort: SortOption;
  withProofOnly: boolean;
  multiplayerOnly: boolean;
  minAmount?: string;
  gemsOnly?: boolean;
}

export type SortOption =
  | "radar-desc"
  | "newest"
  | "oldest"
  | "reward-desc"
  | "reward-asc"
  | "claims-desc"
  | "claims-asc";

export interface PulseStats {
  totalBounties: number;
  activeBounties: number;
  reviewBounties: number;
  completedBounties: number;
  cancelledBounties: number;
  totalEthRewards: number;
  totalDegenRewards: number;
  withClaimsCount: number;
  zeroClaimsCount: number;
  highestBountyEth: { title: string; amount: number; chain: ChainSlug; id: number } | null;
  highestBountyDegen: { title: string; amount: number; chain: ChainSlug; id: number } | null;
  chainCounts: Record<ChainSlug, number>;
  activeChainCounts: Record<ChainSlug, number>;
}
