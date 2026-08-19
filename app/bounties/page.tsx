import React, { Suspense } from "react";
import { Metadata } from "next";
import { getAllBounties } from "@/lib/poidh/client";
import { BountyExplorer } from "@/components/explorer/BountyExplorer";
import { BountyCardSkeleton } from "@/components/ui/Skeleton";

export const metadata: Metadata = {
  title: "Explore Bounties — POIDH Radar",
  description:
    "Complete bounty explorer with real-time multi-facet filtering across Base, Degen, Arbitrum, and Ethereum Mainnet.",
};

export const revalidate = 60;

export default async function BountiesPage() {
  const bounties = await getAllBounties();

  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <BountyCardSkeleton key={i} />
            ))}
          </div>
        </div>
      }
    >
      <BountyExplorer initialBounties={bounties} />
    </Suspense>
  );
}
