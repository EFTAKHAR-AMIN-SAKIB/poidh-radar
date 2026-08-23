"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Bounty } from "@/lib/poidh/types";
import { BountyCard } from "./BountyCard";

interface HiddenGemsProps {
  bounties: Bounty[];
}

export function HiddenGems({ bounties }: HiddenGemsProps) {
  const gems = bounties
    .filter((b) => b.status === "open" && b.claimCount <= 1 && b.amountNumber > 0)
    .sort((a, b) => {
      const oppA = (a.radarBreakdown?.competition || 0) + (a.radarBreakdown?.rewardMagnitude || 0);
      const oppB = (b.radarBreakdown?.competition || 0) + (b.radarBreakdown?.rewardMagnitude || 0);
      return oppB - oppA;
    })
    .slice(0, 8);

  if (gems.length === 0) return null;

  return (
    <section id="gems" className="py-8 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto space-y-5">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-3 border-b border-[#E5E4DF]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-[#D97757]/10 text-[#D97757]">
                <Sparkles className="w-4 h-4" />
              </span>
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#141413]">
                Hidden Gems
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-[#6B6B67]">
              Overlooked opportunities — currently open bounties with low competition (0–1 claims) and meaningful rewards.
            </p>
          </div>

          <Link
            href="/bounties?status=open&sort=reward-desc"
            className="inline-flex items-center gap-1 text-xs font-mono font-medium text-[#D97757] hover:text-[#CC785C] transition-colors"
          >
            <span>View All Open Gems</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Bounties Grid - 2 columns on mobile for better density */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
          {gems.map((bounty) => (
            <BountyCard key={bounty.key} bounty={bounty} />
          ))}
        </div>
      </div>
    </section>
  );
}
