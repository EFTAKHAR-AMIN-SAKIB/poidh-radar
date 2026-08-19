"use client";

import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  Image as ImageIcon,
  Sparkles,
  User,
  X,
  ZoomIn,
} from "lucide-react";
import { CHAINS } from "@/lib/poidh/chains";
import { Bounty, ChainSlug, Claim } from "@/lib/poidh/types";
import { formatDate, formatRelativeTime, shortenAddress } from "@/lib/utils/format";
import { Modal } from "../ui/Modal";

interface SubmissionGalleryProps {
  bounty: Bounty;
  claims: Claim[];
  chainSlug: ChainSlug;
}

export function SubmissionGallery({ bounty, claims, chainSlug }: SubmissionGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const chainConfig = CHAINS[chainSlug] || CHAINS.base;

  const activeClaim = selectedIndex !== null && claims[selectedIndex] ? claims[selectedIndex] : null;

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (selectedIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        setSelectedIndex((prev) => (prev !== null && prev < claims.length - 1 ? prev + 1 : 0));
      } else if (e.key === "ArrowLeft") {
        setSelectedIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : claims.length - 1));
      } else if (e.key === "Escape") {
        setSelectedIndex(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIndex, claims.length]);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : claims.length - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIndex((prev) => (prev !== null && prev < claims.length - 1 ? prev + 1 : 0));
  };

  if (claims.length === 0) {
    return (
      <div className="p-8 text-center rounded-lg border border-[#E5E4DF] bg-[#F0EEE6] space-y-2">
        <div className="w-10 h-10 rounded-full bg-[#FFFFFF] border border-[#E5E4DF] flex items-center justify-center mx-auto text-[#6B6B67]">
          <Sparkles className="w-5 h-5 text-[#D97757]" />
        </div>
        <h4 className="text-sm font-bold text-[#141413]">No Submissions Yet</h4>
        <p className="text-xs text-[#6B6B67] max-w-sm mx-auto">
          Be the first creator or builder to submit verifiable proof and claim this bounty on POIDH.
        </p>
        <div className="pt-1">
          <a
            href={bounty.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-mono text-[#D97757] hover:underline"
          >
            <span>Submit proof on POIDH ↗</span>
          </a>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Submissions Grid Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {claims.map((claim, idx) => (
          <div
            key={claim.id || idx}
            onClick={() => setSelectedIndex(idx)}
            className="group relative cursor-pointer rounded-xl border border-[#E5E4DF] bg-[#FFFFFF] p-3 space-y-3 hover:border-[#D97757] hover:shadow-paper-md transition-all flex flex-col justify-between"
          >
            {/* Top Preview Image */}
            <div className="relative aspect-[4/3] w-full rounded-lg overflow-hidden bg-[#F0EEE6] border border-[#E5E4DF]">
              {claim.image ? (
                <>
                  <img
                    src={claim.image}
                    alt={claim.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  {/* Hover Overlay Icon */}
                  <div className="absolute inset-0 bg-[#141413]/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-mono font-medium backdrop-blur-[2px]">
                    <Eye className="w-4 h-4" />
                    <span>Inspect Proof</span>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-[#8E8E8A] gap-1">
                  <ImageIcon className="w-6 h-6 stroke-[1.5]" />
                  <span className="text-[11px] font-mono">No Image Attached</span>
                </div>
              )}

              {/* Status Badge */}
              {claim.accepted && (
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-[#D97757] text-white font-mono text-[10px] font-bold shadow-sm flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>ACCEPTED</span>
                </div>
              )}

              <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-[#141413]/70 text-white font-mono text-[10px] backdrop-blur-sm">
                #{idx + 1} of {claims.length}
              </div>
            </div>

            {/* Content Details */}
            <div className="space-y-1.5 flex-1 flex flex-col justify-between">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-[#141413] group-hover:text-[#D97757] transition-colors line-clamp-1">
                  {claim.title || `Submission #${idx + 1}`}
                </h4>

                {claim.description && (
                  <p className="text-xs text-[#6B6B67] line-clamp-2 leading-relaxed font-sans">
                    {claim.description}
                  </p>
                )}
              </div>

              {/* Claimant Metadata */}
              <div className="pt-2 border-t border-[#E5E4DF] flex items-center justify-between text-[11px] font-mono text-[#8E8E8A]">
                <div className="flex items-center gap-1 truncate text-[#141413]">
                  <User className="w-3 h-3 text-[#6B6B67]" />
                  <span className="truncate">
                    {claim.farcasterHandle
                      ? `@${claim.farcasterHandle}`
                      : claim.twitterHandle
                      ? `@${claim.twitterHandle}`
                      : claim.claimantName || (claim.claimant ? shortenAddress(claim.claimant) : "Anonymous")}
                  </span>
                </div>

                <span className="text-[#D97757] font-medium group-hover:underline flex-shrink-0">
                  View Details →
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Accessible Submission Lightbox / Inspector Modal */}
      {activeClaim && (
        <Modal
          isOpen={selectedIndex !== null}
          onClose={() => setSelectedIndex(null)}
          maxWidth="3xl"
          title={
            <div className="flex items-center justify-between w-full pr-4">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-[#D97757]" />
                <span>
                  Proof Submission {selectedIndex !== null ? `#${selectedIndex + 1}` : ""} of {claims.length}
                </span>
              </div>

              {/* Carousel Next / Prev in Header */}
              {claims.length > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={handlePrev}
                    className="p-1 rounded bg-[#FFFFFF] border border-[#E5E4DF] hover:bg-[#FAF9F5] text-[#141413]"
                    title="Previous Submission (Left Arrow)"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleNext}
                    className="p-1 rounded bg-[#FFFFFF] border border-[#E5E4DF] hover:bg-[#FAF9F5] text-[#141413]"
                    title="Next Submission (Right Arrow)"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          }
        >
          <div className="space-y-6">
            {/* High-Resolution Photo Container */}
            {activeClaim.image ? (
              <div className="relative w-full max-h-[60vh] bg-[#F0EEE6] rounded-xl border border-[#E5E4DF] overflow-hidden flex items-center justify-center p-2 group">
                <img
                  src={activeClaim.image}
                  alt={activeClaim.title}
                  className="max-h-[56vh] w-auto max-w-full object-contain rounded-lg shadow-sm"
                />

                {/* Direct Image Link */}
                <a
                  href={activeClaim.image}
                  target="_blank"
                  rel="noreferrer"
                  className="absolute bottom-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#141413]/80 hover:bg-[#141413] text-white text-[11px] font-mono backdrop-blur-sm transition-all"
                >
                  <span>Open Full Image</span>
                  <ExternalLink className="w-3 h-3" />
                </a>

                {/* Left/Right Floating Nav Buttons */}
                {claims.length > 1 && (
                  <>
                    <button
                      onClick={handlePrev}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#FFFFFF]/90 hover:bg-[#FFFFFF] border border-[#E5E4DF] shadow-md flex items-center justify-center text-[#141413] transition-transform hover:scale-110"
                      title="Previous"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleNext}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#FFFFFF]/90 hover:bg-[#FFFFFF] border border-[#E5E4DF] shadow-md flex items-center justify-center text-[#141413] transition-transform hover:scale-110"
                      title="Next"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="p-8 text-center bg-[#F0EEE6] rounded-xl border border-[#E5E4DF] text-xs font-mono text-[#6B6B67]">
                No image preview attached to this submission.
              </div>
            )}

            {/* Submission Title & Description */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-lg sm:text-xl font-bold text-[#141413] leading-snug">
                  {activeClaim.title || "Untitled Submission"}
                </h3>

                {activeClaim.accepted && (
                  <div className="inline-flex items-center gap-1 px-3 py-1 rounded bg-[#D97757] text-white font-mono text-xs font-bold shadow-sm">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>ACCEPTED WINNER</span>
                  </div>
                )}
              </div>

              {activeClaim.description ? (
                <div className="p-4 rounded-lg border border-[#E5E4DF] bg-[#F0EEE6] text-xs sm:text-sm text-[#141413] leading-relaxed whitespace-pre-wrap font-sans max-h-48 overflow-y-auto">
                  {activeClaim.description}
                </div>
              ) : (
                <p className="text-xs text-[#8E8E8A] italic">
                  No textual description provided with this submission.
                </p>
              )}
            </div>

            {/* Submitter & Verification Metadata Matrix */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl border border-[#E5E4DF] bg-[#FFFFFF] font-mono text-xs shadow-paper">
              {/* Claimant */}
              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-[#8E8E8A] block">
                  Submitter
                </span>
                <div className="flex flex-col">
                  {activeClaim.farcasterHandle && (
                    <a
                      href={`https://warpcast.com/${activeClaim.farcasterHandle}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-bold text-[#D97757] hover:underline inline-flex items-center gap-1"
                    >
                      <span>@{activeClaim.farcasterHandle}</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}

                  {activeClaim.twitterHandle && (
                    <a
                      href={`https://x.com/${activeClaim.twitterHandle}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#6B6B67] hover:underline inline-flex items-center gap-1"
                    >
                      <span>Twitter: @{activeClaim.twitterHandle}</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}

                  {activeClaim.claimant && (
                    <a
                      href={`${chainConfig.explorerUrl}/address/${activeClaim.claimant}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#8E8E8A] hover:text-[#141413] hover:underline flex items-center gap-1 mt-0.5"
                    >
                      <span>{shortenAddress(activeClaim.claimant)}</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
              </div>

              {/* Claim ID */}
              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-[#8E8E8A] block">
                  Claim ID
                </span>
                <span className="font-bold text-[#141413] text-sm">
                  #{activeClaim.id || selectedIndex + 1}
                </span>
              </div>

              {/* Date */}
              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-[#8E8E8A] block">
                  Submitted
                </span>
                <span className="text-[#141413]">
                  {activeClaim.createdAt ? formatRelativeTime(activeClaim.createdAt) : "Verified onchain"}
                </span>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#E5E4DF]">
              <div className="text-xs font-mono text-[#8E8E8A]">
                Press <kbd className="px-1.5 py-0.5 bg-[#F0EEE6] border border-[#E5E4DF] rounded text-[#141413]">←</kbd> / <kbd className="px-1.5 py-0.5 bg-[#F0EEE6] border border-[#E5E4DF] rounded text-[#141413]">→</kbd> to browse
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedIndex(null)}
                  className="px-3.5 py-2 rounded-md border border-[#E5E4DF] bg-[#FFFFFF] hover:bg-[#F0EEE6] text-[#141413] text-xs font-mono transition-colors"
                >
                  Close
                </button>

                <a
                  href={bounty.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#D97757] hover:bg-[#CC785C] text-white text-xs font-mono font-medium transition-colors shadow-sm"
                >
                  <span>View on POIDH</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
