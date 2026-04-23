import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getWalletFromRequest } from "@/lib/auth";

// POST /api/orders/[id]/verify-pickup
// Driver verifies Code A to confirm they picked up from the restaurant.
// Transitions: ReadyForPickup → PickedUp
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const wallet = await getWalletFromRequest(request);
    if (!wallet) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code } = await request.json();
    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "code is required" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({ where: { id: params.id } });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status !== "ReadyForPickup") {
      return NextResponse.json(
        { error: `Order is not ready for pickup (status: ${order.status})`, valid: false },
        { status: 400 }
      );
    }

    // Only the assigned driver may confirm pickup
    const isAssignedDriver = !!order.driverWallet && order.driverWallet === wallet;
    if (!isAssignedDriver) {
      return NextResponse.json({ error: "Forbidden", valid: false }, { status: 403 });
    }

    const normalized = code.trim().toUpperCase();
    if (!order.codeA || order.codeA.toUpperCase() !== normalized) {
      return NextResponse.json({ valid: false }, { status: 400 });
    }

    await prisma.order.update({
      where: { id: params.id },
      data: {
        status: "PickedUp",
        driverWallet: order.driverWallet,
      },
    });

    return NextResponse.json({ valid: true });
  } catch (error) {
    console.error("verify-pickup error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
