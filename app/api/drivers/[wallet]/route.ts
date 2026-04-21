import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

const NEWCOMER_DELIVERY_THRESHOLD = 5;
const NEWCOMER_RATING_THRESHOLD = 4.0;

// GET /api/drivers/[wallet] — public driver profile
export async function GET(
  _request: NextRequest,
  { params }: { params: { wallet: string } }
) {
  try {
    const profile = await prisma.driverProfile.findUnique({
      where: { wallet: params.wallet },
    });

    const result = profile ?? {
      wallet: params.wallet,
      completedDeliveries: 0,
      avgRating: 0,
      ratingCount: 0,
    };

    return NextResponse.json({
      ...result,
      isNewcomer:
        result.completedDeliveries < NEWCOMER_DELIVERY_THRESHOLD ||
        result.avgRating < NEWCOMER_RATING_THRESHOLD,
    });
  } catch (error) {
    console.error("Error fetching driver profile:", error);
    return NextResponse.json({ error: "Failed to fetch driver profile" }, { status: 500 });
  }
}
