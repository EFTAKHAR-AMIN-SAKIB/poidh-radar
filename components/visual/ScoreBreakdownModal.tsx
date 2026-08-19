"use client";

import React from "react";
import { Activity, Award, Clock, Flame, Info, ShieldCheck, Sparkles, Users } from "lucide-react";
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
      max: 25,
      icon: Clock,
      description: "Recency of the bounty posting. Freshly listed opportunities receive higher discovery priority.",
    },
    {
      name: "Reward Scale",
      score: b.rewardMagnitude,
      max: 30,
      icon: Award,
      description: "Log-normalized reward magnitude relative to other bounties in the ecosystem.",
    },
    {
      name: "Actionable Status",
      score: b.statusScore,
      max: 20,
      icon: ShieldCheck,
      description: "Open, actionable bounties earn maximum points over finished or cancelled bounties.",
    },
    {
      name: "Opportunity / Low Competition",
      score: b.opportunity,
      max: 15,
      icon: Sparkles,
      description: "Hidden gem multiplier: bounties with 0 to 1 claims offer higher probability of earning.",
    },
    {
      name: "Verification Momentum",
      score: b.momentum,
      max: 10,
      icon: Activity,
      description: "Active community proof activity and submissions indicate valid verification interest.",
    },
  ];

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
            Composite score calculated from recency, reward scale, and competition level.
          </div>
        </div>

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
        </div>
      </div>
    </Modal>
  );
}
