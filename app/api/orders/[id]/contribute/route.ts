import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

// POST /api/orders/[id]/contribute - Record a contribution to an order
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    // Accept both field names for compatibility
    const contributorWallet = body.contributorWallet || body.wallet;
    const { amount, txSignature } = body;

    if (!contributorWallet || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        { error: "wallet and positive amount are required" },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: { contributions: true },
    });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const uniqueContributors = new Set(order.contributions.map((c) => c.contributorWallet));
    if (uniqueContributors.size >= 10 && !uniqueContributors.has(contributorWallet)) {
      return NextResponse.json(
        { error: "Maximum 10 contributors per order" },
        { status: 400 }
      );
    }

    const contribution = await prisma.contribution.create({
      data: { orderId: params.id, contributorWallet, amount, txSignature: txSignature || null },
    });

    const totalContributed =
      order.contributions.reduce((sum, c) => sum + c.amount, 0) + amount;

    let funded = false;
    if (totalContributed >= order.escrowTarget && order.status === "Created") {
      await prisma.order.update({
        where: { id: params.id },
        data: { status: "Funded", escrowFunded: totalContributed },
      });
      funded = true;
    } else {
      await prisma.order.update({
        where: { id: params.id },
        data: { escrowFunded: totalContributed },
      });
    }

    return NextResponse.json(
      {
        contribution: {
          id: contribution.id,
          orderId: contribution.orderId,
          wallet: contribution.contributorWallet,
          amount: contribution.amount,
          txSignature: contribution.txSignature,
          timestamp: contribution.createdAt,
        },
        funded,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error recording contribution:", error);
    return NextResponse.json({ error: "Failed to record contribution" }, { status: 500 });
  }
}
