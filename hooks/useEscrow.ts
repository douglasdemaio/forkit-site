"use client";

import { useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import {
  ESCROW_PROGRAM_ID,
  REGISTRY_PROGRAM_ID,
  TREASURY_WALLET,
  TOKEN_DECIMALS,
  getMintForCurrency,
} from "@/lib/constants";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import type { Connection } from "@solana/web3.js";

async function resolveTokenProgram(connection: Connection, mint: PublicKey): Promise<PublicKey> {
  const info = await connection.getAccountInfo(mint);
  if (!info) throw new Error(`Mint ${mint.toBase58()} not found`);
  if (info.owner.equals(TOKEN_2022_PROGRAM_ID)) return TOKEN_2022_PROGRAM_ID;
  if (info.owner.equals(TOKEN_PROGRAM_ID)) return TOKEN_PROGRAM_ID;
  throw new Error(`Mint ${mint.toBase58()} is not owned by a known token program`);
}

// Anchor discriminators: sha256("global:<snake_case_name>")[..8]
const CREATE_ORDER_DISCRIMINATOR          = Buffer.from([141,  54,  37, 207, 237, 210, 250, 215]);
const CONTRIBUTE_DISCRIMINATOR            = Buffer.from([206,   3, 153, 116, 116, 195,  16,  23]);
const MARK_READY_FOR_PICKUP_DISCRIMINATOR = Buffer.from([136,  90, 147,   6, 135,  88,  15, 125]);
const CONFIRM_DELIVERY_DISCRIMINATOR      = Buffer.from([ 11, 109, 227,  53, 179, 190,  88, 155]);
const UPDATE_DELIVERY_AMOUNT_DISCRIMINATOR = Buffer.from([107, 103, 251,  81,  74, 101, 222, 210]);
const ACCEPT_ORDER_DISCRIMINATOR          = Buffer.from([118, 157,  62,  39, 239, 234, 231, 193]);
const CONFIRM_PICKUP_DISCRIMINATOR        = Buffer.from([ 37,   5, 149, 215,  41,  79, 248,  82]);

// Convert a DB UUID string to a deterministic u64 for on-chain order_id.
// Takes the first 8 bytes of the UUID hex (without hyphens) as a big-endian u64,
// then writes it as little-endian into the 8-byte seed buffer.
function uuidToOrderId(uuid: string): bigint {
  return BigInt("0x" + uuid.replace(/-/g, "").slice(0, 16));
}

function orderIdToLeBytes(uuid: string): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(uuidToOrderId(uuid));
  return buf;
}

function deriveOrderPda(orderIdBuf: Buffer): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("order"), orderIdBuf],
    ESCROW_PROGRAM_ID
  )[0];
}

function deriveEscrowVaultPda(orderIdBuf: Buffer): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("escrow_vault"), orderIdBuf],
    ESCROW_PROGRAM_ID
  )[0];
}

function deriveProtocolConfigPda(): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("protocol_config")],
    ESCROW_PROGRAM_ID
  )[0];
}

function deriveContributionPda(orderIdBuf: Buffer, contributor: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("contribution"), orderIdBuf, contributor.toBuffer()],
    ESCROW_PROGRAM_ID
  )[0];
}

function deriveProfilePda(wallet: PublicKey): PublicKey {
  const PROFILE_SEED = Buffer.from("profile");
  return PublicKey.findProgramAddressSync(
    [PROFILE_SEED, wallet.toBuffer(), Buffer.from([1])], // 1 = Driver role
    REGISTRY_PROGRAM_ID
  )[0];
}

export function useEscrow() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  const createOrder = useCallback(
    async (params: {
      orderId: string;
      merchantWallet: string;
      foodAmount: number;
      deliveryAmount: number;
      currency: string;
      codeAHash: string; // hex string — SHA256 of code A
      codeBHash: string; // hex string — SHA256 of code B
    }) => {
      if (!publicKey || !sendTransaction)
        throw new Error("Wallet not connected");

      const mint = getMintForCurrency(params.currency);
      const tokenProgram = await resolveTokenProgram(connection, mint);
      const merchantPubkey = new PublicKey(params.merchantWallet);
      const orderIdBuf = orderIdToLeBytes(params.orderId);
      const orderIdNum = uuidToOrderId(params.orderId);

      const foodAmtLamports = BigInt(Math.round((params.foodAmount ?? 0) * 10 ** TOKEN_DECIMALS));
      const deliveryAmtLamports = BigInt(Math.round((params.deliveryAmount ?? 0) * 10 ** TOKEN_DECIMALS));
      const initialContribution = foodAmtLamports + deliveryAmtLamports;

      const orderPda = deriveOrderPda(orderIdBuf);
      const escrowVaultPda = deriveEscrowVaultPda(orderIdBuf);
      const protocolConfigPda = deriveProtocolConfigPda();
      const contributionPda = deriveContributionPda(orderIdBuf, publicKey);

      const customerTokenAccount = await getAssociatedTokenAddress(mint, publicKey, false, tokenProgram);

      const codeAHashBuf = Buffer.from(params.codeAHash, "hex");
      const codeBHashBuf = Buffer.from(params.codeBHash, "hex");

      // Instruction data layout (129 bytes total):
      // [0-7]    discriminator
      // [8-15]   order_id u64 LE
      // [16-23]  food_amount u64 LE
      // [24-31]  delivery_amount u64 LE
      // [32-39]  initial_contribution u64 LE
      // [40-71]  code_a_hash [u8; 32]
      // [72-103] code_b_hash [u8; 32]
      // [104-111] estimated_delivery_time i64 LE
      // [112]    ai_confidence u8
      // [113-120] requested_delivery_time i64 LE
      // [121-128] requested_pickup_time i64 LE
      const data = Buffer.alloc(129);
      CREATE_ORDER_DISCRIMINATOR.copy(data, 0);
      data.writeBigUInt64LE(orderIdNum, 8);
      data.writeBigUInt64LE(foodAmtLamports, 16);
      data.writeBigUInt64LE(deliveryAmtLamports, 24);
      data.writeBigUInt64LE(initialContribution, 32);
      codeAHashBuf.copy(data, 40);
      codeBHashBuf.copy(data, 72);
      data.writeBigInt64LE(BigInt(0), 104); // estimated_delivery_time = 0 (no AI routing)
      data.writeUInt8(0, 112);              // ai_confidence = 0
      data.writeBigInt64LE(BigInt(0), 113); // requested_delivery_time = 0 (ASAP)
      data.writeBigInt64LE(BigInt(0), 121); // requested_pickup_time = 0 (ASAP)

      // Account order must match the Anchor CreateOrder struct exactly
      const instruction = new TransactionInstruction({
        keys: [
          { pubkey: orderPda,            isSigner: false, isWritable: true  }, // order (init)
          { pubkey: contributionPda,     isSigner: false, isWritable: true  }, // contribution (init)
          { pubkey: protocolConfigPda,   isSigner: false, isWritable: false }, // protocol_config
          { pubkey: merchantPubkey,    isSigner: false, isWritable: false }, // merchant
          { pubkey: mint,                isSigner: false, isWritable: false }, // token_mint
          { pubkey: escrowVaultPda,      isSigner: false, isWritable: true  }, // escrow_vault (init)
          { pubkey: customerTokenAccount,isSigner: false, isWritable: true  }, // customer_token_account
          { pubkey: publicKey,           isSigner: true,  isWritable: true  }, // customer
          { pubkey: ESCROW_PROGRAM_ID,   isSigner: false, isWritable: false }, // surge_config = None
          { pubkey: tokenProgram,        isSigner: false, isWritable: false }, // token_program
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system_program
          { pubkey: SYSVAR_RENT_PUBKEY,  isSigner: false, isWritable: false }, // rent
        ],
        programId: ESCROW_PROGRAM_ID,
        data,
      });

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      const tx = new Transaction({ recentBlockhash: blockhash, feePayer: publicKey });

      // Create the customer's ATA if it doesn't exist yet
      const customerAtaInfo = await connection.getAccountInfo(customerTokenAccount);
      if (!customerAtaInfo) {
        tx.add(createAssociatedTokenAccountInstruction(publicKey, customerTokenAccount, publicKey, mint, tokenProgram));
      }

      tx.add(instruction);
      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");
      return { signature, orderPda: orderPda.toBase58() };
    },
    [publicKey, sendTransaction, connection]
  );

  const contributeToOrder = useCallback(
    async (params: {
      orderId: string;
      escrowPda?: string; // kept for API compatibility; PDAs are re-derived from orderId
      amount: number;
      currency: string;
    }) => {
      if (!publicKey || !sendTransaction)
        throw new Error("Wallet not connected");

      const mint = getMintForCurrency(params.currency);
      const tokenProgram = await resolveTokenProgram(connection, mint);
      const orderIdBuf = orderIdToLeBytes(params.orderId);
      const amountLamports = BigInt(Math.round((params.amount ?? 0) * 10 ** TOKEN_DECIMALS));

      const orderPda = deriveOrderPda(orderIdBuf);
      const escrowVaultPda = deriveEscrowVaultPda(orderIdBuf);
      const contributionPda = deriveContributionPda(orderIdBuf, publicKey);
      const contributorTokenAccount = await getAssociatedTokenAddress(mint, publicKey, false, tokenProgram);

      const data = Buffer.alloc(16);
      CONTRIBUTE_DISCRIMINATOR.copy(data, 0);
      data.writeBigUInt64LE(amountLamports, 8);

      // Account order must match the Anchor ContributeToOrder struct exactly
      const instruction = new TransactionInstruction({
        keys: [
          { pubkey: orderPda,                 isSigner: false, isWritable: true  }, // order (mut)
          { pubkey: contributionPda,          isSigner: false, isWritable: true  }, // contribution (init_if_needed)
          { pubkey: mint,                     isSigner: false, isWritable: false }, // token_mint
          { pubkey: escrowVaultPda,           isSigner: false, isWritable: true  }, // escrow_vault (mut)
          { pubkey: contributorTokenAccount,  isSigner: false, isWritable: true  }, // contributor_token_account
          { pubkey: publicKey,                isSigner: true,  isWritable: true  }, // contributor
          { pubkey: tokenProgram,             isSigner: false, isWritable: false }, // token_program
          { pubkey: SystemProgram.programId,  isSigner: false, isWritable: false }, // system_program
          { pubkey: SYSVAR_RENT_PUBKEY,       isSigner: false, isWritable: false }, // rent
        ],
        programId: ESCROW_PROGRAM_ID,
        data,
      });

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      const tx = new Transaction({ recentBlockhash: blockhash, feePayer: publicKey }).add(instruction);
      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");
      return { signature };
    },
    [publicKey, sendTransaction, connection]
  );

  const markReadyForPickup = useCallback(
    async (params: { orderId: string }) => {
      if (!publicKey || !sendTransaction)
        throw new Error("Wallet not connected");

      const orderIdBuf = orderIdToLeBytes(params.orderId);
      const orderPda = deriveOrderPda(orderIdBuf);

      // No payload args — just the discriminator
      const data = Buffer.alloc(8);
      MARK_READY_FOR_PICKUP_DISCRIMINATOR.copy(data, 0);

      // MarkReadyForPickup struct: order (mut), merchant (signer)
      const ix = new TransactionInstruction({
        keys: [
          { pubkey: orderPda,  isSigner: false, isWritable: true },
          { pubkey: publicKey, isSigner: true,  isWritable: false },
        ],
        programId: ESCROW_PROGRAM_ID,
        data,
      });

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      const tx = new Transaction({ recentBlockhash: blockhash, feePayer: publicKey }).add(ix);
      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");
      return { signature };
    },
    [publicKey, sendTransaction, connection]
  );

  const confirmDelivery = useCallback(
    async (params: {
      orderId: string;
      merchantWallet: string;
      driverWallet: string;
      codeB: string; // raw delivery code (NOT the hash) — contract verifies against stored hash
      currency: string;
    }) => {
      if (!publicKey || !sendTransaction)
        throw new Error("Wallet not connected");

      const mint = getMintForCurrency(params.currency);
      const tokenProgram = await resolveTokenProgram(connection, mint);
      const orderIdBuf = orderIdToLeBytes(params.orderId);

      const orderPda = deriveOrderPda(orderIdBuf);
      const escrowVaultPda = deriveEscrowVaultPda(orderIdBuf);
      const protocolConfigPda = deriveProtocolConfigPda();

      const merchantPubkey = new PublicKey(params.merchantWallet);
      const driverPubkey = new PublicKey(params.driverWallet);

      const merchantTokenAccount = await getAssociatedTokenAddress(mint, merchantPubkey, false, tokenProgram);
      const driverTokenAccount = await getAssociatedTokenAddress(mint, driverPubkey, false, tokenProgram);
      const treasuryTokenAccount = await getAssociatedTokenAddress(mint, TREASURY_WALLET, false, tokenProgram);
      // Customer's ATA — receives any escrow surplus (when the accepted bid was
      // below the posted delivery fee). Customer is the signer (publicKey).
      const customerTokenAccount = await getAssociatedTokenAddress(mint, publicKey, false, tokenProgram);

      // Borsh-encode code_b as a String: 4-byte length (u32 LE) followed by UTF-8 bytes
      const codeBBytes = Buffer.from(params.codeB, "utf8");
      const data = Buffer.alloc(8 + 4 + codeBBytes.length);
      CONFIRM_DELIVERY_DISCRIMINATOR.copy(data, 0);
      data.writeUInt32LE(codeBBytes.length, 8);
      codeBBytes.copy(data, 12);

      // Account order must match the Anchor ConfirmDelivery struct exactly
      const instruction = new TransactionInstruction({
        keys: [
          { pubkey: orderPda,               isSigner: false, isWritable: true  }, // order (mut)
          { pubkey: escrowVaultPda,         isSigner: false, isWritable: true  }, // escrow_vault (mut)
          { pubkey: protocolConfigPda,      isSigner: false, isWritable: false }, // protocol_config
          { pubkey: mint,                   isSigner: false, isWritable: false }, // token_mint
          { pubkey: merchantTokenAccount, isSigner: false, isWritable: true  }, // merchant_token_account
          { pubkey: driverTokenAccount,     isSigner: false, isWritable: true  }, // driver_token_account
          { pubkey: treasuryTokenAccount,   isSigner: false, isWritable: true  }, // treasury_token_account
          { pubkey: customerTokenAccount,   isSigner: false, isWritable: true  }, // customer_token_account (refund target)
          { pubkey: publicKey,              isSigner: true,  isWritable: false }, // customer (signer)
          { pubkey: tokenProgram,           isSigner: false, isWritable: false }, // token_program
        ],
        programId: ESCROW_PROGRAM_ID,
        data,
      });

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      const tx = new Transaction({ recentBlockhash: blockhash, feePayer: publicKey }).add(instruction);
      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");
      return { signature };
    },
    [publicKey, sendTransaction, connection]
  );

  // Merchant-side: lower the on-chain delivery_amount on an order after
  // accepting a low driver bid. Surplus is refunded to the customer at
  // confirm_delivery.
  const updateDeliveryAmount = useCallback(
    async (params: { orderId: string; newAmount: number }) => {
      if (!publicKey || !sendTransaction)
        throw new Error("Wallet not connected");

      const orderIdBuf = orderIdToLeBytes(params.orderId);
      const orderPda = deriveOrderPda(orderIdBuf);
      const protocolConfigPda = deriveProtocolConfigPda();

      const newAmountLamports = BigInt(
        Math.round(params.newAmount * 10 ** TOKEN_DECIMALS)
      );

      // discriminator (8) || new_delivery_amount u64 LE (8)
      const data = Buffer.alloc(16);
      UPDATE_DELIVERY_AMOUNT_DISCRIMINATOR.copy(data, 0);
      data.writeBigUInt64LE(newAmountLamports, 8);

      const instruction = new TransactionInstruction({
        keys: [
          { pubkey: orderPda,          isSigner: false, isWritable: true  }, // order (mut)
          { pubkey: protocolConfigPda, isSigner: false, isWritable: false }, // protocol_config
          { pubkey: publicKey,         isSigner: true,  isWritable: false }, // merchant
        ],
        programId: ESCROW_PROGRAM_ID,
        data,
      });

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      const tx = new Transaction({ recentBlockhash: blockhash, feePayer: publicKey }).add(instruction);
      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");
      return { signature };
    },
    [publicKey, sendTransaction, connection]
  );

  const acceptOrder = useCallback(
    async (params: { orderId: string }) => {
      if (!publicKey || !sendTransaction) throw new Error("Wallet not connected");

      const orderIdBuf = orderIdToLeBytes(params.orderId);
      const orderPda = deriveOrderPda(orderIdBuf);
      const driverProfilePda = deriveProfilePda(publicKey);

      const data = Buffer.alloc(8);
      ACCEPT_ORDER_DISCRIMINATOR.copy(data, 0);

      const ix = new TransactionInstruction({
        keys: [
          { pubkey: orderPda,         isSigner: false, isWritable: true },
          { pubkey: driverProfilePda, isSigner: false, isWritable: false },
          { pubkey: publicKey,        isSigner: true,  isWritable: false },
        ],
        programId: ESCROW_PROGRAM_ID,
        data,
      });

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      const tx = new Transaction({ recentBlockhash: blockhash, feePayer: publicKey }).add(ix);
      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");
      return { signature };
    },
    [publicKey, sendTransaction, connection]
  );

  const confirmPickup = useCallback(
    async (params: { orderId: string; codeA: string }) => {
      if (!publicKey || !sendTransaction) throw new Error("Wallet not connected");

      const orderIdBuf = orderIdToLeBytes(params.orderId);
      const orderPda = deriveOrderPda(orderIdBuf);

      const codeABytes = Buffer.from(params.codeA, "utf8");
      const data = Buffer.alloc(8 + 4 + codeABytes.length);
      CONFIRM_PICKUP_DISCRIMINATOR.copy(data, 0);
      data.writeUInt32LE(codeABytes.length, 8);
      codeABytes.copy(data, 12);

      const ix = new TransactionInstruction({
        keys: [
          { pubkey: orderPda,  isSigner: false, isWritable: true },
          { pubkey: publicKey, isSigner: true,  isWritable: false },
        ],
        programId: ESCROW_PROGRAM_ID,
        data,
      });

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      const tx = new Transaction({ recentBlockhash: blockhash, feePayer: publicKey }).add(ix);
      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");
      return { signature };
    },
    [publicKey, sendTransaction, connection]
  );

  return { createOrder, contributeToOrder, acceptOrder, confirmPickup, markReadyForPickup, confirmDelivery, updateDeliveryAmount };
}
