import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import prisma from "@/lib/db";


// POST /api/orders - Create a new order
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { restaurantId, customerWallet, items } = body;

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
        shareLink,
      },
    });

    return NextResponse.json(
      {
        ...order,
        items: orderItems,
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
