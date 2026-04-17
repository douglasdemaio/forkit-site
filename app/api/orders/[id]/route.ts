import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

// GET /api/orders/[id] - Get order details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Find by ID or by shareLink suffix
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { id },
          { shareLink: { contains: id } },
        ],
      },
      include: {
        contributions: {
          orderBy: { createdAt: "asc" },
        },
        restaurant: {
          select: {
            id: true,
            name: true,
            slug: true,
            wallet: true,
            currency: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...order,
      items: typeof order.items === "string" ? JSON.parse(order.items) : order.items,
    });
  } catch (error) {
    console.error("Error fetching order:", error);
    return NextResponse.json(
      { error: "Failed to fetch order" },
      { status: 500 }
    );
  }
}

// PUT /api/orders/[id] - Update order status
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { status, onChainOrderId, codeAHash, codeBHash } = body;

    const updated = await prisma.order.update({
      where: { id: params.id },
      data: {
        ...(status !== undefined && { status }),
        ...(onChainOrderId !== undefined && { onChainOrderId }),
        ...(codeAHash !== undefined && { codeAHash }),
        ...(codeBHash !== undefined && { codeBHash }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating order:", error);
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 }
    );
  }
}
