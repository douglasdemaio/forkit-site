import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import prisma from "@/lib/db";
import { getWalletFromRequest } from "@/lib/auth";

// POST /api/orders/[id]/share - Generate or return existing share link
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const wallet = await getWalletFromRequest(request);
    if (!wallet) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const order = await prisma.order.findUnique({ where: { id: params.id } });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    if (order.customerWallet !== wallet) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (order.shareLink) {
      return NextResponse.json({ shareLink: order.shareLink });
    }

    const shareToken = uuidv4().slice(0, 8);
    const shareLink = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/order/${shareToken}`;
    await prisma.order.update({ where: { id: params.id }, data: { shareLink } });

    return NextResponse.json({ shareLink });
  } catch (error) {
    console.error("share error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
