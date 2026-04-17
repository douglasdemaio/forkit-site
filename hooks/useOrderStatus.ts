"use client";

import { useState, useEffect, useCallback } from "react";
import { OrderData } from "@/lib/types";

export function useOrderStatus(orderId: string | null) {
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrder = useCallback(async () => {
    if (!orderId) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}`);
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
