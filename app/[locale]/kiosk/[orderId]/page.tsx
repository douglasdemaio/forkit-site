"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";

interface KioskOrder {
  id: string;
  status: string;
  items: { name: string; quantity: number }[];
  restaurant: { name: string; slug: string };
}

export default function KioskPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const searchParams = useSearchParams();
  const key = searchParams.get("key") || "";

  const [order, setOrder] = useState<KioskOrder | null>(null);
  const [error, setError] = useState("");
  const confirmed = ["Delivered", "Settled", "Cancelled", "Refunded"].includes(order?.status ?? "");

  const fetchOrder = useCallback(async () => {
    if (!orderId || !key) return;
    try {
      const res = await fetch(`/api/orders/${orderId}/scan-confirm?key=${encodeURIComponent(key)}`);
      if (res.ok) {
        setOrder(await res.json());
      } else {
        setError("Order not found or invalid link.");
      }
    } catch {
      setError("Could not load order.");
    }
  }, [orderId, key]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  // Poll every 3s until confirmed
  useEffect(() => {
    if (confirmed) return;
    const t = setInterval(fetchOrder, 3000);
    return () => clearInterval(t);
  }, [confirmed, fetchOrder]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-8">
        <p className="text-red-400 text-lg">{error}</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const qrValue = `forkit:${orderId}:${key}`;

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-8 text-white select-none">
      <p className="text-yellow-400 text-lg font-semibold tracking-wide uppercase mb-2">
        {order.restaurant.name}
      </p>

      <h1 className="text-2xl font-bold mb-1">Pickup Order</h1>
      <p className="text-gray-400 text-sm mb-8 font-mono">#{orderId.slice(0, 8)}</p>

      {confirmed ? (
        <div className="flex flex-col items-center gap-4">
          <div className="w-40 h-40 rounded-full bg-green-900/40 border-4 border-green-500 flex items-center justify-center">
            <svg className="w-20 h-20 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-green-400 text-3xl font-bold">Order Confirmed</p>
          <p className="text-gray-400">This order has been picked up.</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-3xl p-5 mb-8 shadow-2xl">
            <QRCodeSVG value={qrValue} size={280} level="M" />
          </div>

          <p className="text-gray-300 text-lg font-medium mb-1">Scan to confirm pickup</p>
          <p className="text-gray-500 text-sm mb-8">Open the ForkMe app and scan this code</p>

          <div className="bg-gray-900 rounded-2xl px-6 py-4 w-full max-w-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Your order</p>
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between py-1 text-sm text-gray-300">
                <span>{item.name}</span>
                <span className="text-gray-500">×{item.quantity}</span>
              </div>
            ))}
          </div>

          <div className="mt-8 flex gap-2 items-center">
            <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
            <span className="text-gray-500 text-sm">Waiting for scan…</span>
          </div>
        </>
      )}
    </div>
  );
}
