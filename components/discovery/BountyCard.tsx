"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, Compass, Flame, Image as ImageIcon, Sparkles, Target, Users } from "lucide-react";
import { CHAINS } from "@/lib/poidh/chains";
import { Bounty } from "@/lib/poidh/types";
import { cn } from "@/lib/utils/cn";
import { formatRelativeTime, formatReward } from "@/lib/utils/format";
import { ChainBadge, StatusBadge } from "../ui/Badge";
import { ChainIcon } from "../ui/ChainIcon";
import { ScoreBreakdownModal } from "../visual/ScoreBreakdownModal";

interface BountyCardProps {
  bounty: Bounty;
  featured?: boolean;
  className?: string;
}

/**
 * Premium interactive empty state for bounties without submitted proof images
 */
function EmptyThumbnailState({ bounty }: { bounty: Bounty }) {
  const isZeroClaims = bounty.claimCount === 0;

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-b from-[#FAF9F5] via-[#F4F2EA] to-[#ECEAE0] overflow-hidden select-none">
      {/* Background Decorative Radar Grid & Crosshairs */}
      <svg
        className="absolute inset-0 w-full h-full opacity-35 group-hover:opacity-55 transition-opacity duration-300 pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 320 200"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <radialGradient id={`radar-grad-${bounty.key}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#D97757" stopOpacity="0.12" />
            <stop offset="60%" stopColor="#D97757" stopOpacity="0.03" />
            <stop offset="100%" stopColor="#D97757" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ambient Radar Glow */}
        <circle cx="160" cy="100" r="95" fill={`url(#radar-grad-${bounty.key})`} />

        {/* Concentric Target Circles */}
        <circle cx="160" cy="100" r="30" fill="none" stroke="#D5D1C5" strokeWidth="1" strokeDasharray="3 3" />
        <circle cx="160" cy="100" r="60" fill="none" stroke="#DDD9CE" strokeWidth="1" />
        <circle cx="160" cy="100" r="90" fill="none" stroke="#E5E1D6" strokeWidth="1" strokeDasharray="4 4" />

        {/* Crosshair Axes */}
        <line x1="160" y1="10" x2="160" y2="190" stroke="#DDD9CE" strokeWidth="1" strokeDasharray="2 2" />
        <line x1="30" y1="100" x2="290" y2="100" stroke="#DDD9CE" strokeWidth="1" strokeDasharray="2 2" />

        {/* Corner Viewfinder Marks */}
        <path d="M 20 25 L 20 15 L 30 15" fill="none" stroke="#D1CDC2" strokeWidth="1.5" />
        <path d="M 300 25 L 300 15 L 290 15" fill="none" stroke="#D1CDC2" strokeWidth="1.5" />
        <path d="M 20 175 L 20 185 L 30 185" fill="none" stroke="#D1CDC2" strokeWidth="1.5" />
        <path d="M 300 175 L 300 185 L 290 185" fill="none" stroke="#D1CDC2" strokeWidth="1.5" />
      </svg>

      {/* Foreground Content Stack */}
      <div className="relative z-10 flex flex-col items-center justify-center space-y-1.5 max-w-[240px]">
        {/* Dynamic Status Pill */}
        {isZeroClaims ? (
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#D97757]/10 border border-[#D97757]/20 text-[#D97757] text-[9px] font-mono font-bold uppercase tracking-wider shadow-2xs">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D97757] opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#D97757]" />
            </span>
            <span>0 CLAIMS · OPEN</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#3B82F6]/10 border border-[#3B82F6]/20 text-[#2563EB] text-[9px] font-mono font-bold uppercase tracking-wider shadow-2xs">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2563EB] opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#2563EB]" />
            </span>
            <span>
              {bounty.claimCount} {bounty.claimCount === 1 ? "CLAIM" : "CLAIMS"} · IN PROGRESS
            </span>
          </div>
        )}

        {/* Dynamic Headline */}
        <h4 className="font-serif font-bold text-[#141413] text-sm sm:text-[15px] leading-tight group-hover:text-[#D97757] transition-colors">
          {isZeroClaims ? "Be the First to Claim" : "Proof in Progress"}
        </h4>

        {/* Supporting Explanation */}
        <p className="text-[11px] text-[#6B6B67] leading-snug font-sans max-w-[210px] line-clamp-2">
          {isZeroClaims
            ? "No submission yet — your proof could be the first."
            : "Claims have been submitted. See what others are working on."}
        </p>

        {/* Interactive CTA Pill */}
        <div className="pt-1">
          <span
            className={cn(
              "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[#FFFFFF] border font-mono text-[10px] font-bold shadow-2xs transition-all duration-200",
              isZeroClaims
                ? "border-[#E5E4DF] text-[#141413] group-hover:border-[#D97757] group-hover:bg-[#FAF9F5] group-hover:text-[#D97757]"
                : "border-[#E5E4DF] text-[#141413] group-hover:border-[#2563EB] group-hover:bg-[#FAF9F5] group-hover:text-[#2563EB]"
            )}
          >
            <span>{isZeroClaims ? "View Bounty" : "View Claims"}</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </div>
    </div>
  );
}

export function BountyCard({ bounty, featured = false, className }: BountyCardProps) {
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  const rewardInfo = formatReward(bounty.amountWei, bounty.currency, bounty.priceUsd);
  const chainConfig = CHAINS[bounty.chain] || CHAINS.base;

  const displayReward = rewardInfo.usdEstimate
    ? rewardInfo.usdEstimate
    : `${bounty.amountNumber.toFixed(bounty.amountNumber < 0.01 ? 4 : 2)} ${bounty.currency}`;

  const hasValidProofImage = Boolean(bounty.proofImage && !imgError);

  return (
    <>
      <div
        className={cn(
          "group relative flex flex-col justify-between rounded-xl border border-[#E5E4DF] bg-[#FFFFFF] shadow-paper transition-all duration-200 hover:-translate-y-1 hover:border-[#D1D0C9] hover:shadow-paper-lg overflow-hidden",
          className
        )}
      >
        {/* Clickable Card Link Anchor */}
        <Link
          href={`/bounty/${bounty.chain}/${bounty.id}`}
          className="block relative aspect-[16/10] w-full bg-[#F0EEE6] border-b border-[#E5E4DF] overflow-hidden select-none"
        >
          {hasValidProofImage ? (
            <>
              {/* Loading Skeleton */}
              {!imgLoaded && (
                <div className="absolute inset-0 w-full h-full bg-[#F0EEE6] animate-pulse flex items-center justify-center">
                  <span className="w-5 h-5 border-2 border-[#D97757]/30 border-t-[#D97757] rounded-full animate-spin" />
                </div>
              )}
              <img
                src={bounty.proofImage!}
                alt={bounty.title}
                onLoad={() => setImgLoaded(true)}
                onError={() => setImgError(true)}
                className={cn(
                  "w-full h-full object-cover group-hover:scale-105 transition-all duration-300",
                  imgLoaded ? "opacity-100" : "opacity-0"
                )}
                loading="lazy"
              />
            </>
          ) : (
            /* Premium Interactive Discovery Empty State */
            <EmptyThumbnailState bounty={bounty} />
          )}

          {/* Radar Score Badge (Top-Right) */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowScoreModal(true);
            }}
            title="Click to view Radar Score breakdown"
            className="absolute top-2.5 right-2.5 flex items-center gap-1 font-mono text-[11px] font-bold px-2 py-0.5 rounded-md border border-[#E5E4DF] bg-[#FAF9F5]/95 text-[#141413] shadow-sm hover:border-[#D97757] hover:text-[#D97757] transition-colors z-20"
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
