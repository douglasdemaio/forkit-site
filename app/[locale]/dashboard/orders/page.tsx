"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletAuth } from "@/hooks/useWallet";
import { useEscrow } from "@/hooks/useEscrow";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { QRCodeSVG } from "qrcode.react";
import { OrderStatus } from "@/lib/types";
import type { DriverBid } from "@/lib/types";

const QrScanner = dynamic(() => import("@/components/qr-scanner"), { ssr: false });

interface OrderRow {
  id: string;
  customer: { wallet: string };
  items: string;
  foodTotal: number;
  deliveryFee: number;
  status: OrderStatus;
  codeA: string | null;
  codeB: string | null;
  deliveryAddress: string | null;
  createdAt: string;
  contributions: { id: string; amount: number }[];
}

const statusColors: Record<OrderStatus, string> = {
  Created:        "bg-yellow-100 text-yellow-800",
  Funded:         "bg-blue-100 text-blue-800",
  Preparing:      "bg-purple-100 text-purple-800",
  DriverAssigned: "bg-violet-100 text-violet-800",
  ReadyForPickup: "bg-amber-100 text-amber-800",
  PickedUp:       "bg-indigo-100 text-indigo-800",
  Delivered:      "bg-teal-100 text-teal-800",
  Settled:        "bg-gray-100 text-gray-800",
  Disputed:       "bg-orange-100 text-orange-800",
  Cancelled:      "bg-red-100 text-red-800",
  Refunded:       "bg-rose-100 text-rose-800",
};

export default function OrdersPage() {
  const { connected } = useWallet();
  const { token, getAuthHeaders, authenticate } = useWalletAuth();
  const { markReadyForPickup } = useEscrow();
  const t = useTranslations("orders");
  const tDash = useTranslations("dashboard");
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [restaurantSelfDelivery, setRestaurantSelfDelivery] = useState(false);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [bidsMap, setBidsMap] = useState<Record<string, DriverBid[]>>({});
  const [acceptingBid, setAcceptingBid] = useState<string | null>(null);

  const statusLabels: Record<OrderStatus, string> = {
    Created:        t("statusPending"),
    Funded:         t("statusFunded"),
    Preparing:      t("statusPreparing"),
    DriverAssigned: t("statusDriverAssigned"),
    ReadyForPickup: t("statusReady"),
    PickedUp:       t("statusPickedUp") ?? "Picked Up",
    Delivered:      t("statusDelivered"),
    Settled:        t("statusSettled") ?? "Settled",
    Disputed:       t("statusDisputed") ?? "Disputed",
    Cancelled:      t("statusCancelled"),
    Refunded:       t("statusRefunded") ?? "Refunded",
  };

  const statusActions: Record<string, { label: string; next: OrderStatus } | null> = {
    Created:        null,
    Funded:         null, // handled separately with Confirm Order UI
    Preparing:      { label: t("markReady"), next: "ReadyForPickup" },
    DriverAssigned: { label: t("markReady"), next: "ReadyForPickup" },
    ReadyForPickup: restaurantSelfDelivery ? { label: t("startDelivery"), next: "PickedUp" } : null,
    PickedUp:       restaurantSelfDelivery ? { label: t("markDelivered"), next: "Delivered" } : null,
    Delivered:      null,
    Settled:        null,
    Disputed:       null,
    Cancelled:      null,
    Refunded:       null,
  };

  const newOrderCount = orders.filter((o) => o.status === "Funded").length;

  const loadOrders = useCallback(async (silent = false) => {
    if (!token || !restaurantId) return;
    if (!silent) setRefreshing(true);
    try {
      const res = await fetch(`/api/orders?restaurantId=${restaurantId}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        const list: OrderRow[] = data.orders || [];
        setOrders(list);
        // Fetch bids for all Preparing orders (no driver assigned)
        const preparingOrders = list.filter((o) => o.status === "Preparing");
        if (preparingOrders.length > 0) {
          const results = await Promise.allSettled(
            preparingOrders.map((o) =>
              fetch(`/api/orders/${o.id}/bids`, { headers: getAuthHeaders() }).then((r) => r.json())
            )
          );
          const newBidsMap: Record<string, DriverBid[]> = {};
          results.forEach((result, i) => {
            if (result.status === "fulfilled" && result.value.bids) {
              newBidsMap[preparingOrders[i].id] = result.value.bids;
            }
          });
          setBidsMap(newBidsMap);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setRefreshing(false);
    }
  }, [token, restaurantId, getAuthHeaders]);

  const acceptBid = async (orderId: string, bidId: string) => {
    setAcceptingBid(bidId);
    try {
      const res = await fetch(`/api/orders/${orderId}/bids/${bidId}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      });
      if (res.ok) {
        await loadOrders(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAcceptingBid(null);
    }
  };

  const searchParams = useSearchParams();
  const restaurantIdParam = searchParams.get("restaurantId");

  const loadData = useCallback(async () => {
    if (!token) return;
    try {
      if (restaurantIdParam) {
        // Fetch the specific restaurant to get selfDelivery flag
        const res = await fetch(`/api/restaurants/${restaurantIdParam}`, {
          headers: getAuthHeaders(),
        });
        if (res.ok) {
          const data = await res.json();
          setRestaurantId(restaurantIdParam);
          setRestaurantSelfDelivery(data.selfDelivery ?? false);
        } else {
          setRestaurantId(restaurantIdParam);
        }
      } else {
        const res = await fetch("/api/restaurants/mine", {
          headers: getAuthHeaders(),
        });
        if (res.ok) {
          const data = await res.json();
          const r = data.restaurant || data.restaurants?.[0];
          if (r) {
            setRestaurantId(r.id);
            setRestaurantSelfDelivery(r.selfDelivery ?? false);
          }
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
      // For the Preparing → ReadyForPickup transition, the restaurant must
      // sign mark_ready_for_pickup on-chain — without it, the customer's
      // later confirm_delivery will fail (chain status would still be
      // Preparing, but confirm_delivery requires PickedUp). Sign first, then
      // update DB. If the on-chain call fails, do not advance the DB.
      if (newStatus === "ReadyForPickup") {
        const current = orders.find((o) => o.id === orderId);
        if (current && current.status === "Preparing") {
          try {
            await markReadyForPickup({ orderId });
          } catch (e) {
            console.error("mark_ready_for_pickup failed:", e);
            return;
          }
        }
      }
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
        );
        if (newStatus === "Preparing") await loadOrders(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const [codeInputs, setCodeInputs] = useState<Record<string, string>>({});
  const [verifyingKey, setVerifyingKey] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<Record<string, string>>({});
  const [scanningKey, setScanningKey] = useState<string | null>(null);

  // inputKey = orderId + "_A" (pickup) or orderId + "_B" (delivery)
  // directCode: skip codeInputs state lookup (used after QR scan)
  const verifyCode = async (orderId: string, inputKey: string, directCode?: string) => {
    const code = (directCode ?? codeInputs[inputKey] ?? "").trim();
    if (!code) {
      setVerifyError((e) => ({ ...e, [inputKey]: t("codeRequired") }));
      return;
    }
    setVerifyingKey(inputKey);
    setVerifyError((e) => ({ ...e, [inputKey]: "" }));
    try {
      const res = await fetch(`/api/orders/${orderId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (res.ok && data.matched) {
        const newStatus = (data.order?.status as OrderStatus) ?? (data.codeType === "delivery" ? "Settled" : "PickedUp");
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
        );
        setCodeInputs((p) => ({ ...p, [inputKey]: "" }));
      } else {
        setVerifyError((e) => ({
          ...e,
          [inputKey]: data.error || t("invalidCode"),
        }));
      }
    } catch (err) {
      console.error(err);
      setVerifyError((e) => ({ ...e, [inputKey]: t("verifyFailed") }));
    } finally {
      setVerifyingKey(null);
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
                  order.status === "Funded" ? "ring-2 ring-blue-300 bg-blue-50/30" : ""
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
                        {order.foodTotal.toFixed(2)} USDC
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

                    {/* Verification codes with QR */}
                    {(order.codeA || order.codeB) && (
                      <div className="mt-3 flex flex-wrap gap-3">
                        {order.codeA && (
                          <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-3 flex flex-col items-center gap-2">
                            <span className="text-xs text-orange-600 font-medium">{t("codeA")}</span>
                            <div className="bg-white rounded-lg p-1.5">
                              <QRCodeSVG value={`forkit:${order.id}:${order.codeA}`} size={88} />
                            </div>
                            <span className="text-base font-bold font-mono text-orange-800 tracking-wider">{order.codeA}</span>
                            {(order.status === "Preparing" || order.status === "ReadyForPickup") && (
                              <button
                                onClick={() => window.open(`/kiosk/${order.id}?key=${order.codeA}`, "_blank")}
                                className="text-xs text-orange-600 hover:text-orange-800 flex items-center gap-1 mt-1 underline underline-offset-2"
                              >
                                🖥 Display on screen
                              </button>
                            )}
                          </div>
                        )}
                        {order.codeB && (
                          <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-3 flex flex-col items-center gap-2">
                            <span className="text-xs text-green-600 font-medium">{t("codeB")}</span>
                            <div className="bg-white rounded-lg p-1.5">
                              <QRCodeSVG value={`forkit:${order.id}:${order.codeB}`} size={88} />
                            </div>
                            <span className="text-base font-bold font-mono text-green-800 tracking-wider">{order.codeB}</span>
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

                {/* Confirm Order — prominent CTA for funded orders */}
                {order.status === "Funded" && (
                  <div className="mt-4 pt-4 border-t border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-blue-50/50 rounded-xl px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-blue-900">{t("confirmOrder")}</p>
                      <p className="text-xs text-blue-600 mt-0.5">
                        {restaurantSelfDelivery ? t("confirmOrderSelfHint") : t("confirmOrderDriverHint")}
                      </p>
                    </div>
                    <button
                      onClick={() => updateStatus(order.id, "Preparing")}
                      className="px-5 py-2.5 bg-forkit-orange text-white text-sm font-semibold rounded-xl hover:bg-orange-600 transition-colors whitespace-nowrap"
                    >
                      {t("confirmOrder")} ✓
                    </button>
                  </div>
                )}

                {/* Driver bids panel — shown for Preparing orders awaiting driver assignment, not for self-delivery */}
                {order.status === "Preparing" && !restaurantSelfDelivery && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-sm font-semibold text-gray-700 mb-2">
                      🚴 {t("driverBids")} {bidsMap[order.id]?.length > 0 ? `(${bidsMap[order.id].length})` : ""}
                    </p>
                    {!bidsMap[order.id] || bidsMap[order.id].length === 0 ? (
                      <p className="text-sm text-gray-400 italic">{t("noBidsYet")}</p>
                    ) : (
                      <div className="space-y-2">
                        {bidsMap[order.id].filter((b) => b.status === "Pending").map((bid) => (
                          <div key={bid.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                            <div>
                              <span className="text-xs font-mono text-gray-600">
                                {bid.driverWallet.slice(0, 8)}…{bid.driverWallet.slice(-4)}
                              </span>
                              {bid.driver?.isNewcomer ? (
                                <span className="ml-2 text-xs px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded-full">
                                  {t("newcomer")}
                                </span>
                              ) : (
                                <span className="ml-2 text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full">
                                  ★ {bid.driver?.avgRating?.toFixed(1)} · {bid.driver?.completedDeliveries} {t("deliveries")}
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => acceptBid(order.id, bid.id)}
                              disabled={acceptingBid === bid.id}
                              className="text-xs px-3 py-1.5 bg-forkit-orange text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors"
                            >
                              {acceptingBid === bid.id ? "…" : t("assignDriver")}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Code verification: close out order once customer confirms delivery/pickup */}
                {(order.status === "ReadyForPickup" || order.status === "Preparing" || (restaurantSelfDelivery && order.status === "Delivered")) && (order.codeA || order.codeB) && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-sm font-semibold text-gray-700">
                        🔐 {t("confirmWithCode")}
                      </span>
                      <span className="text-xs text-gray-500">
                        {t("confirmWithCodeDesc")}
                      </span>
                    </div>
                    <div className="flex flex-col gap-3">
                      {[
                        (order.status !== "Delivered" && order.codeA) ? { key: order.id + "_A", label: t("codeA"), color: "orange" } : null,
                        order.codeB ? { key: order.id + "_B", label: t("codeB"), color: "green" } : null,
                      ].filter(Boolean).map((entry) => {
                        const { key, label, color } = entry!;
                        const ring = color === "orange" ? "focus:ring-forkit-orange/20 focus:border-forkit-orange" : "focus:ring-green-300/40 focus:border-green-500";
                        return (
                          <div key={key}>
                            <label className={`text-xs font-medium mb-1 block text-${color}-600`}>
                              {label}
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={codeInputs[key] || ""}
                                onChange={(e) => {
                                  const val = e.target.value.toUpperCase();
                                  setCodeInputs((p) => ({ ...p, [key]: val }));
                                  setVerifyError((er) => ({ ...er, [key]: "" }));
                                }}
                                onKeyDown={(e) => { if (e.key === "Enter") verifyCode(order.id, key); }}
                                placeholder="XXXXXX"
                                className={`flex-1 px-3 py-2 border rounded-lg font-mono uppercase tracking-wider focus:outline-none focus:ring-2 ${ring}`}
                                maxLength={16}
                                disabled={verifyingKey === key}
                              />
                              <button
                                onClick={() => setScanningKey(key + "|" + order.id)}
                                className="px-3 py-2 border rounded-lg text-gray-600 hover:bg-gray-50 text-sm"
                                title="Scan QR code"
                              >
                                📷
                              </button>
                              <button
                                onClick={() => verifyCode(order.id, key)}
                                disabled={verifyingKey === key || !codeInputs[key]}
                                className="btn-primary text-sm whitespace-nowrap disabled:opacity-50"
                              >
                                {verifyingKey === key ? t("verifying") : t("confirmAndClose")}
                              </button>
                            </div>
                            {verifyError[key] && (
                              <p className="text-sm text-red-600 mt-1">❌ {verifyError[key]}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* QR scanner modal */}
      {scanningKey && (() => {
        const [inputKey, orderId] = scanningKey.split("|");
        return (
          <QrScanner
            title={inputKey.endsWith("_A") ? `Scan Pickup Code` : `Scan Delivery Code`}
            onScan={(code) => {
              setCodeInputs((p) => ({ ...p, [inputKey]: code }));
              setScanningKey(null);
              verifyCode(orderId, inputKey, code);
            }}
            onClose={() => setScanningKey(null)}
          />
        );
      })()}
    </div>
  );
}
