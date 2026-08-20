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
    contractAddress: "0x5555Fa783936C260f77385b4E153B9725feF1719",
    v2Offset: 986,
    rpcUrls: [
      "https://mainnet.base.org",
      "https://base.llamarpc.com",
      "https://1rpc.io/base",
    ],
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
    contractAddress: "0x18E5585ca7cE31b90Bc8BB7aAf84152857cE243f",
    v2Offset: 1197,
    rpcUrls: [
      "https://rpc.degen.tips",
    ],
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
    contractAddress: "0x5555Fa783936C260f77385b4E153B9725feF1719",
    v2Offset: 180,
    rpcUrls: [
      "https://arb1.arbitrum.io/rpc",
      "https://arbitrum.llamarpc.com",
      "https://1rpc.io/arb",
    ],
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
    contractAddress: "0xE731dFadBFf20542E10D09D26Fc71445C70d4232",
    v2Offset: 0,
    rpcUrls: [
      "https://eth.llamarpc.com",
      "https://cloudflare-eth.com",
      "https://1rpc.io/eth",
    ],
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
      contractAddress: "0x5555Fa783936C260f77385b4E153B9725feF1719",
      v2Offset: 0,
      rpcUrls: ["https://mainnet.base.org"],
    }
  );
}
