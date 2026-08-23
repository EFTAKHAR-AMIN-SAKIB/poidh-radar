import Link from "next/link";
import { ArrowRight, Compass, Sparkles } from "lucide-react";
import { calculatePulseStats, fetchLiveStats, getAllBounties } from "@/lib/poidh/client";
import { FreshBounties } from "@/components/discovery/FreshBounties";
import { HeroSection } from "@/components/discovery/HeroSection";
import { HiddenGems } from "@/components/discovery/HiddenGems";
import { HotBounties } from "@/components/discovery/HotBounties";
import { LiveBountyPulse } from "@/components/discovery/LiveBountyPulse";
import { MostActive } from "@/components/discovery/MostActive";
import { BountyUniverse } from "@/components/visual/BountyUniverse";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  const [bounties, liveStats] = await Promise.all([
    getAllBounties(),
    fetchLiveStats(),
  ]);
  const stats = calculatePulseStats(bounties, liveStats);

  return (
    <div className="space-y-10 pb-16">
      {/* 1. Hero Section with Search & Print-style Stat Pills */}
      <HeroSection totalCount={stats.totalBounties} stats={stats} />

      {/* 2. Live Ecosystem Pulse */}
      <LiveBountyPulse stats={stats} />

      {/* 3. Hot Bounties (Highest Radar Scores) */}
      <HotBounties bounties={bounties} />

      {/* 4. Hidden Gems (Overlooked Open Bounties with Low Competition) */}
      <HiddenGems bounties={bounties} />

      {/* 5. Bounty Universe (Interactive Constellation Galaxy) */}
      <section className="py-6 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto space-y-4">
          <BountyUniverse bounties={bounties} />
        </div>
      </section>

      {/* 6. Fresh on POIDH (Chronological Stream) */}
      <FreshBounties bounties={bounties} />

      {/* 7. Most Active Contests */}
      <MostActive bounties={bounties} />

      {/* 8. Editorial Call to Action Banner */}
      <section className="py-10 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto rounded-xl border border-[#E5E4DF] bg-[#F0EEE6] p-8 sm:p-12 text-center space-y-5 shadow-paper">
          <div className="space-y-2 max-w-xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#141413]">
              Find your next onchain build
            </h2>
            <p className="text-xs sm:text-sm text-[#6B6B67] leading-relaxed">
              Explore all {stats.totalBounties.toLocaleString()} indexed bounties across Base, Degen, Arbitrum, and Ethereum with instant filtering.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/bounties"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#D97757] hover:bg-[#CC785C] text-white font-mono text-xs font-medium transition-colors shadow-sm"
            >
              <span>Explore All Bounties</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <Link
              href="/chains"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-[#E5E4DF] bg-[#FFFFFF] hover:bg-[#FAF9F5] text-[#141413] font-mono text-xs font-medium transition-colors"
            >
              <span>View Networks</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
