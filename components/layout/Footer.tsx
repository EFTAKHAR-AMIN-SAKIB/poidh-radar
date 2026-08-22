import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ExternalLink, Github, Radar } from "lucide-react";
import { CHAINS, CHAIN_ORDER } from "@/lib/poidh/chains";
import { ChainIcon } from "../ui/ChainIcon";

export function Footer() {
  return (
    <footer className="border-t border-[#E5E4DF] bg-[#F0EEE6] text-[#6B6B67] py-12 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-[#E5E4DF]">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="relative w-7 h-7 rounded-full overflow-hidden shadow-sm border border-[#E5E4DF] bg-white flex-shrink-0">
                <Image
                  src="/logo.png"
                  alt="POIDH Logo"
                  fill
                  sizes="28px"
                  className="object-cover"
                />
              </div>
              <span className="font-serif font-bold text-base text-[#141413]">
                <span className="text-[#E61B1B]">POIDH</span> Radar
              </span>
            </div>
            <p className="text-xs text-[#6B6B67] max-w-md leading-relaxed">
              Find something worth building. An editorial discovery engine for live POIDH onchain bounties across Base, Degen, Arbitrum, and Ethereum Mainnet.
            </p>
          </div>

          {/* Supported Chains Badges */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-mono uppercase tracking-wider text-[#8E8E8A]">
              Indexed Networks
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {CHAIN_ORDER.map((c) => {
                const chain = CHAINS[c];
                return (
                  <Link
                    key={c}
                    href={`/bounties?chain=${c}`}
                    className="inline-flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-md border border-[#E5E4DF] bg-[#FFFFFF] hover:border-[#D97757] text-[#141413] transition-colors shadow-paper hover:shadow-sm"
                  >
                    <ChainIcon chain={c} size="sm" />
                    <span className="font-medium">{chain.shortName}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Details & Links */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs font-mono">
          <div className="space-y-0.5">
            <p className="text-[#6B6B67]">
              Powered by public POIDH bounty protocol data (`https://poidh.xyz/[chain]/bounty/[id]/data`).
            </p>
            <p className="text-[#8E8E8A]">
              An independent community-built discovery engine for POIDH bounties. Not officially affiliated with POIDH.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <a
              href="https://poidh.xyz"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#141413] hover:underline flex items-center gap-1 text-[#6B6B67] transition-colors"
            >
              <span>POIDH.xyz</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="https://docs.poidh.xyz"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#141413] hover:underline flex items-center gap-1 text-[#6B6B67] transition-colors"
            >
              <span>Documentation</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="https://github.com/picsoritdidnthappen/poidh-app"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#141413] hover:underline flex items-center gap-1 text-[#6B6B67] transition-colors"
            >
              <span>Contracts</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
