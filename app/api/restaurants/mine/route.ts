import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getWalletFromRequest } from "@/lib/auth";

// GET /api/restaurants/mine - Get all restaurants owned by the authenticated wallet
export async function GET(request: NextRequest) {
  try {
    const wallet = await getWalletFromRequest(request);
    if (!wallet) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const restaurants = await prisma.restaurant.findMany({
      where: { wallet },
      orderBy: { createdAt: "desc" },
      include: {
        menuItems: { orderBy: { sortOrder: "asc" } },
        _count: { select: { orders: true } },
      },
    });

    // Backward compat: also return first as `restaurant` for existing dashboard code
    return NextResponse.json({
      restaurants,
      restaurant: restaurants.length > 0 ? restaurants[0] : null,
    });
  } catch (error) {
    console.error("Error fetching restaurants:", error);
    return NextResponse.json(
      { error: "Failed to fetch restaurants" },
      { status: 500 }
    );
  }
}
