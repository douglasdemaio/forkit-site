import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { toShareableOrder } from "@/lib/order-dto";

// GET /api/orders/share/[shareLink] - Resolve a share link to an order.
// Public endpoint — anyone with the link can view. Returns a stripped DTO
// (no codeA / codeB / hashes / deliveryAddress / driverWallet) so the link
// only grants visibility, not the ability to spoof pickup/delivery.
export async function GET(
  _request: NextRequest,
  { params }: { params: { shareLink: string } }
) {
  try {
    const order = await prisma.order.findFirst({
      where: { shareLink: { contains: params.shareLink } },
      include: {
        contributions: { orderBy: { createdAt: "asc" } },
        restaurant: { select: { id: true, name: true, slug: true, currency: true } },
      },
    });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    return NextResponse.json(toShareableOrder(order));
  } catch (error) {
    console.error("share link error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
