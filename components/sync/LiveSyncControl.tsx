"use client";

import React, { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Clock, RefreshCw, Sparkles, Wifi } from "lucide-react";
import { useLiveSync } from "./LiveSyncContext";
import { cn } from "@/lib/utils/cn";

export function LiveSyncControl({ className }: { className?: string }) {
  const {
    isSyncing,
    lastSyncedAt,
    autoSyncInterval,
    secondsUntilNextSync,
    syncNow,
    setAutoSyncInterval,
  } = useLiveSync();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [timeAgoStr, setTimeAgoStr] = useState<string>("just now");
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Update time ago string every 5 seconds
  useEffect(() => {
    const update = () => {
      if (!lastSyncedAt) {
        setTimeAgoStr("just now");
        return;
      }
      const elapsedSec = Math.floor((Date.now() - lastSyncedAt.getTime()) / 1000);
      if (elapsedSec < 10) setTimeAgoStr("just now");
      else if (elapsedSec < 60) setTimeAgoStr(`${elapsedSec}s ago`);
      else setTimeAgoStr(`${Math.floor(elapsedSec / 60)}m ago`);
    };

    update();
    const interval = setInterval(update, 5000);
    return () => clearInterval(interval);
  }, [lastSyncedAt]);

  const intervals = [
    { label: "Every 15s (Real-time)", value: 15 },
    { label: "Every 30s (Default)", value: 30 },
    { label: "Every 60s", value: 60 },
    { label: "Manual (Press R)", value: 0 },
  ];

  return (
    <div className={cn("relative inline-flex items-center", className)} ref={dropdownRef}>
      <div className="inline-flex items-center rounded-md border border-[#E5E4DF] bg-[#F0EEE6] shadow-2xs">
        {/* Main Sync Button */}
        <button
          onClick={() => syncNow(false)}
          disabled={isSyncing}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono text-[#141413] hover:text-[#D97757] hover:bg-[#FAF9F5] rounded-l-md transition-all active:scale-95 disabled:opacity-60"
          title={`Click to instantly refresh bounties from poidh.xyz (or press 'R'). Last synced: ${timeAgoStr}`}
        >
          <RefreshCw
            className={cn(
              "w-3 h-3 text-[#D97757] transition-transform",
              isSyncing && "animate-spin text-[#D97757]"
            )}
          />
          <span className="font-medium hidden sm:inline">
            {isSyncing ? "Syncing…" : "Sync"}
          </span>
          {!isSyncing && autoSyncInterval > 0 && (
            <span className="text-[10px] text-[#6B6B67] hidden md:inline">
              ({secondsUntilNextSync}s)
            </span>
          )}
        </button>

        {/* Status Dot / Indicator */}
        <div className="h-4 w-px bg-[#E5E4DF]" />

        {/* Dropdown Toggle */}
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-1 px-1.5 py-1 text-xs font-mono text-[#6B6B67] hover:text-[#141413] hover:bg-[#FAF9F5] rounded-r-md transition-colors"
          aria-label="Sync options"
        >
          <span
            className={cn(
              "w-1.5 h-1.5 rounded-full transition-colors",
              isSyncing
                ? "bg-[#D97757] animate-ping"
                : autoSyncInterval > 0
                ? "bg-emerald-500"
                : "bg-[#8E8E8A]"
            )}
          />
          <ChevronDown className="w-3 h-3" />
        </button>
      </div>

      {/* Dropdown Menu */}
      {dropdownOpen && (
        <div className="absolute right-0 top-full mt-1.5 z-50 w-64 rounded-xl border border-[#E5E4DF] bg-[#FFFFFF] p-2.5 shadow-paper-lg animate-in fade-in zoom-in-95 duration-150 font-mono text-xs text-[#141413]">
          {/* Header */}
          <div className="px-2 py-1.5 border-b border-[#E5E4DF] mb-1.5 flex items-center justify-between">
            <span className="font-bold text-[11px] uppercase tracking-wider text-[#6B6B67]">
              Live POIDH Sync
            </span>
            <span className="text-[10px] text-[#8E8E8A]">{timeAgoStr}</span>
          </div>

          {/* Quick sync trigger button */}
          <button
            onClick={() => {
              setDropdownOpen(false);
              syncNow(false);
            }}
            disabled={isSyncing}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 mb-2 rounded-lg bg-[#D97757] hover:bg-[#CC785C] text-white font-medium text-xs transition-colors shadow-sm disabled:opacity-60"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isSyncing && "animate-spin")} />
            <span>{isSyncing ? "Syncing from poidh.xyz…" : "Sync Now from poidh.xyz"}</span>
          </button>

          {/* Interval options */}
          <div className="space-y-0.5 pt-1">
            <span className="px-2 text-[10px] uppercase tracking-wider text-[#8E8E8A] block">
              Auto-Sync Rate
            </span>
            {intervals.map((item) => {
              const isSelected = autoSyncInterval === item.value;
              return (
                <button
                  key={item.value}
                  onClick={() => {
                    setAutoSyncInterval(item.value);
                    setDropdownOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors text-left",
                    isSelected
                      ? "bg-[#F0EEE6] text-[#141413] font-bold"
                      : "text-[#6B6B67] hover:bg-[#FAF9F5] hover:text-[#141413]"
                  )}
                >
                  <span>{item.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#D97757]" />}
                </button>
              );
            })}
          </div>

          {/* Keyboard tip */}
          <div className="mt-2 pt-2 border-t border-[#E5E4DF] px-2 text-[10px] text-[#8E8E8A] flex items-center justify-between">
            <span>Instant sync key:</span>
            <kbd className="px-1.5 py-0.5 rounded border border-[#E5E4DF] bg-[#F0EEE6] text-[#141413] font-bold">
              R
            </kbd>
          </div>
        </div>
      )}
    </div>
  );
}
