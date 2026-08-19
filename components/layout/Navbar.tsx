"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Compass,
  Dices,
  ExternalLink,
  Layers,
  Menu,
  Radar,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { Bounty } from "@/lib/poidh/types";
import { cn } from "@/lib/utils/cn";
import { SurpriseMeModal } from "../discovery/SurpriseMeModal";

interface NavbarProps {
  bounties?: Bounty[];
}

export function Navbar({ bounties = [] }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSurpriseModal, setShowSurpriseModal] = useState(false);

  // Keyboard shortcut '/' to open search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)
      ) {
        e.preventDefault();
        router.push("/bounties");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  const navLinks = [
    { label: "Radar", href: "/" },
    { label: "Bounties", href: "/bounties" },
    { label: "Chains", href: "/chains" },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-[#E5E4DF] bg-[#FAF9F5]/90 backdrop-blur-md transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-3 group">
              {/* POIDH Logo */}
              <div className="relative w-8 h-8 rounded-full overflow-hidden shadow-sm border border-[#E5E4DF] bg-white transition-transform group-hover:scale-105 flex-shrink-0">
                <Image
                  src="/logo.png"
                  alt="POIDH Logo"
                  fill
                  sizes="32px"
                  className="object-cover"
                  priority
                />
              </div>
              <div className="flex flex-col">
                <span className="font-serif text-lg font-bold tracking-tight text-[#141413] leading-none group-hover:text-[#D97757] transition-colors">
                  POIDH Radar
                </span>
                <span className="text-[10px] font-mono text-[#6B6B67] tracking-wider uppercase mt-0.5">
                  Bounty Discovery Engine
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "px-3.5 py-1.5 rounded-md text-xs font-mono tracking-wider uppercase transition-colors",
                      isActive
                        ? "bg-[#F0EEE6] text-[#141413] font-bold border border-[#E5E4DF]"
                        : "text-[#6B6B67] hover:text-[#141413] hover:bg-[#F0EEE6]/60"
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2.5">
            {/* Quick Search trigger */}
            <Link
              href="/bounties"
              className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 text-xs font-mono rounded-md border border-[#E5E4DF] bg-[#F0EEE6] text-[#6B6B67] hover:text-[#141413] hover:border-[#D1D0C9] transition-colors"
            >
              <Search className="w-3.5 h-3.5 text-[#6B6B67]" />
              <span>Search bounties…</span>
              <kbd className="px-1.5 py-0.2 text-[10px] bg-[#FAF9F5] border border-[#E5E4DF] rounded text-[#6B6B67]">
                /
              </kbd>
            </Link>

            {/* Surprise Me button */}
            <button
              onClick={() => setShowSurpriseModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-mono font-medium rounded-md border border-[#D97757]/40 bg-[#D97757]/10 text-[#D97757] hover:bg-[#D97757]/20 transition-colors"
            >
              <Dices className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Surprise Me</span>
            </button>

            {/* Live Data Badge */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono rounded-md border border-[#E5E4DF] bg-[#F0EEE6] text-[#6B6B67]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D97757]" />
              <span>Live Onchain</span>
            </div>

            {/* External POIDH Link */}
            <a
              href="https://poidh.xyz"
              target="_blank"
              rel="noreferrer"
              className="hidden md:flex items-center gap-1 text-xs font-mono text-[#6B6B67] hover:text-[#141413] px-2 py-1 transition-colors"
            >
              <span>POIDH.xyz</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-md border border-[#E5E4DF] bg-[#F0EEE6] text-[#141413]"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#E5E4DF] bg-[#FAF9F5] px-4 py-4 space-y-3 animate-in slide-in-from-top duration-150">
            <Link
              href="/bounties"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-xs font-mono rounded-md border border-[#E5E4DF] bg-[#F0EEE6] text-[#6B6B67]"
            >
              <Search className="w-4 h-4 text-[#D97757]" />
              <span>Search all bounties…</span>
            </Link>

            <div className="space-y-1 pt-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "block px-3 py-2 text-sm font-mono rounded-md transition-colors",
                    pathname === link.href
                      ? "bg-[#F0EEE6] text-[#141413] font-bold"
                      : "text-[#6B6B67] hover:bg-[#F0EEE6]/60"
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="pt-2 border-t border-[#E5E4DF] flex items-center justify-between text-xs font-mono text-[#6B6B67]">
              <a
                href="https://poidh.xyz"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 hover:text-[#141413]"
              >
                <span>POIDH.xyz</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href="https://docs.poidh.xyz"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 hover:text-[#141413]"
              >
                <span>Documentation</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}
      </header>

      {/* Global Surprise Me Modal */}
      <SurpriseMeModal
        bounties={bounties}
        isOpen={showSurpriseModal}
        onClose={() => setShowSurpriseModal(false)}
      />
    </>
  );
}
