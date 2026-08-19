import { NextResponse } from "next/server";
import { calculatePulseStats, fetchLiveStats, getAllBounties } from "@/lib/poidh/client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [bounties, liveStats] = await Promise.all([
      getAllBounties(),
      fetchLiveStats(),
    ]);
    const stats = calculatePulseStats(bounties, liveStats);
    return NextResponse.json(stats, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load live stats" },
      { status: 500 }
    );
  }
}
