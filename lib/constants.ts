import { PublicKey } from "@solana/web3.js";

// ForkIt Program IDs (deployed to devnet 2026-04-22)
export const ESCROW_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_ESCROW_PROGRAM_ID || "CNUWqYhXPXszPuB8psqG2VSnwCXf1MWzT4Pztp4y8fgj"
);
export const REGISTRY_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_REGISTRY_PROGRAM_ID || "EM1FgSzfS3F7cCYJWhUaqqPAK7ijZYpYRx7pzYkuyExz"
);
export const LOYALTY_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_LOYALTY_PROGRAM_ID || "BnnUntqkUadZ2BsW8j675P9hJQV3aqVcmt4xG4xfeoM8"
);

// Treasury
export const TREASURY_WALLET = new PublicKey(
  "BiP5PJuUiXPYCFx98RMCGCnRhdUVrkxSke9C6y2ZohQ9"
);

// Token Mints (devnet)
export const USDC_MINT = new PublicKey(
  "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
);
export const PYUSD_MINT = new PublicKey(
  "CXk2AMBfi3TwaEL2468s6zP8xq9NxTXjp9gjMgzeUynM"
);
// Circle EURC — mainnet mint. No devnet equivalent currently; selecting EURC
// while running on devnet will fail at transaction time.
export const EURC_MINT = new PublicKey(
  "HzwqbKZw8HxMN6bF2yFZNrht3c2iXXzpKcFu7uBEDKtr"
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
// Custom RPC via Tatum gateway for better reliability
export const SOLANA_RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com";

// Token decimals
export const TOKEN_DECIMALS = 6;

export function getMintForCurrency(currency: string): PublicKey {
  switch (currency.toUpperCase()) {
    case "PYUSD":
      return PYUSD_MINT;
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
