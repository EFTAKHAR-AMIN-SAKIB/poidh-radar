"use client";

import React, { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  Grid,
  List,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { CHAIN_ORDER } from "@/lib/poidh/chains";
import { Bounty, BountyStatus, ChainSlug, FilterState, SortOption } from "@/lib/poidh/types";
import { cn } from "@/lib/utils/cn";
import { BountyCard } from "../discovery/BountyCard";
import { BountyTable } from "./BountyTable";
import { FilterRail } from "./FilterRail";

interface BountyExplorerProps {
  initialBounties: Bounty[];
}

export function BountyExplorer({ initialBounties }: BountyExplorerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Read initial filter values from URL query parameters
  const initialChainParam = searchParams.get("chain");
  const initialStatusParam = searchParams.get("status");
  const initialSortParam = searchParams.get("sort") as SortOption;
  const initialQueryParam = searchParams.get("q") || "";
  const initialGemsParam = searchParams.get("gems") === "true";

  const initialChains: ChainSlug[] =
    initialChainParam && CHAIN_ORDER.includes(initialChainParam.toLowerCase() as ChainSlug)
      ? [initialChainParam.toLowerCase() as ChainSlug]
      : [...CHAIN_ORDER];

  const parseStatusParam = (param: string | null): BountyStatus[] => {
    if (!param) return [];
    return param
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .map((s) => {
        if (s === "completed" || s === "past" || s === "closed") return "paid";
        if (s === "progress" || s === "voting") return "review";
        if (s === "new") return "open";
        return s as BountyStatus;
      })
      .filter((s) => ["open", "review", "paid"].includes(s));
  };

  const initialStatuses: BountyStatus[] = parseStatusParam(initialStatusParam);

  const [filters, setFilters] = useState<FilterState>({
    chains: initialChains,
    statuses: initialStatuses,
    q: initialQueryParam,
    sort: initialSortParam || "radar-desc",
    withProofOnly: searchParams.get("proof") === "true",
    multiplayerOnly: searchParams.get("multiplayer") === "true",
    gemsOnly: initialGemsParam,
  });

  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 16;

  // Reactively sync URL searchParams into filters state when URL changes (e.g. from Hero or Search Modal)
  useEffect(() => {
    const qParam = searchParams.get("q") || "";
    const chainParam = searchParams.get("chain");
    const statusParam = searchParams.get("status");
    const sortParam = searchParams.get("sort") as SortOption;
    const gemsParam = searchParams.get("gems") === "true";
    const proofParam = searchParams.get("proof") === "true";
    const multiplayerParam = searchParams.get("multiplayer") === "true";

    const parsedChains: ChainSlug[] = chainParam
      ? (chainParam.split(",").map((c) => c.trim().toLowerCase()) as ChainSlug[]).filter((c) =>
          CHAIN_ORDER.includes(c)
        )
      : [...CHAIN_ORDER];

    const parsedStatuses: BountyStatus[] = parseStatusParam(statusParam);

    setFilters({
      chains: parsedChains.length > 0 ? parsedChains : [...CHAIN_ORDER],
      statuses: parsedStatuses,
      q: qParam,
      sort: sortParam || "radar-desc",
      gemsOnly: gemsParam,
      withProofOnly: proofParam,
      multiplayerOnly: multiplayerParam,
    });
  }, [searchParams]);

  // Sync filter changes with URL
  const updateFilters = (newFilters: FilterState) => {
    setFilters(newFilters);
    setCurrentPage(1);

    const params = new URLSearchParams();
    if (newFilters.chains.length < CHAIN_ORDER.length) {
      params.set("chain", newFilters.chains.join(","));
    }
    if (newFilters.statuses.length > 0) {
      params.set("status", newFilters.statuses.join(","));
    }
    if (newFilters.q.trim()) {
      params.set("q", newFilters.q.trim());
    }
    if (newFilters.sort && newFilters.sort !== "radar-desc") {
      params.set("sort", newFilters.sort);
    }
    if (newFilters.withProofOnly) {
      params.set("proof", "true");
    }
    if (newFilters.multiplayerOnly) {
      params.set("multiplayer", "true");
    }
    if (newFilters.gemsOnly) {
      params.set("gems", "true");
    }

    const queryStr = params.toString();
    router.replace(`${pathname}${queryStr ? `?${queryStr}` : ""}`, { scroll: false });
  };

  const resetFilters = () => {
    updateFilters({
      chains: [...CHAIN_ORDER],
      statuses: [],
      q: "",
      sort: "radar-desc",
      withProofOnly: false,
      multiplayerOnly: false,
      gemsOnly: false,
    });
  };

  // Compute Counts
  const { chainCounts, statusCounts } = useMemo(() => {
    const cc: Record<ChainSlug, number> = { base: 0, degen: 0, arbitrum: 0, mainnet: 0 };
    const sc: Record<BountyStatus, number> = { open: 0, review: 0, paid: 0, cancelled: 0, unknown: 0 };

    for (const b of initialBounties) {
      cc[b.chain] = (cc[b.chain] || 0) + 1;
      sc[b.status] = (sc[b.status] || 0) + 1;
    }
    return { chainCounts: cc, statusCounts: sc };
  }, [initialBounties]);

  // Reactive Filter & Search
  const filteredBounties = useMemo(() => {
    let list = [...initialBounties];

    // Chain filter
    if (filters.chains.length > 0 && filters.chains.length < CHAIN_ORDER.length) {
      list = list.filter((b) => filters.chains.includes(b.chain));
    }

    // Status filter
    if (filters.statuses.length > 0) {
      list = list.filter((b) => filters.statuses.includes(b.status));
    }

    // Text search (Title, Description, Issuer, ID)
    if (filters.q.trim()) {
      const q = filters.q.toLowerCase().trim();
      list = list.filter((b) => {
        return (
          b.title.toLowerCase().includes(q) ||
          b.description.toLowerCase().includes(q) ||
          (b.issuer && b.issuer.toLowerCase().includes(q)) ||
          b.id.toString() === q ||
          b.chain.toLowerCase().includes(q)
        );
      });
    }

    // Hidden gems only
    if (filters.gemsOnly) {
      list = list.filter((b) => b.status === "open" && b.claimCount <= 1);
    }

    // Proof only
    if (filters.withProofOnly) {
      list = list.filter((b) => b.claimCount > 0);
    }

    // Multiplayer only
    if (filters.multiplayerOnly) {
      list = list.filter((b) => b.isMultiplayer);
    }

    // Sorting
    switch (filters.sort) {
      case "radar-desc":
        list.sort((a, b) => b.radarScore - a.radarScore);
        break;
      case "newest":
        list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        break;
      case "oldest":
        list.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
        break;
      case "reward-desc":
        list.sort((a, b) => b.amountNumber - a.amountNumber);
        break;
      case "reward-asc":
        list.sort((a, b) => a.amountNumber - b.amountNumber);
        break;
      case "claims-desc":
        list.sort((a, b) => b.claimCount - a.claimCount);
        break;
      case "claims-asc":
        list.sort((a, b) => a.claimCount - b.claimCount);
        break;
    }

    return list;
  }, [initialBounties, filters]);

  // Paginate
  const totalPages = Math.ceil(filteredBounties.length / pageSize) || 1;
  const paginatedBounties = filteredBounties.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-medium text-[#D97757] uppercase tracking-wider">
              Bounty Directory
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-serif font-bold text-[#141413]">
            Explore Bounties
          </h1>
          <p className="text-sm text-[#6B6B67]">
            Find your next opportunity across {initialBounties.length} indexed onchain bounties.
          </p>
        </div>

        {/* View Mode & Mobile Filter Trigger */}
        <div className="flex items-center gap-2">
          {/* Mobile Filter Button */}
          <button
            onClick={() => setMobileDrawerOpen(true)}
            className="lg:hidden flex items-center gap-1.5 px-3 py-2 text-xs font-mono rounded-md border border-[#E5E4DF] bg-[#F0EEE6] text-[#141413]"
          >
            <Filter className="w-3.5 h-3.5 text-[#D97757]" />
            <span>Filters</span>
          </button>

          {/* Grid / Table Switcher */}
          <div className="flex items-center p-0.5 rounded-md border border-[#E5E4DF] bg-[#F0EEE6]">
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "p-1.5 rounded transition-all",
                viewMode === "grid"
                  ? "bg-[#FFFFFF] text-[#141413] shadow-sm font-semibold"
                  : "text-[#6B6B67] hover:text-[#141413]"
              )}
              title="Grid View"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={cn(
                "p-1.5 rounded transition-all",
                viewMode === "table"
                  ? "bg-[#FFFFFF] text-[#141413] shadow-sm font-semibold"
                  : "text-[#6B6B67] hover:text-[#141413]"
              )}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Layout: Filter Rail + Bounty Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Desktop Filter Sidebar */}
        <aside className="hidden lg:block lg:col-span-1 sticky top-24 p-4 rounded-xl border border-[#E5E4DF] bg-[#FFFFFF] shadow-paper">
          <FilterRail
            filters={filters}
            onChange={updateFilters}
            onReset={resetFilters}
            chainCounts={chainCounts}
            statusCounts={statusCounts}
          />
        </aside>

        {/* Mobile Filter Drawer / Bottom Sheet */}
        {mobileDrawerOpen && (
          <div
            className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end bg-[#141413]/50 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setMobileDrawerOpen(false)}
          >
            <div
              className="bg-[#FAF9F5] rounded-t-2xl border-t border-[#E5E4DF] p-6 max-h-[85vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom duration-250"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Sheet Drag Indicator */}
              <div className="w-12 h-1.5 rounded-full bg-[#D1D0C9] mx-auto mb-4" />
              <FilterRail
                filters={filters}
                onChange={updateFilters}
                onReset={resetFilters}
                chainCounts={chainCounts}
                statusCounts={statusCounts}
                isMobileDrawer={true}
                onCloseMobileDrawer={() => setMobileDrawerOpen(false)}
              />
            </div>
          </div>
        )}

        {/* Results Column */}
        <div className="lg:col-span-3 space-y-4">
          {/* Active Search & Filter Bar */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border border-[#E5E4DF] bg-[#FFFFFF] shadow-paper">
              {/* Search Input */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8E8E8A]" />
                <input
                  type="text"
                  value={filters.q}
                  onChange={(e) => updateFilters({ ...filters, q: e.target.value })}
                  placeholder="Filter results by keyword or address…"
                  className="w-full pl-9 pr-7 py-2 rounded-md border border-[#E5E4DF] bg-[#F0EEE6] text-xs font-mono text-[#141413] placeholder-[#8E8E8A] focus:outline-none focus:border-[#D97757] focus:bg-[#FFFFFF]"
                />
                {filters.q && (
                  <button
                    onClick={() => updateFilters({ ...filters, q: "" })}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[#6B6B67] hover:text-[#141413]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Results Count & Quick Reset */}
              <div className="flex items-center justify-between sm:justify-end gap-3 text-xs font-mono">
                <span className="text-[#6B6B67]">
                  <strong className="text-[#141413] font-bold">
                    {filteredBounties.length}
                  </strong>{" "}
                  {filteredBounties.length === 1 ? "bounty" : "bounties"}
                </span>

                {(filters.chains.length < CHAIN_ORDER.length ||
                  filters.statuses.length > 0 ||
                  filters.q ||
                  filters.gemsOnly ||
                  filters.withProofOnly ||
                  filters.multiplayerOnly) && (
                  <button
                    onClick={resetFilters}
                    className="text-[#D97757] hover:underline flex items-center gap-1 font-medium active:scale-95 transition-all"
                  >
                    <span>Clear All</span>
                  </button>
                )}
              </div>
            </div>

            {/* Active Filter Chips Strip (Mobile & Desktop) */}
            {(filters.chains.length < CHAIN_ORDER.length ||
              filters.statuses.length > 0 ||
              filters.gemsOnly ||
              filters.withProofOnly ||
              filters.multiplayerOnly ||
              filters.q.trim()) && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] font-mono uppercase text-[#8E8E8A] mr-1">
                  Active:
                </span>

                {/* Chain chips */}
                {filters.chains.length < CHAIN_ORDER.length &&
                  filters.chains.map((chain) => (
                    <button
                      key={chain}
                      onClick={() => {
                        const next = filters.chains.filter((c) => c !== chain);
                        updateFilters({
                          ...filters,
                          chains: next.length === 0 ? [...CHAIN_ORDER] : next,
                        });
                      }}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-[#E5E4DF] bg-[#F0EEE6] hover:bg-[#EAE7DD] text-[#141413] text-[11px] font-mono capitalize transition-colors shadow-2xs"
                    >
                      <span>{chain}</span>
                      <X className="w-3 h-3 text-[#6B6B67]" />
                    </button>
                  ))}

                {/* Status chips */}
                {filters.statuses.map((status) => (
                  <button
                    key={status}
                    onClick={() => {
                      updateFilters({
                        ...filters,
                        statuses: filters.statuses.filter((s) => s !== status),
                      });
                    }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-[#E5E4DF] bg-[#F0EEE6] hover:bg-[#EAE7DD] text-[#141413] text-[11px] font-mono uppercase transition-colors shadow-2xs"
                  >
                    <span>{status}</span>
                    <X className="w-3 h-3 text-[#6B6B67]" />
                  </button>
                ))}

                {/* Feature Toggle chips */}
                {filters.gemsOnly && (
                  <button
                    onClick={() => updateFilters({ ...filters, gemsOnly: false })}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-[#D97757]/30 bg-[#D97757]/10 text-[#D97757] text-[11px] font-mono font-medium transition-colors shadow-2xs"
                  >
                    <span>Gems Only</span>
                    <X className="w-3 h-3" />
                  </button>
                )}

                {filters.withProofOnly && (
                  <button
                    onClick={() => updateFilters({ ...filters, withProofOnly: false })}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-[#E5E4DF] bg-[#F0EEE6] hover:bg-[#EAE7DD] text-[#141413] text-[11px] font-mono transition-colors shadow-2xs"
                  >
                    <span>Has Proof</span>
                    <X className="w-3 h-3 text-[#6B6B67]" />
                  </button>
                )}

                {filters.multiplayerOnly && (
                  <button
                    onClick={() => updateFilters({ ...filters, multiplayerOnly: false })}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-[#E5E4DF] bg-[#F0EEE6] hover:bg-[#EAE7DD] text-[#141413] text-[11px] font-mono transition-colors shadow-2xs"
                  >
                    <span>Multiplayer</span>
                    <X className="w-3 h-3 text-[#6B6B67]" />
                  </button>
                )}

                {filters.q.trim() && (
                  <button
                    onClick={() => updateFilters({ ...filters, q: "" })}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-[#E5E4DF] bg-[#F0EEE6] hover:bg-[#EAE7DD] text-[#141413] text-[11px] font-mono transition-colors shadow-2xs"
                  >
                    <span>&quot;{filters.q}&quot;</span>
                    <X className="w-3 h-3 text-[#6B6B67]" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Bounty Content or Empty State */}
          {filteredBounties.length === 0 ? (
            <div className="py-16 px-6 text-center rounded-xl border border-[#E5E4DF] bg-[#FFFFFF] shadow-paper space-y-3">
              <div className="w-10 h-10 rounded-full bg-[#F0EEE6] flex items-center justify-center mx-auto text-[#6B6B67]">
                <Search className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[#141413]">
                  No Bounties Found
                </h3>
                <p className="text-xs text-[#6B6B67] max-w-sm mx-auto">
                  Try adjusting search terms, clearing status filters, or including other networks.
                </p>
              </div>
              <button
                onClick={resetFilters}
                className="px-4 py-2 rounded-md bg-[#D97757] text-white font-mono text-xs font-medium hover:bg-[#CC785C] transition-colors"
              >
                Clear All Filters
              </button>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-5">
              {paginatedBounties.map((bounty) => (
                <BountyCard key={bounty.key} bounty={bounty} />
              ))}
            </div>
          ) : (
            <BountyTable bounties={paginatedBounties} />
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="pt-4 border-t border-[#E5E4DF] flex items-center justify-between font-mono text-xs text-[#6B6B67]">
              <div>
                Page <span className="text-[#141413] font-bold">{currentPage}</span> of{" "}
                <span className="text-[#141413] font-bold">{totalPages}</span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-md border border-[#E5E4DF] bg-[#FFFFFF] hover:bg-[#F0EEE6] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-all"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev</span>
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-md border border-[#E5E4DF] bg-[#FFFFFF] hover:bg-[#F0EEE6] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-all"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
