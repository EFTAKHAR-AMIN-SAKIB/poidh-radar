"use client";

import React from "react";
import Link from "next/link";
import {
  Activity,
  Award,
  CircleDollarSign,
  Compass,
  Flame,
  Globe,
  Layers,
  ShieldAlert,
  Sparkles,
  Zap,
} from "lucide-react";
import { CHAINS } from "@/lib/poidh/chains";
import { PulseStats } from "@/lib/poidh/types";
import { ChainIcon } from "../ui/ChainIcon";

interface LiveBountyPulseProps {
  stats: PulseStats;
}

export function LiveBountyPulse({ stats }: LiveBountyPulseProps) {
  const zeroClaimsPct = stats.totalBounties > 0
    ? Math.round((stats.zeroClaimsCount / stats.totalBounties) * 100)
    : 0;

  const statCards = [
    {
      title: "Total Discovered",
      value: stats.totalBounties.toLocaleString(),
      subtext: `${stats.activeBounties} currently active`,
      icon: Layers,
    },
    {
      title: "Open Opportunities",
      value: stats.activeBounties.toLocaleString(),
      subtext: `${zeroClaimsPct}% have 0 submissions`,
      icon: Sparkles,
    },
    {
      title: "ETH Rewards Pool",
      value: `${stats.totalEthRewards.toFixed(2)} ETH`,
      subtext: stats.highestBountyEth
        ? `Max: ${stats.highestBountyEth.amount.toFixed(2)} ETH`
        : "Base, Arbitrum & Mainnet",
      icon: CircleDollarSign,
    },
    {
      title: "DEGEN Rewards Pool",
      value: stats.totalDegenRewards >= 1000
        ? `${(stats.totalDegenRewards / 1000).toFixed(1)}k DEGEN`
        : `${stats.totalDegenRewards.toFixed(0)} DEGEN`,
      subtext: stats.highestBountyDegen
        ? `Max: ${(stats.highestBountyDegen.amount / 1000).toFixed(0)}k DEGEN`
        : "Social bounties on Degen L3",
      icon: Award,
    },
  ];

  return (
    <section className="py-4 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto space-y-3">
        {/* Section Title */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#D97757]" />
            <h2 className="text-xs font-mono font-bold tracking-widest uppercase text-[#6B6B67]">
              Live Ecosystem Pulse
            </h2>
          </div>
          <div className="text-[11px] font-mono text-[#8E8E8A]">
            Real-time onchain metrics
          </div>
        </div>

        {/* Pulse Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="p-4 rounded-xl border border-[#E5E4DF] bg-[#FFFFFF] shadow-paper space-y-2 hover:border-[#D1D0C9] transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase tracking-wider text-[#6B6B67]">
                    {card.title}
                  </span>
                  <div className="p-1.5 rounded-md bg-[#F0EEE6] border border-[#E5E4DF] text-[#D97757]">
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                </div>

                <div className="space-y-0.5">
                  <div className="text-xl font-bold font-mono tracking-tight text-[#141413]">
                    {card.value}
                  </div>
                  <div className="text-[11px] font-mono text-[#6B6B67]">
                    {card.subtext}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Chain breakdown bar with Official Chain Vector Logos */}
        <div className="p-3 rounded-xl border border-[#E5E4DF] bg-[#F0EEE6] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs font-mono">
          <span className="text-[#6B6B67] font-medium flex-shrink-0">Network Distribution:</span>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 touch-pan-x">
            {(["base", "degen", "arbitrum", "mainnet"] as const).map((chain) => {
              const cfg = CHAINS[chain];
              const count = stats.chainCounts[chain] || 0;
              const activeCount = stats.activeChainCounts[chain] || 0;
              return (
                <Link
                  key={chain}
                  href={`/bounties?chain=${chain}`}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-[#E5E4DF] bg-[#FFFFFF] hover:border-[#D97757] hover:shadow-sm active:scale-95 transition-all text-[#141413] flex-shrink-0 shadow-2xs"
                >
                  <ChainIcon chain={chain} size="sm" />
                  <span className="font-semibold">{cfg.name}:</span>
                  <span className="font-bold text-[#141413]">{count}</span>
                  <span className="text-[#6B6B67] text-[10px]">({activeCount} open)</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
