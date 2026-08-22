"use client";

import React from "react";
import { Award, Clock, Flame, Shield, Sparkles, Target } from "lucide-react";
import { Bounty } from "@/lib/poidh/types";
import { Modal } from "../ui/Modal";

interface ScoreBreakdownModalProps {
  bounty: Bounty | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ScoreBreakdownModal({
  bounty,
  isOpen,
  onClose,
}: ScoreBreakdownModalProps) {
  if (!bounty) return null;

  const { radarBreakdown: b, radarScore, standoutTags } = bounty;

  const factors = [
    {
      name: "Freshness",
      score: b.freshness,
      max: 30,
      icon: Clock,
      description: "Exponential decay based on bounty age. Fresh bounties (< 2 days) score near maximum; scores halve every 14 days.",
    },
    {
      name: "Reward Scale",
      score: b.rewardMagnitude,
      max: 35,
      icon: Award,
      description: "USD-normalised log-scaled reward. ETH and DEGEN bounties are scored at equivalent dollar value for fair cross-chain comparison.",
    },
    {
      name: "Competition",
      score: b.competition,
      max: 20,
      icon: Target,
      description: "Lower competition = higher score. Bounties with zero claims earn maximum points; each additional claim reduces this score monotonically.",
    },
    {
      name: "Quality",
      score: b.quality,
      max: 15,
      icon: Sparkles,
      description: "Content richness score based on title length, description detail, and multiplayer collaboration structure.",
    },
  ];

  const statusLabel = b.statusMultiplier < 1
    ? `× ${b.statusMultiplier} (${bounty.status})`
    : "× 1.0 (open)";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-[#D97757] fill-[#D97757]" />
          <span>Radar Score Breakdown</span>
        </div>
      }
      maxWidth="xl"
    >
      <div className="space-y-5">
        {/* Header Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-[#E5E4DF] bg-[#F0EEE6]">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#6B6B67] block">
              ALGORITHMIC DISCOVERY SCORE
            </span>
            <div className="text-3xl font-serif font-bold text-[#141413]">
              {radarScore}{" "}
              <span className="text-base font-normal font-sans text-[#8E8E8A]">/ 100</span>
            </div>
          </div>

          <div className="text-xs font-sans text-[#6B6B67] max-w-xs leading-relaxed">
            Composite score from freshness, USD-normalised reward, competition level, and content quality.
          </div>
        </div>

        {/* Standout Tags */}
        {standoutTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {standoutTags.map((tag) => (
              <span
                key={tag}
                className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-[#D97757]/10 text-[#D97757] border border-[#D97757]/20"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Breakdown Factors List */}
        <div className="space-y-3">
          <div className="text-xs font-mono font-bold uppercase tracking-wider text-[#6B6B67]">
            Scoring Dimensions
          </div>

          <div className="space-y-2.5">
            {factors.map((f) => {
              const Icon = f.icon;
              const pct = Math.min(100, Math.round((f.score / f.max) * 100));

              return (
                <div
                  key={f.name}
                  className="p-3 rounded-lg border border-[#E5E4DF] bg-[#FFFFFF] space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded bg-[#F0EEE6] text-[#D97757]">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold text-[#141413] font-mono">
                        {f.name}
                      </span>
                    </div>

                    <div className="font-mono text-xs text-[#141413] font-bold">
                      {f.score}{" "}
                      <span className="text-[#8E8E8A] font-normal">/ {f.max}</span>
                    </div>
                  </div>

                  {/* Progress Meter Bar in Terracotta */}
                  <div className="w-full h-1.5 rounded-full bg-[#F0EEE6] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#D97757] transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <p className="text-[11px] text-[#6B6B67] leading-relaxed font-sans">
                    {f.description}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Status Multiplier Row */}
          {b.statusMultiplier < 1 && (
            <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-amber-100 text-amber-600">
                    <Shield className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-[#141413] font-mono">
                    Status Multiplier
                  </span>
                </div>
                <div className="font-mono text-xs text-amber-700 font-bold">
                  {statusLabel}
                </div>
              </div>
              <p className="text-[11px] text-amber-700 leading-relaxed font-sans">
                Non-actionable bounties receive a reduced score. Open bounties get full credit.
              </p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
