"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWalletAuth } from "@/hooks/useWallet";

export default function ConnectPage() {
  const router = useRouter();
  const { connected } = useWallet();
  const { token, authenticate, isAuthenticating } = useWalletAuth();

  // Redirect to dashboard when authenticated
  useEffect(() => {
    if (token) {
      router.push("/dashboard");
    }
  }, [token, router]);

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4">
      <div className="max-w-md w-full">
        <span className="text-6xl">🍴</span>
        <h1 className="mt-6 text-3xl font-bold text-forkit-dark">
          Welcome to ForkIt
        </h1>
        <p className="mt-3 text-gray-500">
          Connect your Solana wallet to get started. Create your restaurant page
          or order food from existing ones.
        </p>

        <div className="mt-10 space-y-4">
          {!connected ? (
            <>
              <WalletMultiButton className="!bg-forkit-orange hover:!bg-orange-600 !rounded-xl !h-14 !text-lg !w-full !justify-center" />
              <p className="text-sm text-gray-400">
                Supports Phantom, Solflare, and other Solana wallets
              </p>
            </>
          ) : !token ? (
            <>
              <p className="text-gray-600 font-medium">
                ✅ Wallet connected! Sign a message to authenticate.
              </p>
              <button
                onClick={authenticate}
                disabled={isAuthenticating}
                className="w-full py-4 bg-forkit-orange text-white rounded-xl font-semibold text-lg hover:bg-orange-600 disabled:opacity-50 transition-colors"
              >
                {isAuthenticating ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Signing...
                  </span>
                ) : (
                  "Sign & Continue"
                )}
              </button>
              <p className="text-sm text-gray-400">
                This proves you own the wallet — no gas fees
              </p>
            </>
          ) : (
            <div className="flex items-center justify-center gap-2 text-forkit-green">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span className="font-semibold">Authenticated! Redirecting...</span>
            </div>
          )}
        </div>

        {/* Info cards */}
        <div className="mt-16 grid grid-cols-2 gap-4 text-left">
          <div className="p-4 bg-gray-50 rounded-xl">
            <h3 className="font-semibold text-sm text-gray-900">
              🏪 Restaurant Owner?
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              Set up your page, upload menu items, and start receiving orders.
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl">
            <h3 className="font-semibold text-sm text-gray-900">
              🍕 Hungry Customer?
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              Browse restaurants, order food, and pay with USDC on Solana.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
