import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getWalletFromRequest } from "@/lib/auth";

// POST /api/restaurants/[id]/menu/reorder
// Body: { orderedIds: string[] }
// Sets sortOrder on each item in the order provided.
export async function POST(
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

    const body = await request.json();
    const { orderedIds } = body;

    if (!Array.isArray(orderedIds)) {
      return NextResponse.json(
        { error: "orderedIds must be an array" },
        { status: 400 }
      );
    }

    // Update sortOrder for each item in a transaction
    await prisma.$transaction(
      orderedIds.map((id: string, index: number) =>
        prisma.menuItem.updateMany({
          where: { id, restaurantId: params.id },
          data: { sortOrder: index },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error reordering menu:", error);
    return NextResponse.json(
      { error: "Failed to reorder menu" },
      { status: 500 }
    );
  }
}
