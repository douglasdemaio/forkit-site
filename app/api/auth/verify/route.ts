import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import nacl from "tweetnacl";
import bs58 from "bs58";
import prisma from "@/lib/db";
import { createToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { wallet, nonce, signature } = await request.json();

    if (!wallet || !nonce || !signature) {
      return NextResponse.json(
        { error: "wallet, nonce, and signature are required" },
        { status: 400 }
      );
    }

    // Look up the nonce
    const storedNonce = await prisma.nonce.findUnique({ where: { nonce } });

    if (!storedNonce) {
      return NextResponse.json(
        { error: "Invalid or expired nonce" },
        { status: 401 }
      );
    }

    // Check expiry
    if (new Date() > storedNonce.expiresAt) {
      await prisma.nonce.delete({ where: { id: storedNonce.id } });
      return NextResponse.json(
        { error: "Nonce expired" },
        { status: 401 }
      );
    }

    // Check wallet matches
    if (storedNonce.wallet !== wallet) {
      return NextResponse.json(
        { error: "Wallet mismatch" },
        { status: 401 }
      );
    }

    // Verify signature
    const message = new TextEncoder().encode(
      `Sign this message to authenticate with ForkIt:\n\nNonce: ${nonce}`
    );

    const publicKey = new PublicKey(wallet);
    const signatureBytes = bs58.decode(signature);

    const isValid = nacl.sign.detached.verify(
      message,
      signatureBytes,
      publicKey.toBytes()
    );

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    // Clean up nonce
    await prisma.nonce.delete({ where: { id: storedNonce.id } });

    // Generate JWT
    const token = await createToken(wallet);

    return NextResponse.json({ token, wallet });
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.json(
      { error: "Verification failed" },
      { status: 500 }
    );
  }
}
