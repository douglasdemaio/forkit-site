import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getWalletFromRequest } from "@/lib/auth";

const VALID_TRANSITIONS: Record<string, string[]> = {
  Created:       ["Cancelled"],
  Funded:        ["Preparing", "Cancelled"],
  Preparing:     ["ReadyForPickup"],
  ReadyForPickup: ["PickedUp"],
  PickedUp:      ["Delivered"],
  Delivered:     ["Settled"],
};

// POST /api/orders/[id]/status
// Used by forkme restaurant and driver screens to advance order state.
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const wallet = await getWalletFromRequest(request);
    if (!wallet) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { status: newStatus } = body;
    if (!newStatus) {
      return NextResponse.json({ error: "status is required" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        restaurant: { select: { id: true, name: true, slug: true, wallet: true, currency: true } },
        contributions: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const allowed = VALID_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(newStatus)) {
      return NextResponse.json(
        { error: `Cannot transition from ${order.status} to ${newStatus}` },
        { status: 400 }
      );
    }

    const updateData: any = { status: newStatus };
    // Track driver wallet when they accept a delivery
    if (newStatus === "PickedUp" && !order.driverWallet) {
      updateData.driverWallet = wallet;
    }

    const updated = await prisma.order.update({
      where: { id: params.id },
      data: updateData,
      include: {
        restaurant: { select: { id: true, name: true, slug: true, wallet: true, currency: true } },
        contributions: { orderBy: { createdAt: "asc" } },
      },
    });

    const items = typeof updated.items === "string" ? JSON.parse(updated.items) : updated.items;
    const contributions = updated.contributions.map((c) => ({
      id: c.id,
      orderId: c.orderId,
      wallet: c.contributorWallet,
      amount: c.amount,
      txSignature: c.txSignature,
      timestamp: c.createdAt,
    }));
    const rest = updated.restaurant;

    return NextResponse.json({
      ...updated,
      items,
      foodTotal: updated.foodTotal ?? 0,
      escrowFunded: updated.escrowFunded ?? 0,
      customer: { wallet: updated.customerWallet },
      contributions,
      restaurant: rest
        ? { id: rest.id, name: rest.name, slug: rest.slug, walletAddress: rest.wallet, currency: rest.currency }
        : undefined,
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }
}
