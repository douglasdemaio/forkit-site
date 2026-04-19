"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletAuth } from "@/hooks/useWallet";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { OrderStatus } from "@/lib/types";

interface OrderRow {
  id: string;
  customerWallet: string;
  items: string;
  totalAmount: number;
  deliveryFee: number;
  status: OrderStatus;
  codeA: string | null;
  codeB: string | null;
  deliveryAddress: string | null;
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
  const [refreshing, setRefreshing] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const newOrderCount = orders.filter((o) => o.status === "funded").length;

  const loadOrders = useCallback(async (silent = false) => {
    if (!token || !restaurantId) return;
    if (!silent) setRefreshing(true);
    try {
      const res = await fetch(`/api/orders?restaurantId=${restaurantId}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setRefreshing(false);
    }
  }, [token, restaurantId, getAuthHeaders]);

  const searchParams = useSearchParams();
  const restaurantIdParam = searchParams.get("restaurantId");

  const loadData = useCallback(async () => {
    if (!token) return;
    // If restaurant ID is in URL, use it directly
    if (restaurantIdParam) {
      setRestaurantId(restaurantIdParam);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/restaurants/mine", {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.restaurant) {
          setRestaurantId(data.restaurant.id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token, getAuthHeaders, restaurantIdParam]);

  useEffect(() => {
    if (token) loadData();
    else setLoading(false);
  }, [token, loadData]);

  // Load orders when restaurantId is set
  useEffect(() => {
    if (restaurantId && token) {
      loadOrders();
    }
  }, [restaurantId, token, loadOrders]);

  // Poll for new orders every 15 seconds
  useEffect(() => {
    if (!restaurantId || !token) return;

    pollRef.current = setInterval(() => {
      loadOrders(true);
    }, 15000);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [restaurantId, token, loadOrders]);

  const updateStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ status: newStatus }),
      });
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const [codeInputs, setCodeInputs] = useState<Record<string, string>>({});
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<Record<string, string>>({});

  const verifyCode = async (orderId: string) => {
    const code = (codeInputs[orderId] || "").trim();
    if (!code) {
      setVerifyError((e) => ({ ...e, [orderId]: t("codeRequired") }));
      return;
    }
    setVerifyingId(orderId);
    setVerifyError((e) => ({ ...e, [orderId]: "" }));
    try {
      const res = await fetch(`/api/orders/${orderId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (res.ok && data.matched) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: "delivered" } : o))
        );
        setCodeInputs((p) => ({ ...p, [orderId]: "" }));
      } else {
        setVerifyError((e) => ({
          ...e,
          [orderId]: data.error || t("invalidCode"),
        }));
      }
    } catch (err) {
      console.error(err);
      setVerifyError((e) => ({ ...e, [orderId]: t("verifyFailed") }));
    } finally {
      setVerifyingId(null);
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-forkit-dark">{t("title")}</h1>
          <p className="text-gray-500 text-sm mt-1">
            {t("subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {refreshing && (
            <span className="text-xs text-gray-400">{t("refreshing")}</span>
          )}
        </div>
      </div>

      {/* New orders notification banner */}
      {newOrderCount > 0 && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl px-5 py-3 flex items-center gap-3">
          <span className="text-2xl">🔔</span>
          <div className="flex-1">
            <span className="font-semibold text-blue-800">{t("newOrders")}</span>
            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-600 text-white">
              {t("newOrdersBadge", { count: newOrderCount })}
            </span>
          </div>
        </div>
      )}

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
              <div
                key={order.id}
                className={`card p-5 ${
                  order.status === "funded" ? "ring-2 ring-blue-300 bg-blue-50/30" : ""
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
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

                    {/* Delivery address */}
                    <div className="mt-2 text-sm">
                      <span className="text-gray-500 font-medium">{t("deliveryAddress")}:</span>{" "}
                      <span className="text-gray-700">
                        {order.deliveryAddress || (
                          <span className="italic text-gray-400">{t("noAddress")}</span>
                        )}
                      </span>
                    </div>

                    {/* Verification codes */}
                    {(order.codeA || order.codeB) && (
                      <div className="mt-3 flex flex-wrap gap-3">
                        {order.codeA && (
                          <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                            <span className="text-xs text-orange-600 font-medium block">{t("codeA")}</span>
                            <span className="text-lg font-bold font-mono text-orange-800 tracking-wider">{order.codeA}</span>
                          </div>
                        )}
                        {order.codeB && (
                          <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                            <span className="text-xs text-green-600 font-medium block">{t("codeB")}</span>
                            <span className="text-lg font-bold font-mono text-green-800 tracking-wider">{order.codeB}</span>
                          </div>
                        )}
                      </div>
                    )}
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

                {/* Code verification: close out order once customer confirms delivery/pickup */}
                {(order.status === "ready" || order.status === "preparing") && (order.codeA || order.codeB) && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-semibold text-gray-700">
                        🔐 {t("confirmWithCode")}
                      </span>
                      <span className="text-xs text-gray-500">
                        {t("confirmWithCodeDesc")}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={codeInputs[order.id] || ""}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase();
                          setCodeInputs((p) => ({ ...p, [order.id]: val }));
                          setVerifyError((er) => ({ ...er, [order.id]: "" }));
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") verifyCode(order.id);
                        }}
                        placeholder="XXXX-XXXX"
                        className="flex-1 px-3 py-2 border rounded-lg font-mono uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-forkit-orange/20 focus:border-forkit-orange"
                        maxLength={16}
                        disabled={verifyingId === order.id}
                      />
                      <button
                        onClick={() => verifyCode(order.id)}
                        disabled={verifyingId === order.id || !codeInputs[order.id]}
                        className="btn-primary text-sm whitespace-nowrap disabled:opacity-50"
                      >
                        {verifyingId === order.id ? t("verifying") : t("confirmAndClose")}
                      </button>
                    </div>
                    {verifyError[order.id] && (
                      <p className="text-sm text-red-600 mt-2">❌ {verifyError[order.id]}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
