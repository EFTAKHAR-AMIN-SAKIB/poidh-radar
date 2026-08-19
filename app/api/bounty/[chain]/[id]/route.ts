import { NextRequest, NextResponse } from "next/server";
import { fetchLiveBounty } from "@/lib/poidh/client";
import { ChainSlug } from "@/lib/poidh/types";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { chain: string; id: string } }
) {
  try {
    const chain = params.chain.toLowerCase() as ChainSlug;
    const id = parseInt(params.id, 10);

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid bounty ID" }, { status: 400 });
    }

    const bounty = await fetchLiveBounty(chain, id);
    if (!bounty) {
      return NextResponse.json({ error: "Bounty not found" }, { status: 404 });
    }

    return NextResponse.json(bounty, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch bounty" },
      { status: 500 }
    );
  }
}
