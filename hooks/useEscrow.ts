"use client";

import { useCallback } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
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
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

// Instruction discriminators (Anchor-style, first 8 bytes of sha256 hash)
const CREATE_ORDER_DISCRIMINATOR = Buffer.from([
  141, 54, 37, 207, 237, 210, 250, 215,
]);
const CONTRIBUTE_DISCRIMINATOR = Buffer.from([
  82, 48, 204, 145, 137, 43, 194, 101,
]);
const CONFIRM_DELIVERY_DISCRIMINATOR = Buffer.from([
  104, 87, 191, 49, 195, 225, 56, 139,
]);

export function useEscrow() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  const createOrder = useCallback(
    async (params: {
      orderId: string;
      restaurantWallet: string;
      amount: number;
      currency: string;
    }) => {
      if (!publicKey || !sendTransaction)
        throw new Error("Wallet not connected");

      const mint = getMintForCurrency(params.currency);
      const restaurantPubkey = new PublicKey(params.restaurantWallet);
      const amountLamports = Math.round(params.amount * 10 ** TOKEN_DECIMALS);

      // Derive escrow PDA
      const [escrowPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("escrow"),
          publicKey.toBuffer(),
          Buffer.from(params.orderId.slice(0, 32)),
        ],
        ESCROW_PROGRAM_ID
      );

      // Get token accounts
      const customerTokenAccount = await getAssociatedTokenAddress(
        mint,
        publicKey
      );
      const escrowTokenAccount = await getAssociatedTokenAddress(
        mint,
        escrowPda,
        true
      );

      // Build instruction data
      const data = Buffer.alloc(8 + 8 + 32);
      CREATE_ORDER_DISCRIMINATOR.copy(data, 0);
      data.writeBigUInt64LE(BigInt(amountLamports), 8);
      Buffer.from(params.orderId.slice(0, 32).padEnd(32, "\0")).copy(data, 16);

      const instruction = new TransactionInstruction({
        keys: [
          { pubkey: publicKey, isSigner: true, isWritable: true },
          { pubkey: escrowPda, isSigner: false, isWritable: true },
          { pubkey: customerTokenAccount, isSigner: false, isWritable: true },
          { pubkey: escrowTokenAccount, isSigner: false, isWritable: true },
          { pubkey: restaurantPubkey, isSigner: false, isWritable: false },
          { pubkey: TREASURY_WALLET, isSigner: false, isWritable: true },
          { pubkey: mint, isSigner: false, isWritable: false },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
          {
            pubkey: ASSOCIATED_TOKEN_PROGRAM_ID,
            isSigner: false,
            isWritable: false,
          },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId: ESCROW_PROGRAM_ID,
        data,
      });

      // Check if ATA needs to be created
      const ataInfo = await connection.getAccountInfo(escrowTokenAccount);
      const tx = new Transaction();
      if (!ataInfo) {
        tx.add(
          createAssociatedTokenAccountInstruction(
            publicKey,
            escrowTokenAccount,
            escrowPda,
            mint
          )
        );
      }
      tx.add(instruction);

      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction(signature, "confirmed");

      return { signature, escrowPda: escrowPda.toBase58() };
    },
    [publicKey, sendTransaction, connection]
  );

  const contributeToOrder = useCallback(
    async (params: {
      orderId: string;
      escrowPda: string;
      amount: number;
      currency: string;
    }) => {
      if (!publicKey || !sendTransaction)
        throw new Error("Wallet not connected");

      const mint = getMintForCurrency(params.currency);
      const escrowPubkey = new PublicKey(params.escrowPda);
      const amountLamports = Math.round(params.amount * 10 ** TOKEN_DECIMALS);

      const contributorTokenAccount = await getAssociatedTokenAddress(
        mint,
        publicKey
      );
      const escrowTokenAccount = await getAssociatedTokenAddress(
        mint,
        escrowPubkey,
        true
      );

      const data = Buffer.alloc(8 + 8);
      CONTRIBUTE_DISCRIMINATOR.copy(data, 0);
      data.writeBigUInt64LE(BigInt(amountLamports), 8);

      const instruction = new TransactionInstruction({
        keys: [
          { pubkey: publicKey, isSigner: true, isWritable: true },
          { pubkey: escrowPubkey, isSigner: false, isWritable: true },
          {
            pubkey: contributorTokenAccount,
            isSigner: false,
            isWritable: true,
          },
          { pubkey: escrowTokenAccount, isSigner: false, isWritable: true },
          { pubkey: mint, isSigner: false, isWritable: false },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        ],
        programId: ESCROW_PROGRAM_ID,
        data,
      });

      const tx = new Transaction().add(instruction);
      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction(signature, "confirmed");

      return { signature };
    },
    [publicKey, sendTransaction, connection]
  );

  const confirmDelivery = useCallback(
    async (params: {
      escrowPda: string;
      restaurantWallet: string;
      codeA: string;
      currency: string;
    }) => {
      if (!publicKey || !sendTransaction)
        throw new Error("Wallet not connected");

      const mint = getMintForCurrency(params.currency);
      const escrowPubkey = new PublicKey(params.escrowPda);
      const restaurantPubkey = new PublicKey(params.restaurantWallet);

      const escrowTokenAccount = await getAssociatedTokenAddress(
        mint,
        escrowPubkey,
        true
      );
      const restaurantTokenAccount = await getAssociatedTokenAddress(
        mint,
        restaurantPubkey
      );
      const treasuryTokenAccount = await getAssociatedTokenAddress(
        mint,
        TREASURY_WALLET
      );

      const codeBytes = new TextEncoder().encode(params.codeA.padEnd(32, "\0"));
      const data = Buffer.alloc(8 + 32);
      CONFIRM_DELIVERY_DISCRIMINATOR.copy(data, 0);
      Buffer.from(codeBytes.slice(0, 32)).copy(data, 8);

      const instruction = new TransactionInstruction({
        keys: [
          { pubkey: publicKey, isSigner: true, isWritable: true },
          { pubkey: escrowPubkey, isSigner: false, isWritable: true },
          { pubkey: escrowTokenAccount, isSigner: false, isWritable: true },
          {
            pubkey: restaurantTokenAccount,
            isSigner: false,
            isWritable: true,
          },
          { pubkey: treasuryTokenAccount, isSigner: false, isWritable: true },
          { pubkey: restaurantPubkey, isSigner: false, isWritable: false },
          { pubkey: TREASURY_WALLET, isSigner: false, isWritable: false },
          { pubkey: mint, isSigner: false, isWritable: false },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        ],
        programId: ESCROW_PROGRAM_ID,
        data,
      });

      const tx = new Transaction().add(instruction);
      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction(signature, "confirmed");

      return { signature };
    },
    [publicKey, sendTransaction, connection]
  );

  return { createOrder, contributeToOrder, confirmDelivery };
}
