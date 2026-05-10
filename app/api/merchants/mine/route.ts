import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getWalletFromRequest } from "@/lib/auth";

// GET /api/merchants/mine - Get all merchants owned by the authenticated wallet
export async function GET(request: NextRequest) {
  try {
    const wallet = await getWalletFromRequest(request);
    if (!wallet) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const merchants = await prisma.merchant.findMany({
      where: { wallet },
      orderBy: { createdAt: "desc" },
      include: {
        menuItems: { orderBy: { sortOrder: "asc" } },
        _count: { select: { orders: true } },
      },
    });

    return NextResponse.json({
      merchants,
      merchant: merchants.length > 0 ? merchants[0] : null,
    });
  } catch (error) {
    console.error("Error fetching merchants:", error);
    return NextResponse.json(
      { error: "Failed to fetch merchants" },
      { status: 500 }
    );
  }
}
