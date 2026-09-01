"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Bounty, PulseStats } from "@/lib/poidh/types";

export interface SyncResult {
  success: boolean;
  newCount: number;
  totalIndexed?: number;
  timestamp?: number;
  error?: string;
}

export interface LiveSyncContextType {
  bounties: Bounty[];
  stats: PulseStats | null;
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  autoSyncInterval: number; // 0 = off, 15, 30, 60
  secondsUntilNextSync: number;
  toastMessage: string | null;
  syncNow: (silent?: boolean) => Promise<SyncResult>;
  setAutoSyncInterval: (sec: number) => void;
  updateBountiesLocally: (bounties: Bounty[]) => void;
  updateSingleBountyLocally: (bounty: Bounty) => void;
}

const LiveSyncContext = createContext<LiveSyncContextType | null>(null);

interface LiveSyncProviderProps {
  initialBounties: Bounty[];
  initialStats?: PulseStats | null;
  children: React.ReactNode;
}

export function LiveSyncProvider({
  initialBounties,
  initialStats = null,
  children,
}: LiveSyncProviderProps) {
  const [bounties, setBounties] = useState<Bounty[]>(initialBounties);
  const [stats, setStats] = useState<PulseStats | null>(initialStats);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(() => new Date());
  const [autoSyncInterval, setAutoSyncIntervalState] = useState<number>(30); // 30s default auto sync
  const [secondsUntilNextSync, setSecondsUntilNextSync] = useState<number>(30);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  }, []);

  const updateBountiesLocally = useCallback((newBounties: Bounty[]) => {
    setBounties(newBounties);
  }, []);

  const updateSingleBountyLocally = useCallback((updated: Bounty) => {
    setBounties((prev) => {
      const idx = prev.findIndex((b) => b.key === updated.key);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = updated;
        return next;
      }
      return [updated, ...prev];
    });
  }, []);

  const syncNow = useCallback(
    async (silent = false): Promise<SyncResult> => {
      if (isSyncing) {
        return { success: false, newCount: 0, error: "Sync already in progress" };
      }

      setIsSyncing(true);
      try {
        // Trigger live sync on server
        const [syncRes, bountiesRes, statsRes] = await Promise.all([
          fetch("/api/sync", { method: "POST", cache: "no-store" }),
          fetch("/api/bounties?refresh=true", { cache: "no-store" }),
          fetch("/api/stats?refresh=true", { cache: "no-store" }),
        ]);

        let newFound = 0;
        if (syncRes.ok) {
          const syncData = await syncRes.json();
          newFound = syncData.newCount || 0;
        }

        if (bountiesRes.ok) {
          const freshBounties: Bounty[] = await bountiesRes.json();
          if (Array.isArray(freshBounties) && freshBounties.length > 0) {
            setBounties(freshBounties);
          }
        }

        if (statsRes.ok) {
          const freshStats: PulseStats = await statsRes.json();
          if (freshStats && freshStats.totalBounties) {
            setStats(freshStats);
          }
        }

        const now = new Date();
        setLastSyncedAt(now);
        setSecondsUntilNextSync(autoSyncInterval > 0 ? autoSyncInterval : 0);

        if (!silent) {
          if (newFound > 0) {
            showToast(`⚡ Discovered ${newFound} new bounty${newFound > 1 ? "ies" : ""} from poidh.xyz!`);
          } else {
            showToast("✓ All bounties are synced & up-to-date with poidh.xyz");
          }
        }

        return { success: true, newCount: newFound, timestamp: now.getTime() };
      } catch (err: any) {
        console.error("Live sync failed:", err);
        if (!silent) {
          showToast("⚠ Sync notice: using latest cached data");
        }
        return { success: false, newCount: 0, error: err.message };
      } finally {
        setIsSyncing(false);
      }
    },
    [isSyncing, autoSyncInterval, showToast]
  );

  const setAutoSyncInterval = useCallback((sec: number) => {
    setAutoSyncIntervalState(sec);
    setSecondsUntilNextSync(sec);
  }, []);

  // Timer countdown and background sync trigger
  useEffect(() => {
    if (autoSyncInterval <= 0) return;

    const timer = setInterval(() => {
      setSecondsUntilNextSync((prev) => {
        if (prev <= 1) {
          syncNow(true); // background silent sync
          return autoSyncInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoSyncInterval, syncNow]);

  // Global keyboard shortcut: 'r' to trigger instant refresh (when not focused in inputs)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput = ["INPUT", "TEXTAREA", "SELECT"].includes(
        (e.target as HTMLElement)?.tagName
      );
      if (isInput) return;

      if ((e.key === "r" || e.key === "R") && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        syncNow(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [syncNow]);

  return (
    <LiveSyncContext.Provider
      value={{
        bounties,
        stats,
        isSyncing,
        lastSyncedAt,
        autoSyncInterval,
        secondsUntilNextSync,
        toastMessage,
        syncNow,
        setAutoSyncInterval,
        updateBountiesLocally,
        updateSingleBountyLocally,
      }}
    >
      {children}
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-200">
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg border border-[#D97757]/30 bg-[#141413] text-[#FAF9F5] shadow-2xl text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-[#D97757] animate-ping" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}
    </LiveSyncContext.Provider>
  );
}

export function useLiveSync(): LiveSyncContextType {
  const ctx = useContext(LiveSyncContext);
  if (!ctx) {
    throw new Error("useLiveSync must be used within a LiveSyncProvider");
  }
  return ctx;
}
