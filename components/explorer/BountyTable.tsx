"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, Flame, Image as ImageIcon, Users } from "lucide-react";
import { Bounty } from "@/lib/poidh/types";
import { formatRelativeTime, formatReward } from "@/lib/utils/format";
import { ChainBadge, StatusBadge } from "../ui/Badge";
import { ScoreBreakdownModal } from "../visual/ScoreBreakdownModal";

interface BountyTableProps {
  bounties: Bounty[];
}

export function BountyTable({ bounties }: BountyTableProps) {
  const [selectedScoreBounty, setSelectedScoreBounty] = useState<Bounty | null>(null);

  if (bounties.length === 0) return null;

  return (
    <>
      <div className="w-full overflow-x-auto rounded-xl border border-[#E5E4DF] bg-[#FFFFFF] shadow-paper">
        <table className="w-full text-left text-xs font-mono border-collapse min-w-[760px]">
          <thead>
            <tr className="border-b border-[#E5E4DF] bg-[#F0EEE6] text-[#6B6B67] uppercase tracking-wider font-semibold">
              <th className="py-3 px-4">Bounty & Network</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Reward</th>
              <th className="py-3 px-4 text-center">Score</th>
              <th className="py-3 px-4">Claims</th>
              <th className="py-3 px-4">Listed</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E4DF]">
            {bounties.map((b) => {
              const rewardInfo = formatReward(b.amountWei, b.currency, b.priceUsd);
              return (
                <tr
                  key={b.key}
                  className="hover:bg-[#F0EEE6]/50 transition-colors group"
                >
                  {/* Bounty Info */}
                  <td className="py-3.5 px-4 max-w-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <ChainBadge chain={b.chain} size="sm" />
                        <span className="text-[#8E8E8A] text-[11px]">#{b.id}</span>
                        {b.isMultiplayer && (
                          <span className="text-[10px] text-[#6B6B67] bg-[#F0EEE6] border border-[#E5E4DF] px-1 rounded">
                            MP
                          </span>
                        )}
                      </div>
                      <Link
                        href={`/bounty/${b.chain}/${b.id}`}
                        className="block font-bold text-[#141413] group-hover:text-[#D97757] transition-colors line-clamp-1 text-sm font-sans"
                      >
                        {b.title}
                      </Link>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <StatusBadge status={b.status} size="sm" />
                  </td>

                  {/* Reward */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="font-bold text-[#141413] text-sm">
                      {rewardInfo.fullWithSymbol}
                    </div>
                    {rewardInfo.usdEstimate && (
                      <div className="text-[11px] text-[#6B6B67]">
                        {rewardInfo.usdEstimate}
                      </div>
                    )}
                  </td>

                  {/* Radar Score */}
                  <td className="py-3.5 px-4 whitespace-nowrap text-center">
                    <button
                      onClick={() => setSelectedScoreBounty(b)}
                      title="View score breakdown"
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-[#E5E4DF] bg-[#FAF9F5] text-[#141413] font-bold text-xs hover:border-[#D97757]"
                    >
                      <Flame className="w-3 h-3 text-[#D97757] fill-[#D97757]" />
                      <span>{b.radarScore}</span>
                    </button>
                  </td>

                  {/* Claims */}
                  <td className="py-3.5 px-4 whitespace-nowrap text-[#6B6B67]">
                    {b.claimCount > 0 ? (
                      <span className="flex items-center gap-1 text-[#141413] font-medium">
                        <ImageIcon className="w-3.5 h-3.5 text-[#8E8E8A]" />
                        {b.claimCount} {b.claimCount === 1 ? "claim" : "claims"}
                      </span>
                    ) : (
                      <span>0 claims</span>
                    )}
                  </td>

                  {/* Age */}
                  <td className="py-3.5 px-4 whitespace-nowrap text-[#8E8E8A]">
                    {formatRelativeTime(b.createdAt)}
                  </td>

                  {/* Action */}
                  <td className="py-3.5 px-4 whitespace-nowrap text-right">
                    <Link
                      href={`/bounty/${b.chain}/${b.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded border border-[#E5E4DF] bg-[#FFFFFF] text-[#141413] hover:border-[#D97757] hover:text-[#D97757] transition-colors"
                    >
                      <span>View</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ScoreBreakdownModal
        bounty={selectedScoreBounty}
        isOpen={!!selectedScoreBounty}
        onClose={() => setSelectedScoreBounty(null)}
      />
    </>
  );
}
