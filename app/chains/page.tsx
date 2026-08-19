import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  CircleDollarSign,
  Compass,
  ExternalLink,
  Layers,
  Sparkles,
  Zap,
} from "lucide-react";
import { CHAINS, CHAIN_ORDER } from "@/lib/poidh/chains";
import { calculatePulseStats, getAllBounties } from "@/lib/poidh/client";
import { ChainSlug } from "@/lib/poidh/types";
import { formatReward } from "@/lib/utils/format";
import { ChainIcon } from "@/components/ui/ChainIcon";

export const metadata: Metadata = {
  title: "Ecosystem Networks — POIDH Radar",
  description:
    "Explore POIDH bounty distribution, reward volume, and active opportunities across Base, Degen, Arbitrum, and Ethereum Mainnet.",
};

export const revalidate = 60;

export default async function ChainsPage() {
  const bounties = await getAllBounties();
  const stats = calculatePulseStats(bounties);

  const chainSummaries = CHAIN_ORDER.map((slug) => {
    const config = CHAINS[slug];
    const chainBounties = bounties.filter((b) => b.chain === slug);
    const count = chainBounties.length;
    const activeCount = chainBounties.filter((b) => b.status === "open").length;
    const completedCount = chainBounties.filter((b) => b.status === "paid").length;
    const sharePct = bounties.length > 0 ? Math.round((count / bounties.length) * 100) : 0;

    let totalAmount = 0;
    let highestBounty = chainBounties[0] || null;

    for (const b of chainBounties) {
      totalAmount += b.amountNumber;
      if (!highestBounty || b.amountNumber > highestBounty.amountNumber) {
        highestBounty = b;
      }
    }

    return {
      config,
      slug,
      count,
      activeCount,
      completedCount,
      sharePct,
      totalAmount,
      highestBounty,
    };
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Page Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border border-[#E5E4DF] bg-[#F0EEE6] text-xs font-mono text-[#6B6B67]">
          <Compass className="w-3.5 h-3.5 text-[#D97757]" />
          <span>MULTI-CHAIN ECOSYSTEMS</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#141413]">
          Supported Networks
        </h1>
        <p className="text-sm sm:text-base text-[#6B6B67] max-w-2xl leading-relaxed">
          Analyze bounty volume, open opportunities, and reward distributions across all 4 networks indexed by POIDH Radar.
        </p>
      </div>

      {/* Grid of Chain Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {chainSummaries.map((chain) => {
          const { config, count, activeCount, completedCount, sharePct, totalAmount, highestBounty } = chain;
          const isDegen = config.nativeCurrency.toUpperCase() === "DEGEN";
          const formattedTotal = isDegen
            ? `${(totalAmount / 1000).toFixed(1)}k DEGEN`
            : `${totalAmount.toFixed(2)} ETH`;

          return (
            <div
              key={chain.slug}
              className="rounded-xl border border-[#E5E4DF] bg-[#FFFFFF] p-6 space-y-5 shadow-paper hover:border-[#D1D0C9] transition-all flex flex-col justify-between"
            >
              {/* Header */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-[#F0EEE6] border border-[#E5E4DF] flex items-center justify-center shadow-sm">
                      <ChainIcon chain={chain.slug} size="lg" className="w-7 h-7" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-[#141413]">
                        {config.name}
                      </h2>
                      <span className="text-xs font-mono text-[#8E8E8A]">
                        Chain ID {config.chainId} • {config.nativeCurrency}
                      </span>
                    </div>
                  </div>

                  <span className="text-xs font-mono px-2.5 py-0.5 rounded-md border border-[#E5E4DF] bg-[#F0EEE6] text-[#141413] font-bold">
                    {sharePct}% Share
                  </span>
                </div>

                <p className="text-xs text-[#6B6B67] leading-relaxed">
                  {config.description}
                </p>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-lg border border-[#E5E4DF] bg-[#FAF9F5] font-mono text-xs">
                <div>
                  <span className="text-[#8E8E8A] text-[10px] block">TOTAL BOUNTIES</span>
                  <span className="text-base font-bold text-[#141413]">{count}</span>
                </div>
                <div>
                  <span className="text-[#8E8E8A] text-[10px] block">OPEN NOW</span>
                  <span className="text-base font-bold text-[#D97757]">{activeCount}</span>
                </div>
                <div>
                  <span className="text-[#8E8E8A] text-[10px] block">COMPLETED</span>
                  <span className="text-base font-bold text-[#141413]">{completedCount}</span>
                </div>
              </div>

              {/* Highlight / Top Bounty */}
              {highestBounty && (
                <div className="space-y-1 text-xs font-mono pt-2 border-t border-[#E5E4DF]">
                  <span className="text-[#8E8E8A] text-[10px] block">HIGHEST REWARD BOUNTY</span>
                  <Link
                    href={`/bounty/${highestBounty.chain}/${highestBounty.id}`}
                    className="text-[#141413] font-semibold hover:text-[#D97757] line-clamp-1 block transition-colors font-sans text-xs sm:text-sm"
                  >
                    {highestBounty.title}
                  </Link>
                  <div className="text-[#D97757] font-bold">
                    {formatReward(highestBounty.amountWei, highestBounty.currency).fullWithSymbol}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-between gap-3">
                <a
                  href={config.explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-mono text-[#6B6B67] hover:text-[#141413] transition-colors"
                >
                  <span>Block Explorer</span>
                  <ExternalLink className="w-3 h-3" />
                </a>

                <Link
                  href={`/bounties?chain=${chain.slug}`}
                  className="inline-flex items-center gap-1 text-xs font-mono font-medium px-3.5 py-1.5 rounded-md bg-[#D97757] hover:bg-[#CC785C] text-white transition-colors"
                >
                  <span>Explore {config.shortName}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
