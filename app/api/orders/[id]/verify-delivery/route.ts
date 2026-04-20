import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getWalletFromRequest } from "@/lib/auth";

// POST /api/orders/[id]/verify-delivery
// Customer or driver submits Code B to confirm delivery.
// Transitions: PickedUp → Settled
// Returns { valid: boolean, settleTxSignature?: string }
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

    if (order.status !== "PickedUp") {
      return NextResponse.json(
        { error: `Order is not in PickedUp state (status: ${order.status})`, valid: false },
        { status: 400 }
      );
    }

    // Only the customer or the assigned driver may confirm delivery
    const isCustomer = order.customerWallet === wallet;
    const isDriver = order.driverWallet === wallet || !order.driverWallet;
    if (!isCustomer && !isDriver) {
      return NextResponse.json({ error: "Forbidden", valid: false }, { status: 403 });
    }

    const normalized = code.trim().toUpperCase();
    if (!order.codeB || order.codeB.toUpperCase() !== normalized) {
      return NextResponse.json({ valid: false }, { status: 400 });
    }

    const updated = await prisma.order.update({
      where: { id: params.id },
      data: { status: "Settled" },
    });

    return NextResponse.json({ valid: true, settleTxSignature: updated.settleTxSignature || null });
  } catch (error) {
    console.error("verify-delivery error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
