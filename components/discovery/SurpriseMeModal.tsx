"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Dices,
  ExternalLink,
  Flame,
  Radar,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Bounty } from "@/lib/poidh/types";
import { formatRelativeTime, formatReward } from "@/lib/utils/format";
import { ChainBadge, StatusBadge, TagBadge } from "../ui/Badge";
import { Modal } from "../ui/Modal";

interface SurpriseMeModalProps {
  bounties: Bounty[];
  isOpen: boolean;
  onClose: () => void;
}

export function SurpriseMeModal({
  bounties,
  isOpen,
  onClose,
}: SurpriseMeModalProps) {
  const [selectedBounty, setSelectedBounty] = useState<Bounty | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);

  const pickRandom = () => {
    if (!bounties || bounties.length === 0) return;
    setIsSpinning(true);

    const candidates = bounties.filter((b) => b.status === "open" || b.radarScore >= 60);
    const pool = candidates.length > 0 ? candidates : bounties;

    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * pool.length);
      setSelectedBounty(pool[randomIndex]);
      setIsSpinning(false);
    }, 400);
  };

  useEffect(() => {
    if (isOpen && (!selectedBounty || isSpinning)) {
      pickRandom();
    }
  }, [isOpen]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Dices className="w-4 h-4 text-[#D97757]" />
          <span>Surprise Opportunity</span>
        </div>
      }
      maxWidth="lg"
    >
      <div className="space-y-5">
        {isSpinning ? (
          <div className="py-14 flex flex-col items-center justify-center gap-3 text-center">
            <div className="w-12 h-12 rounded-xl bg-[#F0EEE6] border border-[#E5E4DF] flex items-center justify-center text-[#D97757]">
              <Radar className="w-6 h-6 animate-spin" />
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-mono text-[#141413] font-bold uppercase">
                Selecting Bounty…
              </p>
              <p className="text-xs text-[#6B6B67]">
                Picking a high-potential onchain opportunity
              </p>
            </div>
          </div>
        ) : selectedBounty ? (
          <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
            {/* Top signals */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <ChainBadge chain={selectedBounty.chain} size="md" />
                <StatusBadge status={selectedBounty.status} size="md" />
              </div>
              <div className="flex items-center gap-1 font-mono text-xs font-bold text-[#D97757] bg-[#D97757]/10 border border-[#D97757]/30 px-2.5 py-0.5 rounded-md">
                <Flame className="w-3.5 h-3.5 fill-[#D97757]" />
                <span>Radar {selectedBounty.radarScore}</span>
              </div>
            </div>

            {/* Title & Description */}
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-[#141413] leading-snug">
                {selectedBounty.title}
              </h3>
              <p className="text-xs sm:text-sm text-[#6B6B67] leading-relaxed bg-[#F0EEE6] p-3.5 rounded-lg border border-[#E5E4DF] max-h-32 overflow-y-auto font-sans">
                {selectedBounty.description || "No description provided for this bounty."}
              </p>
            </div>

            {/* Metrics Matrix */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 rounded-lg border border-[#E5E4DF] bg-[#FFFFFF] font-mono text-xs">
              <div>
                <span className="text-[#8E8E8A] text-[10px] block uppercase">Reward</span>
                <span className="font-bold text-[#141413] text-sm">
                  {formatReward(selectedBounty.amountWei, selectedBounty.currency, selectedBounty.priceUsd).fullWithSymbol}
                </span>
              </div>
              <div>
                <span className="text-[#8E8E8A] text-[10px] block uppercase">Claims</span>
                <span className="font-bold text-[#141413] text-sm">
                  {selectedBounty.claimCount} claims
                </span>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <span className="text-[#8E8E8A] text-[10px] block uppercase">Listed</span>
                <span suppressHydrationWarning className="text-[#141413] font-medium">
                  {formatRelativeTime(selectedBounty.createdAt)}
                </span>
              </div>
            </div>

            {/* CTAs */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                onClick={pickRandom}
                disabled={isSpinning}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#E5E4DF] bg-[#F0EEE6] text-[#141413] hover:bg-[#EAE7DD] text-xs font-mono font-medium transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Roll Another 🎲</span>
              </button>

              <div className="w-full sm:w-auto flex items-center gap-2">
                <Link
                  href={`/bounty/${selectedBounty.chain}/${selectedBounty.id}`}
                  onClick={onClose}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#D97757] hover:bg-[#CC785C] text-white text-xs font-mono font-medium transition-colors shadow-sm"
                >
                  <span>View Bounty</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                <a
                  href={selectedBounty.url}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#E5E4DF] bg-[#FFFFFF] text-[#141413] text-xs font-mono hover:bg-[#F0EEE6] transition-colors"
                >
                  <span>POIDH</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
