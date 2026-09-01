import { NextRequest, NextResponse } from "next/server";
import { getAllBounties, getLastSyncTimestamp } from "@/lib/poidh/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const forceRefresh = searchParams.get("refresh") === "true";

    const bounties = await getAllBounties(forceRefresh);
    const syncTime = getLastSyncTimestamp();

    return NextResponse.json(bounties, {
      headers: {
        "Cache-Control": forceRefresh
          ? "no-store, max-age=0"
          : "public, s-maxage=20, stale-while-revalidate=40",
        "X-Sync-Timestamp": syncTime.toString(),
        "X-Bounties-Count": bounties.length.toString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load live bounties" },
      { status: 500 }
    );
  }
}
