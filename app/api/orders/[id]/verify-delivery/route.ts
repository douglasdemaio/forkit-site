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

    const { code, txSignature } = await request.json();
    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "code is required" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({ where: { id: params.id } });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Only the customer or the explicitly assigned driver may confirm delivery
    const isCustomer = order.customerWallet === wallet;
    const isDriver = !!order.driverWallet && order.driverWallet === wallet;
    if (!isCustomer && !isDriver) {
      return NextResponse.json({ error: "Forbidden", valid: false }, { status: 403 });
    }

    const normalized = code.trim().toUpperCase();
    if (!order.codeB || order.codeB.toUpperCase() !== normalized) {
      return NextResponse.json({ valid: false }, { status: 400 });
    }

    // Idempotent: if already Settled, just record the on-chain signature
    // (the customer may sign confirm_delivery on-chain after a previous
    // DB-only flip). Otherwise transition PickedUp → Settled.
    if (order.status !== "PickedUp" && order.status !== "Settled") {
      return NextResponse.json(
        { error: `Order is not in PickedUp state (status: ${order.status})`, valid: false },
        { status: 400 }
      );
    }

    const data: { status?: string; settleTxSignature?: string } = {};
    if (order.status === "PickedUp") data.status = "Settled";
    if (typeof txSignature === "string" && txSignature.length > 0) {
      data.settleTxSignature = txSignature;
    }

    const updated = Object.keys(data).length > 0
      ? await prisma.order.update({ where: { id: params.id }, data })
      : order;

    return NextResponse.json({ valid: true, settleTxSignature: updated.settleTxSignature || null });
  } catch (error) {
    console.error("verify-delivery error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
