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

const CREATE_ORDER_DISCRIMINATOR = Buffer.from([141, 54, 37, 207, 237, 210, 250, 215]);
const CONTRIBUTE_DISCRIMINATOR = Buffer.from([82, 48, 204, 145, 137, 43, 194, 101]);
const CONFIRM_DELIVERY_DISCRIMINATOR = Buffer.from([104, 87, 191, 49, 195, 225, 56, 139]);

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

export function useEscrow() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  const createOrder = useCallback(
    async (params: {
      orderId: string;
      restaurantWallet: string;
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
      const restaurantPubkey = new PublicKey(params.restaurantWallet);
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
          { pubkey: restaurantPubkey,    isSigner: false, isWritable: false }, // restaurant
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

  const confirmDelivery = useCallback(
    async (params: {
      orderId: string;
      restaurantWallet: string;
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

      const restaurantPubkey = new PublicKey(params.restaurantWallet);
      const driverPubkey = new PublicKey(params.driverWallet);

      const restaurantTokenAccount = await getAssociatedTokenAddress(mint, restaurantPubkey, false, tokenProgram);
      const driverTokenAccount = await getAssociatedTokenAddress(mint, driverPubkey, false, tokenProgram);
      const treasuryTokenAccount = await getAssociatedTokenAddress(mint, TREASURY_WALLET, false, tokenProgram);

      // Borsh-encode code_b as a String: 4-byte length (u32 LE) followed by UTF-8 bytes
      const codeBBytes = Buffer.from(params.codeB, "utf8");
      const data = Buffer.alloc(8 + 4 + codeBBytes.length);
      CONFIRM_DELIVERY_DISCRIMINATOR.copy(data, 0);
      data.writeUInt32LE(codeBBytes.length, 8);
      codeBBytes.copy(data, 12);

      // Account order must match the Anchor ConfirmDelivery struct exactly
      const instruction = new TransactionInstruction({
        keys: [
          { pubkey: orderPda,             isSigner: false, isWritable: true  }, // order (mut)
          { pubkey: escrowVaultPda,       isSigner: false, isWritable: true  }, // escrow_vault (mut)
          { pubkey: protocolConfigPda,    isSigner: false, isWritable: false }, // protocol_config
          { pubkey: mint,                 isSigner: false, isWritable: false }, // token_mint
          { pubkey: restaurantTokenAccount, isSigner: false, isWritable: true }, // restaurant_token_account
          { pubkey: driverTokenAccount,   isSigner: false, isWritable: true  }, // driver_token_account
          { pubkey: treasuryTokenAccount, isSigner: false, isWritable: true  }, // treasury_token_account
          { pubkey: publicKey,            isSigner: true,  isWritable: false }, // customer
          { pubkey: tokenProgram,         isSigner: false, isWritable: false }, // token_program
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

  return { createOrder, contributeToOrder, confirmDelivery };
}
