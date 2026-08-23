"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Compass,
  Globe,
  Radar,
  Search,
  Sparkles,
} from "lucide-react";
import { CHAIN_ORDER, CHAINS } from "@/lib/poidh/chains";
import { PulseStats } from "@/lib/poidh/types";
import { ChainIcon } from "../ui/ChainIcon";

interface HeroSectionProps {
  totalCount?: number;
  stats?: PulseStats;
}

export function HeroSection({ totalCount = 0, stats }: HeroSectionProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedChain, setSelectedChain] = useState("all");
  const [selectedSort, setSelectedSort] = useState("radar-desc");
  const [chainMenuOpen, setChainMenuOpen] = useState(false);
  const chainMenuRef = useRef<HTMLDivElement>(null);

  // Close chain dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (chainMenuRef.current && !chainMenuRef.current.contains(e.target as Node)) {
        setChainMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (selectedChain !== "all") params.set("chain", selectedChain);
    if (selectedSort !== "radar-desc") params.set("sort", selectedSort);

    const qs = params.toString();
    router.push(`/bounties${qs ? `?${qs}` : ""}`);
  };

  const handleChainChange = (chain: string) => {
    setSelectedChain(chain);
    setChainMenuOpen(false);
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (chain !== "all") params.set("chain", chain);
    if (selectedSort !== "radar-desc") params.set("sort", selectedSort);
    const qs = params.toString();
    router.push(`/bounties${qs ? `?${qs}` : ""}`);
  };

  const handleSortChange = (sort: string) => {
    setSelectedSort(sort);
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (selectedChain !== "all") params.set("chain", selectedChain);
    if (sort !== "radar-desc") params.set("sort", sort);
    const qs = params.toString();
    router.push(`/bounties${qs ? `?${qs}` : ""}`);
  };

  const activeCount = stats?.activeBounties ?? (totalCount > 0 ? Math.round(totalCount * 0.75) : 92);
  const totalBountiesCount = stats?.totalBounties ?? (totalCount || 1708);
  const totalEth = stats?.totalEthRewards ?? 12.45;
  const estUsd = totalEth > 0 ? (totalEth * 2968).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }) : "$36,961.76";

  const chainOptions = [
    { slug: "all", name: "All networks" },
    { slug: "base", name: "Base" },
    { slug: "arbitrum", name: "Arbitrum" },
    { slug: "mainnet", name: "Ethereum" },
    { slug: "degen", name: "Degen" },
  ];

  return (
    <section className="pt-10 pb-8 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Main Brand & Headline */}
        <div className="space-y-3">
          {/* Top publication label */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md border border-[#E5E4DF] bg-[#F0EEE6] text-xs font-mono text-[#6B6B67]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D97757]" />
            <span className="font-semibold text-[#141413]">ONCHAIN DISCOVERY ENGINE</span>
            <span>•</span>
            <span>{totalBountiesCount} BOUNTIES INDEXED</span>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl sm:text-5xl font-serif font-bold text-[#141413] tracking-tight">
              <span className="text-[#E61B1B]">POIDH</span> Radar
            </h1>
            <p className="text-base sm:text-lg text-[#6B6B67] font-normal max-w-2xl leading-relaxed">
              Find something worth building. Discover, compare, and verify live onchain bounties across Base, Degen, Arbitrum, and Ethereum.
            </p>
          </div>
        </div>

        {/* 4 Stat Metric Pills as Interactive Filter Shortcuts */}
        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          {/* Pill 1: Active Bounties */}
          <Link
            href="/bounties?status=open"
            className="px-3.5 py-1.5 rounded-md bg-[#F0EEE6] hover:bg-[#EAE7DD] border border-[#E5E4DF] hover:border-[#D97757]/40 text-xs font-mono flex items-center gap-1.5 text-[#141413] active:scale-95 transition-all shadow-2xs"
            title="Filter by open bounties"
          >
            <span className="font-bold text-[#D97757]">{activeCount.toLocaleString()}</span>
            <span className="text-[#6B6B67]">active bounties</span>
          </Link>

          {/* Pill 2: Total Indexed */}
          <Link
            href="/bounties"
            className="px-3.5 py-1.5 rounded-md bg-[#F0EEE6] hover:bg-[#EAE7DD] border border-[#E5E4DF] hover:border-[#D97757]/40 text-xs font-mono flex items-center gap-1.5 text-[#141413] active:scale-95 transition-all shadow-2xs"
            title="Explore all indexed bounties"
          >
            <span className="font-bold">{totalBountiesCount.toLocaleString()}</span>
            <span className="text-[#6B6B67]">total indexed</span>
          </Link>

          {/* Pill 3: Estimated Rewards Volume */}
          <Link
            href="/bounties?sort=reward-desc"
            className="px-3.5 py-1.5 rounded-md bg-[#EBDBBC]/40 hover:bg-[#EBDBBC]/60 border border-[#D4A27F]/40 text-xs font-mono flex items-center gap-1.5 text-[#141413] active:scale-95 transition-all shadow-2xs"
            title="View highest reward bounties"
          >
            <span className="font-bold text-[#141413]">{estUsd}</span>
            <span className="text-[#6B6B67]">reward pool</span>
          </Link>

          {/* Pill 4: 4 Connected Networks */}
          <Link
            href="/chains"
            className="px-3.5 py-1.5 rounded-md bg-[#F0EEE6] hover:bg-[#EAE7DD] border border-[#E5E4DF] hover:border-[#D97757]/40 text-xs font-mono flex items-center gap-1.5 text-[#141413] active:scale-95 transition-all shadow-2xs"
            title="View indexed networks"
          >
            <span className="font-bold">4</span>
            <span className="text-[#6B6B67]">networks</span>
          </Link>
        </div>

        {/* Editorial Search & Filter Bar */}
        <form
          onSubmit={handleSearch}
          className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-2.5 pt-2"
        >
          {/* Search Input Box */}
          <div className="sm:col-span-7 md:col-span-8 relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search bounties, ideas, issuers, or keywords…"
              className="w-full pl-10 pr-12 py-3 rounded-lg border border-[#E5E4DF] bg-[#FFFFFF] text-sm text-[#141413] placeholder-[#8E8E8A] font-sans focus:outline-none focus:border-[#D97757] focus:ring-2 focus:ring-[#D97757]/20 shadow-paper transition-all"
            />
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8E8E8A]">
              <Search className="w-4 h-4" />
            </div>
            <button
              type="submit"
              aria-label="Search"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-md bg-[#D97757] text-white hover:bg-[#CC785C] active:scale-95 transition-all"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Chain Selector Custom Dropdown with Official Logos */}
          <div className="sm:col-span-3 md:col-span-2 relative" ref={chainMenuRef}>
            <button
              type="button"
              onClick={() => setChainMenuOpen(!chainMenuOpen)}
              className="w-full flex items-center justify-between px-3.5 py-3 rounded-lg border border-[#E5E4DF] bg-[#F0EEE6] hover:bg-[#EAE7DD] text-xs font-mono font-medium text-[#141413] shadow-paper focus:outline-none focus:border-[#D97757] transition-colors text-left"
            >
              <div className="flex items-center gap-2 truncate">
                {selectedChain === "all" ? (
                  <Globe className="w-3.5 h-3.5 text-[#6B6B67]" />
                ) : (
                  <ChainIcon chain={selectedChain} size="sm" />
                )}
                <span className="truncate">
                  {chainOptions.find((c) => c.slug === selectedChain)?.name || "All networks"}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[#6B6B67] flex-shrink-0 ml-1" />
            </button>

            {/* Dropdown Menu Options */}
            {chainMenuOpen && (
              <div className="absolute left-0 right-0 top-full mt-1 z-30 rounded-lg border border-[#E5E4DF] bg-[#FAF9F5] shadow-paper-md py-1 animate-in fade-in duration-100 overflow-hidden font-mono text-xs">
                {chainOptions.map((opt) => {
                  const isSelected = selectedChain === opt.slug;
                  return (
                    <button
                      key={opt.slug}
                      type="button"
                      onClick={() => handleChainChange(opt.slug)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors ${
                        isSelected
                          ? "bg-[#F0EEE6] text-[#141413] font-bold"
                          : "text-[#6B6B67] hover:bg-[#F0EEE6]/80 hover:text-[#141413]"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {opt.slug === "all" ? (
                          <Globe className="w-3.5 h-3.5 text-[#6B6B67]" />
                        ) : (
                          <ChainIcon chain={opt.slug} size="sm" />
                        )}
                        <span>{opt.name}</span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#D97757]" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sort Selector Dropdown */}
          <div className="sm:col-span-2 md:col-span-2 relative">
            <select
              value={selectedSort}
              onChange={(e) => handleSortChange(e.target.value)}
              className="w-full appearance-none px-3.5 py-3 rounded-lg border border-[#E5E4DF] bg-[#F0EEE6] text-xs font-mono font-medium text-[#141413] shadow-paper focus:outline-none focus:border-[#D97757] cursor-pointer pr-8 hover:bg-[#EAE7DD] transition-colors"
            >
              <option value="radar-desc">Radar Score</option>
              <option value="newest">Newest First</option>
              <option value="reward-desc">Highest Reward</option>
              <option value="claims-desc">Most Active</option>
              <option value="oldest">Oldest</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6B6B67] pointer-events-none" />
          </div>
        </form>
      </div>
    </section>
  );
}
