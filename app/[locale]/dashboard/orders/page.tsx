"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletAuth } from "@/hooks/useWallet";
import { useTranslations } from "next-intl";
import { OrderStatus } from "@/lib/types";

interface OrderRow {
  id: string;
  customerWallet: string;
  items: string;
  totalAmount: number;
  deliveryFee: number;
  status: OrderStatus;
  createdAt: string;
  contributions: { id: string; amount: number }[];
}

const statusColors: Record<OrderStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  funded: "bg-blue-100 text-blue-800",
  preparing: "bg-purple-100 text-purple-800",
  ready: "bg-green-100 text-green-800",
  delivered: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function OrdersPage() {
  const { connected } = useWallet();
  const { token, getAuthHeaders, authenticate } = useWalletAuth();
  const t = useTranslations("orders");
  const tDash = useTranslations("dashboard");
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  const statusLabels: Record<OrderStatus, string> = {
    pending: t("statusPending"),
    funded: t("statusFunded"),
    preparing: t("statusPreparing"),
    ready: t("statusReady"),
    delivered: t("statusDelivered"),
    cancelled: t("statusCancelled"),
  };

  const statusActions: Record<string, { label: string; next: OrderStatus } | null> = {
    pending: null,
    funded: { label: t("startPreparing"), next: "preparing" },
    preparing: { label: t("markReady"), next: "ready" },
    ready: { label: t("markDelivered"), next: "delivered" },
    delivered: null,
    cancelled: null,
  };

  const loadOrders = useCallback(async () => {
    if (!token || !restaurantId) return;
  }, [token, restaurantId]);

  const loadData = useCallback(async () => {
    if (!token) return;
    try {
      const createRes = await fetch("/api/restaurants", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ name: "__probe__" }),
      });

      if (createRes.status === 409) {
        const { restaurant } = await createRes.json();
        setRestaurantId(restaurant.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token, getAuthHeaders]);

  useEffect(() => {
    if (token) loadData();
    else setLoading(false);
  }, [token, loadData]);

  const updateStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
    } catch (err) {
      console.error(err);
    }
  };

  if (!connected || !token) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4">
        <span className="text-5xl mb-4">🔐</span>
        <h1 className="text-2xl font-bold">{t("authRequired")}</h1>
        {connected && !token && (
          <button onClick={authenticate} className="mt-4 btn-primary">
            {tDash("signContinue")}
          </button>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-forkit-orange border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-forkit-dark">{t("title")}</h1>
        <p className="text-gray-500 text-sm mt-1">
          {t("subtitle")}
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-20">
          <span className="text-5xl">📦</span>
          <h2 className="mt-4 text-xl font-bold text-gray-900">
            {t("noOrders")}
          </h2>
          <p className="text-gray-500 mt-2">
            {t("noOrdersDesc")}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const items =
              typeof order.items === "string"
                ? JSON.parse(order.items)
                : order.items;
            const action = statusActions[order.status];

            return (
              <div key={order.id} className="card p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          statusColors[order.status]
                        }`}
                      >
                        {statusLabels[order.status]}
                      </span>
                      <span className="text-sm text-gray-400 font-mono">
                        #{order.id.slice(0, 8)}
                      </span>
                      <span className="text-sm text-gray-400">
                        {new Date(order.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <div className="mt-2 text-sm text-gray-600">
                      {items.map(
                        (
                          item: { name: string; quantity: number; price: number },
                          i: number
                        ) => (
                          <span key={i}>
                            {i > 0 && " · "}
                            {item.quantity}× {item.name}
                          </span>
                        )
                      )}
                    </div>

                    <div className="mt-1 text-sm">
                      <span className="font-semibold text-gray-900">
                        {order.totalAmount.toFixed(2)} USDC
                      </span>
                      {order.deliveryFee > 0 && (
                        <span className="text-gray-400">
                          {" "}
                          + {order.deliveryFee.toFixed(2)} {t("delivery")}
                        </span>
                      )}
                    </div>
                  </div>

                  {action && (
                    <button
                      onClick={() => updateStatus(order.id, action.next)}
                      className="btn-primary text-sm whitespace-nowrap"
                    >
                      {action.label}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
