import { PublicKey } from "@solana/web3.js";

// ForkIt Program IDs
export const ESCROW_PROGRAM_ID = new PublicKey(
  "FNZXjjq2oceq15jVsnHT8gYJQUZ9NLCXCpYak2pXsqGB"
);
export const REGISTRY_PROGRAM_ID = new PublicKey(
  "2riHMdVB6eFgeQjqvnqq2Mrpqea7hrMv5ZNRh7gZgB9S"
);
export const LOYALTY_PROGRAM_ID = new PublicKey(
  "6DaFmi7haz2Ci9sXaHRviz3biwbmTwipvwc9L9cdeugR"
);

// Treasury
export const TREASURY_WALLET = new PublicKey(
  "BiP5PJuUiXPYCFx98RMCGCnRhdUVrkxSke9C6y2ZohQ9"
);

// Token Mints (devnet)
export const USDC_MINT = new PublicKey(
  "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
);
export const EURC_MINT = new PublicKey(
  "CXk2AMBfi3TwaEL2468s6zP8xq9NxTXjp9gjMgzeUynM"
);

// Protocol constants
export const PROTOCOL_FEE_BPS = 2; // 0.02%
export const MAX_CONTRIBUTORS = 10;

// Timeout constants (seconds) — must match on-chain values
export const CANCEL_WINDOW_SECONDS = 60;
export const FUNDING_TIMEOUT_SECONDS = 900; // 15 min
export const PREP_TIMEOUT_SECONDS = 2700; // 45 min
export const PICKUP_TIMEOUT_SECONDS = 2700; // 45 min
export const DELIVERY_TIMEOUT_SECONDS = 10800; // 3 hours

// Network
export const SOLANA_NETWORK =
  process.env.NEXT_PUBLIC_SOLANA_NETWORK || "devnet";
export const SOLANA_RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com";

// Token decimals
export const TOKEN_DECIMALS = 6;

export function getMintForCurrency(currency: string): PublicKey {
  switch (currency.toUpperCase()) {
    case "EURC":
      return EURC_MINT;
    case "USDC":
    default:
      return USDC_MINT;
  }
}

export function formatTokenAmount(amount: number): string {
  return (amount / 10 ** TOKEN_DECIMALS).toFixed(2);
}

export function toTokenAmount(amount: number): number {
  return Math.round(amount * 10 ** TOKEN_DECIMALS);
}
