import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getWalletFromRequest } from "@/lib/auth";

function toApiOrder(order: any) {
  const items =
    typeof order.items === "string" ? JSON.parse(order.items) : order.items;
  const contributions = (order.contributions ?? []).map((c: any) => ({
    id: c.id,
    orderId: c.orderId,
    wallet: c.contributorWallet,
    amount: c.amount,
    txSignature: c.txSignature,
    timestamp: c.createdAt,
  }));
  const rest = order.restaurant;
  return {
    ...order,
    items,
    foodTotal: order.foodTotal ?? 0,
    escrowFunded: order.escrowFunded ?? 0,
    customer: { wallet: order.customerWallet },
    contributions,
    restaurant: rest
      ? {
          id: rest.id,
          name: rest.name,
          slug: rest.slug,
          walletAddress: rest.wallet,
          currency: rest.currency,
        }
      : undefined,
  };
}

// GET /api/orders/[id]
// Auth: restaurant owner, customer, or assigned driver may view full order.
// Share-link tokens (8-char slug) are treated as public read for order tracking.
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const wallet = await getWalletFromRequest(request);
    const { id } = params;

    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id }, { shareLink: { contains: id } }],
      },
      include: {
        contributions: { orderBy: { createdAt: "asc" } },
        restaurant: { select: { id: true, name: true, slug: true, wallet: true, currency: true } },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Share-link access: the ID is the 8-char slug embedded in the share URL,
    // not the full UUID — treat as public read-only for order tracking.
    const isShareLinkAccess = id !== order.id;

    if (!isShareLinkAccess) {
      if (!wallet) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const isOwner = order.restaurant?.wallet === wallet;
      const isCustomer = order.customerWallet === wallet;
      const isDriver = order.driverWallet === wallet;
      if (!isOwner && !isCustomer && !isDriver) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    return NextResponse.json(toApiOrder(order));
  } catch (error) {
    console.error("Error fetching order:", error);
    return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 });
  }
}

// PUT /api/orders/[id] - Update order fields (on-chain settlement data, status)
// Auth: restaurant owner may update any field; assigned driver may update
// delivery-state fields only.
export async function PUT(
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

    const isOwner = order.restaurant?.wallet === wallet;
    const isAssignedDriver = !!order.driverWallet && order.driverWallet === wallet;

    if (!isOwner && !isAssignedDriver) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { status: rawStatus, onChainOrderId, codeAHash, codeBHash, driverWallet, settleTxSignature } = body;

    const STATUS_MAP: Record<string, string> = {
      created: "Created", funded: "Funded", preparing: "Preparing",
      driverassigned: "DriverAssigned", readyforpickup: "ReadyForPickup",
      pickedup: "PickedUp", delivered: "Delivered", settled: "Settled",
      disputed: "Disputed", cancelled: "Cancelled", refunded: "Refunded",
    };
    const status = rawStatus !== undefined
      ? (STATUS_MAP[rawStatus.toLowerCase()] ?? rawStatus)
      : undefined;

    const updateData: any = {};

    if (isOwner) {
      // Restaurant owner can update all allowed fields
      if (status !== undefined) updateData.status = status;
      if (onChainOrderId !== undefined) updateData.onChainOrderId = onChainOrderId;
      if (codeAHash !== undefined) updateData.codeAHash = codeAHash;
      if (codeBHash !== undefined) updateData.codeBHash = codeBHash;
      if (settleTxSignature !== undefined) updateData.settleTxSignature = settleTxSignature;
      // Owner cannot hijack by changing driverWallet here; use bid-accept endpoint
    } else {
      // Assigned driver can only record settlement signature and delivery states
      if (settleTxSignature !== undefined) updateData.settleTxSignature = settleTxSignature;
      if (status === "PickedUp" || status === "Delivered") updateData.status = status;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No valid updates provided" }, { status: 400 });
    }

    const updated = await prisma.order.update({
      where: { id: params.id },
      data: updateData,
      include: {
        contributions: { orderBy: { createdAt: "asc" } },
        restaurant: { select: { id: true, name: true, slug: true, wallet: true, currency: true } },
      },
    });
    return NextResponse.json(toApiOrder(updated));
  } catch (error) {
    console.error("Error updating order:", error);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}
