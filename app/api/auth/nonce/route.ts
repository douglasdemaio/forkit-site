import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import prisma from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { wallet } = await request.json();

    if (!wallet || typeof wallet !== "string") {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }

    // Delete any existing nonces for this wallet
    await prisma.nonce.deleteMany({ where: { wallet } });

    // Create new nonce with 5 minute expiry
    const nonce = uuidv4();
    await prisma.nonce.create({
      data: {
        wallet,
        nonce,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
    });

    return NextResponse.json({ nonce });
  } catch (error) {
    console.error("Nonce generation error:", error);
    const detail =
      error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    return NextResponse.json(
      { error: "Failed to generate nonce", detail },
      { status: 500 }
    );
  }
}
