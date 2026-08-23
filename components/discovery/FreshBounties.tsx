"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { Bounty } from "@/lib/poidh/types";
import { formatRelativeTime, formatReward } from "@/lib/utils/format";
import { ChainBadge, StatusBadge } from "../ui/Badge";

interface FreshBountiesProps {
  bounties: Bounty[];
}

export function FreshBounties({ bounties }: FreshBountiesProps) {
  const freshList = [...bounties]
    .filter((b) => b.createdAt)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, 5);

  if (freshList.length === 0) return null;

  return (
    <section id="fresh" className="py-8 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto space-y-5">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-3 border-b border-[#E5E4DF]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-[#D97757]/10 text-[#D97757]">
                <Clock className="w-4 h-4" />
              </span>
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#141413]">
                Fresh on POIDH
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-[#6B6B67]">
              The newest bounties posted across all supported chains in chronological order.
            </p>
          </div>

          <Link
            href="/bounties?sort=newest"
            className="inline-flex items-center gap-1 text-xs font-mono font-medium text-[#D97757] hover:text-[#CC785C] transition-colors"
          >
            <span>Explore All New Drops</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Chronological Stream List */}
        <div className="space-y-2.5">
          {freshList.map((bounty, idx) => {
            const rewardInfo = formatReward(bounty.amountWei, bounty.currency, bounty.priceUsd);
            return (
              <Link
                key={bounty.key}
                href={`/bounty/${bounty.chain}/${bounty.id}`}
                className="group flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-4 rounded-xl border border-[#E5E4DF] bg-[#FFFFFF] shadow-paper hover:border-[#D1D0C9] hover:shadow-paper-md active:scale-[0.99] transition-all gap-3 sm:gap-4"
              >
                {/* Left: Drop Tag, Chain, Status, Title, Description */}
                <div className="flex items-start gap-3 sm:gap-4 min-w-0">
                  <div className="flex flex-col items-center justify-center w-8 sm:w-10 text-center p-1 sm:p-1.5 rounded bg-[#F0EEE6] border border-[#E5E4DF] flex-shrink-0">
                    <span className="text-[8px] sm:text-[9px] font-mono uppercase text-[#6B6B67]">
                      DROP
                    </span>
                    <span className="text-[11px] sm:text-xs font-mono font-bold text-[#141413]">
                      #{idx + 1}
                    </span>
                  </div>

                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      <ChainBadge chain={bounty.chain} size="sm" />
                      <StatusBadge status={bounty.status} size="sm" />
                      <span suppressHydrationWarning className="text-[11px] sm:text-xs font-mono text-[#8E8E8A]">
                        {formatRelativeTime(bounty.createdAt)}
                      </span>
                    </div>

                    <h3 className="font-bold text-[#141413] text-sm sm:text-base group-hover:text-[#D97757] transition-colors line-clamp-1">
                      {bounty.title}
                    </h3>

                    {bounty.description && (
                      <p className="text-xs text-[#6B6B67] line-clamp-1 max-w-2xl font-sans">
                        {bounty.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Reward & Score */}
                <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-[#E5E4DF]">
                  <div>
                    <div className="text-[10px] font-mono uppercase text-[#8E8E8A]">
                      Reward
                    </div>
                    <div className="font-mono text-sm font-bold text-[#141413] whitespace-nowrap">
                      {rewardInfo.fullWithSymbol}
                    </div>
                    {rewardInfo.usdEstimate && (
                      <div className="text-[10px] font-mono text-[#6B6B67] sm:hidden">
                        {rewardInfo.usdEstimate}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-xs font-mono px-2 py-0.5 rounded bg-[#F0EEE6] text-[#141413] border border-[#E5E4DF] font-bold whitespace-nowrap shadow-2xs">
                      🔥 {bounty.radarScore}
                    </div>
                    <div className="p-1.5 rounded bg-[#FAF9F5] border border-[#E5E4DF] text-[#6B6B67] group-hover:text-[#D97757] group-hover:border-[#D97757] active:translate-x-0.5 transition-all">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
