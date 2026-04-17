import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

// POST /api/orders/[id]/contribute - Record a contribution to an order
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { contributorWallet, amount, txSignature } = body;

    if (!contributorWallet || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        { error: "contributorWallet and positive amount are required" },
        { status: 400 }
      );
    }

    // Verify order exists
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: { contributions: true },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // Check max contributors
    const uniqueContributors = new Set(
      order.contributions.map((c) => c.contributorWallet)
    );
    if (
      uniqueContributors.size >= 10 &&
      !uniqueContributors.has(contributorWallet)
    ) {
      return NextResponse.json(
        { error: "Maximum 10 contributors per order" },
        { status: 400 }
      );
    }

    // Record contribution
    const contribution = await prisma.contribution.create({
      data: {
        orderId: params.id,
        contributorWallet,
        amount,
        txSignature: txSignature || null,
      },
    });

    // Check if order is fully funded
    const totalContributed =
      order.contributions.reduce((sum, c) => sum + c.amount, 0) + amount;

    if (totalContributed >= order.escrowTarget && order.status === "pending") {
      await prisma.order.update({
        where: { id: params.id },
        data: { status: "funded" },
      });
    }

    return NextResponse.json(contribution, { status: 201 });
  } catch (error) {
    console.error("Error recording contribution:", error);
    return NextResponse.json(
      { error: "Failed to record contribution" },
      { status: 500 }
    );
  }
}
