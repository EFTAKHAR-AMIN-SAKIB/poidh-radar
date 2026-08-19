"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Zap } from "lucide-react";
import { Bounty } from "@/lib/poidh/types";
import { BountyCard } from "./BountyCard";

interface MostActiveProps {
  bounties: Bounty[];
}

export function MostActive({ bounties }: MostActiveProps) {
  const activeList = [...bounties]
    .filter((b) => b.claimCount > 0)
    .sort((a, b) => b.claimCount - a.claimCount)
    .slice(0, 8);

  if (activeList.length === 0) return null;

  return (
    <section id="active" className="py-8 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto space-y-5">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-3 border-b border-[#E5E4DF]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-[#D97757]/10 text-[#D97757]">
                <Zap className="w-4 h-4 fill-[#D97757]" />
              </span>
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#141413]">
                Most Active Contests
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-[#6B6B67]">
              Ranked by community proof submission volume and verification momentum.
            </p>
          </div>

          <Link
            href="/bounties?sort=claims-desc"
            className="inline-flex items-center gap-1 text-xs font-mono font-medium text-[#D97757] hover:text-[#CC785C] transition-colors"
          >
            <span>View All Active Contests</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Bounties Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {activeList.map((bounty) => (
            <BountyCard key={bounty.key} bounty={bounty} />
          ))}
        </div>
      </div>
    </section>
  );
}
