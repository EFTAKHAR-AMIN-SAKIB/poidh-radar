"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, RefreshCw } from "lucide-react";
import { ChainSlug } from "@/lib/poidh/types";
import { cn } from "@/lib/utils/cn";

interface BountyLiveRefreshButtonProps {
  chain: ChainSlug;
  id: number;
}

export function BountyLiveRefreshButton({ chain, id }: BountyLiveRefreshButtonProps) {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setStatusText("Fetching live from poidh.xyz…");

    try {
      const res = await fetch(`/api/bounty/${chain}/${id}?refresh=true`, {
        cache: "no-store",
      });

      if (res.ok) {
        setStatusText("Updated with latest data!");
        router.refresh();
      } else {
        setStatusText("Could not reach poidh.xyz");
      }
    } catch {
      setStatusText("Network error");
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
        setTimeout(() => setStatusText(null), 2500);
      }, 600);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleRefresh}
        disabled={isRefreshing}
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium rounded-md border border-[#E5E4DF] bg-[#FFFFFF] hover:bg-[#F0EEE6] text-[#141413] shadow-paper transition-all active:scale-95 disabled:opacity-60",
          isRefreshing && "text-[#D97757]"
        )}
        title="Query canonical poidh.xyz endpoint for newly submitted claims or status transitions"
      >
        <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin text-[#D97757]")} />
        <span>{isRefreshing ? "Checking poidh.xyz…" : "Live Refresh"}</span>
      </button>

      {statusText && (
        <span className="text-[11px] font-mono text-[#6B6B67] animate-in fade-in duration-150">
          {statusText}
        </span>
      )}
    </div>
  );
}
