"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  CornerDownLeft,
  Dices,
  Flame,
  Globe,
  Layers,
  RotateCcw,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { Bounty, ChainSlug } from "@/lib/poidh/types";
import { formatReward } from "@/lib/utils/format";
import { ChainBadge, StatusBadge } from "../ui/Badge";
import { ChainIcon } from "../ui/ChainIcon";

interface SearchModalProps {
  bounties: Bounty[];
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}

export function SearchModal({
  bounties = [],
  isOpen,
  onClose,
  initialQuery = "",
}: SearchModalProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState(initialQuery);
  const [selectedChain, setSelectedChain] = useState<ChainSlug | "all">("all");
  const [openOnly, setOpenOnly] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Sync initial query & focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery);
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen, initialQuery]);

  // Real-time instant search filtering
  const searchResults = useMemo(() => {
    let list = [...bounties];

    // Filter by selected chain
    if (selectedChain !== "all") {
      list = list.filter((b) => b.chain === selectedChain);
    }

    // Filter by open status if toggled
    if (openOnly) {
      list = list.filter((b) => b.status === "open");
    }

    // Text query search
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((b) => {
        const titleMatch = b.title.toLowerCase().includes(q);
        const descMatch = b.description.toLowerCase().includes(q);
        const issuerMatch = b.issuer ? b.issuer.toLowerCase().includes(q) : false;
        const idMatch = b.id.toString() === q;
        const chainMatch = b.chain.toLowerCase().includes(q);
        const currencyMatch = b.currency ? b.currency.toLowerCase().includes(q) : false;
        return titleMatch || descMatch || issuerMatch || idMatch || chainMatch || currencyMatch;
      });
      // Sort by relevance / radar score
      list.sort((a, b) => b.radarScore - a.radarScore);
    } else {
      // Default: show top Radar score open bounties when query is empty
      list = list.filter((b) => b.status === "open").sort((a, b) => b.radarScore - a.radarScore);
    }

    return list;
  }, [bounties, query, selectedChain, openOnly]);

  const displayedResults = useMemo(() => {
    return searchResults.slice(0, 7);
  }, [searchResults]);

  // Reset selected index when search query or filters change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, selectedChain, openOnly]);

  // Keyboard navigation inside modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          displayedResults.length > 0 ? (prev + 1) % displayedResults.length : 0
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          displayedResults.length > 0
            ? (prev - 1 + displayedResults.length) % displayedResults.length
            : 0
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (displayedResults.length > 0 && selectedIndex >= 0 && selectedIndex < displayedResults.length) {
          const selected = displayedResults[selectedIndex];
          onClose();
          router.push(`/bounty/${selected.chain}/${selected.id}`);
        } else {
          // Fallback: navigate to explorer with search query
          onClose();
          const params = new URLSearchParams();
          if (query.trim()) params.set("q", query.trim());
          if (selectedChain !== "all") params.set("chain", selectedChain);
          if (openOnly) params.set("status", "open");
          const qs = params.toString();
          router.push(`/bounties${qs ? `?${qs}` : ""}`);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, displayedResults, selectedIndex, query, selectedChain, openOnly, onClose, router]);

  if (!isOpen) return null;

  const handleNavigateToAll = () => {
    onClose();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (selectedChain !== "all") params.set("chain", selectedChain);
    if (openOnly) params.set("status", "open");
    const qs = params.toString();
    router.push(`/bounties${qs ? `?${qs}` : ""}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 sm:pt-20 px-4 pb-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#141413]/50 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Dialog Card */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-2xl rounded-2xl border border-[#E5E4DF] bg-[#FAF9F5] shadow-2xl z-10 overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[82vh]"
      >
        {/* Search Header Input */}
        <div className="relative flex items-center px-4 py-3 border-b border-[#E5E4DF] bg-[#FFFFFF]">
          <Search className="w-5 h-5 text-[#D97757] flex-shrink-0 ml-1" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, description, issuer, chain, or ID…"
            className="w-full pl-3 pr-10 py-1.5 text-base text-[#141413] placeholder-[#8E8E8A] bg-transparent font-sans focus:outline-none"
          />
          {query ? (
            <button
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="p-1 rounded-md text-[#6B6B67] hover:text-[#141413] hover:bg-[#F0EEE6] transition-colors"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono text-[#6B6B67] bg-[#F0EEE6] border border-[#E5E4DF] rounded">
              ESC
            </kbd>
          )}
        </div>

        {/* Quick Chain & Status Filter Buttons */}
        <div className="px-4 py-2 bg-[#F0EEE6]/80 border-b border-[#E5E4DF] flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar">
            <span className="text-[#8E8E8A] text-[10px] uppercase tracking-wider mr-1">
              Network:
            </span>
            {[
              { id: "all", label: "All" },
              { id: "base", label: "Base" },
              { id: "arbitrum", label: "Arbitrum" },
              { id: "degen", label: "Degen" },
              { id: "mainnet", label: "Ethereum" },
            ].map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedChain(c.id as ChainSlug | "all")}
                className={`px-2.5 py-1 rounded-md transition-all text-xs flex items-center gap-1.5 ${
                  selectedChain === c.id
                    ? "bg-[#141413] text-[#FAF9F5] font-bold shadow-xs"
                    : "bg-[#FFFFFF] text-[#6B6B67] hover:text-[#141413] border border-[#E5E4DF]"
                }`}
              >
                {c.id !== "all" && <ChainIcon chain={c.id} size="sm" />}
                <span>{c.label}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setOpenOnly(!openOnly)}
            className={`px-2.5 py-1 rounded-md transition-all text-xs flex items-center gap-1 ${
              openOnly
                ? "bg-[#D97757] text-white font-bold"
                : "bg-[#FFFFFF] text-[#6B6B67] hover:text-[#141413] border border-[#E5E4DF]"
            }`}
          >
            <span>Open Only</span>
            {openOnly && <Check className="w-3 h-3" />}
          </button>
        </div>

        {/* Search Results List */}
        <div
          ref={resultsContainerRef}
          className="flex-1 overflow-y-auto p-3 space-y-1.5 divide-y divide-[#E5E4DF]/60"
        >
          {/* Header indicator */}
          <div className="px-2 pt-1 pb-2 flex items-center justify-between text-[11px] font-mono text-[#6B6B67]">
            <span>
              {query.trim() ? (
                <>
                  Found <strong className="text-[#141413]">{searchResults.length}</strong> matching bounties
                </>
              ) : (
                <span className="flex items-center gap-1 text-[#D97757] font-semibold">
                  <Flame className="w-3.5 h-3.5 fill-[#D97757]" />
                  <span>Popular Bounties Right Now</span>
                </span>
              )}
            </span>
            {searchResults.length > 0 && (
              <span className="text-[10px] text-[#8E8E8A]">Use ↑ ↓ to navigate, ↵ to select</span>
            )}
          </div>

          {displayedResults.length === 0 ? (
            <div className="py-12 px-4 text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-[#F0EEE6] flex items-center justify-center mx-auto text-[#8E8E8A]">
                <Search className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-[#141413]">
                  No bounties found matching &quot;{query}&quot;
                </p>
                <p className="text-xs text-[#6B6B67]">
                  Try adjusting network filters, clearing query terms, or searching for keywords like &quot;logo&quot; or &quot;app&quot;.
                </p>
              </div>
              <button
                onClick={() => {
                  setQuery("");
                  setSelectedChain("all");
                  setOpenOnly(false);
                }}
                className="px-3 py-1.5 rounded-md bg-[#D97757] text-white font-mono text-xs font-medium hover:bg-[#CC785C] transition-colors"
              >
                Reset Search Filters
              </button>
            </div>
          ) : (
            displayedResults.map((bounty, idx) => {
              const isSelected = idx === selectedIndex;
              const reward = formatReward(bounty.amountWei, bounty.currency, bounty.priceUsd);

              return (
                <div
                  key={bounty.key}
                  onClick={() => {
                    onClose();
                    router.push(`/bounty/${bounty.chain}/${bounty.id}`);
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`group relative p-3 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? "bg-[#F0EEE6] border border-[#D97757]/40 shadow-xs"
                      : "bg-[#FFFFFF] hover:bg-[#F0EEE6]/60 border border-transparent"
                  }`}
                >
                  {/* Left: Chain Badge & Title */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="mt-0.5 flex-shrink-0">
                      <ChainIcon chain={bounty.chain} size="md" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-mono text-[#8E8E8A] uppercase tracking-wider">
                          #{bounty.id} • {bounty.chain}
                        </span>
                        <StatusBadge status={bounty.status} size="sm" />
                        {bounty.claimCount > 0 && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#E5E4DF] text-[#141413]">
                            {bounty.claimCount} {bounty.claimCount === 1 ? "claim" : "claims"}
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs sm:text-sm font-bold text-[#141413] group-hover:text-[#D97757] transition-colors line-clamp-1">
                        {bounty.title}
                      </h4>
                      {bounty.description && (
                        <p className="text-xs text-[#6B6B67] line-clamp-1 font-sans">
                          {bounty.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Reward & Arrow */}
                  <div className="flex items-center gap-3 flex-shrink-0 text-right">
                    <div>
                      <div className="text-xs font-mono font-bold text-[#141413]">
                        {reward.formatted}
                      </div>
                      {reward.usdEstimate && (
                        <div className="text-[10px] font-mono text-[#6B6B67]">
                          {reward.usdEstimate}
                        </div>
                      )}
                    </div>
                    <div
                      className={`p-1.5 rounded-lg transition-colors ${
                        isSelected
                          ? "bg-[#D97757] text-white"
                          : "bg-[#F0EEE6] text-[#8E8E8A] group-hover:text-[#141413]"
                      }`}
                    >
                      <CornerDownLeft className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer / Navigation to Explorer */}
        <div className="p-3 bg-[#FFFFFF] border-t border-[#E5E4DF] flex items-center justify-between gap-3 text-xs font-mono">
          <div className="text-[#6B6B67]">
            Showing <strong className="text-[#141413]">{displayedResults.length}</strong> of{" "}
            <strong className="text-[#141413]">{searchResults.length}</strong> results
          </div>

          <button
            onClick={handleNavigateToAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D97757] hover:bg-[#CC785C] text-white font-medium active:scale-95 transition-all shadow-xs"
          >
            <span>View All Bounties ({searchResults.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
