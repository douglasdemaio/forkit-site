import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

const TOKEN_SYMBOLS: Record<string, { symbol: string; currencySign: string }> = {
  "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU": { symbol: "USDC", currencySign: "$" },
  "CXk2AMBfi3TwaEL2468s6zP8xq9NxTXjp9gjMgzeUynM": { symbol: "EURC", currencySign: "€" },
  // Mainnet
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": { symbol: "USDC", currencySign: "$" },
  "HzwqbKZw8HxMN6bF2yFZNrht3c2iXXzpKcFu7uBEDKtr": { symbol: "EURC", currencySign: "€" },
};

const FEE_BASIS_POINTS = 2;
const DEPOSIT_BASIS_POINTS = 200;

// GET /api/orders/[id]/receipt - Settlement receipt (after Settled/Delivered)
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        restaurant: { select: { name: true } },
        contributions: true,
      },
    });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    if (!["Settled", "Delivered"].includes(order.status)) {
      return NextResponse.json({ error: "Order not yet settled" }, { status: 400 });
    }

    const tokenInfo = (order.tokenMint && TOKEN_SYMBOLS[order.tokenMint]) || {
      symbol: "USDC",
      currencySign: "$",
    };
    const items = typeof order.items === "string" ? JSON.parse(order.items) : order.items;
    const foodTotal = order.foodTotal ?? 0;
    const subtotal = foodTotal + order.deliveryFee;
    const protocolFee = (subtotal * FEE_BASIS_POINTS) / 10_000;
    const deposit = (subtotal * DEPOSIT_BASIS_POINTS) / 10_000;
    const totalCharged = subtotal + protocolFee + deposit;
    const reimbursement = deposit;
    const netPaid = subtotal + protocolFee;

    return NextResponse.json({
      orderId: order.id,
      onChainOrderId: order.onChainOrderId,
      restaurantName: order.restaurant?.name ?? "",
      items,
      tokenMint: order.tokenMint,
      tokenSymbol: tokenInfo.symbol,
      currencySign: tokenInfo.currencySign,
      foodTotal,
      deliveryFee: order.deliveryFee,
      protocolFee,
      totalCharged,
      reimbursement,
      netPaid,
      status: order.status,
      createdAt: order.createdAt,
      settledAt: order.updatedAt,
      settleTxSignature: order.settleTxSignature,
    });
  } catch (error) {
    console.error("receipt error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
