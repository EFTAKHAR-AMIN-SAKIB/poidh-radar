import { ChainConfig, ChainSlug } from "./types";

export const CHAINS: Record<ChainSlug, ChainConfig> = {
  base: {
    slug: "base",
    name: "Base",
    shortName: "Base",
    chainId: 8453,
    nativeCurrency: "ETH",
    icon: "🔵",
    color: "#0052ff",
    accentColor: "rgb(0, 82, 255)",
    bgGlow: "rgba(0, 82, 255, 0.15)",
    explorerUrl: "https://basescan.org",
    poidhUrl: "https://poidh.xyz/base",
    description: "Coinbase's Layer 2 Ethereum rollup, the primary home of POIDH bounties.",
  },
  degen: {
    slug: "degen",
    name: "Degen Chain",
    shortName: "Degen",
    chainId: 666666666,
    nativeCurrency: "DEGEN",
    icon: "🎩",
    color: "#a855f7",
    accentColor: "rgb(168, 85, 247)",
    bgGlow: "rgba(168, 85, 247, 0.15)",
    explorerUrl: "https://explorer.degen.tips",
    poidhUrl: "https://poidh.xyz/degen",
    description: "Farcaster-native Layer 3 network with viral tip-driven social bounties.",
  },
  arbitrum: {
    slug: "arbitrum",
    name: "Arbitrum One",
    shortName: "Arbitrum",
    chainId: 42161,
    nativeCurrency: "ETH",
    icon: "💙",
    color: "#28a0f0",
    accentColor: "rgb(40, 160, 240)",
    bgGlow: "rgba(40, 160, 240, 0.15)",
    explorerUrl: "https://arbiscan.io",
    poidhUrl: "https://poidh.xyz/arbitrum",
    description: "Leading Ethereum L2 rollup supporting high-throughput onchain bounties.",
  },
  mainnet: {
    slug: "mainnet",
    name: "Ethereum Mainnet",
    shortName: "Mainnet",
    chainId: 1,
    nativeCurrency: "ETH",
    icon: "⟠",
    color: "#627eea",
    accentColor: "rgb(98, 126, 234)",
    bgGlow: "rgba(98, 126, 234, 0.15)",
    explorerUrl: "https://etherscan.io",
    poidhUrl: "https://poidh.xyz/mainnet",
    description: "The decentralized base layer of Ethereum for flagship onchain coordinate actions.",
  },
};

export const CHAIN_ORDER: ChainSlug[] = ["base", "degen", "arbitrum", "mainnet"];

export function getChainConfig(slug: string): ChainConfig {
  const s = slug.toLowerCase() as ChainSlug;
  return (
    CHAINS[s] || {
      slug: "base",
      name: slug,
      shortName: slug,
      chainId: 0,
      nativeCurrency: "ETH",
      icon: "🌐",
      color: "#3b82f6",
      accentColor: "rgb(59, 130, 246)",
      bgGlow: "rgba(59, 130, 246, 0.15)",
      explorerUrl: "https://etherscan.io",
      poidhUrl: `https://poidh.xyz/${slug}`,
      description: `Ecosystem support for ${slug}`,
    }
  );
}
