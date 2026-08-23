"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Dices, Globe, Search, Sparkles } from "lucide-react";
import { Bounty } from "@/lib/poidh/types";
import { cn } from "@/lib/utils/cn";
import { SurpriseMeModal } from "../discovery/SurpriseMeModal";

interface MobileBottomNavProps {
  bounties?: Bounty[];
}

export function MobileBottomNav({ bounties = [] }: MobileBottomNavProps) {
  const pathname = usePathname();
  const [showSurpriseModal, setShowSurpriseModal] = useState(false);

  const navItems = [
    {
      label: "Radar",
      href: "/",
      icon: Compass,
      isActive: pathname === "/",
    },
    {
      label: "Bounties",
      href: "/bounties",
      icon: Search,
      isActive: pathname.startsWith("/bounties") || pathname.startsWith("/bounty"),
    },
    {
      label: "Networks",
      href: "/chains",
      icon: Globe,
      isActive: pathname === "/chains",
    },
  ];

  return (
    <>
      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-[#FAF9F5]/95 backdrop-blur-md border-t border-[#E5E4DF] shadow-lg transition-transform duration-200"
      >
        <div className="grid grid-cols-4 items-center h-14 max-w-md mx-auto px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center py-1 rounded-lg transition-all active:scale-95",
                  item.isActive
                    ? "text-[#D97757] font-bold"
                    : "text-[#6B6B67] hover:text-[#141413]"
                )}
              >
                <div
                  className={cn(
                    "p-1 rounded-md transition-colors",
                    item.isActive ? "bg-[#D97757]/10" : "bg-transparent"
                  )}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-mono tracking-tight mt-0.5">
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* Surprise Me Tab */}
          <button
            type="button"
            onClick={() => setShowSurpriseModal(true)}
            className="flex flex-col items-center justify-center py-1 text-[#6B6B67] hover:text-[#D97757] transition-all active:scale-95"
            aria-label="Surprise Me with a random bounty"
          >
            <div className="p-1 rounded-md bg-[#D97757]/10 text-[#D97757]">
              <Dices className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-mono tracking-tight text-[#D97757] font-semibold mt-0.5">
              Surprise
            </span>
          </button>
        </div>
      </nav>

      {/* Surprise Me Modal instance for Mobile Navigation */}
      <SurpriseMeModal
        bounties={bounties}
        isOpen={showSurpriseModal}
        onClose={() => setShowSurpriseModal(false)}
      />
    </>
  );
}
