import { NextRequest, NextResponse } from "next/server";
import { syncLiveBounties, getLastSyncTimestamp, getMaxKnownIds } from "@/lib/poidh/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const report = await syncLiveBounties(true);
    return NextResponse.json(report, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "X-Sync-Timestamp": report.timestamp.toString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to trigger instant sync",
        timestamp: getLastSyncTimestamp(),
        maxKnownIds: getMaxKnownIds(),
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
