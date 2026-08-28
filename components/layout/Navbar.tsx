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
import { SearchModal } from "../discovery/SearchModal";

interface NavbarProps {
  bounties?: Bounty[];
}

export function Navbar({ bounties = [] }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSurpriseModal, setShowSurpriseModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);

  // Keyboard shortcut '/' and 'Cmd+K' / 'Ctrl+K' to open search modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInputOrTextArea = ["INPUT", "TEXTAREA"].includes(
        (e.target as HTMLElement)?.tagName
      );

      if ((e.key === "/" && !isInputOrTextArea) || ((e.metaKey || e.ctrlKey) && e.key === "k")) {
        e.preventDefault();
        setShowSearchModal(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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
              <Image
                src="/logo.png"
                alt="POIDH Logo"
                width={32}
                height={32}
                className="w-8 h-8 rounded-full object-cover shadow-sm border border-[#E5E4DF] bg-white transition-transform group-hover:scale-105 flex-shrink-0"
                priority
              />
              <div className="flex flex-col">
                <span className="font-serif text-lg font-bold tracking-tight leading-none transition-colors">
                  <span className="text-[#E61B1B]">POIDH</span>{" "}
                  <span className="text-[#141413]">Radar</span>
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
          <div className="flex items-center gap-2">
            {/* Quick Search trigger (Desktop & Tablet) */}
            <button
              onClick={() => setShowSearchModal(true)}
              className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 text-xs font-mono rounded-md border border-[#E5E4DF] bg-[#F0EEE6] text-[#6B6B67] hover:text-[#141413] hover:border-[#D1D0C9] active:scale-95 transition-all"
            >
              <Search className="w-3.5 h-3.5 text-[#6B6B67]" />
              <span>Search bounties…</span>
              <kbd className="px-1.5 py-0.2 text-[10px] bg-[#FAF9F5] border border-[#E5E4DF] rounded text-[#6B6B67]">
                /
              </kbd>
            </button>

            {/* Direct Search Icon for Mobile (< sm) */}
            <button
              onClick={() => setShowSearchModal(true)}
              className="sm:hidden p-2 rounded-md border border-[#E5E4DF] bg-[#F0EEE6] text-[#6B6B67] hover:text-[#141413] active:scale-95 transition-all"
              aria-label="Search all bounties"
            >
              <Search className="w-4 h-4 text-[#D97757]" />
            </button>

            {/* Surprise Me button */}
            <button
              onClick={() => setShowSurpriseModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium rounded-md border border-[#D97757]/40 bg-[#D97757]/10 text-[#D97757] hover:bg-[#D97757]/20 active:scale-95 transition-all"
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
              className="md:hidden p-2 rounded-md border border-[#E5E4DF] bg-[#F0EEE6] text-[#141413] active:scale-95 transition-all"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#E5E4DF] bg-[#FAF9F5] px-4 py-4 space-y-3 animate-in slide-in-from-top duration-150 shadow-paper-lg">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                setShowSearchModal(true);
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-mono rounded-lg border border-[#E5E4DF] bg-[#F0EEE6] text-[#6B6B67] active:bg-[#EAE7DD] text-left"
            >
              <Search className="w-4 h-4 text-[#D97757]" />
              <span>Search all bounties…</span>
            </button>

            <div className="space-y-1 pt-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "block px-3 py-2 text-sm font-mono rounded-md transition-colors",
                    pathname === link.href
                      ? "bg-[#F0EEE6] text-[#141413] font-bold border border-[#E5E4DF]"
                      : "text-[#6B6B67] hover:bg-[#F0EEE6]/60"
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Quick Network Shortcuts in Mobile Menu */}
            <div className="pt-2 border-t border-[#E5E4DF] space-y-1.5">
              <div className="text-[10px] font-mono uppercase tracking-wider text-[#8E8E8A]">
                Quick Network Filter
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { slug: "base", name: "Base" },
                  { slug: "arbitrum", name: "Arbitrum" },
                  { slug: "degen", name: "Degen" },
                  { slug: "mainnet", name: "Ethereum" },
                ].map((c) => (
                  <Link
                    key={c.slug}
                    href={`/bounties?chain=${c.slug}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-[#E5E4DF] bg-[#FFFFFF] text-xs font-mono text-[#141413] hover:border-[#D97757] active:bg-[#F0EEE6]"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D97757]" />
                    <span>{c.name}</span>
                  </Link>
                ))}
              </div>
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

      {/* Global Search Modal */}
      <SearchModal
        bounties={bounties}
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
      />

      {/* Global Surprise Me Modal */}
      <SurpriseMeModal
        bounties={bounties}
        isOpen={showSurpriseModal}
        onClose={() => setShowSurpriseModal(false)}
      />
    </>
  );
}

