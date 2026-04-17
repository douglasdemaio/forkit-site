import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getWalletFromRequest } from "@/lib/auth";

// GET /api/restaurants/[id]/menu - Get menu items
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const items = await prisma.menuItem.findMany({
      where: { restaurantId: params.id },
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error("Error fetching menu:", error);
    return NextResponse.json(
      { error: "Failed to fetch menu" },
      { status: 500 }
    );
  }
}

// POST /api/restaurants/[id]/menu - Add/update menu item
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const wallet = await getWalletFromRequest(request);
    if (!wallet) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify ownership
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: params.id },
    });

    if (!restaurant || restaurant.wallet !== wallet) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { id, name, description, price, image, category, available, sortOrder } =
      body;

    if (!name || typeof price !== "number" || price < 0) {
      return NextResponse.json(
        { error: "Name and valid price are required" },
        { status: 400 }
      );
    }

    // If id is provided, update existing item
    if (id) {
      const existing = await prisma.menuItem.findFirst({
        where: { id, restaurantId: params.id },
      });
      if (!existing) {
        return NextResponse.json(
          { error: "Menu item not found" },
          { status: 404 }
        );
      }

      const updated = await prisma.menuItem.update({
        where: { id },
        data: {
          name,
          description: description || "",
          price,
          image: image || null,
          category: category || "Main",
          available: available ?? true,
          sortOrder: sortOrder ?? 0,
        },
      });
      return NextResponse.json(updated);
    }

    // Create new item
    const item = await prisma.menuItem.create({
      data: {
        restaurantId: params.id,
        name,
        description: description || "",
        price,
        image: image || null,
        category: category || "Main",
        available: available ?? true,
        sortOrder: sortOrder ?? 0,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("Error saving menu item:", error);
    return NextResponse.json(
      { error: "Failed to save menu item" },
      { status: 500 }
    );
  }
}

// DELETE /api/restaurants/[id]/menu - Delete menu item
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const wallet = await getWalletFromRequest(request);
    if (!wallet) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: params.id },
    });

    if (!restaurant || restaurant.wallet !== wallet) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get("itemId");

    if (!itemId) {
      return NextResponse.json(
        { error: "itemId is required" },
        { status: 400 }
      );
    }

    await prisma.menuItem.delete({ where: { id: itemId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting menu item:", error);
    return NextResponse.json(
      { error: "Failed to delete menu item" },
      { status: 500 }
    );
  }
}
