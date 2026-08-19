"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, Flame, Image as ImageIcon, Users } from "lucide-react";
import { CHAINS } from "@/lib/poidh/chains";
import { Bounty } from "@/lib/poidh/types";
import { cn } from "@/lib/utils/cn";
import { formatRelativeTime, formatReward } from "@/lib/utils/format";
import { ChainBadge, StatusBadge, TagBadge } from "../ui/Badge";
import { ChainIcon } from "../ui/ChainIcon";
import { ScoreBreakdownModal } from "../visual/ScoreBreakdownModal";

interface BountyCardProps {
  bounty: Bounty;
  featured?: boolean;
  className?: string;
}

export function BountyCard({ bounty, featured = false, className }: BountyCardProps) {
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [imgError, setImgError] = useState(false);
  const rewardInfo = formatReward(bounty.amountWei, bounty.currency, bounty.priceUsd);
  const chainConfig = CHAINS[bounty.chain] || CHAINS.base;

  const displayReward = rewardInfo.usdEstimate
    ? rewardInfo.usdEstimate
    : `${bounty.amountNumber.toFixed(bounty.amountNumber < 0.01 ? 4 : 2)} ${bounty.currency}`;

  return (
    <>
      <div
        className={cn(
          "group relative flex flex-col justify-between rounded-xl border border-[#E5E4DF] bg-[#FFFFFF] shadow-paper transition-all duration-200 hover:-translate-y-0.5 hover:border-[#D1D0C9] hover:shadow-paper-md overflow-hidden",
          className
        )}
      >
        {/* Top Media Frame / Contact Sheet Thumbnail */}
        <Link
          href={`/bounty/${bounty.chain}/${bounty.id}`}
          className="block relative aspect-[16/10] w-full bg-[#F0EEE6] border-b border-[#E5E4DF] overflow-hidden select-none"
        >
          {bounty.proofImage && !imgError ? (
            <img
              src={bounty.proofImage}
              alt={bounty.title}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            /* Calm Editorial Monogram Frame with Official Chain Vector Logo */
            <div className="w-full h-full flex items-center justify-center p-4 bg-[#F0EEE6]">
              <div className="w-14 h-14 rounded-full bg-[#FAF9F5] border border-[#E5E4DF] flex items-center justify-center shadow-sm">
                <ChainIcon chain={bounty.chain} size="lg" className="w-8 h-8" />
              </div>
            </div>
          )}

          {/* Radar Score Badge (Top-Right) */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowScoreModal(true);
            }}
            title="Click to view Radar Score breakdown"
            className="absolute top-2.5 right-2.5 flex items-center gap-1 font-mono text-[11px] font-bold px-2 py-0.5 rounded-md border border-[#E5E4DF] bg-[#FAF9F5]/95 text-[#141413] shadow-sm hover:border-[#D97757] transition-colors z-10"
          >
            <Flame className="w-3 h-3 text-[#D97757] fill-[#D97757]" />
            <span>{bounty.radarScore}</span>
          </button>
        </Link>

        {/* Card Body */}
        <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
          <div className="space-y-2">
            {/* Badges Row */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 flex-wrap">
                <ChainBadge chain={bounty.chain} size="sm" />
                <StatusBadge status={bounty.status} size="sm" />

                {bounty.isMultiplayer && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono text-[#6B6B67] bg-[#F0EEE6] border border-[#E5E4DF] px-1.5 py-0.5 rounded">
                    <Users className="w-2.5 h-2.5" /> MP
                  </span>
                )}
              </div>
            </div>

            {/* Title */}
            <Link
              href={`/bounty/${bounty.chain}/${bounty.id}`}
              className="block group-hover:text-[#D97757] transition-colors"
            >
              <h3 className="font-bold text-[#141413] text-base leading-snug line-clamp-2">
                {bounty.title}
              </h3>
            </Link>

            {/* Description */}
            {bounty.description && (
              <p className="text-xs text-[#6B6B67] line-clamp-2 leading-relaxed font-sans">
                {bounty.description}
              </p>
            )}
          </div>

          {/* Reward & Submissions Row */}
          <div className="pt-3 border-t border-[#E5E4DF] flex items-center justify-between gap-2">
            {/* Reward Box */}
            <div className="px-2.5 py-1 rounded bg-[#F0EEE6] border border-[#E5E4DF] text-[#141413] font-bold text-xs sm:text-sm font-mono">
              {displayReward}
            </div>

            {/* Submissions text */}
            <div className="text-right text-xs font-mono text-[#6B6B67]">
              {bounty.claimCount}{" "}
              {bounty.claimCount === 1 ? "claim" : "claims"}
            </div>
          </div>

          {/* Bottom Action: View Bounty → */}
          <div className="pt-1 flex items-center justify-between">
            <span className="text-[11px] font-mono text-[#8E8E8A]">
              {formatRelativeTime(bounty.createdAt)}
            </span>
            <Link
              href={`/bounty/${bounty.chain}/${bounty.id}`}
              className="inline-flex items-center gap-1 text-xs font-mono font-medium text-[#D97757] group-hover:text-[#CC785C] group-hover:translate-x-0.5 transition-all"
            >
              <span>View Bounty</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      <ScoreBreakdownModal
        bounty={bounty}
        isOpen={showScoreModal}
        onClose={() => setShowScoreModal(false)}
      />
    </>
  );
}
