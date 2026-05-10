import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getWalletFromRequest } from "@/lib/auth";

const VALID_TRANSITIONS: Record<string, string[]> = {
  Created:        ["Cancelled"],
  Funded:         ["Preparing", "Cancelled"],
  Preparing:      ["DriverAssigned", "ReadyForPickup"],
  DriverAssigned: ["ReadyForPickup"],
  ReadyForPickup: ["PickedUp"],
  PickedUp:       ["Delivered"],
  Delivered:      ["Settled"],
};

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
        merchant: { select: { id: true, name: true, slug: true, wallet: true, currency: true, autoAcknowledge: true, selfDelivery: true } },
        contributions: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Only the merchant owner may drive order status from the dashboard
    if (order.merchant?.wallet !== wallet) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const allowed = VALID_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(newStatus)) {
      return NextResponse.json(
        { error: `Cannot transition from ${order.status} to ${newStatus}` },
        { status: 400 }
      );
    }

    const now = new Date();
    const updateData: any = { status: newStatus };

    // Only open for driver bids when the merchant doesn't handle delivery itself
    if (newStatus === "Preparing" && !order.merchant?.selfDelivery) {
      updateData.bidOpenAt = now;
    }

    // Auto-acknowledge: if merchant has flag set, chain Funded → Preparing automatically
    const autoChainToPreparing =
      newStatus === "Funded" && order.merchant?.autoAcknowledge;
    if (autoChainToPreparing) {
      updateData.status = "Preparing";
      if (!order.merchant?.selfDelivery) {
        updateData.bidOpenAt = now;
      }
    }

    if (newStatus === "PickedUp" && !order.driverWallet) {
      updateData.driverWallet = wallet;
    }

    const updated = await prisma.order.update({
      where: { id: params.id },
      data: updateData,
      include: {
        merchant: { select: { id: true, name: true, slug: true, wallet: true, currency: true } },
        contributions: { orderBy: { createdAt: "asc" } },
      },
    });

    // Increment driver completedDeliveries when order settles
    if (newStatus === "Settled" && updated.driverWallet) {
      await prisma.driverProfile.upsert({
        where: { wallet: updated.driverWallet },
        update: { completedDeliveries: { increment: 1 } },
        create: { wallet: updated.driverWallet, completedDeliveries: 1 },
      });
    }

    const items = typeof updated.items === "string" ? JSON.parse(updated.items) : updated.items;
    const contributions = updated.contributions.map((c) => ({
      id: c.id,
      orderId: c.orderId,
      wallet: c.contributorWallet,
      amount: c.amount,
      txSignature: c.txSignature,
      timestamp: c.createdAt,
    }));
    const rest = updated.merchant;

    return NextResponse.json({
      ...updated,
      items,
      foodTotal: updated.foodTotal ?? 0,
      escrowFunded: updated.escrowFunded ?? 0,
      customer: { wallet: updated.customerWallet },
      contributions,
      merchant: rest
        ? { id: rest.id, name: rest.name, slug: rest.slug, wallet: rest.wallet, currency: rest.currency }
        : undefined,
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }
}
