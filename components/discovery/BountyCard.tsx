"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Compass, Flame, Image as ImageIcon, Sparkles, Target, Users } from "lucide-react";
import { CHAINS } from "@/lib/poidh/chains";
import { getNextGatewayUrl } from "@/lib/poidh/normalize";
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
 * Clean raw markdown headings, links, and formatting from bounty descriptions
 * for compact card preview text.
 */
function cleanDescription(desc: string | null | undefined): string {
  if (!desc) return "";
  return desc
    .replace(/^#+\s+.*$/gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_~`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
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
        {bounty.status === "open" ? (
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 text-[9px] font-mono font-bold uppercase tracking-wider shadow-2xs">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
            </span>
            <span>
              {bounty.claimCount === 0 ? "0 CLAIMS · OPEN" : `${bounty.claimCount} ${bounty.claimCount === 1 ? "CLAIM" : "CLAIMS"} · OPEN`}
            </span>
          </div>
        ) : bounty.status === "review" ? (
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700 text-[9px] font-mono font-bold uppercase tracking-wider shadow-2xs">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500" />
            </span>
            <span>
              {bounty.claimCount} {bounty.claimCount === 1 ? "CLAIM" : "CLAIMS"} · VOTING IN PROGRESS
            </span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#F0EEE6] border border-[#E5E4DF] text-[#6B6B67] text-[9px] font-mono font-bold uppercase tracking-wider shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-[#8E8E8A]" />
            <span>
              {bounty.claimCount > 0 ? `${bounty.claimCount} ${bounty.claimCount === 1 ? "CLAIM" : "CLAIMS"} · PAST BOUNTY` : "PAST BOUNTY"}
            </span>
          </div>
        )}

        {/* Dynamic Headline */}
        <h4 className="font-serif font-bold text-[#141413] text-xs sm:text-[15px] leading-tight group-hover:text-[#D97757] transition-colors">
          {bounty.status === "open"
            ? (bounty.claimCount === 0 ? "Be the First to Claim" : "Open for Submissions")
            : bounty.status === "review"
            ? "Voting in Progress"
            : "Past Bounty"}
        </h4>

        {/* Supporting Explanation */}
        <p className="hidden sm:block text-[11px] text-[#6B6B67] leading-snug font-sans max-w-[210px] line-clamp-2">
          {bounty.status === "open"
            ? (bounty.claimCount === 0
                ? "No submission yet — your proof could be the first."
                : "Active onchain bounty accepting proof submissions.")
            : bounty.status === "review"
            ? "Community voting or multisig review is actively in progress."
            : "This bounty has concluded or was settled."}
        </p>

        {/* Interactive CTA Pill */}
        <div className="pt-0.5 sm:pt-1">
          <span
            className={cn(
              "inline-flex items-center gap-1 px-2 sm:px-2.5 py-0.5 rounded-md bg-[#FFFFFF] border font-mono text-[9px] sm:text-[10px] font-bold shadow-2xs transition-all duration-200",
              bounty.status === "open"
                ? "border-[#E5E4DF] text-[#141413] group-hover:border-[#D97757] group-hover:bg-[#FAF9F5] group-hover:text-[#D97757]"
                : bounty.status === "review"
                ? "border-[#E5E4DF] text-[#141413] group-hover:border-amber-500 group-hover:bg-[#FAF9F5] group-hover:text-amber-700"
                : "border-[#E5E4DF] text-[#141413] group-hover:border-[#6B6B67] group-hover:bg-[#FAF9F5] group-hover:text-[#141413]"
            )}
          >
            <span>{bounty.claimCount > 0 ? "Claims" : "View"}</span>
            <ArrowRight className="w-2.5 h-2.5 sm:w-3 sm:h-3 group-hover:translate-x-0.5 transition-transform" />
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
  const [imgSrc, setImgSrc] = useState(bounty.proofImage);
  const imgTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const rewardInfo = formatReward(bounty.amountWei, bounty.currency, bounty.priceUsd);
  const chainConfig = CHAINS[bounty.chain] || CHAINS.base;

  // Primary: native token amount (e.g. "0.0301 ETH"), matching the detail page
  const displayReward = rewardInfo.fullWithSymbol;

  const hasValidProofImage = Boolean(imgSrc && !imgError);

  // Image load timeout — if image hasn't loaded within 10s, try next gateway or give up
  useEffect(() => {
    if (!imgSrc || imgLoaded || imgError) return;

    imgTimeoutRef.current = setTimeout(() => {
      const nextUrl = getNextGatewayUrl(imgSrc);
      if (nextUrl && nextUrl !== imgSrc) {
        setImgSrc(nextUrl);
      } else {
        setImgError(true);
      }
    }, 10000);

    return () => {
      if (imgTimeoutRef.current) clearTimeout(imgTimeoutRef.current);
    };
  }, [imgSrc, imgLoaded, imgError]);

  // Handle image error — try next IPFS gateway before giving up
  const handleImgError = () => {
    if (imgTimeoutRef.current) clearTimeout(imgTimeoutRef.current);
    const nextUrl = getNextGatewayUrl(imgSrc);
    if (nextUrl && nextUrl !== imgSrc) {
      setImgSrc(nextUrl);
    } else {
      setImgError(true);
    }
  };

  return (
    <>
      <div
        className={cn(
          "group relative flex flex-col justify-between rounded-xl border border-[#E5E4DF] bg-[#FFFFFF] shadow-paper transition-all duration-200 hover:-translate-y-1 hover:border-[#D1D0C9] hover:shadow-paper-lg overflow-hidden",
          className
        )}
      >
        {/* Top Thumbnail Section with Unnested Score Badge */}
        <div className="relative aspect-[16/10] w-full bg-[#F0EEE6] border-b border-[#E5E4DF] overflow-hidden select-none">
          <Link
            href={`/bounty/${bounty.chain}/${bounty.id}`}
            className="block w-full h-full"
            aria-label={`View bounty: ${bounty.title}`}
          >
            {hasValidProofImage ? (
              <>
                {/* Loading Skeleton */}
                {!imgLoaded && (
                  <div className="absolute inset-0 w-full h-full bg-[#F0EEE6] animate-pulse flex items-center justify-center">
                    <span className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-[#D97757]/30 border-t-[#D97757] rounded-full animate-spin" />
                  </div>
                )}
                <img
                  src={imgSrc!}
                  alt={bounty.title}
                  onLoad={() => {
                    if (imgTimeoutRef.current) clearTimeout(imgTimeoutRef.current);
                    setImgLoaded(true);
                  }}
                  onError={handleImgError}
                  className={cn(
                    "w-full h-full object-cover group-hover:scale-105 transition-all duration-300",
                    imgLoaded ? "opacity-100" : "opacity-0"
                  )}
                  loading="lazy"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                />
              </>
            ) : (
              /* Premium Interactive Discovery Empty State */
              <EmptyThumbnailState bounty={bounty} />
            )}
          </Link>

          {/* Radar Score Badge (Top-Right) */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowScoreModal(true);
            }}
            title="Click to view Radar Score breakdown"
            aria-label={`Radar score: ${bounty.radarScore} out of 100. Click to view breakdown`}
            className="absolute top-1.5 right-1.5 sm:top-2.5 sm:right-2.5 flex items-center gap-1 font-mono text-[10px] sm:text-[11px] font-bold px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-md border border-[#E5E4DF] bg-[#FAF9F5]/95 backdrop-blur-sm text-[#141413] shadow-sm hover:border-[#D97757] hover:text-[#D97757] active:scale-95 transition-all z-20 cursor-pointer touch-manipulation"
          >
            <Flame className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#D97757] fill-[#D97757]" />
            <span>{bounty.radarScore}</span>
          </button>
        </div>

        {/* Card Body */}
        <div className="p-2.5 sm:p-4 flex-1 flex flex-col justify-between space-y-2 sm:space-y-3">
          <div className="space-y-1.5 sm:space-y-2">
            {/* Badges Row */}
            <div className="flex items-center justify-between gap-1 sm:gap-2 flex-wrap">
              <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                <ChainBadge chain={bounty.chain} size="sm" />
                <StatusBadge status={bounty.status} size="sm" />

                {bounty.isMultiplayer && (
                  <span className="inline-flex items-center gap-0.5 text-[9px] sm:text-[10px] font-mono text-[#6B6B67] bg-[#F0EEE6] border border-[#E5E4DF] px-1 py-0.5 rounded">
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
              <h3 className="font-bold text-[#141413] text-xs sm:text-base leading-snug line-clamp-2">
                {bounty.title}
              </h3>
            </Link>

            {/* Description (Visible on larger screens with clean 2-line clamp) */}
            {bounty.description && cleanDescription(bounty.description) && (
              <p className="hidden sm:block text-xs text-[#6B6B67] line-clamp-2 leading-relaxed font-sans overflow-hidden">
                {cleanDescription(bounty.description)}
              </p>
            )}
          </div>

          {/* Reward & Submissions Row */}
          <div className="pt-2 sm:pt-3 border-t border-[#E5E4DF] flex items-center justify-between gap-1 sm:gap-2">
            {/* Reward Box */}
            <div className="p-1 sm:px-2.5 sm:py-1 rounded bg-[#F0EEE6] border border-[#E5E4DF] font-mono min-w-0">
              <div className="text-[#141413] font-bold text-[11px] sm:text-sm truncate">
                {displayReward}
              </div>
              {rewardInfo.usdEstimate && (
                <div className="text-[9px] sm:text-[10px] text-[#6B6B67] truncate">
                  {rewardInfo.usdEstimate}
                </div>
              )}
            </div>

            {/* Submissions text */}
            <div className="text-right text-[10px] sm:text-xs font-mono text-[#6B6B67] flex-shrink-0">
              {bounty.claimCount}{" "}
              {bounty.claimCount === 1 ? "claim" : "claims"}
            </div>
          </div>

          {/* Bottom Action: View Bounty → */}
          <div className="pt-0.5 sm:pt-1 flex items-center justify-between">
            <span suppressHydrationWarning className="text-[10px] sm:text-[11px] font-mono text-[#8E8E8A]">
              {formatRelativeTime(bounty.createdAt)}
            </span>
            <Link
              href={`/bounty/${bounty.chain}/${bounty.id}`}
              className="inline-flex items-center gap-0.5 sm:gap-1 text-[10px] sm:text-xs font-mono font-medium text-[#D97757] group-hover:text-[#CC785C] group-hover:translate-x-0.5 transition-all"
            >
              <span>View</span>
              <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
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
