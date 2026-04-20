import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

// POST /api/orders/[id]/scan-confirm
// Public endpoint — code itself is authorization. Used by restaurant kiosk QR scans.
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { code } = body;
    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Code required" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: { restaurant: { select: { name: true, slug: true } } },
    });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (["Delivered", "Settled", "Cancelled"].includes(order.status)) {
      return NextResponse.json({
        success: true,
        alreadyClosed: true,
        status: order.status,
        order: { id: order.id, status: order.status, restaurant: order.restaurant },
      });
    }

    const normalized = code.trim().toUpperCase();
    const codeAMatches = order.codeA && order.codeA.toUpperCase() === normalized;
    const codeBMatches = order.codeB && order.codeB.toUpperCase() === normalized;

    if (!codeAMatches && !codeBMatches) {
      return NextResponse.json({ error: "Invalid code", matched: false }, { status: 400 });
    }

    // Code A = driver picking up → PickedUp; Code B = customer confirming → Settled
    const newStatus = codeBMatches ? "Settled" : "PickedUp";
    const updated = await prisma.order.update({
      where: { id: params.id },
      data: { status: newStatus },
      include: { restaurant: { select: { name: true, slug: true } } },
    });

    const items = typeof updated.items === "string" ? JSON.parse(updated.items) : updated.items;
    return NextResponse.json({
      success: true,
      matched: true,
      order: { id: updated.id, status: updated.status, restaurant: updated.restaurant, items },
    });
  } catch (error) {
    console.error("scan-confirm error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// GET /api/orders/[id]/scan-confirm?key=[codeA]
// Returns order info if key matches codeA — for kiosk display page.
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const key = request.nextUrl.searchParams.get("key");
    if (!key) {
      return NextResponse.json({ error: "Key required" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: { restaurant: { select: { name: true, slug: true } } },
    });

    if (!order || !order.codeA || order.codeA.toUpperCase() !== key.trim().toUpperCase()) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const items = typeof order.items === "string" ? JSON.parse(order.items) : order.items;
    return NextResponse.json({ id: order.id, status: order.status, items, restaurant: order.restaurant });
  } catch (error) {
    console.error("kiosk GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
