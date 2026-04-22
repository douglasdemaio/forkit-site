import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getWalletFromRequest } from "@/lib/auth";

const NEWCOMER_DELIVERY_THRESHOLD = 5;
const NEWCOMER_RATING_THRESHOLD = 4.0;

const VALID_VEHICLE_TYPES = ["bicycle", "ebike", "escooter", "ev", "motorcycle", "car"];

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
      vehicleType: null,
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

// PATCH /api/drivers/[wallet] — update own vehicle type
export async function PATCH(
  request: NextRequest,
  { params }: { params: { wallet: string } }
) {
  const authWallet = await getWalletFromRequest(request);
  if (!authWallet || authWallet !== params.wallet) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { vehicleType } = await request.json();
    if (!VALID_VEHICLE_TYPES.includes(vehicleType)) {
      return NextResponse.json({ error: "Invalid vehicle type" }, { status: 400 });
    }

    const profile = await prisma.driverProfile.upsert({
      where: { wallet: params.wallet },
      update: { vehicleType },
      create: { wallet: params.wallet, vehicleType },
    });

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Error updating driver profile:", error);
    return NextResponse.json({ error: "Failed to update driver profile" }, { status: 500 });
  }
}
