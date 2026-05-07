import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import prisma from "@/lib/db";
import { getWalletFromRequest } from "@/lib/auth";
import { ESCROW_PROGRAM_ID, SOLANA_RPC_URL, TOKEN_DECIMALS } from "@/lib/constants";

// Anchor discriminator for `update_delivery_amount`:
// sha256("global:update_delivery_amount")[..8]
const UPDATE_DELIVERY_AMOUNT_DISCRIMINATOR = Buffer.from([
  107, 103, 251, 81, 74, 101, 222, 210,
]);

function uuidToOrderIdBytes(uuid: string): Buffer {
  const id = BigInt("0x" + uuid.replace(/-/g, "").slice(0, 16));
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(id);
  return buf;
}

function deriveOrderPda(orderId: string): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("order"), uuidToOrderIdBytes(orderId)],
    ESCROW_PROGRAM_ID
  )[0];
}

/**
 * Verifies that the given on-chain signature contains a valid
 * `update_delivery_amount` instruction targeting this order with the expected
 * amount and signed by the expected restaurant wallet.
 */
async function verifyUpdateSignature(args: {
  signature: string;
  expectedOrderPda: PublicKey;
  expectedAmountLamports: bigint;
  expectedSigner: PublicKey;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const conn = new Connection(SOLANA_RPC_URL, "confirmed");
  const tx = await conn.getTransaction(args.signature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });
  if (!tx) return { ok: false, reason: "Transaction not found" };

  const message = tx.transaction.message;
  // Build the full account list (legacy + LUT-loaded for v0). For v0 the loaded
  // addresses come back from the meta; for legacy they're already in account_keys.
  const staticKeys = message.staticAccountKeys ?? [];
  const loadedAddresses = tx.meta?.loadedAddresses;
  const allKeys: PublicKey[] = [
    ...staticKeys,
    ...(loadedAddresses?.writable ?? []),
    ...(loadedAddresses?.readonly ?? []),
  ];

  const compiledIxs = message.compiledInstructions ?? [];
  for (const ix of compiledIxs) {
    const programId = allKeys[ix.programIdIndex];
    if (!programId || !programId.equals(ESCROW_PROGRAM_ID)) continue;
    const data = Buffer.from(ix.data);
    if (data.length < 8 + 8) continue;
    if (!data.subarray(0, 8).equals(UPDATE_DELIVERY_AMOUNT_DISCRIMINATOR)) continue;

    // Decode new_delivery_amount (u64 LE)
    const amount = data.readBigUInt64LE(8);
    if (amount !== args.expectedAmountLamports) {
      return {
        ok: false,
        reason: `amount mismatch: tx has ${amount}, expected ${args.expectedAmountLamports}`,
      };
    }

    // Account order from update_delivery_amount: [order, protocol_config, restaurant]
    const orderKey = allKeys[ix.accountKeyIndexes[0]];
    const signerKey = allKeys[ix.accountKeyIndexes[2]];
    if (!orderKey?.equals(args.expectedOrderPda)) {
      return { ok: false, reason: "order PDA mismatch" };
    }
    if (!signerKey?.equals(args.expectedSigner)) {
      return { ok: false, reason: "signer mismatch" };
    }
    // Confirm the restaurant signed the tx
    const numSigners = message.header.numRequiredSignatures;
    const signers = staticKeys.slice(0, numSigners);
    if (!signers.some((s) => s.equals(args.expectedSigner))) {
      return { ok: false, reason: "expected signer did not sign the tx" };
    }
    return { ok: true };
  }
  return {
    ok: false,
    reason: "no update_delivery_amount instruction found in tx",
  };
}

// POST /api/orders/[id]/bids/[bidId]/accept — restaurant accepts a bid.
//
// Two-phase commit:
//   Phase 1: client calls without `updateSignature`. If bid.amount === order.deliveryFee,
//            the server assigns the driver and returns success. Otherwise the server
//            returns { requiresOnChainUpdate: true, newDeliveryAmount } and makes
//            no DB changes — the client is expected to sign update_delivery_amount
//            with the restaurant wallet, then re-call this endpoint with the signature.
//   Phase 2: client re-calls with `updateSignature`. Server verifies the signature
//            on devnet (Step 11), then commits the assignment.
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; bidId: string } }
) {
  try {
    const wallet = await getWalletFromRequest(request);
    if (!wallet) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const updateSignature: string | undefined = body?.updateSignature;

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: { restaurant: { select: { wallet: true } } },
    });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    if (order.restaurant?.wallet !== wallet) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (order.status !== "Preparing") {
      return NextResponse.json({ error: "Order is not in Preparing state" }, { status: 400 });
    }
    if (order.driverWallet) {
      return NextResponse.json({ error: "Driver already assigned" }, { status: 409 });
    }

    const bid = await prisma.driverBid.findUnique({ where: { id: params.bidId } });
    if (!bid || bid.orderId !== params.id) {
      return NextResponse.json({ error: "Bid not found" }, { status: 404 });
    }
    if (bid.status !== "Pending") {
      return NextResponse.json({ error: "Bid is no longer pending" }, { status: 400 });
    }

    const requiresOnChainUpdate = bid.amount < order.deliveryFee;

    if (requiresOnChainUpdate && !updateSignature) {
      return NextResponse.json({
        requiresOnChainUpdate: true,
        newDeliveryAmount: bid.amount,
        postedDeliveryFee: order.deliveryFee,
      });
    }

    if (requiresOnChainUpdate && updateSignature) {
      const expectedAmountLamports = BigInt(
        Math.round(bid.amount * 10 ** TOKEN_DECIMALS)
      );
      const verdict = await verifyUpdateSignature({
        signature: updateSignature,
        expectedOrderPda: deriveOrderPda(params.id),
        expectedAmountLamports,
        expectedSigner: new PublicKey(wallet),
      });
      if (!verdict.ok) {
        return NextResponse.json(
          { error: `Signature verification failed: ${verdict.reason}` },
          { status: 400 }
        );
      }
      // Verification passed — fall through to the assign-driver transaction below.
    }

    // Assign driver and reject other pending bids.
    await prisma.$transaction([
      prisma.order.update({
        where: { id: params.id },
        data: { status: "DriverAssigned", driverWallet: bid.driverWallet },
      }),
      prisma.driverBid.update({
        where: { id: params.bidId },
        data: { status: "Accepted" },
      }),
      prisma.driverBid.updateMany({
        where: { orderId: params.id, id: { not: params.bidId }, status: "Pending" },
        data: { status: "Rejected" },
      }),
    ]);

    return NextResponse.json({ success: true, driverWallet: bid.driverWallet });
  } catch (error) {
    console.error("Error accepting bid:", error);
    return NextResponse.json({ error: "Failed to accept bid" }, { status: 500 });
  }
}
