"use client";

import React from "react";
import { Check, Filter, RotateCcw, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { CHAINS, CHAIN_ORDER } from "@/lib/poidh/chains";
import { BountyStatus, ChainSlug, FilterState, SortOption } from "@/lib/poidh/types";
import { cn } from "@/lib/utils/cn";
import { ChainIcon } from "../ui/ChainIcon";

interface FilterRailProps {
  filters: FilterState;
  onChange: (newFilters: FilterState) => void;
  onReset: () => void;
  chainCounts?: Record<ChainSlug, number>;
  statusCounts?: Record<BountyStatus, number>;
  className?: string;
  isMobileDrawer?: boolean;
  onCloseMobileDrawer?: () => void;
}

export function FilterRail({
  filters,
  onChange,
  onReset,
  chainCounts = { base: 0, degen: 0, arbitrum: 0, mainnet: 0 },
  statusCounts = { open: 0, review: 0, paid: 0, cancelled: 0, unknown: 0 },
  className,
  isMobileDrawer = false,
  onCloseMobileDrawer,
}: FilterRailProps) {
  const toggleChain = (chain: ChainSlug) => {
    const exists = filters.chains.includes(chain);
    let next: ChainSlug[];
    if (exists) {
      next = filters.chains.filter((c) => c !== chain);
      if (next.length === 0) next = [...CHAIN_ORDER];
    } else {
      next = [...filters.chains, chain];
    }
    onChange({ ...filters, chains: next });
  };

  const toggleStatus = (status: BountyStatus) => {
    const exists = filters.statuses.includes(status);
    let next: BountyStatus[];
    if (exists) {
      next = filters.statuses.filter((s) => s !== status);
    } else {
      next = [...filters.statuses, status];
    }
    onChange({ ...filters, statuses: next });
  };

  const sortOptions: { label: string; value: SortOption }[] = [
    { label: "Radar Score (Recommended)", value: "radar-desc" },
    { label: "Newest First", value: "newest" },
    { label: "Oldest First", value: "oldest" },
    { label: "Highest Reward", value: "reward-desc" },
    { label: "Lowest Reward", value: "reward-asc" },
    { label: "Most Active (Claims)", value: "claims-desc" },
    { label: "Fewest Claims (Gems)", value: "claims-asc" },
  ];

  const statuses: { key: BountyStatus; label: string }[] = [
    { key: "open", label: "Open" },
    { key: "review", label: "In Review" },
    { key: "paid", label: "Completed" },
    { key: "cancelled", label: "Cancelled" },
  ];

  const activeFilterCount =
    (filters.chains.length < CHAIN_ORDER.length ? 1 : 0) +
    (filters.statuses.length > 0 ? 1 : 0) +
    (filters.withProofOnly ? 1 : 0) +
    (filters.multiplayerOnly ? 1 : 0) +
    (filters.gemsOnly ? 1 : 0);

  return (
    <div className={cn("space-y-5 text-xs font-mono", className)}>
      {/* Rail Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-[#E5E4DF]">
        <div className="flex items-center gap-1.5 text-[#141413] font-bold uppercase tracking-wider text-xs">
          <SlidersHorizontal className="w-3.5 h-3.5 text-[#D97757]" />
          <span>Filters {activeFilterCount > 0 && `(${activeFilterCount})`}</span>
        </div>

        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <button
              onClick={onReset}
              className="text-[#6B6B67] hover:text-[#141413] flex items-center gap-1 text-[11px] transition-colors"
              title="Reset all filters"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
          {isMobileDrawer && (
            <button
              onClick={onCloseMobileDrawer}
              className="p-1 rounded text-[#6B6B67] hover:text-[#141413]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Sort Section */}
      <div className="space-y-1.5">
        <label className="text-[#6B6B67] uppercase tracking-wider text-[10px] font-semibold block">
          Sort Order
        </label>
        <select
          value={filters.sort}
          onChange={(e) => onChange({ ...filters, sort: e.target.value as SortOption })}
          className="w-full bg-[#FFFFFF] border border-[#E5E4DF] rounded-md px-3 py-2 text-[#141413] font-medium font-mono text-xs cursor-pointer focus:outline-none focus:border-[#D97757]"
        >
          {sortOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Network / Chain Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[#6B6B67] uppercase tracking-wider text-[10px] font-semibold">
          <span>Networks</span>
          <button
            onClick={() => onChange({ ...filters, chains: [...CHAIN_ORDER] })}
            className="text-[#D97757] hover:underline text-[10px]"
          >
            All
          </button>
        </div>

        <div className="space-y-1">
          {CHAIN_ORDER.map((slug) => {
            const cfg = CHAINS[slug];
            const isSelected = filters.chains.includes(slug);
            const count = chainCounts[slug] || 0;
            return (
              <button
                key={slug}
                onClick={() => toggleChain(slug)}
                className={cn(
                  "w-full flex items-center justify-between px-2.5 py-1.5 rounded-md border text-left transition-all",
                  isSelected
                    ? "bg-[#F0EEE6] text-[#141413] border-[#D1D0C9] font-medium"
                    : "bg-transparent text-[#6B6B67] border-transparent hover:bg-[#F0EEE6]/60 hover:text-[#141413]"
                )}
              >
                <div className="flex items-center gap-2">
                  <ChainIcon chain={slug} size="sm" />
                  <span>{cfg.name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[#8E8E8A] text-[11px]">{count}</span>
                  <div
                    className={cn(
                      "w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors",
                      isSelected
                        ? "bg-[#D97757] border-[#CC785C] text-white"
                        : "border-[#D1D0C9] bg-[#FFFFFF]"
                    )}
                  >
                    {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Status Filter */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[#6B6B67] uppercase tracking-wider text-[10px] font-semibold">
          <span>Status</span>
          {filters.statuses.length > 0 && (
            <button
              onClick={() => onChange({ ...filters, statuses: [] })}
              className="text-[#D97757] hover:underline text-[10px]"
            >
              Any
            </button>
          )}
        </div>

        <div className="space-y-1">
          {statuses.map((st) => {
            const isSelected = filters.statuses.includes(st.key);
            const count = statusCounts[st.key] || 0;
            return (
              <button
                key={st.key}
                onClick={() => toggleStatus(st.key)}
                className={cn(
                  "w-full flex items-center justify-between px-2.5 py-1.5 rounded-md border text-left transition-all",
                  isSelected
                    ? "bg-[#F0EEE6] text-[#141413] border-[#D1D0C9] font-medium"
                    : "bg-transparent text-[#6B6B67] border-transparent hover:bg-[#F0EEE6]/60 hover:text-[#141413]"
                )}
              >
                <span>{st.label}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[#8E8E8A] text-[11px]">{count}</span>
                  <div
                    className={cn(
                      "w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors",
                      isSelected
                        ? "bg-[#D97757] border-[#CC785C] text-white"
                        : "border-[#D1D0C9] bg-[#FFFFFF]"
                    )}
                  >
                    {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Special Feature Toggles */}
      <div className="space-y-2 pt-2 border-t border-[#E5E4DF]">
        <span className="text-[#6B6B67] uppercase tracking-wider text-[10px] font-semibold block">
          Filters
        </span>

        {/* Hidden Gems Only */}
        <label className="flex items-center justify-between px-2.5 py-1.5 rounded-md border border-[#E5E4DF] bg-[#FFFFFF] hover:bg-[#F0EEE6] cursor-pointer transition-colors">
          <div className="flex items-center gap-1.5 text-[#141413]">
            <Sparkles className="w-3 h-3 text-[#D97757]" />
            <span>Hidden Gems Only</span>
          </div>
          <input
            type="checkbox"
            checked={filters.gemsOnly || false}
            onChange={(e) => onChange({ ...filters, gemsOnly: e.target.checked })}
            className="w-3.5 h-3.5 rounded border-[#D1D0C9] text-[#D97757] focus:ring-0 cursor-pointer accent-[#D97757]"
          />
        </label>

        {/* Proof / Image Only */}
        <label className="flex items-center justify-between px-2.5 py-1.5 rounded-md border border-[#E5E4DF] bg-[#FFFFFF] hover:bg-[#F0EEE6] cursor-pointer transition-colors">
          <span className="text-[#141413]">Has Proof Images</span>
          <input
            type="checkbox"
            checked={filters.withProofOnly}
            onChange={(e) => onChange({ ...filters, withProofOnly: e.target.checked })}
            className="w-3.5 h-3.5 rounded border-[#D1D0C9] text-[#D97757] focus:ring-0 cursor-pointer accent-[#D97757]"
          />
        </label>

        {/* Multiplayer Only */}
        <label className="flex items-center justify-between px-2.5 py-1.5 rounded-md border border-[#E5E4DF] bg-[#FFFFFF] hover:bg-[#F0EEE6] cursor-pointer transition-colors">
          <span className="text-[#141413]">Multiplayer Bounties</span>
          <input
            type="checkbox"
            checked={filters.multiplayerOnly}
            onChange={(e) => onChange({ ...filters, multiplayerOnly: e.target.checked })}
            className="w-3.5 h-3.5 rounded border-[#D1D0C9] text-[#D97757] focus:ring-0 cursor-pointer accent-[#D97757]"
          />
        </label>
      </div>

      {isMobileDrawer && (
        <div className="pt-3">
          <button
            onClick={onCloseMobileDrawer}
            className="w-full py-2.5 rounded-md bg-[#D97757] text-white font-medium text-xs transition-colors"
          >
            Apply Filters
          </button>
        </div>
      )}
    </div>
  );
}
