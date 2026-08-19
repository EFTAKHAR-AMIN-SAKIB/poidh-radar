import { NextResponse } from "next/server";
import { getAllBounties } from "@/lib/poidh/client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const bounties = await getAllBounties();
    return NextResponse.json(bounties, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load live bounties" },
      { status: 500 }
    );
  }
}
