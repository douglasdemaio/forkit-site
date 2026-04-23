"use client";

import { useState, useEffect, useCallback } from "react";
import { OrderData } from "@/lib/types";

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem("forkit-auth-token");
    if (!stored) return null;
    const b64 = stored.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(b64));
    return payload.exp * 1000 > Date.now() ? stored : null;
  } catch {
    return null;
  }
}

export function useOrderStatus(orderId: string | null) {
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrder = useCallback(async () => {
    if (!orderId) return;

    setLoading(true);
    setError(null);
    try {
      const token = getStoredToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`/api/orders/${orderId}`, { headers });
      if (!res.ok) throw new Error("Failed to fetch order");
      const data = await res.json();
      setOrder({
        ...data,
        items: typeof data.items === "string" ? JSON.parse(data.items) : data.items,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  // Poll for updates every 10 seconds
  useEffect(() => {
    if (!orderId) return;

    fetchOrder();
    const interval = setInterval(fetchOrder, 10000);
    return () => clearInterval(interval);
  }, [orderId, fetchOrder]);

  return { order, loading, error, refetch: fetchOrder };
}
