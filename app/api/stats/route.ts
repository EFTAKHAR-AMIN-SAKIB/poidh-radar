import { NextRequest, NextResponse } from "next/server";
import { calculatePulseStats, fetchLiveStats, getAllBounties, getLastSyncTimestamp } from "@/lib/poidh/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const forceRefresh = searchParams.get("refresh") === "true";

    const [bounties, liveStats] = await Promise.all([
      getAllBounties(forceRefresh),
      fetchLiveStats(forceRefresh),
    ]);
    const stats = calculatePulseStats(bounties, liveStats);
    const syncTime = getLastSyncTimestamp();

    return NextResponse.json(stats, {
      headers: {
        "Cache-Control": forceRefresh
          ? "no-store, max-age=0"
          : "public, s-maxage=20, stale-while-revalidate=40",
        "X-Sync-Timestamp": syncTime.toString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load live stats" },
      { status: 500 }
    );
  }
}
