import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import prisma from "@/lib/db";
import { getWalletFromRequest } from "@/lib/auth";

function generateCode(): string {
  return crypto.randomBytes(3).toString("hex").toUpperCase();
}

function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

function toApiOrder(order: any, restaurant?: any) {
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
  const rest = restaurant ?? order.restaurant;
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
          wallet: rest.wallet,
          currency: rest.currency,
        }
      : undefined,
  };
}

// GET /api/orders - List orders
// ?restaurantId=xxx  → restaurant's orders (owner auth)
// ?role=restaurant   → same as above using the authed wallet's restaurant
// ?role=driver&status=ReadyForPickup → available pickup orders
// (no params)        → authenticated customer's orders
export async function GET(request: NextRequest) {
  try {
    const wallet = await getWalletFromRequest(request);
    if (!wallet) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get("restaurantId");
    const role = searchParams.get("role");
    const statusFilter = searchParams.get("status");

    if (restaurantId) {
      // Restaurant owner viewing their orders
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
      return NextResponse.json({ orders: orders.map((o) => toApiOrder(o, restaurant)) });
    }

    if (role === "restaurant") {
      const restaurant = await prisma.restaurant.findFirst({ where: { wallet } });
      if (!restaurant) {
        return NextResponse.json({ orders: [] });
      }
      const orders = await prisma.order.findMany({
        where: { restaurantId: restaurant.id },
        orderBy: { createdAt: "desc" },
        include: { contributions: true, restaurant: true },
      });
      return NextResponse.json(orders.map((o) => toApiOrder(o)));
    }

    if (role === "driver") {
      const where: any = {};
      if (statusFilter) where.status = statusFilter;
      const orders = await prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: { contributions: true, restaurant: true },
      });
      return NextResponse.json(orders.map((o) => toApiOrder(o)));
    }

    // Customer: return their own orders
    const orders = await prisma.order.findMany({
      where: { customerWallet: wallet },
      orderBy: { createdAt: "desc" },
      include: { contributions: true, restaurant: true },
    });
    return NextResponse.json(orders.map((o) => toApiOrder(o)));
  } catch (error) {
    console.error("Error listing orders:", error);
    return NextResponse.json({ error: "Failed to list orders" }, { status: 500 });
  }
}

// POST /api/orders - Create a new order
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { restaurantId, items, tokenMint, deliveryAddress, customerWallet: bodyWallet } = body;

    // Prefer wallet from JWT; fall back to body (for web clients that send it)
    const authWallet = await getWalletFromRequest(request);
    const customerWallet = authWallet || bodyWallet;

    if (!restaurantId || !customerWallet || !items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: "restaurantId, authenticated wallet, and items are required" },
        { status: 400 }
      );
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      include: { menuItems: true },
    });
    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    let foodTotal = 0;
    const orderItems = [];
    for (const item of items) {
      const menuItem = restaurant.menuItems.find((mi) => mi.id === item.menuItemId);
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
      foodTotal += menuItem.price * quantity;
      orderItems.push({ menuItemId: menuItem.id, name: menuItem.name, price: menuItem.price, quantity });
    }

    const deliveryFee = restaurant.deliveryFee;
    const escrowTarget = foodTotal + deliveryFee;
    const codeA = generateCode();
    const codeB = generateCode();
    const shareLink = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/order/${uuidv4().slice(0, 8)}`;

    const order = await prisma.order.create({
      data: {
        restaurantId,
        customerWallet,
        items: JSON.stringify(orderItems),
        tokenMint: tokenMint || null,
        foodTotal,
        deliveryFee,
        escrowTarget,
        status: "Created",
        codeA,
        codeB,
        codeAHash: hashCode(codeA),
        codeBHash: hashCode(codeB),
        shareLink,
        deliveryAddress: deliveryAddress || null,
      },
    });

    return NextResponse.json(
      toApiOrder({ ...order, contributions: [] }, restaurant),
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating order:", error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
