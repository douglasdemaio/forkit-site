import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

// GET /api/orders/share/[shareLink] - Resolve a share link to an order
export async function GET(
  _request: NextRequest,
  { params }: { params: { shareLink: string } }
) {
  try {
    const order = await prisma.order.findFirst({
      where: { shareLink: { contains: params.shareLink } },
      include: {
        contributions: { orderBy: { createdAt: "asc" } },
        restaurant: { select: { id: true, name: true, slug: true, wallet: true, currency: true } },
      },
    });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const items = typeof order.items === "string" ? JSON.parse(order.items) : order.items;
    const escrowFunded = order.escrowFunded ?? 0;
    const remaining = Math.max(0, order.escrowTarget - escrowFunded);
    const percentFunded = order.escrowTarget > 0 ? (escrowFunded / order.escrowTarget) * 100 : 0;
    const rest = order.restaurant;

    return NextResponse.json({
      ...order,
      items,
      foodTotal: order.foodTotal ?? 0,
      escrowFunded,
      customer: { wallet: order.customerWallet },
      contributions: order.contributions.map((c) => ({
        id: c.id,
        orderId: c.orderId,
        wallet: c.contributorWallet,
        amount: c.amount,
        txSignature: c.txSignature,
        timestamp: c.createdAt,
      })),
      restaurant: rest
        ? { id: rest.id, name: rest.name, slug: rest.slug, walletAddress: rest.wallet, currency: rest.currency }
        : undefined,
      remaining,
      percentFunded,
    });
  } catch (error) {
    console.error("share link error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
