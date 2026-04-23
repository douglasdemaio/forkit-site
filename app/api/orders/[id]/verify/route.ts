import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getWalletFromRequest } from "@/lib/auth";

// POST /api/orders/[id]/verify
// Restaurant owner manually verifies a code (web dashboard).
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const wallet = await getWalletFromRequest(request);
    if (!wallet) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { code } = body;
    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Code is required" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: { restaurant: true },
    });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.restaurant.wallet !== wallet) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (order.status === "Settled" || order.status === "Cancelled") {
      return NextResponse.json({ error: "Order is already closed" }, { status: 400 });
    }

    const normalized = code.trim().toUpperCase();
    const codeAMatches = order.codeA && order.codeA.toUpperCase() === normalized;
    const codeBMatches = order.codeB && order.codeB.toUpperCase() === normalized;

    if (!codeAMatches && !codeBMatches) {
      return NextResponse.json({ error: "Invalid code", matched: false }, { status: 400 });
    }

    if (order.status === "Delivered" && !codeBMatches) {
      return NextResponse.json({ error: "Only the delivery code is accepted at this stage", matched: false }, { status: 400 });
    }

    const newStatus = codeBMatches ? "Settled" : "PickedUp";
    const updated = await prisma.order.update({
      where: { id: params.id },
      data: { status: newStatus },
    });

    return NextResponse.json({
      success: true,
      matched: true,
      codeType: codeAMatches ? "pickup" : "delivery",
      order: updated,
    });
  } catch (error) {
    console.error("Error verifying order code:", error);
    return NextResponse.json({ error: "Failed to verify code" }, { status: 500 });
  }
}
