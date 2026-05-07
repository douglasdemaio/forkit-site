import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getWalletFromRequest } from "@/lib/auth";

const NEWCOMER_DELIVERY_THRESHOLD = 5;
const NEWCOMER_RATING_THRESHOLD = 4.0;

function isNewcomer(profile: { completedDeliveries: number; avgRating: number } | null): boolean {
  if (!profile) return true;
  return profile.completedDeliveries < NEWCOMER_DELIVERY_THRESHOLD || profile.avgRating < NEWCOMER_RATING_THRESHOLD;
}

// GET /api/orders/[id]/bids — restaurant sees all bids for this order
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const wallet = await getWalletFromRequest(request);
    if (!wallet) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: { restaurant: { select: { wallet: true } } },
    });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    if (order.restaurant?.wallet !== wallet) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const bids = await prisma.driverBid.findMany({
      where: { orderId: params.id },
      orderBy: [{ amount: "asc" }, { createdAt: "asc" }],
    });

    const profiles = await prisma.driverProfile.findMany({
      where: { wallet: { in: bids.map((b) => b.driverWallet) } },
    });
    const profileMap = Object.fromEntries(profiles.map((p) => [p.wallet, p]));

    return NextResponse.json({
      bids: bids.map((b) => {
        const profile = profileMap[b.driverWallet] ?? null;
        return {
          ...b,
          driver: profile
            ? { ...profile, isNewcomer: isNewcomer(profile) }
            : { wallet: b.driverWallet, completedDeliveries: 0, avgRating: 0, ratingCount: 0, isNewcomer: true },
        };
      }),
    });
  } catch (error) {
    console.error("Error fetching bids:", error);
    return NextResponse.json({ error: "Failed to fetch bids" }, { status: 500 });
  }
}

// POST /api/orders/[id]/bids — driver places a bid with a proposed amount
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const wallet = await getWalletFromRequest(request);
    if (!wallet) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const offerAmount = Number(body?.offerAmount);
    if (!Number.isFinite(offerAmount) || offerAmount <= 0) {
      return NextResponse.json(
        { error: "offerAmount must be a positive number" },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id: params.id },
    });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    if (order.status !== "Preparing") {
      return NextResponse.json({ error: "Order is not accepting bids" }, { status: 400 });
    }
    if (order.driverWallet) {
      return NextResponse.json({ error: "Order already has an assigned driver" }, { status: 409 });
    }
    if (offerAmount > order.deliveryFee) {
      return NextResponse.json(
        { error: `offerAmount cannot exceed posted delivery fee (${order.deliveryFee})` },
        { status: 400 }
      );
    }

    // Upsert: driver can re-bid any new amount (lower or higher) before acceptance
    const bid = await prisma.driverBid.upsert({
      where: { orderId_driverWallet: { orderId: params.id, driverWallet: wallet } },
      update: { amount: offerAmount, status: "Pending", createdAt: new Date() },
      create: { orderId: params.id, driverWallet: wallet, amount: offerAmount },
    });

    return NextResponse.json({ bid });
  } catch (error) {
    console.error("Error placing bid:", error);
    return NextResponse.json({ error: "Failed to place bid" }, { status: 500 });
  }
}
