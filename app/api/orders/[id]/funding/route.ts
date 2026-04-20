import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

// GET /api/orders/[id]/funding - Funding progress for an order
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: { contributions: { orderBy: { createdAt: "asc" } } },
    });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
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
