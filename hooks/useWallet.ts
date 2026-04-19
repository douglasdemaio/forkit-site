"use client";

import { useState, useCallback, useEffect } from "react";
import { useWallet as useSolanaWallet } from "@solana/wallet-adapter-react";
import bs58 from "bs58";

export function useWalletAuth() {
  const { publicKey, signMessage, connected, disconnect } = useSolanaWallet();
  const [token, setToken] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Load token from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("forkit-auth-token");
      if (stored) setToken(stored);
    }
  }, []);

  const authenticate = useCallback(async () => {
    if (!publicKey || !signMessage) return null;

    setIsAuthenticating(true);
    try {
      // 1. Get nonce from server
      const nonceRes = await fetch("/api/auth/nonce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: publicKey.toBase58() }),
      });
      const { nonce } = await nonceRes.json();

      // 2. Sign the nonce
      const message = new TextEncoder().encode(
        `Sign this message to authenticate with ForkIt:\n\nNonce: ${nonce}`
      );
      const signature = await signMessage(message);

      // 3. Verify signature and get JWT
      const verifyRes = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: publicKey.toBase58(),
          nonce,
          signature: bs58.encode(signature),
        }),
      });

      if (!verifyRes.ok) throw new Error("Verification failed");

      const { token: jwt } = await verifyRes.json();
      setToken(jwt);
      localStorage.setItem("forkit-auth-token", jwt);
      return jwt;
    } catch (error) {
      console.error("Authentication failed:", error);
      return null;
    } finally {
      setIsAuthenticating(false);
    }
  }, [publicKey, signMessage]);

  const logout = useCallback(() => {
    setToken(null);
    localStorage.removeItem("forkit-auth-token");
    disconnect();
  }, [disconnect]);

  const getAuthHeaders = useCallback((): Record<string, string> => {
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  }, [token]);

  return {
    wallet: publicKey?.toBase58() ?? null,
    connected,
    token,
    isAuthenticating,
    authenticate,
    logout,
    getAuthHeaders,
  };
}
