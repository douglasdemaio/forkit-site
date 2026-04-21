import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getWalletFromRequest } from "@/lib/auth";

// POST /api/orders/[id]/bids/[bidId]/accept — restaurant manually accepts a bid
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; bidId: string } }
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
    if (order.status !== "Preparing") {
      return NextResponse.json({ error: "Order is not in Preparing state" }, { status: 400 });
    }
    if (order.driverWallet) {
      return NextResponse.json({ error: "Driver already assigned" }, { status: 409 });
    }

    const bid = await prisma.driverBid.findUnique({ where: { id: params.bidId } });
    if (!bid || bid.orderId !== params.id) {
      return NextResponse.json({ error: "Bid not found" }, { status: 404 });
    }
    if (bid.status !== "Pending") {
      return NextResponse.json({ error: "Bid is no longer pending" }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.order.update({
        where: { id: params.id },
        data: { status: "DriverAssigned", driverWallet: bid.driverWallet },
      }),
      prisma.driverBid.update({
        where: { id: params.bidId },
        data: { status: "Accepted" },
      }),
      // Reject all other pending bids
      prisma.driverBid.updateMany({
        where: { orderId: params.id, id: { not: params.bidId }, status: "Pending" },
        data: { status: "Rejected" },
      }),
    ]);

    return NextResponse.json({ success: true, driverWallet: bid.driverWallet });
  } catch (error) {
    console.error("Error accepting bid:", error);
    return NextResponse.json({ error: "Failed to accept bid" }, { status: 500 });
  }
}
