import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

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
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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
    return NextResponse.json(toApiOrder(order));
  } catch (error) {
    console.error("Error fetching order:", error);
    return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 });
  }
}

// PUT /api/orders/[id] - Update order (used by web dashboard)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { status, onChainOrderId, codeAHash, codeBHash, driverWallet, settleTxSignature } = body;

    const updated = await prisma.order.update({
      where: { id: params.id },
      data: {
        ...(status !== undefined && { status }),
        ...(onChainOrderId !== undefined && { onChainOrderId }),
        ...(codeAHash !== undefined && { codeAHash }),
        ...(codeBHash !== undefined && { codeBHash }),
        ...(driverWallet !== undefined && { driverWallet }),
        ...(settleTxSignature !== undefined && { settleTxSignature }),
      },
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
