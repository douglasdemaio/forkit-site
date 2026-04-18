import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import prisma from "@/lib/db";
import { getWalletFromRequest } from "@/lib/auth";

/** Generate a random 6-character alphanumeric code */
function generateCode(): string {
  return crypto.randomBytes(3).toString("hex").toUpperCase(); // e.g. "A3F1B2"
}

/** SHA-256 hash of a code (for on-chain verification) */
function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

// GET /api/orders?restaurantId=xxx - List orders for a restaurant (owner only)
export async function GET(request: NextRequest) {
  try {
    const wallet = await getWalletFromRequest(request);
    if (!wallet) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const restaurantId = new URL(request.url).searchParams.get("restaurantId");
    if (!restaurantId) {
      return NextResponse.json(
        { error: "restaurantId query parameter is required" },
        { status: 400 }
      );
    }

    // Verify wallet owns this restaurant
    const restaurant = await prisma.restaurant.findFirst({
      where: { id: restaurantId, wallet },
    });
    if (!restaurant) {
      return NextResponse.json(
        { error: "Restaurant not found or not owned by you" },
        { status: 403 }
      );
    }

    const orders = await prisma.order.findMany({
      where: { restaurantId },
      orderBy: { createdAt: "desc" },
      include: { contributions: true },
    });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("Error listing orders:", error);
    return NextResponse.json(
      { error: "Failed to list orders" },
      { status: 500 }
    );
  }
}

// POST /api/orders - Create a new order
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { restaurantId, customerWallet, items, deliveryAddress } = body;

    if (!restaurantId || !customerWallet || !items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: "restaurantId, customerWallet, and items are required" },
        { status: 400 }
      );
    }

    // Fetch restaurant
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      include: { menuItems: true },
    });

    if (!restaurant) {
      return NextResponse.json(
        { error: "Restaurant not found" },
        { status: 404 }
      );
    }

    // Validate items and calculate total
    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const menuItem = restaurant.menuItems.find(
        (mi) => mi.id === item.menuItemId
      );
      if (!menuItem) {
        return NextResponse.json(
          { error: `Menu item ${item.menuItemId} not found` },
          { status: 400 }
        );
      }
      if (!menuItem.available) {
        return NextResponse.json(
          { error: `${menuItem.name} is currently unavailable` },
          { status: 400 }
        );
      }

      const quantity = Math.max(1, Math.round(item.quantity || 1));
      totalAmount += menuItem.price * quantity;
      orderItems.push({
        menuItemId: menuItem.id,
        name: menuItem.name,
        price: menuItem.price,
        quantity,
      });
    }

    const deliveryFee = restaurant.deliveryFee;
    const escrowTarget = totalAmount + deliveryFee;

    // Generate verification codes
    const codeA = generateCode(); // Pickup code — shown to restaurant, driver verifies
    const codeB = generateCode(); // Delivery code — shown to customer, confirms delivery

    // Generate share link
    const shareId = uuidv4().slice(0, 8);
    const shareLink = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/order/${shareId}`;

    const order = await prisma.order.create({
      data: {
        restaurantId,
        customerWallet,
        items: JSON.stringify(orderItems),
        totalAmount,
        deliveryFee,
        escrowTarget,
        codeA,
        codeB,
        codeAHash: hashCode(codeA),
        codeBHash: hashCode(codeB),
        shareLink,
        deliveryAddress: deliveryAddress || null,
      },
    });

    return NextResponse.json(
      {
        ...order,
        items: orderItems,
        restaurant: { id: restaurant.id, name: restaurant.name, wallet: restaurant.wallet },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating order:", error);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}
