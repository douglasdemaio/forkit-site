import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getWalletFromRequest } from "@/lib/auth";

// GET /api/orders/available — driver sees orders in Preparing with no assigned driver
export async function GET(request: NextRequest) {
  try {
    const wallet = await getWalletFromRequest(request);
    if (!wallet) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orders = await prisma.order.findMany({
      where: { status: "Preparing", driverWallet: null },
      orderBy: { bidOpenAt: "asc" },
      include: { restaurant: true, contributions: true },
    });

    // Check if this driver already bid on each order
    const orderIds = orders.map((o) => o.id);
    const myBids = await prisma.driverBid.findMany({
      where: { orderId: { in: orderIds }, driverWallet: wallet },
    });
    const myBidMap = Object.fromEntries(myBids.map((b) => [b.orderId, b.status]));

    return NextResponse.json({
      orders: orders.map((o) => {
        const items = typeof o.items === "string" ? JSON.parse(o.items) : o.items;
        const rest = o.restaurant;
        return {
          ...o,
          items,
          foodTotal: o.foodTotal ?? 0,
          escrowFunded: o.escrowFunded ?? 0,
          customer: { wallet: o.customerWallet },
          contributions: (o.contributions ?? []).map((c) => ({
            id: c.id,
            orderId: c.orderId,
            wallet: c.contributorWallet,
            amount: c.amount,
            txSignature: c.txSignature,
            timestamp: c.createdAt,
          })),
          myBidStatus: myBidMap[o.id] ?? null,
          restaurant: rest
            ? { id: rest.id, name: rest.name, slug: rest.slug, wallet: rest.wallet, currency: rest.currency }
            : undefined,
        };
      }),
    });
  } catch (error) {
    console.error("Error fetching available orders:", error);
    return NextResponse.json({ error: "Failed to fetch available orders" }, { status: 500 });
  }
}
