"use client";

import dynamic from "next/dynamic";

// WalletMultiButton detects installed wallets client-side and injects <i> icon
// elements, causing a server/client HTML mismatch. ssr:false keeps it client-only.
export const WalletButton = dynamic(
  () =>
    import("@solana/wallet-adapter-react-ui").then(
      (m) => m.WalletMultiButton
    ),
  { ssr: false }
);
