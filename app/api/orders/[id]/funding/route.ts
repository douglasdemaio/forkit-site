import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getWalletFromRequest } from "@/lib/auth";

// GET /api/orders/[id]/funding - Funding progress for an order.
// Auth: restaurant owner, customer, assigned driver, or an existing contributor
// may view. Otherwise contributor wallet addresses (PII when paired with the
// order's items/timing) would be readable by anyone with the order UUID.
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
      include: {
        contributions: { orderBy: { createdAt: "asc" } },
        restaurant: { select: { wallet: true } },
      },
    });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    const isOwner = order.restaurant?.wallet === wallet;
    const isCustomer = order.customerWallet === wallet;
    const isDriver = order.driverWallet === wallet;
    const isContributor = order.contributions.some((c) => c.contributorWallet === wallet);
    if (!isOwner && !isCustomer && !isDriver && !isContributor) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const escrowFunded = order.escrowFunded ?? 0;
    const remaining = Math.max(0, order.escrowTarget - escrowFunded);
    const percentFunded = order.escrowTarget > 0 ? (escrowFunded / order.escrowTarget) * 100 : 0;

    return NextResponse.json({
      escrowTarget: order.escrowTarget,
      escrowFunded,
      remaining,
      percentFunded,
      contributorCount: order.contributions.length,
      contributions: order.contributions.map((c) => ({
        id: c.id,
        orderId: c.orderId,
        wallet: c.contributorWallet,
        amount: c.amount,
        txSignature: c.txSignature,
        timestamp: c.createdAt,
      })),
    });
  } catch (error) {
    console.error("funding error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
