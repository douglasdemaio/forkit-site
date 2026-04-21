import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getWalletFromRequest } from "@/lib/auth";

// POST /api/orders/[id]/rate-driver
// Body: { rating: 1-5, comment?: string }
// Allowed callers: restaurant owner (raterRole = "restaurant") or customer (raterRole = "customer")
export async function POST(
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
    if (!order.driverWallet) {
      return NextResponse.json({ error: "No driver on this order" }, { status: 400 });
    }
    if (order.status !== "Settled") {
      return NextResponse.json({ error: "Order must be settled before rating" }, { status: 400 });
    }

    let raterRole: "restaurant" | "customer";
    if (order.restaurant?.wallet === wallet) {
      raterRole = "restaurant";
    } else if (order.customerWallet === wallet) {
      raterRole = "customer";
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { rating, comment } = body;
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "rating must be 1–5" }, { status: 400 });
    }

    // Upsert so users can revise their rating
    const deliveryRating = await prisma.deliveryRating.upsert({
      where: { orderId_raterRole: { orderId: params.id, raterRole } },
      update: { rating, comment: comment || null, raterWallet: wallet },
      create: {
        orderId: params.id,
        driverWallet: order.driverWallet,
        raterWallet: wallet,
        raterRole,
        rating,
        comment: comment || null,
      },
    });

    // Recalculate avgRating for the driver from all their ratings
    const allRatings = await prisma.deliveryRating.findMany({
      where: { driverWallet: order.driverWallet },
      select: { rating: true },
    });
    const ratingCount = allRatings.length;
    const avgRating = allRatings.reduce((sum, r) => sum + r.rating, 0) / ratingCount;

    await prisma.driverProfile.upsert({
      where: { wallet: order.driverWallet },
      update: { avgRating, ratingCount },
      create: { wallet: order.driverWallet, avgRating, ratingCount },
    });

    return NextResponse.json({ deliveryRating });
  } catch (error) {
    console.error("Error rating driver:", error);
    return NextResponse.json({ error: "Failed to submit rating" }, { status: 500 });
  }
}
