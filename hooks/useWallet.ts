"use client";

import { useState, useCallback, useEffect } from "react";
import { useWallet as useSolanaWallet } from "@solana/wallet-adapter-react";
import bs58 from "bs58";

export function useWalletAuth() {
  const { publicKey, signMessage, connected, disconnect } = useSolanaWallet();
  const [token, setToken] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Load token from localStorage on mount, discarding expired JWTs
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("forkit-auth-token");
      if (stored) {
        try {
          const b64 = stored.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
          const payload = JSON.parse(atob(b64));
          if (payload.exp * 1000 > Date.now()) {
            setToken(stored);
          } else {
            localStorage.removeItem("forkit-auth-token");
          }
        } catch {
          localStorage.removeItem("forkit-auth-token");
        }
      }
    }
  }, []);

  const authenticate = useCallback(async () => {
    if (!publicKey || !signMessage) return null;

    setIsAuthenticating(true);
    setAuthError(null);
    try {
      // 1. Get nonce from server
      const nonceRes = await fetch("/api/auth/nonce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: publicKey.toBase58() }),
      });
      if (!nonceRes.ok) {
        throw new Error(`Server error (${nonceRes.status}): could not generate sign-in nonce`);
      }
      const { nonce } = await nonceRes.json();
      if (!nonce) throw new Error("Invalid nonce from server");

      // 2. Sign the nonce — Phantom only pops up after nonce is confirmed valid
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

      if (!verifyRes.ok) {
        const body = await verifyRes.json().catch(() => ({}));
        throw new Error(body.error || `Verification failed (${verifyRes.status})`);
      }

      const { token: jwt } = await verifyRes.json();
      setToken(jwt);
      localStorage.setItem("forkit-auth-token", jwt);
      return jwt;
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Authentication failed";
      console.error("Authentication failed:", error);
      setAuthError(msg);
      return null;
    } finally {
      setIsAuthenticating(false);
    }
  }, [publicKey, signMessage]);

  const clearToken = useCallback(() => {
    setToken(null);
    localStorage.removeItem("forkit-auth-token");
  }, []);

  const logout = useCallback(() => {
    clearToken();
    disconnect();
  }, [clearToken, disconnect]);

  const getAuthHeaders = useCallback((): Record<string, string> => {
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  }, [token]);

  return {
    wallet: publicKey?.toBase58() ?? null,
    connected,
    token,
    isAuthenticating,
    authError,
    authenticate,
    logout,
    clearToken,
    getAuthHeaders,
  };
}
